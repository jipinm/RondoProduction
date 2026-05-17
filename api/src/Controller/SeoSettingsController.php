<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Log\LoggerInterface;
use XS2EventProxy\Repository\SeoSettingsRepository;

/**
 * SEO Settings Controller
 *
 * Admin routes (require AuthMiddleware):
 *   GET  /admin/seo-settings           – list all pages with their SEO data
 *   GET  /admin/seo-settings/{id}      – get one page by ID
 *   PUT  /admin/seo-settings/{id}      – update SEO data for one page
 *
 * Public route (no auth, cached by browser):
 *   GET  /api/v1/seo-settings/{pageKey} – get SEO data for a single page key
 *   GET  /api/v1/seo-settings           – get all SEO data (for frontend bulk load)
 */
class SeoSettingsController
{
    private SeoSettingsRepository $repo;
    private LoggerInterface $logger;

    public function __construct(SeoSettingsRepository $repo, LoggerInterface $logger)
    {
        $this->repo   = $repo;
        $this->logger = $logger;
    }

    // -------------------------------------------------------------------------
    // Admin endpoints
    // -------------------------------------------------------------------------

    /**
     * GET /admin/seo-settings
     * Returns all pages with their SEO data for the admin management UI.
     */
    public function adminGetAll(Request $request, Response $response): Response
    {
        try {
            $rows = $this->repo->getAllSettings();
            return $this->json($response, ['success' => true, 'data' => $rows, 'count' => count($rows)]);
        } catch (\Exception $e) {
            $this->logger->error('SeoSettingsController::adminGetAll error', ['error' => $e->getMessage()]);
            return $this->json($response, ['success' => false, 'error' => 'Failed to retrieve SEO settings'], 500);
        }
    }

    /**
     * GET /admin/seo-settings/{id}
     * Returns the SEO data for a single page identified by its numeric ID.
     */
    public function adminGetOne(Request $request, Response $response, array $args): Response
    {
        $id = (int) ($args['id'] ?? 0);
        if ($id <= 0) {
            return $this->json($response, ['success' => false, 'error' => 'Invalid ID'], 400);
        }

        try {
            $row = $this->repo->getById($id);
            if ($row === null) {
                return $this->json($response, ['success' => false, 'error' => 'SEO settings not found'], 404);
            }
            return $this->json($response, ['success' => true, 'data' => $row]);
        } catch (\Exception $e) {
            $this->logger->error('SeoSettingsController::adminGetOne error', ['id' => $id, 'error' => $e->getMessage()]);
            return $this->json($response, ['success' => false, 'error' => 'Failed to retrieve SEO settings'], 500);
        }
    }

    /**
     * PUT /admin/seo-settings/{id}
     * Updates the SEO data for a page. Accepts JSON body with any combination of:
     *   meta_title, meta_description, meta_keywords, og_title, og_description, robots
     */
    public function adminUpdate(Request $request, Response $response, array $args): Response
    {
        $id = (int) ($args['id'] ?? 0);
        if ($id <= 0) {
            return $this->json($response, ['success' => false, 'error' => 'Invalid ID'], 400);
        }

        $body = $request->getParsedBody();
        if (empty($body) || !is_array($body)) {
            return $this->json($response, ['success' => false, 'error' => 'Request body is empty or invalid'], 400);
        }

        // Validate field lengths to prevent data truncation
        $validationErrors = $this->validateBody($body);
        if (!empty($validationErrors)) {
            return $this->json($response, ['success' => false, 'error' => implode('; ', $validationErrors)], 422);
        }

        try {
            $existing = $this->repo->getById($id);
            if ($existing === null) {
                return $this->json($response, ['success' => false, 'error' => 'SEO settings not found'], 404);
            }

            $this->repo->update($id, $body);

            $updated = $this->repo->getById($id);
            return $this->json($response, ['success' => true, 'message' => 'SEO settings updated successfully', 'data' => $updated]);
        } catch (\Exception $e) {
            $this->logger->error('SeoSettingsController::adminUpdate error', ['id' => $id, 'error' => $e->getMessage()]);
            return $this->json($response, ['success' => false, 'error' => 'Failed to update SEO settings'], 500);
        }
    }

    // -------------------------------------------------------------------------
    // Public endpoints
    // -------------------------------------------------------------------------

    /**
     * GET /api/v1/seo-settings
     * Returns all SEO settings rows for the frontend to bulk-cache on load.
     */
    public function publicGetAll(Request $request, Response $response): Response
    {
        try {
            $rows = $this->repo->getAllSettings();
            return $this->json($response, ['success' => true, 'data' => $rows]);
        } catch (\Exception $e) {
            $this->logger->error('SeoSettingsController::publicGetAll error', ['error' => $e->getMessage()]);
            return $this->json($response, ['success' => false, 'error' => 'Failed to retrieve SEO settings'], 500);
        }
    }

    /**
     * GET /api/v1/seo-settings/{pageKey}
     * Returns SEO data for a single page key (used by individual page components).
     */
    public function publicGetByKey(Request $request, Response $response, array $args): Response
    {
        $pageKey = trim($args['pageKey'] ?? '');
        if ($pageKey === '') {
            return $this->json($response, ['success' => false, 'error' => 'Page key is required'], 400);
        }

        try {
            $row = $this->repo->getByPageKey($pageKey);
            if ($row === null) {
                return $this->json($response, ['success' => false, 'error' => 'SEO settings not found for this page'], 404);
            }
            return $this->json($response, ['success' => true, 'data' => $row]);
        } catch (\Exception $e) {
            $this->logger->error('SeoSettingsController::publicGetByKey error', ['pageKey' => $pageKey, 'error' => $e->getMessage()]);
            return $this->json($response, ['success' => false, 'error' => 'Failed to retrieve SEO settings'], 500);
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private function json(Response $response, array $data, int $status = 200): Response
    {
        $response->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE));
        return $response->withHeader('Content-Type', 'application/json')->withStatus($status);
    }

    private function validateBody(array $body): array
    {
        $errors = [];
        if (isset($body['meta_title']) && mb_strlen($body['meta_title']) > 255) {
            $errors[] = 'meta_title must not exceed 255 characters';
        }
        if (isset($body['meta_keywords']) && mb_strlen($body['meta_keywords']) > 500) {
            $errors[] = 'meta_keywords must not exceed 500 characters';
        }
        if (isset($body['og_title']) && mb_strlen($body['og_title']) > 255) {
            $errors[] = 'og_title must not exceed 255 characters';
        }
        if (isset($body['robots']) && mb_strlen($body['robots']) > 100) {
            $errors[] = 'robots must not exceed 100 characters';
        }
        return $errors;
    }
}
