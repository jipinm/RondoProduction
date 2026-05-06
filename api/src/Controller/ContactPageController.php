<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use XS2EventProxy\Repository\ContactPageRepository;
use Psr\Log\LoggerInterface;

/**
 * Contact Page Controller
 *
 * Admin endpoints:
 *   GET  /admin/contact-page            – fetch current settings
 *   PUT  /admin/contact-page            – update text/link settings
 *   POST /admin/contact-page/banner     – upload banner image
 *
 * Public endpoint:
 *   GET  /api/v1/contact-page           – fetch settings for the frontend
 */
class ContactPageController
{
    private ContactPageRepository $repo;
    private LoggerInterface $logger;
    private string $uploadPath;
    private string $baseUrl;

    private array $allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/avif',
    ];

    private int $maxFileSize = 5242880; // 5 MB

    public function __construct(
        ContactPageRepository $repo,
        LoggerInterface $logger,
        string $uploadPath = '',
        string $baseUrl = ''
    ) {
        $this->repo       = $repo;
        $this->logger     = $logger;
        $this->uploadPath = rtrim($uploadPath, '/');
        $this->baseUrl    = rtrim($baseUrl, '/');

        if ($this->uploadPath && !is_dir($this->uploadPath)) {
            mkdir($this->uploadPath, 0755, true);
        }
    }

    // -------------------------------------------------------------------------
    // Admin endpoints
    // -------------------------------------------------------------------------

    /**
     * GET /admin/contact-page
     */
    public function getSettings(Request $request, Response $response): Response
    {
        try {
            $settings = $this->repo->getSettings();

            return $this->json($response, [
                'success' => true,
                'data'    => $settings,
            ]);
        } catch (\Exception $e) {
            $this->logger->error('ContactPageController::getSettings failed', [
                'error' => $e->getMessage(),
            ]);

            return $this->json($response, [
                'success' => false,
                'error'   => 'Failed to retrieve contact page settings',
            ], 500);
        }
    }

    /**
     * PUT /admin/contact-page
     */
    public function updateSettings(Request $request, Response $response): Response
    {
        try {
            $body = (array) ($request->getParsedBody() ?? []);

            if (empty($body)) {
                return $this->json($response, [
                    'success' => false,
                    'error'   => 'Request body is empty',
                ], 400);
            }

            $updated = $this->repo->updateSettings($body);

            $this->logger->info('Contact page settings updated');

            return $this->json($response, [
                'success' => true,
                'data'    => $updated,
                'message' => 'Contact page settings updated successfully',
            ]);
        } catch (\Exception $e) {
            $this->logger->error('ContactPageController::updateSettings failed', [
                'error' => $e->getMessage(),
            ]);

            return $this->json($response, [
                'success' => false,
                'error'   => 'Failed to update contact page settings',
            ], 500);
        }
    }

    // -------------------------------------------------------------------------
    // Public endpoint
    // -------------------------------------------------------------------------

    /**
     * POST /admin/contact-page/banner
     * Expects multipart/form-data with field name "banner".
     */
    public function uploadBanner(Request $request, Response $response): Response
    {
        try {
            if (empty($this->uploadPath)) {
                return $this->json($response, [
                    'success' => false,
                    'error'   => 'Upload path not configured',
                ], 500);
            }

            $uploadedFiles = $request->getUploadedFiles();

            if (empty($uploadedFiles['banner'])) {
                return $this->json($response, [
                    'success' => false,
                    'error'   => 'No banner file provided (field name: banner)',
                ], 400);
            }

            $file = $uploadedFiles['banner'];

            if ($file->getError() !== UPLOAD_ERR_OK) {
                return $this->json($response, [
                    'success' => false,
                    'error'   => 'Upload error code: ' . $file->getError(),
                ], 400);
            }

            $mediaType = $file->getClientMediaType();
            if (!in_array($mediaType, $this->allowedTypes, true)) {
                return $this->json($response, [
                    'success' => false,
                    'error'   => 'Invalid file type. Allowed: JPEG, PNG, WebP, AVIF',
                ], 400);
            }

            if ($file->getSize() > $this->maxFileSize) {
                return $this->json($response, [
                    'success' => false,
                    'error'   => 'File exceeds 5 MB limit',
                ], 400);
            }

            $ext      = strtolower(pathinfo((string) $file->getClientFilename(), PATHINFO_EXTENSION));
            $filename = 'contact-banner-' . time() . '.' . $ext;
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

            // Delete old banner if it was managed by us
            $existing = $this->repo->getSettings();
            if ($existing && !empty($existing['banner_image_url'])) {
                $oldFile = basename($existing['banner_image_url']);
                $oldPath = $this->uploadPath . '/' . $oldFile;
                if (file_exists($oldPath) && str_starts_with($oldFile, 'contact-banner-')) {
                    @unlink($oldPath);
                }
            }

            $bannerUrl = $this->baseUrl . '/images/contact/' . $filename;
            $this->repo->updateSettings(['banner_image_url' => $bannerUrl]);

            $this->logger->info('Contact page banner uploaded', ['url' => $bannerUrl]);

            return $this->json($response, [
                'success' => true,
                'data'    => ['banner_image_url' => $bannerUrl],
                'message' => 'Banner uploaded successfully',
            ]);
        } catch (\Exception $e) {
            $this->logger->error('ContactPageController::uploadBanner failed', [
                'error' => $e->getMessage(),
            ]);

            return $this->json($response, [
                'success' => false,
                'error'   => 'Failed to upload banner',
            ], 500);
        }
    }

    /**
     * GET /api/v1/contact-page
     */
    public function getPublicSettings(Request $request, Response $response): Response
    {
        try {
            $settings = $this->repo->getSettings();

            return $this->json($response, [
                'success' => true,
                'data'    => $settings,
            ]);
        } catch (\Exception $e) {
            $this->logger->error('ContactPageController::getPublicSettings failed', [
                'error' => $e->getMessage(),
            ]);

            return $this->json($response, [
                'success' => false,
                'error'   => 'Failed to retrieve contact page settings',
            ], 500);
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private function json(Response $response, array $data, int $status = 200): Response
    {
        $response->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus($status);
    }
}
