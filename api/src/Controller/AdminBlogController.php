<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use XS2EventProxy\Repository\BlogRepository;
use Psr\Log\LoggerInterface;

/**
 * AdminBlogController – admin CRUD for blogs, categories, tags.
 */
class AdminBlogController
{
    private BlogRepository $blogRepo;
    private LoggerInterface $logger;
    private string $uploadPath;
    private string $baseUrl;

    private array $allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/svg+xml',
        'image/webp',
        'image/avif',
    ];

    private int $maxFileSize = 10485760; // 10 MB

    public function __construct(
        BlogRepository $blogRepo,
        LoggerInterface $logger,
        string $uploadPath = '',
        string $baseUrl = ''
    ) {
        $this->blogRepo   = $blogRepo;
        $this->logger     = $logger;
        $this->uploadPath = rtrim($uploadPath, '/');
        $this->baseUrl    = rtrim($baseUrl, '/');

        if ($this->uploadPath && !is_dir($this->uploadPath)) {
            mkdir($this->uploadPath, 0755, true);
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // BLOG CRUD
    // ──────────────────────────────────────────────────────────────────────

    // GET /admin/blogs
    public function listBlogs(Request $request, Response $response): Response
    {
        try {
            $params  = $request->getQueryParams();
            $page    = max(1, (int) ($params['page'] ?? 1));
            $limit   = min(100, max(1, (int) ($params['limit'] ?? 20)));
            $search  = trim($params['search'] ?? '');
            $status  = trim($params['status'] ?? '');
            $sortBy  = $params['sort_by'] ?? 'publish_date';
            $sortDir = $params['sort_dir'] ?? 'DESC';

            $result = $this->blogRepo->adminGetBlogs($page, $limit, $search, $status, $sortBy, $sortDir);

            return $this->json($response, ['success' => true] + $result);
        } catch (\Exception $e) {
            $this->logger->error('AdminBlogController::listBlogs', ['error' => $e->getMessage()]);
            return $this->json($response, ['success' => false, 'error' => 'Failed to retrieve blogs'], 500);
        }
    }

    // GET /admin/blogs/{id}
    public function getBlog(Request $request, Response $response, array $args): Response
    {
        try {
            $blog = $this->blogRepo->adminGetBlogById((int) $args['id']);
            if (!$blog) {
                return $this->json($response, ['success' => false, 'error' => 'Blog not found'], 404);
            }
            return $this->json($response, ['success' => true, 'data' => $blog]);
        } catch (\Exception $e) {
            $this->logger->error('AdminBlogController::getBlog', ['error' => $e->getMessage()]);
            return $this->json($response, ['success' => false, 'error' => 'Failed to retrieve blog'], 500);
        }
    }

    // POST /admin/blogs
    public function createBlog(Request $request, Response $response): Response
    {
        try {
            $body = (array) $request->getParsedBody();
            $errors = $this->validateBlogData($body);
            if (!empty($errors)) {
                return $this->json($response, ['success' => false, 'errors' => $errors], 422);
            }

            $newId = $this->blogRepo->adminCreateBlog($body);
            $blog  = $this->blogRepo->adminGetBlogById($newId);

            return $this->json($response, ['success' => true, 'data' => $blog], 201);
        } catch (\Exception $e) {
            $this->logger->error('AdminBlogController::createBlog', ['error' => $e->getMessage()]);
            return $this->json($response, ['success' => false, 'error' => 'Failed to create blog'], 500);
        }
    }

    // PUT /admin/blogs/{id}
    public function updateBlog(Request $request, Response $response, array $args): Response
    {
        try {
            $id   = (int) $args['id'];
            $body = (array) $request->getParsedBody();

            if (!$this->blogRepo->adminGetBlogById($id)) {
                return $this->json($response, ['success' => false, 'error' => 'Blog not found'], 404);
            }

            $errors = $this->validateBlogData($body);
            if (!empty($errors)) {
                return $this->json($response, ['success' => false, 'errors' => $errors], 422);
            }

            $this->blogRepo->adminUpdateBlog($id, $body);
            $blog = $this->blogRepo->adminGetBlogById($id);

            return $this->json($response, ['success' => true, 'data' => $blog]);
        } catch (\Exception $e) {
            $this->logger->error('AdminBlogController::updateBlog', ['error' => $e->getMessage()]);
            return $this->json($response, ['success' => false, 'error' => 'Failed to update blog'], 500);
        }
    }

    // DELETE /admin/blogs/{id}
    public function deleteBlog(Request $request, Response $response, array $args): Response
    {
        try {
            $id = (int) $args['id'];
            if (!$this->blogRepo->adminGetBlogById($id)) {
                return $this->json($response, ['success' => false, 'error' => 'Blog not found'], 404);
            }
            $this->blogRepo->adminDeleteBlog($id);
            return $this->json($response, ['success' => true, 'message' => 'Blog deleted']);
        } catch (\Exception $e) {
            $this->logger->error('AdminBlogController::deleteBlog', ['error' => $e->getMessage()]);
            return $this->json($response, ['success' => false, 'error' => 'Failed to delete blog'], 500);
        }
    }

    // POST /admin/blogs/{id}/upload-image
    public function uploadFeaturedImage(Request $request, Response $response, array $args): Response
    {
        try {
            $id = (int) $args['id'];
            if (!$this->blogRepo->adminGetBlogById($id)) {
                return $this->json($response, ['success' => false, 'error' => 'Blog not found'], 404);
            }

            if (empty($this->uploadPath)) {
                return $this->json($response, ['success' => false, 'error' => 'Upload path not configured'], 500);
            }

            $uploadedFiles = $request->getUploadedFiles();
            if (empty($uploadedFiles['image'])) {
                return $this->json($response, ['success' => false, 'error' => 'No image file provided (field: image)'], 400);
            }

            $file = $uploadedFiles['image'];

            if ($file->getError() !== UPLOAD_ERR_OK) {
                return $this->json($response, ['success' => false, 'error' => 'Upload error: ' . $file->getError()], 400);
            }

            $mediaType = $file->getClientMediaType();
            if (!in_array($mediaType, $this->allowedTypes, true)) {
                return $this->json($response, ['success' => false, 'error' => 'Invalid file type. Allowed: JPEG, PNG, SVG, WebP, AVIF'], 400);
            }

            if ($file->getSize() > $this->maxFileSize) {
                return $this->json($response, ['success' => false, 'error' => 'File exceeds 10 MB limit'], 400);
            }

            $ext      = strtolower(pathinfo((string) $file->getClientFilename(), PATHINFO_EXTENSION));
            $filename = 'blog-' . $id . '-' . time() . '.' . $ext;
            $target   = $this->uploadPath . '/' . $filename;

            try {
                $file->moveTo($target);
            } catch (\Exception $e) {
                $stream = $file->getStream();
                $stream->rewind();
                if (file_put_contents($target, $stream->getContents()) === false) {
                    throw new \RuntimeException('Failed to write uploaded file');
                }
            }

            // Delete old image if managed by this module
            $existing = $this->blogRepo->adminGetBlogById($id);
            if (!empty($existing['featured_image'])) {
                $oldFile = basename($existing['featured_image']);
                $oldPath = $this->uploadPath . '/' . $oldFile;
                if (file_exists($oldPath) && str_starts_with($oldFile, 'blog-')) {
                    @unlink($oldPath);
                }
            }

            $imageUrl = $this->baseUrl . '/images/blog/' . $filename;
            $this->blogRepo->adminUpdateFeaturedImage($id, $imageUrl);

            return $this->json($response, ['success' => true, 'data' => ['featured_image' => $imageUrl]]);
        } catch (\Exception $e) {
            $this->logger->error('AdminBlogController::uploadFeaturedImage', ['error' => $e->getMessage()]);
            return $this->json($response, ['success' => false, 'error' => 'Failed to upload image'], 500);
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // CATEGORY CRUD
    // ──────────────────────────────────────────────────────────────────────

    // GET /admin/blog-categories
    public function listCategories(Request $request, Response $response): Response
    {
        try {
            $categories = $this->blogRepo->getAllCategories();
            return $this->json($response, ['success' => true, 'data' => $categories]);
        } catch (\Exception $e) {
            $this->logger->error('AdminBlogController::listCategories', ['error' => $e->getMessage()]);
            return $this->json($response, ['success' => false, 'error' => 'Failed to retrieve categories'], 500);
        }
    }

    // GET /admin/blog-categories/{id}
    public function getCategory(Request $request, Response $response, array $args): Response
    {
        try {
            $cat = $this->blogRepo->adminGetCategoryById((int) $args['id']);
            if (!$cat) return $this->json($response, ['success' => false, 'error' => 'Category not found'], 404);
            return $this->json($response, ['success' => true, 'data' => $cat]);
        } catch (\Exception $e) {
            $this->logger->error('AdminBlogController::getCategory', ['error' => $e->getMessage()]);
            return $this->json($response, ['success' => false, 'error' => 'Failed to retrieve category'], 500);
        }
    }

    // POST /admin/blog-categories
    public function createCategory(Request $request, Response $response): Response
    {
        try {
            $body = (array) $request->getParsedBody();
            if (empty($body['name'])) {
                return $this->json($response, ['success' => false, 'error' => 'Name is required'], 422);
            }
            if (empty($body['slug'])) {
                $body['slug'] = $this->slugify($body['name']);
            }
            $newId = $this->blogRepo->adminCreateCategory($body);
            $cat   = $this->blogRepo->adminGetCategoryById($newId);
            return $this->json($response, ['success' => true, 'data' => $cat], 201);
        } catch (\Exception $e) {
            $this->logger->error('AdminBlogController::createCategory', ['error' => $e->getMessage()]);
            return $this->json($response, ['success' => false, 'error' => 'Failed to create category'], 500);
        }
    }

    // PUT /admin/blog-categories/{id}
    public function updateCategory(Request $request, Response $response, array $args): Response
    {
        try {
            $id   = (int) $args['id'];
            $body = (array) $request->getParsedBody();
            if (empty($body['name'])) {
                return $this->json($response, ['success' => false, 'error' => 'Name is required'], 422);
            }
            if (empty($body['slug'])) {
                $body['slug'] = $this->slugify($body['name']);
            }
            if (!$this->blogRepo->adminGetCategoryById($id)) {
                return $this->json($response, ['success' => false, 'error' => 'Category not found'], 404);
            }
            $this->blogRepo->adminUpdateCategory($id, $body);
            return $this->json($response, ['success' => true, 'data' => $this->blogRepo->adminGetCategoryById($id)]);
        } catch (\Exception $e) {
            $this->logger->error('AdminBlogController::updateCategory', ['error' => $e->getMessage()]);
            return $this->json($response, ['success' => false, 'error' => 'Failed to update category'], 500);
        }
    }

    // DELETE /admin/blog-categories/{id}
    public function deleteCategory(Request $request, Response $response, array $args): Response
    {
        try {
            $id = (int) $args['id'];
            if (!$this->blogRepo->adminGetCategoryById($id)) {
                return $this->json($response, ['success' => false, 'error' => 'Category not found'], 404);
            }
            $this->blogRepo->adminDeleteCategory($id);
            return $this->json($response, ['success' => true, 'message' => 'Category deleted']);
        } catch (\Exception $e) {
            $this->logger->error('AdminBlogController::deleteCategory', ['error' => $e->getMessage()]);
            return $this->json($response, ['success' => false, 'error' => 'Failed to delete category'], 500);
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // TAG CRUD
    // ──────────────────────────────────────────────────────────────────────

    // GET /admin/blog-tags
    public function listTags(Request $request, Response $response): Response
    {
        try {
            $tags = $this->blogRepo->getAllTags();
            return $this->json($response, ['success' => true, 'data' => $tags]);
        } catch (\Exception $e) {
            $this->logger->error('AdminBlogController::listTags', ['error' => $e->getMessage()]);
            return $this->json($response, ['success' => false, 'error' => 'Failed to retrieve tags'], 500);
        }
    }

    // GET /admin/blog-tags/{id}
    public function getTag(Request $request, Response $response, array $args): Response
    {
        try {
            $tag = $this->blogRepo->adminGetTagById((int) $args['id']);
            if (!$tag) return $this->json($response, ['success' => false, 'error' => 'Tag not found'], 404);
            return $this->json($response, ['success' => true, 'data' => $tag]);
        } catch (\Exception $e) {
            $this->logger->error('AdminBlogController::getTag', ['error' => $e->getMessage()]);
            return $this->json($response, ['success' => false, 'error' => 'Failed to retrieve tag'], 500);
        }
    }

    // POST /admin/blog-tags
    public function createTag(Request $request, Response $response): Response
    {
        try {
            $body = (array) $request->getParsedBody();
            if (empty($body['name'])) {
                return $this->json($response, ['success' => false, 'error' => 'Name is required'], 422);
            }
            if (empty($body['slug'])) {
                $body['slug'] = $this->slugify($body['name']);
            }
            $newId = $this->blogRepo->adminCreateTag($body);
            $tag   = $this->blogRepo->adminGetTagById($newId);
            return $this->json($response, ['success' => true, 'data' => $tag], 201);
        } catch (\Exception $e) {
            $this->logger->error('AdminBlogController::createTag', ['error' => $e->getMessage()]);
            return $this->json($response, ['success' => false, 'error' => 'Failed to create tag'], 500);
        }
    }

    // PUT /admin/blog-tags/{id}
    public function updateTag(Request $request, Response $response, array $args): Response
    {
        try {
            $id   = (int) $args['id'];
            $body = (array) $request->getParsedBody();
            if (empty($body['name'])) {
                return $this->json($response, ['success' => false, 'error' => 'Name is required'], 422);
            }
            if (empty($body['slug'])) {
                $body['slug'] = $this->slugify($body['name']);
            }
            if (!$this->blogRepo->adminGetTagById($id)) {
                return $this->json($response, ['success' => false, 'error' => 'Tag not found'], 404);
            }
            $this->blogRepo->adminUpdateTag($id, $body);
            return $this->json($response, ['success' => true, 'data' => $this->blogRepo->adminGetTagById($id)]);
        } catch (\Exception $e) {
            $this->logger->error('AdminBlogController::updateTag', ['error' => $e->getMessage()]);
            return $this->json($response, ['success' => false, 'error' => 'Failed to update tag'], 500);
        }
    }

    // DELETE /admin/blog-tags/{id}
    public function deleteTag(Request $request, Response $response, array $args): Response
    {
        try {
            $id = (int) $args['id'];
            if (!$this->blogRepo->adminGetTagById($id)) {
                return $this->json($response, ['success' => false, 'error' => 'Tag not found'], 404);
            }
            $this->blogRepo->adminDeleteTag($id);
            return $this->json($response, ['success' => true, 'message' => 'Tag deleted']);
        } catch (\Exception $e) {
            $this->logger->error('AdminBlogController::deleteTag', ['error' => $e->getMessage()]);
            return $this->json($response, ['success' => false, 'error' => 'Failed to delete tag'], 500);
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // HELPERS
    // ──────────────────────────────────────────────────────────────────────

    private function validateBlogData(array $data): array
    {
        $errors = [];
        if (empty($data['title'])) $errors[] = 'Title is required';
        if (empty($data['slug']))  $errors[] = 'Slug is required';
        if (!empty($data['status']) && !in_array($data['status'], ['draft', 'published'])) {
            $errors[] = 'Status must be draft or published';
        }
        return $errors;
    }

    private function slugify(string $text): string
    {
        $text = strtolower(trim($text));
        $text = preg_replace('/[^a-z0-9\s-]/', '', $text);
        $text = preg_replace('/[\s-]+/', '-', $text);
        return trim($text, '-');
    }

    private function json(Response $response, array $data, int $status = 200): Response
    {
        $response->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE));
        return $response->withHeader('Content-Type', 'application/json')->withStatus($status);
    }
}
