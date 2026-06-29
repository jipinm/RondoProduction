<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Log\LoggerInterface;
use XS2EventProxy\Repository\SystemSettingsRepository;

/**
 * Site Branding Controller
 *
 * Manages the three configurable brand assets: header logo, footer logo,
 * and favicon. Images are uploaded to public/images/branding/ and their
 * public URLs are stored in system_settings.
 *
 * Admin routes (require AuthMiddleware):
 *   GET  /admin/site-branding              – get all branding URLs
 *   POST /admin/site-branding/upload/{type} – upload image (type: header_logo | footer_logo | favicon)
 *   DELETE /admin/site-branding/{type}     – remove a branding asset (reset to default)
 *
 * Public route (no auth):
 *   GET  /api/v1/site-branding             – get all branding URLs for frontend
 */
class SiteBrandingController
{
    private SystemSettingsRepository $repo;
    private LoggerInterface $logger;
    private string $uploadPath;
    private string $baseUrl;

    private const ALLOWED_TYPES = ['header_logo', 'footer_logo', 'favicon'];

    private const SETTING_KEY_MAP = [
        'header_logo' => 'site_header_logo_url',
        'footer_logo' => 'site_footer_logo_url',
        'favicon'     => 'site_favicon_url',
    ];

    private const FILE_PREFIX_MAP = [
        'header_logo' => 'header-logo-',
        'footer_logo' => 'footer-logo-',
        'favicon'     => 'favicon-',
    ];

    private array $allowedMimeTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/avif',
        'image/x-icon',
        'image/vnd.microsoft.icon',
    ];

    private int $maxFileSize = 5242880; // 5 MB

    public function __construct(
        SystemSettingsRepository $repo,
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
     * GET /admin/site-branding
     */
    public function getSettings(Request $request, Response $response): Response
    {
        try {
            $data = $this->fetchBrandingData();
            return $this->json($response, ['success' => true, 'data' => $data]);
        } catch (\Exception $e) {
            $this->logger->error('SiteBrandingController::getSettings failed', ['error' => $e->getMessage()]);
            return $this->json($response, ['success' => false, 'error' => 'Failed to retrieve branding settings'], 500);
        }
    }

    /**
     * POST /admin/site-branding/upload/{type}
     * Expects multipart/form-data with field name "image".
     */
    public function uploadImage(Request $request, Response $response, array $args): Response
    {
        $type = $args['type'] ?? '';

        if (!in_array($type, self::ALLOWED_TYPES, true)) {
            return $this->json($response, [
                'success' => false,
                'error'   => 'Invalid type. Allowed: ' . implode(', ', self::ALLOWED_TYPES),
            ], 400);
        }

        if (empty($this->uploadPath)) {
            return $this->json($response, ['success' => false, 'error' => 'Upload path not configured'], 500);
        }

        $uploadedFiles = $request->getUploadedFiles();

        if (empty($uploadedFiles['image'])) {
            return $this->json($response, [
                'success' => false,
                'error'   => 'No image file provided (field name: image)',
            ], 400);
        }

        $file = $uploadedFiles['image'];

        if ($file->getError() !== UPLOAD_ERR_OK) {
            return $this->json($response, [
                'success' => false,
                'error'   => 'Upload error code: ' . $file->getError(),
            ], 400);
        }

        $mediaType = $file->getClientMediaType();
        if (!in_array($mediaType, $this->allowedMimeTypes, true)) {
            return $this->json($response, [
                'success' => false,
                'error'   => 'Invalid file type. Allowed: JPEG, PNG, WebP, AVIF, ICO',
            ], 400);
        }

        if ($file->getSize() > $this->maxFileSize) {
            return $this->json($response, ['success' => false, 'error' => 'File exceeds 5 MB limit'], 400);
        }

        try {
            $ext      = strtolower(pathinfo((string) $file->getClientFilename(), PATHINFO_EXTENSION));
            $prefix   = self::FILE_PREFIX_MAP[$type];
            $filename = $prefix . time() . '.' . $ext;
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

            // Delete old file if it was managed by this controller
            $settingKey = self::SETTING_KEY_MAP[$type];
            $existing   = $this->repo->getByKey($settingKey);
            if ($existing && !empty($existing['setting_value'])) {
                $oldFile = basename($existing['setting_value']);
                $oldPath = $this->uploadPath . '/' . $oldFile;
                if (file_exists($oldPath) && str_starts_with($oldFile, $prefix)) {
                    @unlink($oldPath);
                }
            }

            $imageUrl = $this->baseUrl . '/images/branding/' . $filename;

            $this->repo->upsert(
                key:         $settingKey,
                value:       $imageUrl,
                type:        'string',
                category:    'branding',
                description: $existing['description'] ?? '',
                isPublic:    true,
                defaultVal:  '',
                updatedBy:   (int) ($request->getAttribute('user')['id'] ?? 0)
            );

            $this->logger->info('Site branding image uploaded', ['type' => $type, 'url' => $imageUrl]);

            return $this->json($response, [
                'success' => true,
                'data'    => [$type . '_url' => $imageUrl],
                'message' => ucfirst(str_replace('_', ' ', $type)) . ' uploaded successfully',
            ]);
        } catch (\Exception $e) {
            $this->logger->error('SiteBrandingController::uploadImage failed', [
                'type'  => $type,
                'error' => $e->getMessage(),
            ]);
            return $this->json($response, ['success' => false, 'error' => 'Failed to upload image'], 500);
        }
    }

    /**
     * DELETE /admin/site-branding/{type}
     * Removes the stored URL (reverts to default static asset).
     */
    public function deleteImage(Request $request, Response $response, array $args): Response
    {
        $type = $args['type'] ?? '';

        if (!in_array($type, self::ALLOWED_TYPES, true)) {
            return $this->json($response, [
                'success' => false,
                'error'   => 'Invalid type. Allowed: ' . implode(', ', self::ALLOWED_TYPES),
            ], 400);
        }

        try {
            $settingKey = self::SETTING_KEY_MAP[$type];
            $existing   = $this->repo->getByKey($settingKey);

            // Delete the physical file if it was managed by this controller
            if ($existing && !empty($existing['setting_value'])) {
                $prefix  = self::FILE_PREFIX_MAP[$type];
                $oldFile = basename($existing['setting_value']);
                $oldPath = $this->uploadPath . '/' . $oldFile;
                if (file_exists($oldPath) && str_starts_with($oldFile, $prefix)) {
                    @unlink($oldPath);
                }
            }

            $this->repo->upsert(
                key:         $settingKey,
                value:       '',
                type:        'string',
                category:    'branding',
                description: $existing['description'] ?? '',
                isPublic:    true,
                defaultVal:  '',
                updatedBy:   (int) ($request->getAttribute('user')['id'] ?? 0)
            );

            $this->logger->info('Site branding image removed', ['type' => $type]);

            return $this->json($response, [
                'success' => true,
                'message' => ucfirst(str_replace('_', ' ', $type)) . ' removed — default asset will be used',
            ]);
        } catch (\Exception $e) {
            $this->logger->error('SiteBrandingController::deleteImage failed', [
                'type'  => $type,
                'error' => $e->getMessage(),
            ]);
            return $this->json($response, ['success' => false, 'error' => 'Failed to remove branding asset'], 500);
        }
    }

    // -------------------------------------------------------------------------
    // Public endpoint
    // -------------------------------------------------------------------------

    /**
     * GET /api/v1/site-branding
     */
    public function getPublicSettings(Request $request, Response $response): Response
    {
        try {
            $data = $this->fetchBrandingData();
            return $this->json($response, ['success' => true, 'data' => $data]);
        } catch (\Exception $e) {
            $this->logger->error('SiteBrandingController::getPublicSettings failed', ['error' => $e->getMessage()]);
            return $this->json($response, ['success' => false, 'error' => 'Failed to retrieve branding settings'], 500);
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private function fetchBrandingData(): array
    {
        $data = [];
        foreach (self::SETTING_KEY_MAP as $type => $key) {
            $row          = $this->repo->getByKey($key);
            $data[$type . '_url'] = ($row !== null && $row['setting_value'] !== '') ? $row['setting_value'] : null;
        }
        return $data;
    }

    private function json(Response $response, array $data, int $status = 200): Response
    {
        $response->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE));
        return $response->withHeader('Content-Type', 'application/json')->withStatus($status);
    }
}
