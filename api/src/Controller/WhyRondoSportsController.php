<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use XS2EventProxy\Repository\WhyRondoSportsRepository;
use Psr\Log\LoggerInterface;

/**
 * Controller for Why Rondo Sports operations
 */
class WhyRondoSportsController
{
    private WhyRondoSportsRepository $repository;
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

    private int $maxFileSize = 5242880; // 5MB

    public function __construct(
        WhyRondoSportsRepository $repository,
        LoggerInterface $logger,
        string $uploadPath = '/var/www/api/public/images/why-rondo',
        string $baseUrl = ''
    ) {
        $this->repository = $repository;
        $this->logger = $logger;
        $this->uploadPath = $uploadPath;
        $this->baseUrl = rtrim($baseUrl, '/');

        if (!is_dir($this->uploadPath)) {
            mkdir($this->uploadPath, 0755, true);
        }
    }

    /**
     * Get all active Why Rondo Sports items (Public)
     */
    public function getPublicItems(Request $request, Response $response): Response
    {
        try {
            $items = $this->repository->findAll(true);
            
            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $items
            ]));
            return $response->withHeader('Content-Type', 'application/json');
        } catch (\Exception $e) {
            $this->logger->error('Error fetching public Why Rondo Sports items: ' . $e->getMessage());
            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => 'Failed to fetch items'
            ]));
            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }
    }

    /**
     * Get all Why Rondo Sports items (Admin)
     */
    public function getAdminItems(Request $request, Response $response): Response
    {
        try {
            $items = $this->repository->findAll(false);
            
            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $items
            ]));
            return $response->withHeader('Content-Type', 'application/json');
        } catch (\Exception $e) {
            $this->logger->error('Error fetching admin Why Rondo Sports items: ' . $e->getMessage());
            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => 'Failed to fetch items'
            ]));
            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }
    }

    /**
     * Create a new item (Admin)
     * icon_url is optional here — upload via uploadIcon after creation
     */
    public function createItem(Request $request, Response $response): Response
    {
        try {
            $data = $request->getParsedBody();
            $adminUser = $request->getAttribute('user');

            if (empty($data['title']) || empty($data['description'])) {
                $response->getBody()->write(json_encode([
                    'success' => false,
                    'error' => 'Title and description are required'
                ]));
                return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
            }

            $data['icon_url'] = $data['icon_url'] ?? '';
            $data['created_by'] = $adminUser['id'];
            $id = $this->repository->create($data);

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => ['id' => $id]
            ]));
            return $response->withStatus(201)->withHeader('Content-Type', 'application/json');
        } catch (\Exception $e) {
            $this->logger->error('Error creating Why Rondo Sports item: ' . $e->getMessage());
            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => 'Failed to create item'
            ]));
            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }
    }

    /**
     * Update an item (Admin)
     */
    public function updateItem(Request $request, Response $response, array $args): Response
    {
        try {
            $id = (int)$args['id'];
            $data = $request->getParsedBody();
            $adminUser = $request->getAttribute('user');
            
            $existing = $this->repository->findById($id);
            if (!$existing) {
                $response->getBody()->write(json_encode([
                    'success' => false,
                    'error' => 'Item not found'
                ]));
                return $response->withStatus(404)->withHeader('Content-Type', 'application/json');
            }

            $data['updated_by'] = $adminUser['id'];
            $this->repository->update($id, $data);
            
            $response->getBody()->write(json_encode([
                'success' => true,
                'message' => 'Item updated successfully'
            ]));
            return $response->withHeader('Content-Type', 'application/json');
        } catch (\Exception $e) {
            $this->logger->error('Error updating Why Rondo Sports item: ' . $e->getMessage());
            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => 'Failed to update item'
            ]));
            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }
    }

    /**
     * Upload icon image for an item (Admin)
     * POST /admin/why-rondo-sports/{id}/upload-icon
     */
    public function uploadIcon(Request $request, Response $response, array $args): Response
    {
        $id = (int)$args['id'];
        try {
            $existing = $this->repository->findById($id);
            if (!$existing) {
                $response->getBody()->write(json_encode(['success' => false, 'error' => 'Item not found']));
                return $response->withStatus(404)->withHeader('Content-Type', 'application/json');
            }

            $uploadedFiles = $request->getUploadedFiles();
            if (empty($uploadedFiles['icon'])) {
                $response->getBody()->write(json_encode(['success' => false, 'error' => 'No icon file provided']));
                return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
            }

            $file = $uploadedFiles['icon'];

            if ($file->getError() !== UPLOAD_ERR_OK) {
                $response->getBody()->write(json_encode(['success' => false, 'error' => 'Upload error: ' . $file->getError()]));
                return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
            }

            $mediaType = $file->getClientMediaType();
            if (!in_array($mediaType, $this->allowedTypes, true)) {
                $response->getBody()->write(json_encode(['success' => false, 'error' => 'Invalid file type. Allowed: JPEG, PNG, SVG, WebP, AVIF']));
                return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
            }

            if ($file->getSize() > $this->maxFileSize) {
                $response->getBody()->write(json_encode(['success' => false, 'error' => 'File exceeds 5MB limit']));
                return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
            }

            $ext = pathinfo((string)$file->getClientFilename(), PATHINFO_EXTENSION);
            $filename = 'why-rondo-' . $id . '-' . time() . '.' . strtolower($ext);
            $targetPath = $this->uploadPath . '/' . $filename;

            try {
                $file->moveTo($targetPath);
            } catch (\Exception $e) {
                $stream = $file->getStream();
                $stream->rewind();
                if (file_put_contents($targetPath, $stream->getContents()) === false) {
                    throw new \RuntimeException('Failed to write uploaded file');
                }
            }

            // Delete old icon file if it exists and was managed by us
            if (!empty($existing['icon_url'])) {
                $oldFilename = basename($existing['icon_url']);
                $oldPath = $this->uploadPath . '/' . $oldFilename;
                if (file_exists($oldPath) && str_starts_with($oldFilename, 'why-rondo-')) {
                    @unlink($oldPath);
                }
            }

            $iconUrl = $this->baseUrl . '/images/why-rondo/' . $filename;
            $adminUser = $request->getAttribute('user');
            $this->repository->update($id, [
                'icon_url' => $iconUrl,
                'updated_by' => $adminUser['id']
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => ['icon_url' => $iconUrl]
            ]));
            return $response->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('Error uploading Why Rondo Sports icon: ' . $e->getMessage());
            $response->getBody()->write(json_encode(['success' => false, 'error' => 'Failed to upload icon']));
            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }
    }

    /**
     * Delete an item (Admin)
     */
    public function deleteItem(Request $request, Response $response, array $args): Response
    {
        try {
            $id = (int)$args['id'];
            
            $existing = $this->repository->findById($id);
            if (!$existing) {
                $response->getBody()->write(json_encode([
                    'success' => false,
                    'error' => 'Item not found'
                ]));
                return $response->withStatus(404)->withHeader('Content-Type', 'application/json');
            }

            $this->repository->delete($id);
            
            $response->getBody()->write(json_encode([
                'success' => true,
                'message' => 'Item deleted successfully'
            ]));
            return $response->withHeader('Content-Type', 'application/json');
        } catch (\Exception $e) {
            $this->logger->error('Error deleting Why Rondo Sports item: ' . $e->getMessage());
            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => 'Failed to delete item'
            ]));
            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }
    }
}
