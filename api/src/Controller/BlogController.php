<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use XS2EventProxy\Repository\BlogRepository;
use Psr\Log\LoggerInterface;

/**
 * BlogController – public-facing (frontend) blog API endpoints.
 */
class BlogController
{
    private BlogRepository $blogRepo;
    private LoggerInterface $logger;

    public function __construct(BlogRepository $blogRepo, LoggerInterface $logger)
    {
        $this->blogRepo = $blogRepo;
        $this->logger   = $logger;
    }

    // GET /api/blogs
    public function listBlogs(Request $request, Response $response): Response
    {
        try {
            $params     = $request->getQueryParams();
            $page       = max(1, (int) ($params['page'] ?? 1));
            $limit      = min(50, max(1, (int) ($params['limit'] ?? 6)));
            $categoryId = isset($params['category_id']) && $params['category_id'] !== ''
                ? (int) $params['category_id']
                : null;
            $tagId      = isset($params['tag_id']) && $params['tag_id'] !== ''
                ? (int) $params['tag_id']
                : null;

            $result = $this->blogRepo->getPublishedBlogs($page, $limit, $categoryId, $tagId);

            return $this->json($response, ['success' => true] + $result);
        } catch (\Exception $e) {
            $this->logger->error('BlogController::listBlogs', ['error' => $e->getMessage()]);
            return $this->json($response, ['success' => false, 'error' => 'Failed to retrieve blogs'], 500);
        }
    }

    // GET /api/blogs/{slug}
    public function getBlogBySlug(Request $request, Response $response, array $args): Response
    {
        try {
            $slug = $args['slug'] ?? '';
            $blog = $this->blogRepo->getPublishedBlogBySlug($slug);

            if (!$blog) {
                return $this->json($response, ['success' => false, 'error' => 'Blog not found'], 404);
            }

            return $this->json($response, ['success' => true, 'data' => $blog]);
        } catch (\Exception $e) {
            $this->logger->error('BlogController::getBlogBySlug', ['error' => $e->getMessage()]);
            return $this->json($response, ['success' => false, 'error' => 'Failed to retrieve blog'], 500);
        }
    }

    // GET /api/blogs/{slug}/related
    public function getRelatedBlogs(Request $request, Response $response, array $args): Response
    {
        try {
            $slug = $args['slug'] ?? '';
            $blog = $this->blogRepo->getPublishedBlogBySlug($slug);

            if (!$blog) {
                return $this->json($response, ['success' => false, 'error' => 'Blog not found'], 404);
            }

            $tagIds  = array_column($blog['tags'] ?? [], 'id');
            $related = $this->blogRepo->getRelatedBlogs(
                (int) $blog['id'],
                $blog['category_id'] ? (int) $blog['category_id'] : null,
                $tagIds
            );

            return $this->json($response, ['success' => true, 'data' => $related]);
        } catch (\Exception $e) {
            $this->logger->error('BlogController::getRelatedBlogs', ['error' => $e->getMessage()]);
            return $this->json($response, ['success' => false, 'error' => 'Failed to retrieve related blogs'], 500);
        }
    }

    // GET /api/blog-categories
    public function listCategories(Request $request, Response $response): Response
    {
        try {
            $categories = $this->blogRepo->getAllCategories();
            return $this->json($response, ['success' => true, 'data' => $categories]);
        } catch (\Exception $e) {
            $this->logger->error('BlogController::listCategories', ['error' => $e->getMessage()]);
            return $this->json($response, ['success' => false, 'error' => 'Failed to retrieve categories'], 500);
        }
    }

    // GET /api/blog-tags
    public function listTags(Request $request, Response $response): Response
    {
        try {
            $tags = $this->blogRepo->getAllTags();
            return $this->json($response, ['success' => true, 'data' => $tags]);
        } catch (\Exception $e) {
            $this->logger->error('BlogController::listTags', ['error' => $e->getMessage()]);
            return $this->json($response, ['success' => false, 'error' => 'Failed to retrieve tags'], 500);
        }
    }

    // ──────────────────────────────────────────────────────────────────────

    private function json(Response $response, array $data, int $status = 200): Response
    {
        $response->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE));
        return $response->withHeader('Content-Type', 'application/json')->withStatus($status);
    }
}
