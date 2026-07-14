<?php

declare(strict_types=1);

namespace XS2EventProxy\Service;

use Psr\Http\Message\UploadedFileInterface;
use Psr\Log\LoggerInterface;
use XS2EventProxy\Repository\BannersRepository;
use XS2EventProxy\Exception\ValidationException;
use XS2EventProxy\Exception\ServiceException;

/**
 * Service for banner business logic and file operations
 */
class BannersService
{
    private BannersRepository $repository;
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
    
    // Maximum file size: 10MB
    private int $maxFileSize = 10485760;

    public function __construct(
        BannersRepository $repository, 
        LoggerInterface $logger,
        string $uploadPath = '/var/www/api/public/images/banners',
        string $baseUrl = 'https://apix2.redberries.ae/images/banners'
    ) {
        $this->repository = $repository;
        $this->logger = $logger;
        $this->uploadPath = $uploadPath;
        $this->baseUrl = $baseUrl;
        
        // Ensure upload directory exists
        $this->ensureUploadDirectory();
    }

    /**
     * Get all banners with filtering and pagination
     */
    public function getAllBanners(array $filters = [], int $page = 1, int $limit = 20): array
    {
        try {
            $result = $this->repository->findAll($filters, $page, $limit);
            
            // Format dates for response
            if (isset($result['data']) && is_array($result['data'])) {
                foreach ($result['data'] as &$banner) {
                    $banner['event_date'] = $this->formatDateOnlyForResponse($banner['event_date']);
                }
            }
            
            return $result;
        } catch (\Exception $e) {
            $this->logger->error('Error in BannersService::getAllBanners', [
                'error' => $e->getMessage(),
                'filters' => $filters
            ]);
            throw new ServiceException('Failed to retrieve banners: ' . $e->getMessage());
        }
    }

    /**
     * Get a single banner by ID
     */
    public function getBannerById(int $id): ?array
    {
        try {
            $banner = $this->repository->findById($id);
            
            // Format dates for response
            if ($banner) {
                $banner['event_date'] = $this->formatDateOnlyForResponse($banner['event_date']);
            }
            
            return $banner;
        } catch (\Exception $e) {
            $this->logger->error('Error in BannersService::getBannerById', [
                'error' => $e->getMessage(),
                'banner_id' => $id
            ]);
            throw new ServiceException('Failed to retrieve banner: ' . $e->getMessage());
        }
    }

    /**
     * Convert UTC date from database to ISO 8601 format with UTC indicator
     * 
     * @param string|null $utcDateString Date from database in Y-m-d H:i:s format
     * @return string|null ISO 8601 format with Z suffix
     */
    private function formatDateForResponse(?string $utcDateString): ?string
    {
        if (empty($utcDateString)) {
            return null;
        }
        
        try {
            $date = new \DateTime($utcDateString, new \DateTimeZone('UTC'));
            return $date->format('Y-m-d\TH:i:s.v\Z'); // ISO 8601 with milliseconds and Z
        } catch (\Exception $e) {
            $this->logger->error('Date formatting error', [
                'date' => $utcDateString,
                'error' => $e->getMessage()
            ]);
            return $utcDateString;
        }
    }

    /**
     * Format date-only field for response (YYYY-MM-DD format)
     * 
     * @param string|null $dateString Date from database in Y-m-d format
     * @return string|null Date in YYYY-MM-DD format
     */
    private function formatDateOnlyForResponse(?string $dateString): ?string
    {
        if (empty($dateString)) {
            return null;
        }
        
        try {
            // Just return as-is if already in proper format
            $date = new \DateTime($dateString);
            return $date->format('Y-m-d');
        } catch (\Exception $e) {
            $this->logger->error('Date formatting error', [
                'date' => $dateString,
                'error' => $e->getMessage()
            ]);
            return $dateString;
        }
    }

    /**
     * Create a new banner
     */
    public function createBanner(array $data, int $createdBy): array
    {
        try {
            // Remove invalid image field if it's an empty object from frontend
            if (isset($data['image']) && (is_array($data['image']) || is_object($data['image']))) {
                unset($data['image']);
            }
            
            // Set default image URL if none provided
            if (!isset($data['image_url']) || empty($data['image_url'])) {
                $data['image_url'] = '/images/banners/placeholder.jpg';
            }
            
            // Validate banner data
            $this->validateBannerData($data);
            
            // Add audit fields
            $data['created_by'] = $createdBy;
            
            return $this->repository->create($data);
            
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            $this->logger->error('Error in BannersService::createBanner', [
                'error' => $e->getMessage(),
                'data' => $data
            ]);
            throw new ServiceException('Failed to create banner: ' . $e->getMessage());
        }
    }

    /**
     * Update an existing banner
     */
    public function updateBanner(int $id, array $data): array
    {
        try {
            // Validate banner data
            $this->validateBannerData($data, true);
            
            return $this->repository->update($id, $data);
            
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            $this->logger->error('Error in BannersService::updateBanner', [
                'error' => $e->getMessage(),
                'banner_id' => $id,
                'data' => $data
            ]);
            throw new ServiceException('Failed to update banner: ' . $e->getMessage());
        }
    }

    /**
     * Delete a banner and its associated files
     */
    public function deleteBanner(int $id): bool
    {
        try {
            // Get banner data before deletion to cleanup files
            $banner = $this->repository->findById($id);
            if (!$banner) {
                throw new ServiceException('Banner not found with ID: ' . $id);
            }

            // Delete banner from database
            $deleted = $this->repository->delete($id);
            
            if ($deleted) {
                // Cleanup associated files
                $this->cleanupBannerFiles($banner);
            }

            return $deleted;
            
        } catch (\Exception $e) {
            $this->logger->error('Error in BannersService::deleteBanner', [
                'error' => $e->getMessage(),
                'banner_id' => $id
            ]);
            throw new ServiceException('Failed to delete banner: ' . $e->getMessage());
        }
    }

    /**
     * Upload banner image (PSR-7 UploadedFile)
     * Saves the full-size file as-is, then best-effort generates a smaller
     * WebP variant for mobile_image_url. If resizing isn't possible (GD
     * unavailable, unsupported source format, or any failure), falls back
     * to reusing the same URL for both fields — the upload never fails
     * because of the resize step.
     */
    public function uploadBannerImage(int $bannerId, UploadedFileInterface $uploadedFile): array
    {
        try {
            // Get file information
            $clientFilename = $uploadedFile->getClientFilename();
            $mediaType = $uploadedFile->getClientMediaType();
            $size = $uploadedFile->getSize();

            $this->logger->info('Banner image upload started', [
                'banner_id' => $bannerId,
                'filename' => $clientFilename,
                'media_type' => $mediaType,
                'size' => $size
            ]);

            // Validate file type
            if (!in_array($mediaType, $this->allowedTypes)) {
                throw new ValidationException('Invalid file format', [
                    'file' => 'Invalid file format. Allowed formats: JPEG, JPG, PNG, SVG, WebP, AVIF'
                ]);
            }

            // Validate file size
            if ($size > $this->maxFileSize) {
                throw new ValidationException('File size exceeded', [
                    'file' => 'File size cannot exceed ' . ($this->maxFileSize / 1024 / 1024) . 'MB'
                ]);
            }

            // Fetch the current banner so its existing files can be cleaned up
            // once the new ones are confirmed saved (best-effort, see below).
            $existingBanner = $this->repository->findById($bannerId);

            // Generate unique filename
            $uniqueFilename = $this->generateUniqueFilename($clientFilename);
            $targetPath = $this->uploadPath . '/' . $uniqueFilename;

            $this->logger->info('Saving banner image', [
                'unique_filename' => $uniqueFilename,
                'target_path' => $targetPath
            ]);

            // Save file using PSR-7 moveTo method
            try {
                $uploadedFile->moveTo($targetPath);
            } catch (\Exception $moveException) {
                // Fallback: Read stream and write to file
                $this->logger->warning('moveTo() failed, using stream fallback', [
                    'error' => $moveException->getMessage()
                ]);

                $stream = $uploadedFile->getStream();
                $stream->rewind();
                $contents = $stream->getContents();

                if (file_put_contents($targetPath, $contents) === false) {
                    throw new ServiceException('Failed to save uploaded file');
                }
            }

            // Verify file was saved
            if (!file_exists($targetPath)) {
                throw new ServiceException('File saved but verification failed');
            }

            // Generate public URL
            $imageUrl = $this->baseUrl . '/' . $uniqueFilename;

            $this->logger->info('Banner image saved successfully', [
                'image_url' => $imageUrl
            ]);

            // Best-effort mobile variant: falls back to the full-size URL
            // whenever GD is unavailable or the source can't be resized.
            $mobileImageUrl = $imageUrl;
            $mobileFilename = pathinfo($uniqueFilename, PATHINFO_FILENAME) . '_mobile.webp';
            $mobileTargetPath = $this->uploadPath . '/' . $mobileFilename;

            if ($this->generateMobileVariant($targetPath, $mobileTargetPath, $mediaType)) {
                $mobileImageUrl = $this->baseUrl . '/' . $mobileFilename;
                $this->logger->info('Mobile banner variant generated', [
                    'mobile_image_url' => $mobileImageUrl
                ]);
            }

            // Update banner in database
            $updateData = [
                'image_url' => $imageUrl,
                'mobile_image_url' => $mobileImageUrl
            ];

            try {
                $updatedBanner = $this->repository->update($bannerId, $updateData);

                $this->logger->info('Banner database updated', [
                    'banner_id' => $bannerId,
                    'image_url' => $imageUrl,
                    'mobile_image_url' => $mobileImageUrl
                ]);

                // Clean up the files this upload just replaced. Best-effort:
                // the new image is already live, so a cleanup failure here
                // must not surface as an upload failure.
                if ($existingBanner) {
                    try {
                        $this->deleteFileByUrl($existingBanner['image_url'] ?? null);
                        $oldMobileUrl = $existingBanner['mobile_image_url'] ?? null;
                        if ($oldMobileUrl && basename($oldMobileUrl) !== basename($existingBanner['image_url'] ?? '')) {
                            $this->deleteFileByUrl($oldMobileUrl);
                        }
                    } catch (\Throwable $cleanupException) {
                        $this->logger->warning('Failed to clean up previous banner files after re-upload', [
                            'banner_id' => $bannerId,
                            'error' => $cleanupException->getMessage()
                        ]);
                    }
                }

                return [
                    'success' => true,
                    'filename' => $uniqueFilename,
                    'image_url' => $imageUrl,
                    'mobile_image_url' => $mobileImageUrl,
                    'banner' => $updatedBanner
                ];

            } catch (\Exception $dbException) {
                // File saved but database update failed
                $this->logger->error('File saved but database update failed', [
                    'banner_id' => $bannerId,
                    'error' => $dbException->getMessage()
                ]);

                throw new ServiceException('File saved but database update failed: ' . $dbException->getMessage());
            }

        } catch (ValidationException $e) {
            throw $e;
        } catch (ServiceException $e) {
            throw $e;
        } catch (\Throwable $e) {
            $this->logger->error('Unexpected error during banner image upload', [
                'banner_id' => $bannerId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw new ServiceException('Unexpected error during image upload: ' . $e->getMessage());
        }
    }

    /**
     * Get banners for public display by location
     */
    public function getPublicBanners(string $location, int $limit = 10): array
    {
        try {
            $banners = $this->repository->findByLocation($location, $limit);

            // Re-base image URLs against the current APP_URL so that records
            // uploaded in development (http://rondoapi.local/...) are served
            // with the correct hostname in every environment.
            foreach ($banners as &$banner) {
                $banner['image_url'] = $this->normalizeImageUrl($banner['image_url'] ?? null) ?? '';
                $banner['mobile_image_url'] = $this->normalizeImageUrl($banner['mobile_image_url'] ?? null);
            }
            unset($banner);

            return $banners;
        } catch (\Exception $e) {
            $this->logger->error('Error in BannersService::getPublicBanners', [
                'error' => $e->getMessage(),
                'location' => $location
            ]);
            throw new ServiceException('Failed to retrieve public banners: ' . $e->getMessage());
        }
    }

    /**
     * Rebase a stored image URL against the current $baseUrl so any hostname
     * baked in at upload time is replaced with the current environment's APP_URL.
     * Returns null for empty/null input; returns the original URL unchanged when
     * it does not contain the expected /images/banners/ path segment.
     */
    private function normalizeImageUrl(?string $storedUrl): ?string
    {
        if (empty($storedUrl)) {
            return null;
        }

        $path = parse_url($storedUrl, PHP_URL_PATH);
        if (!$path) {
            return $storedUrl;
        }

        $marker = '/images/banners/';
        $pos = strpos($path, $marker);
        if ($pos === false) {
            return $storedUrl; // unexpected format — leave as-is
        }

        $relativePart = substr($path, $pos + strlen($marker));

        return rtrim($this->baseUrl, '/') . '/' . $relativePart;
    }

    /**
     * Track banner click
     */
    public function trackClick(int $bannerId): bool
    {
        try {
            return $this->repository->incrementClickCount($bannerId);
        } catch (\Exception $e) {
            $this->logger->error('Error tracking banner click', [
                'error' => $e->getMessage(),
                'banner_id' => $bannerId
            ]);
            return false; // Don't throw exception for tracking failures
        }
    }

    /**
     * Track banner impression
     */
    public function trackImpression(int $bannerId): bool
    {
        try {
            return $this->repository->incrementImpressionCount($bannerId);
        } catch (\Exception $e) {
            $this->logger->error('Error tracking banner impression', [
                'error' => $e->getMessage(),
                'banner_id' => $bannerId
            ]);
            return false; // Don't throw exception for tracking failures
        }
    }

    /**
     * Update banner positions
     */
    public function updateBannerPositions(array $positions): bool
    {
        try {
            return $this->repository->updatePositions($positions);
        } catch (\Exception $e) {
            $this->logger->error('Error in BannersService::updateBannerPositions', [
                'error' => $e->getMessage(),
                'positions' => $positions
            ]);
            throw new ServiceException('Failed to update banner positions: ' . $e->getMessage());
        }
    }

    /**
     * Validate banner data
     */
    private function validateBannerData(array $data, bool $isUpdate = false): void
    {
        $errors = [];

        // Title validation
        if (!$isUpdate || isset($data['title'])) {
            if (empty($data['title'])) {
                $errors['title'] = 'Title is required';
            } elseif (strlen($data['title']) > 255) {
                $errors['title'] = 'Title cannot exceed 255 characters';
            }
        }

        // Image URL validation - only validate length if provided
        if (isset($data['image_url']) && strlen($data['image_url']) > 500) {
            $errors['image_url'] = 'Image URL cannot exceed 500 characters';
        }

        // Link URL validation
        if (isset($data['link_url']) && !empty($data['link_url'])) {
            if (strlen($data['link_url']) > 500) {
                $errors['link_url'] = 'Link URL cannot exceed 500 characters';
            }
        }

        // Link target validation
        if (isset($data['link_target']) && !in_array($data['link_target'], ['_self', '_blank'])) {
            $errors['link_target'] = 'Link target must be either "_self" or "_blank"';
        }

        // Status validation
        if (isset($data['status']) && !in_array($data['status'], ['active', 'inactive'])) {
            $errors['status'] = 'Status must be "active" or "inactive"';
        }

        // Location validation
        if (isset($data['location']) && !in_array($data['location'], ['homepage_hero', 'homepage_secondary', 'category_page', 'event_page', 'login_page'])) {
            $errors['location'] = 'Invalid location specified';
        }

        // Position order validation
        if (isset($data['position_order']) && (!is_numeric($data['position_order']) || $data['position_order'] < 0)) {
            $errors['position_order'] = 'Position order must be a non-negative number';
        }

        // Event date validation
        if (isset($data['event_date']) && !empty($data['event_date'])) {
            if (!$this->isValidDate($data['event_date'])) {
                $errors['event_date'] = 'Invalid event date format (expected: YYYY-MM-DD)';
            }
        }

        if (!empty($errors)) {
            throw new ValidationException('Validation failed', $errors);
        }
    }

    /**
     * Cleanup banner files when banner is deleted.
     * image_url and mobile_image_url may point at the same physical file
     * (legacy banners, or any banner where the mobile variant couldn't be
     * generated) or at two distinct files — both cases are handled.
     */
    private function cleanupBannerFiles(array $banner): void
    {
        try {
            $this->deleteFileByUrl($banner['image_url'] ?? null);

            $mobileUrl = $banner['mobile_image_url'] ?? null;
            if ($mobileUrl && basename($mobileUrl) !== basename($banner['image_url'] ?? '')) {
                $this->deleteFileByUrl($mobileUrl);
            }
        } catch (\Exception $e) {
            $this->logger->error('Error cleaning up banner files', [
                'error' => $e->getMessage(),
                'banner_id' => $banner['id']
            ]);
            // Don't throw exception - cleanup failure shouldn't fail the main operation
        }
    }

    /**
     * Delete a single banner file by its stored URL. No-ops for empty URLs
     * and for the shared placeholder image (createBanner()'s default),
     * since other banners may still reference it.
     */
    private function deleteFileByUrl(?string $url): void
    {
        if (empty($url)) {
            return;
        }

        $filename = basename($url);
        if ($filename === 'placeholder.jpg') {
            return;
        }

        $filePath = $this->uploadPath . '/' . $filename;
        if (file_exists($filePath)) {
            unlink($filePath);
            $this->logger->info('Deleted banner file', ['file' => $filePath]);
        }
    }

    /**
     * Ensure upload directory exists with proper permissions
     */
    private function ensureUploadDirectory(): void
    {
        if (!is_dir($this->uploadPath)) {
            if (!mkdir($this->uploadPath, 0755, true)) {
                throw new ServiceException('Failed to create upload directory: ' . $this->uploadPath);
            }
        }

        if (!is_writable($this->uploadPath)) {
            throw new ServiceException('Upload directory is not writable: ' . $this->uploadPath);
        }
    }

    /**
     * Best-effort generation of a scaled-down WebP variant for mobile display.
     * Scales to a max width of 420px preserving aspect ratio (no cropping —
     * banner locations use very different aspect ratios, see BannerForm.tsx).
     * Only jpeg/png/webp sources are supported (SVG is vector, AVIF encoding
     * isn't reliably available via GD); anything else, a missing GD
     * extension, or any failure returns false so the caller can fall back
     * to reusing the full-size URL. Never throws.
     */
    private function generateMobileVariant(string $sourcePath, string $targetPath, string $mediaType): bool
    {
        $mobileMaxWidth = 420;

        try {
            switch ($mediaType) {
                case 'image/jpeg':
                case 'image/jpg':
                    if (!function_exists('imagecreatefromjpeg')) {
                        return false;
                    }
                    $source = @imagecreatefromjpeg($sourcePath);
                    break;
                case 'image/png':
                    if (!function_exists('imagecreatefrompng')) {
                        return false;
                    }
                    $source = @imagecreatefrompng($sourcePath);
                    break;
                case 'image/webp':
                    if (!function_exists('imagecreatefromwebp')) {
                        return false;
                    }
                    $source = @imagecreatefromwebp($sourcePath);
                    break;
                default:
                    // image/svg+xml, image/avif — not rasterized here.
                    return false;
            }

            if (!$source) {
                return false;
            }

            if (!function_exists('imagewebp')) {
                imagedestroy($source);
                return false;
            }

            $sourceWidth = imagesx($source);
            $sourceHeight = imagesy($source);

            if ($sourceWidth <= $mobileMaxWidth) {
                // Already mobile-sized or smaller — no benefit to a second file.
                imagedestroy($source);
                return false;
            }

            $targetWidth = $mobileMaxWidth;
            $targetHeight = (int) round($sourceHeight * ($targetWidth / $sourceWidth));

            $resized = imagecreatetruecolor($targetWidth, $targetHeight);
            imagealphablending($resized, false);
            imagesavealpha($resized, true);
            $transparent = imagecolorallocatealpha($resized, 0, 0, 0, 127);
            imagefill($resized, 0, 0, $transparent);

            imagecopyresampled(
                $resized,
                $source,
                0,
                0,
                0,
                0,
                $targetWidth,
                $targetHeight,
                $sourceWidth,
                $sourceHeight
            );

            $success = imagewebp($resized, $targetPath, 80);

            imagedestroy($source);
            imagedestroy($resized);

            return $success && file_exists($targetPath);
        } catch (\Throwable $e) {
            $this->logger->warning('Mobile image variant generation failed, falling back to full-size URL', [
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Generate unique filename for uploaded file
     */
    private function generateUniqueFilename(string $originalName): string
    {
        $pathInfo = pathinfo($originalName);
        $extension = strtolower($pathInfo['extension'] ?? 'jpg');
        $basename = preg_replace('/[^a-zA-Z0-9_-]/', '_', $pathInfo['filename'] ?? 'banner');
        
        return $basename . '_' . uniqid() . '_' . time() . '.' . $extension;
    }

    /**
     * Validate date string (YYYY-MM-DD format)
     */
    private function isValidDate(string $date): bool
    {
        $d = \DateTime::createFromFormat('Y-m-d', $date);
        return $d && $d->format('Y-m-d') === $date;
    }
}