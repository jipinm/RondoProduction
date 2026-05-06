<?php

declare(strict_types=1);

namespace XS2EventProxy\Repository;

use XS2EventProxy\Service\DatabaseService;
use Psr\Log\LoggerInterface;
use PDO;

/**
 * Repository for Contact Page settings
 *
 * Uses a single-row pattern: the table always has exactly one record (id = 1).
 */
class ContactPageRepository
{
    private DatabaseService $database;
    private LoggerInterface $logger;

    public function __construct(DatabaseService $database, LoggerInterface $logger)
    {
        $this->database = $database;
        $this->logger = $logger;
    }

    /**
     * Return all contact-page settings (the single row).
     */
    public function getSettings(): ?array
    {
        try {
            $pdo = $this->database->getConnection();

            $stmt = $pdo->prepare(
                'SELECT * FROM contact_page_settings ORDER BY id ASC LIMIT 1'
            );
            $stmt->execute();

            $row = $stmt->fetch(PDO::FETCH_ASSOC);

            return $row ?: null;
        } catch (\Exception $e) {
            $this->logger->error('ContactPageRepository::getSettings failed', [
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Update the contact-page settings row.
     * Creates the row if it does not yet exist.
     *
     * @param array $data  Associative array of column => value pairs to update.
     */
    public function updateSettings(array $data): ?array
    {
        try {
            $pdo = $this->database->getConnection();

            // Allowed columns (whitelist to prevent injection via key names)
            $allowed = [
                'banner_image_url',
                'email_address',
                'phone_number',
                'whatsapp_number',
                'social_facebook', 'social_twitter', 'social_instagram',
                'social_linkedin', 'social_youtube',
            ];

            $filtered = array_filter(
                $data,
                fn ($key) => in_array($key, $allowed, true),
                ARRAY_FILTER_USE_KEY
            );

            if (empty($filtered)) {
                $this->logger->warning('ContactPageRepository::updateSettings – no valid fields provided');
                return $this->getSettings();
            }

            // Check whether a row exists
            $existing = $this->getSettings();

            if ($existing) {
                // UPDATE
                $setClauses = implode(', ', array_map(fn ($k) => "`{$k}` = :{$k}", array_keys($filtered)));
                $stmt = $pdo->prepare("UPDATE contact_page_settings SET {$setClauses} WHERE id = :id");
                $stmt->execute(array_merge($filtered, ['id' => $existing['id']]));
            } else {
                // INSERT (first-time setup)
                $columns = implode(', ', array_map(fn ($k) => "`{$k}`", array_keys($filtered)));
                $placeholders = implode(', ', array_map(fn ($k) => ":{$k}", array_keys($filtered)));
                $stmt = $pdo->prepare("INSERT INTO contact_page_settings ({$columns}) VALUES ({$placeholders})");
                $stmt->execute($filtered);
            }

            return $this->getSettings();
        } catch (\Exception $e) {
            $this->logger->error('ContactPageRepository::updateSettings failed', [
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }
}
