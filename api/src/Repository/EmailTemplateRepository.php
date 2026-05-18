<?php

declare(strict_types=1);

namespace XS2EventProxy\Repository;

use XS2EventProxy\Service\DatabaseService;
use Psr\Log\LoggerInterface;
use PDO;

/**
 * EmailTemplateRepository
 *
 * Handles all database operations for the email_templates table.
 */
class EmailTemplateRepository
{
    private DatabaseService $database;
    private LoggerInterface $logger;

    public function __construct(DatabaseService $database, LoggerInterface $logger)
    {
        $this->database = $database;
        $this->logger   = $logger;
    }

    /**
     * Return all email templates ordered by event_label.
     */
    public function getAll(): array
    {
        try {
            $pdo  = $this->database->getConnection();
            $stmt = $pdo->query("
                SELECT id, event_key, event_label, subject, body_html, body_text,
                       is_active, created_at, updated_at
                FROM email_templates
                ORDER BY event_label ASC
            ");
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (\Exception $e) {
            $this->logger->error('EmailTemplateRepository::getAll failed', ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    /**
     * Return a single template by its numeric ID.
     */
    public function getById(int $id): ?array
    {
        try {
            $pdo  = $this->database->getConnection();
            $stmt = $pdo->prepare("
                SELECT id, event_key, event_label, subject, body_html, body_text,
                       is_active, created_at, updated_at
                FROM email_templates
                WHERE id = :id
            ");
            $stmt->execute([':id' => $id]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            return $row ?: null;
        } catch (\Exception $e) {
            $this->logger->error('EmailTemplateRepository::getById failed', ['id' => $id, 'error' => $e->getMessage()]);
            throw $e;
        }
    }

    /**
     * Return a single active template by its event_key.
     * Returns null when the template is inactive or does not exist.
     */
    public function getActiveByEventKey(string $eventKey): ?array
    {
        try {
            $pdo  = $this->database->getConnection();
            $stmt = $pdo->prepare("
                SELECT id, event_key, event_label, subject, body_html, body_text,
                       is_active, created_at, updated_at
                FROM email_templates
                WHERE event_key = :event_key AND is_active = 1
                LIMIT 1
            ");
            $stmt->execute([':event_key' => $eventKey]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            return $row ?: null;
        } catch (\Exception $e) {
            $this->logger->error('EmailTemplateRepository::getActiveByEventKey failed', [
                'event_key' => $eventKey,
                'error'     => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Update an existing template.
     *
     * @param  int    $id
     * @param  array  $data  Keys: subject, body_html, body_text, is_active
     * @return bool          true on success
     */
    public function update(int $id, array $data): bool
    {
        $allowed = ['subject', 'body_html', 'body_text', 'is_active'];
        $sets    = [];
        $params  = [':id' => $id];

        foreach ($allowed as $field) {
            if (array_key_exists($field, $data)) {
                $sets[]          = "{$field} = :{$field}";
                $params[":{$field}"] = $data[$field];
            }
        }

        if (empty($sets)) {
            return false;
        }

        try {
            $pdo  = $this->database->getConnection();
            $sql  = "UPDATE email_templates SET " . implode(', ', $sets) . " WHERE id = :id";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            return $stmt->rowCount() > 0;
        } catch (\Exception $e) {
            $this->logger->error('EmailTemplateRepository::update failed', ['id' => $id, 'error' => $e->getMessage()]);
            throw $e;
        }
    }

    /**
     * Reset a template to the default seed content.
     * We do this by calling the stored procedure equivalent: re-inserting via REPLACE.
     * Caller passes the full default row.
     *
     * @param  int    $id
     * @param  array  $defaults  Keys: subject, body_html, body_text (is_active reset to 1)
     */
    public function resetToDefault(int $id, array $defaults): bool
    {
        return $this->update($id, array_merge($defaults, ['is_active' => 1]));
    }
}
