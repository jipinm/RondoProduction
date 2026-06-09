<?php

declare(strict_types=1);

namespace XS2EventProxy\Repository;

use PDO;
use PDOException;
use Psr\Log\LoggerInterface;
use XS2EventProxy\Exception\DatabaseException;

/**
 * Repository for partners data operations
 */
class PartnersRepository
{
    private PDO $pdo;
    private LoggerInterface $logger;

    public function __construct(PDO $pdo, LoggerInterface $logger)
    {
        $this->pdo = $pdo;
        $this->logger = $logger;
    }

    /**
     * Get all partners with filtering and pagination
     */
    public function findAll(array $filters = [], int $page = 1, int $limit = 20): array
    {
        try {
            $offset = ($page - 1) * $limit;
            $whereConditions = [];
            $params = [];

            // Build WHERE conditions based on filters
            if (!empty($filters['status'])) {
                $whereConditions[] = 'p.status = :status';
                $params['status'] = $filters['status'];
            }

            if (!empty($filters['search'])) {
                $whereConditions[] = 'p.name LIKE :search';
                $params['search'] = '%' . $filters['search'] . '%';
            }

            // Build the query
            $whereClause = !empty($whereConditions) ? 'WHERE ' . implode(' AND ', $whereConditions) : '';
            
            $sql = "
                SELECT 
                    p.*,
                    au.name as created_by_name,
                    uu.name as updated_by_name
                FROM partners p
                LEFT JOIN admin_users au ON p.created_by = au.id
                LEFT JOIN admin_users uu ON p.updated_by = uu.id
                {$whereClause}
                ORDER BY p.position_order ASC, p.created_at DESC
                LIMIT :limit OFFSET :offset
            ";

            $this->logger->info('Generated SQL Query', [
                'sql' => $sql,
                'params' => $params,
                'limit' => $limit,
                'offset' => $offset
            ]);

            $stmt = $this->pdo->prepare($sql);
            
            // Bind parameters
            foreach ($params as $key => $value) {
                $stmt->bindValue(':' . $key, $value);
            }
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);

            $stmt->execute();
            $partners = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get total count for pagination
            $countSql = "SELECT COUNT(*) FROM partners p {$whereClause}";
            $countStmt = $this->pdo->prepare($countSql);
            foreach ($params as $key => $value) {
                $countStmt->bindValue(':' . $key, $value);
            }
            $countStmt->execute();
            $totalCount = (int) $countStmt->fetchColumn();

            return [
                'data' => $partners,
                'pagination' => [
                    'current_page' => $page,
                    'per_page' => $limit,
                    'total' => $totalCount,
                    'total_pages' => (int) ceil($totalCount / $limit)
                ]
            ];

        } catch (PDOException $e) {
            $this->logger->error('Database error in PartnersRepository::findAll', [
                'error' => $e->getMessage(),
                'filters' => $filters
            ]);
            throw new DatabaseException('Failed to retrieve partners: ' . $e->getMessage());
        }
    }

    /**
     * Find a partner by ID
     */
    public function findById(int $id): ?array
    {
        try {
            $sql = "
                SELECT 
                    p.*,
                    au.name as created_by_name,
                    uu.name as updated_by_name
                FROM partners p
                LEFT JOIN admin_users au ON p.created_by = au.id
                LEFT JOIN admin_users uu ON p.updated_by = uu.id
                WHERE p.id = :id
            ";

            $stmt = $this->pdo->prepare($sql);
            $stmt->bindValue(':id', $id, PDO::PARAM_INT);
            $stmt->execute();

            $partner = $stmt->fetch(PDO::FETCH_ASSOC);
            return $partner ?: null;

        } catch (PDOException $e) {
            $this->logger->error('Database error in PartnersRepository::findById', [
                'error' => $e->getMessage(),
                'id' => $id
            ]);
            throw new DatabaseException('Failed to retrieve partner: ' . $e->getMessage());
        }
    }

    /**
     * Create a new partner
     */
    public function create(array $data): array
    {
        try {
            $sql = "
                INSERT INTO partners (
                    name, logo_url, link_url, link_target, status, 
                    position_order, created_by, updated_by
                ) VALUES (
                    :name, :logo_url, :link_url, :link_target, :status,
                    :position_order, :created_by, :updated_by
                )
            ";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                'name' => $data['name'],
                'logo_url' => $data['logo_url'],
                'link_url' => $data['link_url'] ?? null,
                'link_target' => $data['link_target'] ?? '_blank',
                'status' => $data['status'] ?? 'active',
                'position_order' => $data['position_order'] ?? 0,
                'created_by' => $data['created_by'],
                'updated_by' => $data['created_by']
            ]);

            $partnerId = (int) $this->pdo->lastInsertId();
            return $this->findById($partnerId);

        } catch (PDOException $e) {
            $this->logger->error('Database error in PartnersRepository::create', [
                'error' => $e->getMessage(),
                'data' => $data
            ]);
            throw new DatabaseException('Failed to create partner: ' . $e->getMessage());
        }
    }

    /**
     * Update an existing partner
     */
    public function update(int $id, array $data): array
    {
        try {
            $updates = [];
            $params = ['id' => $id];

            // Build dynamic update query
            if (isset($data['name'])) {
                $updates[] = 'name = :name';
                $params['name'] = $data['name'];
            }
            if (isset($data['logo_url'])) {
                $updates[] = 'logo_url = :logo_url';
                $params['logo_url'] = $data['logo_url'];
            }
            if (isset($data['link_url'])) {
                $updates[] = 'link_url = :link_url';
                $params['link_url'] = $data['link_url'];
            }
            if (isset($data['link_target'])) {
                $updates[] = 'link_target = :link_target';
                $params['link_target'] = $data['link_target'];
            }
            if (isset($data['status'])) {
                $updates[] = 'status = :status';
                $params['status'] = $data['status'];
            }
            if (isset($data['position_order'])) {
                $updates[] = 'position_order = :position_order';
                $params['position_order'] = $data['position_order'];
            }
            if (isset($data['updated_by'])) {
                $updates[] = 'updated_by = :updated_by';
                $params['updated_by'] = $data['updated_by'];
            }

            if (empty($updates)) {
                return $this->findById($id);
            }

            $sql = "UPDATE partners SET " . implode(', ', $updates) . " WHERE id = :id";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);

            return $this->findById($id);

        } catch (PDOException $e) {
            $this->logger->error('Database error in PartnersRepository::update', [
                'error' => $e->getMessage(),
                'id' => $id,
                'data' => $data
            ]);
            throw new DatabaseException('Failed to update partner: ' . $e->getMessage());
        }
    }

    /**
     * Delete a partner
     */
    public function delete(int $id): bool
    {
        try {
            $sql = "DELETE FROM partners WHERE id = :id";
            $stmt = $this->pdo->prepare($sql);
            $stmt->bindValue(':id', $id, PDO::PARAM_INT);
            $stmt->execute();

            return $stmt->rowCount() > 0;

        } catch (PDOException $e) {
            $this->logger->error('Database error in PartnersRepository::delete', [
                'error' => $e->getMessage(),
                'id' => $id
            ]);
            throw new DatabaseException('Failed to delete partner: ' . $e->getMessage());
        }
    }

    /**
     * Get active partners for public display
     */
    public function findActive(int $limit = 50): array
    {
        try {
            $sql = "
                SELECT 
                    id, name, logo_url, link_url, link_target, position_order
                FROM partners
                WHERE status = 'active'
                ORDER BY position_order ASC, created_at DESC
                LIMIT :limit
            ";

            $stmt = $this->pdo->prepare($sql);
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->execute();

            return $stmt->fetchAll(PDO::FETCH_ASSOC);

        } catch (PDOException $e) {
            $this->logger->error('Database error in PartnersRepository::findActive', [
                'error' => $e->getMessage()
            ]);
            throw new DatabaseException('Failed to retrieve active partners: ' . $e->getMessage());
        }
    }
}
