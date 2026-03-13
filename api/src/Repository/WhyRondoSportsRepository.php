<?php

declare(strict_types=1);

namespace XS2EventProxy\Repository;

use PDO;
use Psr\Log\LoggerInterface;

/**
 * Repository for Why Rondo Sports data operations
 */
class WhyRondoSportsRepository
{
    private PDO $pdo;
    private LoggerInterface $logger;

    public function __construct(PDO $pdo, LoggerInterface $logger)
    {
        $this->pdo = $pdo;
        $this->logger = $logger;
    }

    /**
     * Get all Why Rondo Sports items
     */
    public function findAll(bool $onlyActive = false): array
    {
        $sql = "SELECT id, title, description, icon_url, position_order, status 
                FROM why_rondo_sports";
        
        if ($onlyActive) {
            $sql .= " WHERE status = 'active'";
        }
        
        $sql .= " ORDER BY position_order ASC";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Find a single item by ID
     */
    public function findById(int $id): ?array
    {
        $sql = "SELECT * FROM why_rondo_sports WHERE id = :id";
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ?: null;
    }

    /**
     * Create a new item
     */
    public function create(array $data): int
    {
        $sql = "INSERT INTO why_rondo_sports (title, description, icon_url, position_order, status, created_by)
                VALUES (:title, :description, :icon_url, :position_order, :status, :created_by)";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':title', $data['title']);
        $stmt->bindValue(':description', $data['description']);
        $stmt->bindValue(':icon_url', $data['icon_url']);
        $stmt->bindValue(':position_order', $data['position_order'] ?? 0, PDO::PARAM_INT);
        $stmt->bindValue(':status', $data['status'] ?? 'active');
        $stmt->bindValue(':created_by', $data['created_by'] ?? null, PDO::PARAM_INT);
        
        $stmt->execute();
        return (int)$this->pdo->lastInsertId();
    }

    /**
     * Update an item
     */
    public function update(int $id, array $data): bool
    {
        $fields = [];
        $params = [':id' => $id];
        
        $allowedFields = ['title', 'description', 'icon_url', 'position_order', 'status', 'updated_by'];
        
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $fields[] = "$field = :$field";
                $params[":$field"] = $data[$field];
            }
        }
        
        if (empty($fields)) {
            return false;
        }
        
        $sql = "UPDATE why_rondo_sports SET " . implode(', ', $fields) . " WHERE id = :id";
        $stmt = $this->pdo->prepare($sql);
        
        return $stmt->execute($params);
    }

    /**
     * Delete an item
     */
    public function delete(int $id): bool
    {
        $sql = "DELETE FROM why_rondo_sports WHERE id = :id";
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        
        return $stmt->execute();
    }
}
