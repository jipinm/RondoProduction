<?php

declare(strict_types=1);

namespace XS2EventProxy\Service;

use Psr\Http\Message\UploadedFileInterface;
use Psr\Log\LoggerInterface;
use XS2EventProxy\Repository\PartnersRepository;
use XS2EventProxy\Exception\ValidationException;
use XS2EventProxy\Exception\ServiceException;

/**
 * Service for partners business logic and file operations
 */
class PartnersService
{
    private PartnersRepository $repository;
    private LoggerInterface $logger;
    private string $uploadPath;
    private string $baseUrl;
    
    // Supported image formats
    private array $allowedTypes = [
        'image/jpeg',
        'image/jpg', 
        'image/png', 
        'image/svg+xml',
        'image/webp',
        'image/avif'
    ];
    
    // Maximum file size: 5MB
    private int $maxFileSize = 5242880;

    public function __construct(
        PartnersRepository $repository, 
        LoggerInterface $logger,
        string $uploadPath = '/var/www/api/public/images/partners',
        string $baseUrl = 'https://apix2.redberries.ae/images/partners'
    ) {
        $this->repository = $repository;
        $this->logger = $logger;
        $this->uploadPath = $uploadPath;
        $this->baseUrl = $baseUrl;
        
        // Ensure upload directory exists
        $this->ensureUploadDirectory();
    }

    /**
     * Get all partners with filtering and pagination
     */
    public function getAllPartners(array $filters = [], int $page = 1, int $limit = 20): array
    {
        try {
            return $this->repository->findAll($filters, $page, $limit);
        } catch (\Exception $e) {
            $this->logger->error('Error in PartnersService::getAllPartners', [
                'error' => $e->getMessage(),
                'filters' => $filters
            ]);
            throw new ServiceException('Failed to retrieve partners: ' . $e->getMessage());
        }
    }

    /**
     * Get a single partner by ID
     */
    public function getPartnerById(int $id): ?array
    {
        try {
            return $this->repository->findById($id);
        } catch (\Exception $e) {
            $this->logger->error('Error in PartnersService::getPartnerById', [
                'error' => $e->getMessage(),
                'partner_id' => $id
            ]);
            throw new ServiceException('Failed to retrieve partner: ' . $e->getMessage());
        }
    }

    /**
     * Create a new partner
     */
    public function createPartner(array $data, int $createdBy): array
    {
        try {
            // Validate partner data
            $this->validatePartnerData($data);
            
            // Add audit fields
            $data['created_by'] = $createdBy;
            
            return $this->repository->create($data);
            
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            $this->logger->error('Error in PartnersService::createPartner', [
                'error' => $e->getMessage(),
                'data' => $data
            ]);
            throw new ServiceException('Failed to create partner: ' . $e->getMessage());
        }
    }

    /**
     * Update an existing partner
     */
    public function updatePartner(int $id, array $data, int $updatedBy): array
    {
        try {
            // Validate partner data
            $this->validatePartnerData($data, true);
            
            // Add audit field
            $data['updated_by'] = $updatedBy;
            
            return $this->repository->update($id, $data);
            
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            $this->logger->error('Error in PartnersService::updatePartner', [
                'error' => $e->getMessage(),
                'partner_id' => $id,
                'data' => $data
            ]);
            throw new ServiceException('Failed to update partner: ' . $e->getMessage());
        }
    }

    /**
     * Delete a partner
     */
    public function deletePartner(int $id): bool
    {
        try {
            return $this->repository->delete($id);
        } catch (\Exception $e) {
            $this->logger->error('Error in PartnersService::deletePartner', [
                'error' => $e->getMessage(),
                'partner_id' => $id
            ]);
            throw new ServiceException('Failed to delete partner: ' . $e->getMessage());
        }
    }

    /**
     * Get active partners for frontend display
     */
    public function getActivePartners(int $limit = 50): array
    {
        try {
            return $this->repository->findActive($limit);
        } catch (\Exception $e) {
            $this->logger->error('Error in PartnersService::getActivePartners', [
                'error' => $e->getMessage()
            ]);
            throw new ServiceException('Failed to retrieve active partners: ' . $e->getMessage());
        }
    }

    /**
     * Upload partner logo image
     */
    public function uploadPartnerLogo(int $partnerId, UploadedFileInterface $uploadedFile): array
    {
        try {
            // Validate file
            $this->validateUploadedFile($uploadedFile);
            
            // Generate unique filename
            $extension = pathinfo($uploadedFile->getClientFilename(), PATHINFO_EXTENSION);
            $filename = 'partner-' . $partnerId . '-' . uniqid() . '.' . $extension;
            $filepath = $this->uploadPath . '/' . $filename;
            
            // Move uploaded file
            $uploadedFile->moveTo($filepath);
            
            // Update partner with new logo URL
            $logoUrl = $this->baseUrl . '/' . $filename;
            $this->repository->update($partnerId, ['logo_url' => $logoUrl]);
            
            $this->logger->info('Partner logo uploaded successfully', [
                'partner_id' => $partnerId,
                'filename' => $filename,
                'logo_url' => $logoUrl
            ]);
            
            return [
                'filename' => $filename,
                'url' => $logoUrl
            ];
            
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            $this->logger->error('Error in PartnersService::uploadPartnerLogo', [
                'error' => $e->getMessage(),
                'partner_id' => $partnerId
            ]);
            throw new ServiceException('Failed to upload partner logo: ' . $e->getMessage());
        }
    }

    /**
     * Validate partner data
     */
    private function validatePartnerData(array $data, bool $isUpdate = false): void
    {
        $errors = [];

        // Name is required for creation
        if (!$isUpdate && (empty($data['name']) || !is_string($data['name']))) {
            $errors['name'] = 'Partner name is required';
        } elseif (isset($data['name']) && (!is_string($data['name']) || strlen($data['name']) > 255)) {
            $errors['name'] = 'Partner name must be a string with maximum 255 characters';
        }

        // Logo URL is required for creation
        if (!$isUpdate && (empty($data['logo_url']) || !is_string($data['logo_url']))) {
            $errors['logo_url'] = 'Partner logo URL is required';
        } elseif (isset($data['logo_url']) && (!is_string($data['logo_url']) || strlen($data['logo_url']) > 500)) {
            $errors['logo_url'] = 'Logo URL must be a string with maximum 500 characters';
        }

        // Link URL validation (optional)
        if (isset($data['link_url']) && !empty($data['link_url'])) {
            if (!is_string($data['link_url']) || strlen($data['link_url']) > 500) {
                $errors['link_url'] = 'Link URL must be a string with maximum 500 characters';
            }
        }

        // Link target validation
        if (isset($data['link_target']) && !in_array($data['link_target'], ['_self', '_blank'])) {
            $errors['link_target'] = 'Link target must be either "_self" or "_blank"';
        }

        // Status validation
        if (isset($data['status']) && !in_array($data['status'], ['active', 'inactive'])) {
            $errors['status'] = 'Status must be either "active" or "inactive"';
        }

        // Position order validation
        if (isset($data['position_order']) && (!is_numeric($data['position_order']) || $data['position_order'] < 0)) {
            $errors['position_order'] = 'Position order must be a non-negative number';
        }

        if (!empty($errors)) {
            throw new ValidationException('Partner validation failed', $errors);
        }
    }

    /**
     * Validate uploaded file
     */
    private function validateUploadedFile(UploadedFileInterface $file): void
    {
        $errors = [];

        // Check file size
        if ($file->getSize() > $this->maxFileSize) {
            $maxSizeMB = round($this->maxFileSize / 1048576, 2);
            $errors['file'] = "File size must not exceed {$maxSizeMB}MB";
        }

        // Check file type
        $mimeType = $file->getClientMediaType();
        if (!in_array($mimeType, $this->allowedTypes)) {
            $errors['file'] = 'Invalid file type. Allowed types: JPEG, PNG, SVG, WebP, AVIF';
        }

        if (!empty($errors)) {
            throw new ValidationException('File validation failed', $errors);
        }
    }

    /**
     * Ensure upload directory exists
     */
    private function ensureUploadDirectory(): void
    {
        if (!is_dir($this->uploadPath)) {
            mkdir($this->uploadPath, 0755, true);
            $this->logger->info('Created partners upload directory', [
                'path' => $this->uploadPath
            ]);
        }
    }
}
