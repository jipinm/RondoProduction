<?php

declare(strict_types=1);

namespace XS2EventProxy\Repository;

use XS2EventProxy\Service\DatabaseService;
use Psr\Log\LoggerInterface;
use PDO;

/**
 * SEO Settings Repository
 *
 * Handles all database operations for the seo_settings table.
 */
class SeoSettingsRepository
{
    private DatabaseService $database;
    private LoggerInterface $logger;

    public function __construct(DatabaseService $database, LoggerInterface $logger)
    {
        $this->database = $database;
        $this->logger   = $logger;
    }

    /**
     * Return all SEO settings rows, ordered by page_name.
     */
    public function getAllSettings(): array
    {
        try {
            $pdo  = $this->database->getConnection();
            $stmt = $pdo->query("
                SELECT id, page_key, page_name, meta_title, meta_description,
                       meta_keywords, og_title, og_description, robots,
                       created_at, updated_at
                FROM seo_settings
                ORDER BY page_name ASC
            ");
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (\Exception $e) {
            $this->logger->error('SeoSettingsRepository::getAllSettings failed', [
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Return a single SEO settings row by its numeric ID.
     */
    public function getById(int $id): ?array
    {
        try {
            $pdo  = $this->database->getConnection();
            $stmt = $pdo->prepare("
                SELECT id, page_key, page_name, meta_title, meta_description,
                       meta_keywords, og_title, og_description, robots,
                       created_at, updated_at
                FROM seo_settings
                WHERE id = :id
            ");
            $stmt->execute([':id' => $id]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            return $row ?: null;
        } catch (\Exception $e) {
            $this->logger->error('SeoSettingsRepository::getById failed', [
                'id'    => $id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Return a single SEO settings row by its page_key.
     * Used by the public frontend endpoint.
     */
    public function getByPageKey(string $pageKey): ?array
    {
        try {
            $pdo  = $this->database->getConnection();
            $stmt = $pdo->prepare("
                SELECT id, page_key, page_name, meta_title, meta_description,
                       meta_keywords, og_title, og_description, robots,
                       created_at, updated_at
                FROM seo_settings
                WHERE page_key = :page_key
            ");
            $stmt->execute([':page_key' => $pageKey]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            return $row ?: null;
        } catch (\Exception $e) {
            $this->logger->error('SeoSettingsRepository::getByPageKey failed', [
                'page_key' => $pageKey,
                'error'    => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Update SEO fields for an existing row identified by ID.
     * Only the fields present in $data are updated.
     *
     * @param  int   $id   Row ID
     * @param  array $data Associative array of column => value pairs to update
     * @return bool        TRUE if at least one row was modified
     */
    public function update(int $id, array $data): bool
    {
        $allowed = ['meta_title', 'meta_description', 'meta_keywords', 'og_title', 'og_description', 'robots'];
        $fields  = [];
        $params  = [':id' => $id];

        foreach ($allowed as $col) {
            if (array_key_exists($col, $data)) {
                $fields[]         = "`{$col}` = :{$col}";
                $params[":{$col}"] = $data[$col] === '' ? null : $data[$col];
            }
        }

        if (empty($fields)) {
            return false;
        }

        try {
            $pdo  = $this->database->getConnection();
            $sql  = "UPDATE seo_settings SET " . implode(', ', $fields) . " WHERE id = :id";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            return $stmt->rowCount() > 0;
        } catch (\Exception $e) {
            $this->logger->error('SeoSettingsRepository::update failed', [
                'id'    => $id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }
}
