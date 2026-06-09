<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use XS2EventProxy\Service\PartnersService;
use XS2EventProxy\Exception\ValidationException;
use XS2EventProxy\Exception\ServiceException;
use Psr\Log\LoggerInterface;

/**
 * Controller for partners management operations
 */
class PartnersController
{
    private PartnersService $partnersService;
    private LoggerInterface $logger;

    public function __construct(PartnersService $partnersService, LoggerInterface $logger)
    {
        $this->partnersService = $partnersService;
        $this->logger = $logger;
    }

    /**
     * Get all partners with filtering and pagination
     * GET /admin/partners
     */
    public function getPartners(Request $request, Response $response): ResponseInterface
    {
        try {
            $queryParams = $request->getQueryParams();
            $adminUser = $request->getAttribute('user');

            // Extract pagination parameters
            $page = max(1, (int)($queryParams['page'] ?? 1));
            $limit = min(100, max(1, (int)($queryParams['per_page'] ?? 20)));

            // Extract filters
            $filters = array_intersect_key($queryParams, array_flip([
                'search', 'status'
            ]));

            $result = $this->partnersService->getAllPartners($filters, $page, $limit);

            $this->logger->info('Partners retrieved successfully', [
                'admin_user_id' => $adminUser['id'],
                'total_count' => $result['pagination']['total'],
                'filters' => $filters
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $result['data'],
                'pagination' => $result['pagination'],
                'filters_applied' => $filters
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (ServiceException $e) {
            $this->logger->error('Service error in getPartners', [
                'error' => $e->getMessage(),
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => $e->getMessage()
            ]));

            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('Unexpected error in getPartners', [
                'error' => $e->getMessage(),
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => 'An unexpected error occurred'
            ]));

            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }
    }

    /**
     * Get a single partner by ID
     * GET /admin/partners/{id}
     */
    public function getPartner(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $partnerId = (int) $args['id'];
            $adminUser = $request->getAttribute('user');

            $partner = $this->partnersService->getPartnerById($partnerId);

            if (!$partner) {
                $response->getBody()->write(json_encode([
                    'success' => false,
                    'error' => 'Partner not found'
                ]));

                return $response->withStatus(404)->withHeader('Content-Type', 'application/json');
            }

            $this->logger->info('Partner retrieved successfully', [
                'partner_id' => $partnerId,
                'admin_user_id' => $adminUser['id']
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $partner
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (ServiceException $e) {
            $this->logger->error('Service error in getPartner', [
                'error' => $e->getMessage(),
                'partner_id' => $partnerId ?? null
            ]);

            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => $e->getMessage()
            ]));

            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('Unexpected error in getPartner', [
                'error' => $e->getMessage(),
                'partner_id' => $partnerId ?? null
            ]);

            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => 'An unexpected error occurred'
            ]));

            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }
    }

    /**
     * Create a new partner
     * POST /admin/partners
     */
    public function createPartner(Request $request, Response $response): ResponseInterface
    {
        try {
            $adminUser = $request->getAttribute('user');
            $data = json_decode($request->getBody()->getContents(), true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                $response->getBody()->write(json_encode([
                    'success' => false,
                    'error' => 'Invalid JSON in request body'
                ]));

                return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
            }

            $partner = $this->partnersService->createPartner($data, $adminUser['id']);

            $this->logger->info('Partner created successfully', [
                'partner_id' => $partner['id'],
                'name' => $partner['name'],
                'admin_user_id' => $adminUser['id']
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $partner,
                'message' => 'Partner created successfully'
            ]));

            return $response->withStatus(201)->withHeader('Content-Type', 'application/json');

        } catch (ValidationException $e) {
            $this->logger->warning('Validation error in createPartner', [
                'errors' => $e->getFieldErrors(),
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => 'Validation failed',
                'field_errors' => $e->getFieldErrors()
            ]));

            return $response->withStatus(400)->withHeader('Content-Type', 'application/json');

        } catch (ServiceException $e) {
            $this->logger->error('Service error in createPartner', [
                'error' => $e->getMessage(),
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => $e->getMessage()
            ]));

            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('Unexpected error in createPartner', [
                'error' => $e->getMessage(),
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => 'An unexpected error occurred'
            ]));

            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }
    }

    /**
     * Update an existing partner
     * PUT /admin/partners/{id}
     */
    public function updatePartner(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $partnerId = (int) $args['id'];
            $adminUser = $request->getAttribute('user');
            $data = json_decode($request->getBody()->getContents(), true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                $response->getBody()->write(json_encode([
                    'success' => false,
                    'error' => 'Invalid JSON in request body'
                ]));

                return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
            }

            $partner = $this->partnersService->updatePartner($partnerId, $data, $adminUser['id']);

            $this->logger->info('Partner updated successfully', [
                'partner_id' => $partnerId,
                'name' => $partner['name'],
                'admin_user_id' => $adminUser['id']
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $partner,
                'message' => 'Partner updated successfully'
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (ValidationException $e) {
            $this->logger->warning('Validation error in updatePartner', [
                'errors' => $e->getFieldErrors(),
                'partner_id' => $partnerId ?? null,
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => 'Validation failed',
                'field_errors' => $e->getFieldErrors()
            ]));

            return $response->withStatus(400)->withHeader('Content-Type', 'application/json');

        } catch (ServiceException $e) {
            $this->logger->error('Service error in updatePartner', [
                'error' => $e->getMessage(),
                'partner_id' => $partnerId ?? null,
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => $e->getMessage()
            ]));

            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('Unexpected error in updatePartner', [
                'error' => $e->getMessage(),
                'partner_id' => $partnerId ?? null,
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => 'An unexpected error occurred'
            ]));

            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }
    }

    /**
     * Delete a partner
     * DELETE /admin/partners/{id}
     */
    public function deletePartner(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $partnerId = (int) $args['id'];
            $adminUser = $request->getAttribute('user');

            $deleted = $this->partnersService->deletePartner($partnerId);

            if ($deleted) {
                $this->logger->info('Partner deleted successfully', [
                    'partner_id' => $partnerId,
                    'admin_user_id' => $adminUser['id']
                ]);

                $response->getBody()->write(json_encode([
                    'success' => true,
                    'message' => 'Partner deleted successfully'
                ]));

                return $response->withHeader('Content-Type', 'application/json');
            } else {
                $response->getBody()->write(json_encode([
                    'success' => false,
                    'error' => 'Failed to delete partner'
                ]));

                return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
            }

        } catch (ServiceException $e) {
            $this->logger->error('Service error in deletePartner', [
                'error' => $e->getMessage(),
                'partner_id' => $partnerId ?? null,
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => $e->getMessage()
            ]));

            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('Unexpected error in deletePartner', [
                'error' => $e->getMessage(),
                'partner_id' => $partnerId ?? null,
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => 'An unexpected error occurred'
            ]));

            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }
    }

    /**
     * Upload partner logo
     * POST /admin/partners/{id}/upload-logo
     */
    public function uploadPartnerLogo(Request $request, Response $response, array $args): ResponseInterface
    {
        try {
            $partnerId = (int) $args['id'];
            $adminUser = $request->getAttribute('user');
            $uploadedFiles = $request->getUploadedFiles();

            $this->logger->info('Partner logo upload started', [
                'partner_id' => $partnerId,
                'admin_user_id' => $adminUser['id']
            ]);

            // Check if image file exists in request
            if (empty($uploadedFiles['logo'])) {
                $response->getBody()->write(json_encode([
                    'success' => false,
                    'error' => 'No logo file uploaded'
                ]));

                return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
            }

            $uploadedFile = $uploadedFiles['logo'];

            // Check for upload errors
            if ($uploadedFile->getError() !== UPLOAD_ERR_OK) {
                $errorMessages = [
                    UPLOAD_ERR_INI_SIZE => 'File exceeds upload_max_filesize directive',
                    UPLOAD_ERR_FORM_SIZE => 'File exceeds MAX_FILE_SIZE directive',
                    UPLOAD_ERR_PARTIAL => 'File was only partially uploaded',
                    UPLOAD_ERR_NO_FILE => 'No file was uploaded',
                    UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder',
                    UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
                    UPLOAD_ERR_EXTENSION => 'A PHP extension stopped the upload'
                ];
                $errorMsg = $errorMessages[$uploadedFile->getError()] ?? 'Unknown upload error';
                
                $response->getBody()->write(json_encode([
                    'success' => false,
                    'error' => 'Upload failed: ' . $errorMsg
                ]));

                return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
            }

            // Upload the logo
            $result = $this->partnersService->uploadPartnerLogo($partnerId, $uploadedFile);

            $this->logger->info('Partner logo uploaded successfully', [
                'partner_id' => $partnerId,
                'filename' => $result['filename'],
                'admin_user_id' => $adminUser['id']
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $result,
                'message' => 'Logo uploaded successfully'
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (ValidationException $e) {
            $this->logger->warning('Validation error in uploadPartnerLogo', [
                'errors' => $e->getFieldErrors(),
                'partner_id' => $partnerId ?? null,
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => 'File validation failed',
                'field_errors' => $e->getFieldErrors()
            ]));

            return $response->withStatus(400)->withHeader('Content-Type', 'application/json');

        } catch (ServiceException $e) {
            $this->logger->error('Service error in uploadPartnerLogo', [
                'error' => $e->getMessage(),
                'partner_id' => $partnerId ?? null,
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => $e->getMessage()
            ]));

            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('Unexpected error in uploadPartnerLogo', [
                'error' => $e->getMessage(),
                'partner_id' => $partnerId ?? null,
                'admin_user_id' => $adminUser['id'] ?? null
            ]);

            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => 'An unexpected error occurred'
            ]));

            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }
    }

    /**
     * Get active partners for public display (frontend endpoint)
     * GET /partners
     */
    public function getPublicPartners(Request $request, Response $response): ResponseInterface
    {
        try {
            $queryParams = $request->getQueryParams();
            $limit = min(100, max(1, (int)($queryParams['limit'] ?? 50)));

            $partners = $this->partnersService->getActivePartners($limit);

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $partners
            ]));

            return $response->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('Unexpected error in getPublicPartners', [
                'error' => $e->getMessage()
            ]);

            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => 'An unexpected error occurred'
            ]));

            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }
    }
}
