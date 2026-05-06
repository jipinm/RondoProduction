<?php

declare(strict_types=1);

namespace XS2EventProxy\Repository;

use PDO;
use PDOException;
use Psr\Log\LoggerInterface;
use XS2EventProxy\Exception\DatabaseException;

/**
 * Repository for system_settings table operations.
 * Used by DisplaySettingsController (and can be extended for other settings).
 */
class SystemSettingsRepository
{
    private PDO $pdo;
    private LoggerInterface $logger;

    public function __construct(PDO $pdo, LoggerInterface $logger)
    {
        $this->pdo = $pdo;
        $this->logger = $logger;
    }

    /**
     * Get a single setting by its key.
     * Returns null if the key does not exist.
     */
    public function getByKey(string $key): ?array
    {
        try {
            $stmt = $this->pdo->prepare(
                "SELECT * FROM system_settings WHERE setting_key = :key LIMIT 1"
            );
            $stmt->bindValue(':key', $key);
            $stmt->execute();

            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            return $row ?: null;
        } catch (PDOException $e) {
            $this->logger->error('SystemSettingsRepository::getByKey failed', [
                'key'   => $key,
                'error' => $e->getMessage(),
            ]);
            throw new DatabaseException('Failed to fetch setting: ' . $e->getMessage(), 0, $e);
        }
    }

    /**
     * Get all settings belonging to a category.
     * Optionally restrict to public-only settings.
     */
    public function getByCategory(string $category, bool $publicOnly = false): array
    {
        try {
            $sql = "SELECT * FROM system_settings WHERE category = :category";
            if ($publicOnly) {
                $sql .= " AND is_public = 1";
            }
            $sql .= " ORDER BY setting_key ASC";

            $stmt = $this->pdo->prepare($sql);
            $stmt->bindValue(':category', $category);
            $stmt->execute();

            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            $this->logger->error('SystemSettingsRepository::getByCategory failed', [
                'category'   => $category,
                'publicOnly' => $publicOnly,
                'error'      => $e->getMessage(),
            ]);
            throw new DatabaseException('Failed to fetch settings by category: ' . $e->getMessage(), 0, $e);
        }
    }

    /**
     * Insert or update a setting row identified by setting_key.
     * Preserves all other columns (type, category, description, is_public,
     * default_value) if the row already exists — only setting_value and
     * updated_by are changed on duplicate key.
     *
     * @param string   $key         Unique setting key
     * @param string   $value       Serialised value (use JSON for complex types)
     * @param string   $type        One of: string|number|boolean|json|encrypted
     * @param string   $category    Category bucket (e.g. 'display')
     * @param string   $description Human-readable description
     * @param bool     $isPublic    Expose to frontend public API
     * @param string   $defaultVal  Default value string
     * @param int|null $updatedBy   Admin user ID performing the update
     */
    public function upsert(
        string $key,
        string $value,
        string $type = 'json',
        string $category = 'display',
        string $description = '',
        bool $isPublic = true,
        string $defaultVal = '',
        ?int $updatedBy = null
    ): bool {
        try {
            $sql = "
                INSERT INTO system_settings
                    (setting_key, setting_value, setting_type, category, description,
                     is_public, default_value, updated_by, created_at, updated_at)
                VALUES
                    (:key, :value, :type, :category, :description,
                     :is_public, :default_val, :updated_by, NOW(), NOW())
                ON DUPLICATE KEY UPDATE
                    setting_value = VALUES(setting_value),
                    updated_by    = VALUES(updated_by),
                    updated_at    = NOW()
            ";

            $stmt = $this->pdo->prepare($sql);
            $stmt->bindValue(':key',         $key);
            $stmt->bindValue(':value',       $value);
            $stmt->bindValue(':type',        $type);
            $stmt->bindValue(':category',    $category);
            $stmt->bindValue(':description', $description);
            $stmt->bindValue(':is_public',   (int) $isPublic, PDO::PARAM_INT);
            $stmt->bindValue(':default_val', $defaultVal);
            $stmt->bindValue(':updated_by',  $updatedBy, PDO::PARAM_INT);

            return $stmt->execute();
        } catch (PDOException $e) {
            $this->logger->error('SystemSettingsRepository::upsert failed', [
                'key'   => $key,
                'error' => $e->getMessage(),
            ]);
            throw new DatabaseException('Failed to upsert setting: ' . $e->getMessage(), 0, $e);
        }
    }
}
