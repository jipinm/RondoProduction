<?php

declare(strict_types=1);

namespace XS2EventProxy\Repository;

use PDO;
use PDOException;
use Psr\Log\LoggerInterface;

class NewsletterRepository
{
    private PDO $pdo;
    private LoggerInterface $logger;

    public function __construct(PDO $pdo, LoggerInterface $logger)
    {
        $this->pdo    = $pdo;
        $this->logger = $logger;
    }

    /**
     * Subscribe an email. Returns 'created' | 'exists'.
     * @param string $email Email address (required)
     * @param string|null $name Subscriber name (optional)
     * @param string $submit_from Source of subscription: 'Newsletter subscription' or 'Interest register'
     */
    public function subscribe(string $email, ?string $name = null, string $submit_from = 'Newsletter subscription'): string
    {
        try {
            $stmt = $this->pdo->prepare(
                'INSERT INTO newsletter_subscriptions (email, name, submit_from) VALUES (:email, :name, :submit_from)'
            );
            $stmt->bindValue(':email', $email);
            $stmt->bindValue(':name', $name);
            $stmt->bindValue(':submit_from', $submit_from);
            $stmt->execute();
            return 'created';
        } catch (PDOException $e) {
            // Unique constraint violation (duplicate email)
            if ($e->getCode() === '23000') {
                return 'exists';
            }
            $this->logger->error('NewsletterRepository::subscribe error', ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    /**
     * List all subscribers with optional search, pagination.
     */
    public function list(string $search = '', int $page = 1, int $limit = 50): array
    {
        $offset = ($page - 1) * $limit;
        $where  = '';
        $params = [];

        if ($search !== '') {
            $where    = 'WHERE email LIKE :search OR name LIKE :search OR submit_from LIKE :search';
            $params[':search'] = '%' . $search . '%';
        }

        $countSql = "SELECT COUNT(*) FROM newsletter_subscriptions {$where}";
        $stmt = $this->pdo->prepare($countSql);
        $stmt->execute($params);
        $total = (int) $stmt->fetchColumn();

        $dataSql = "SELECT id, email, name, submit_from, subscribed_at
                    FROM newsletter_subscriptions
                    {$where}
                    ORDER BY subscribed_at DESC
                    LIMIT :limit OFFSET :offset";
        $stmt = $this->pdo->prepare($dataSql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue(':limit',  $limit,  PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return [
            'data'        => $stmt->fetchAll(PDO::FETCH_ASSOC),
            'total'       => $total,
            'page'        => $page,
            'limit'       => $limit,
            'total_pages' => (int) ceil($total / $limit),
        ];
    }

    /**
     * Fetch all rows (for CSV/Excel export).
     */
    public function listAll(): array
    {
        $stmt = $this->pdo->query(
            'SELECT id, email, name, submit_from, subscribed_at FROM newsletter_subscriptions ORDER BY subscribed_at DESC'
        );
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Bulk-subscribe a list of emails.
     * Deduplicates within the batch, validates each address, and calls subscribe().
     * Returns arrays of added, duplicate, and invalid addresses.
     *
     * @param  string[] $emails
     * @return array{ added: string[], duplicates: string[], invalid: string[] }
     */
    public function bulkSubscribe(array $emails): array
    {
        $added      = [];
        $duplicates = [];
        $invalid    = [];
        $seen       = [];

        foreach ($emails as $raw) {
            $email = strtolower(trim((string) $raw));

            if ($email === '') {
                continue;
            }

            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $invalid[] = trim((string) $raw);
                continue;
            }

            // Within-batch duplicate — count once, skip silently
            if (isset($seen[$email])) {
                continue;
            }
            $seen[$email] = true;

            $result = $this->subscribe($email, null, 'Admin import');
            if ($result === 'created') {
                $added[] = $email;
            } else {
                $duplicates[] = $email;
            }
        }

        return compact('added', 'duplicates', 'invalid');
    }

    /**
     * Delete a subscription by id.
     */
    public function delete(int $id): bool
    {
        $stmt = $this->pdo->prepare(
            'DELETE FROM newsletter_subscriptions WHERE id = :id'
        );
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->rowCount() > 0;
    }
}
