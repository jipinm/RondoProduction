<?php

declare(strict_types=1);

namespace XS2EventProxy\Repository;

use XS2EventProxy\Service\DatabaseService;
use Psr\Log\LoggerInterface;
use PDO;

class BlogRepository
{
    private DatabaseService $database;
    private LoggerInterface $logger;

    public function __construct(DatabaseService $database, LoggerInterface $logger)
    {
        $this->database = $database;
        $this->logger = $logger;
    }

    // ──────────────────────────────────────────────────────────────────────
    // PUBLIC FRONTEND QUERIES
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Get published blogs (status=published, publish_date <= NOW) with
     * pagination and optional category / tag filtering.
     */
    public function getPublishedBlogs(
        int $page = 1,
        int $limit = 6,
        ?int $categoryId = null,
        ?int $tagId = null
    ): array {
        $pdo    = $this->database->getConnection();
        $offset = ($page - 1) * $limit;
        $params = [];

        $joins  = '';
        $where  = "b.status = 'published' AND b.publish_date <= NOW()";

        if ($tagId !== null) {
            $joins .= ' INNER JOIN blog_tag_map btm ON btm.blog_id = b.id AND btm.tag_id = :tag_id';
            $params['tag_id'] = $tagId;
        }

        if ($categoryId !== null) {
            $where .= ' AND b.category_id = :category_id';
            $params['category_id'] = $categoryId;
        }

        // Count query
        $countSql = "SELECT COUNT(DISTINCT b.id) FROM blogs b {$joins} WHERE {$where}";
        $countStmt = $pdo->prepare($countSql);
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        // Data query
        $sql = "
            SELECT DISTINCT
                b.id, b.title, b.slug, b.featured_image, b.excerpt,
                b.publish_date, b.status,
                b.seo_title, b.meta_description, b.meta_keywords,
                b.og_title, b.og_description, b.og_image,
                c.id   AS category_id,
                c.name AS category_name,
                c.slug AS category_slug
            FROM blogs b
            LEFT JOIN blog_categories c ON c.id = b.category_id
            {$joins}
            WHERE {$where}
            ORDER BY b.publish_date DESC
            LIMIT :limit OFFSET :offset
        ";

        $params['limit']  = $limit;
        $params['offset'] = $offset;

        $stmt = $pdo->prepare($sql);
        foreach ($params as $key => $value) {
            $type = is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR;
            $stmt->bindValue($key, $value, $type);
        }
        $stmt->execute();
        $blogs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($blogs as &$blog) {
            $blog['tags'] = $this->getTagsForBlog((int) $blog['id']);
        }

        return [
            'data'        => $blogs,
            'total'       => $total,
            'page'        => $page,
            'limit'       => $limit,
            'total_pages' => (int) ceil($total / $limit),
        ];
    }

    /**
     * Get a single published blog by slug (with tags).
     */
    public function getPublishedBlogBySlug(string $slug): ?array
    {
        $pdo  = $this->database->getConnection();
        $stmt = $pdo->prepare("
            SELECT
                b.id, b.title, b.slug, b.featured_image, b.excerpt, b.content,
                b.publish_date, b.status,
                b.seo_title, b.meta_description, b.meta_keywords,
                b.og_title, b.og_description, b.og_image,
                c.id   AS category_id,
                c.name AS category_name,
                c.slug AS category_slug
            FROM blogs b
            LEFT JOIN blog_categories c ON c.id = b.category_id
            WHERE b.slug = :slug
              AND b.status = 'published'
              AND b.publish_date <= NOW()
        ");
        $stmt->execute(['slug' => $slug]);
        $blog = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$blog) return null;

        $blog['tags'] = $this->getTagsForBlog((int) $blog['id']);
        return $blog;
    }

    /**
     * Get up to 3 related published blogs for a given blog.
     * Priority: same category > shared tags.
     */
    public function getRelatedBlogs(int $blogId, ?int $categoryId, array $tagIds): array
    {
        $pdo     = $this->database->getConnection();
        $related = [];
        $seen    = [$blogId];

        // 1. Same category
        if ($categoryId !== null) {
            $stmt = $pdo->prepare("
                SELECT b.id, b.title, b.slug, b.featured_image, b.publish_date
                FROM blogs b
                WHERE b.category_id = :cat_id
                  AND b.id != :blog_id
                  AND b.status = 'published'
                  AND b.publish_date <= NOW()
                ORDER BY b.publish_date DESC
                LIMIT 3
            ");
            $stmt->execute(['cat_id' => $categoryId, 'blog_id' => $blogId]);
            foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
                if (!in_array($row['id'], $seen) && count($related) < 3) {
                    $related[] = $row;
                    $seen[]    = $row['id'];
                }
            }
        }

        // 2. Same tags (fill remaining slots)
        if (count($related) < 3 && !empty($tagIds)) {
            $placeholders = implode(',', array_fill(0, count($tagIds), '?'));
            $excludePlaceholders = implode(',', array_fill(0, count($seen), '?'));
            $stmt = $pdo->prepare("
                SELECT DISTINCT b.id, b.title, b.slug, b.featured_image, b.publish_date
                FROM blogs b
                INNER JOIN blog_tag_map btm ON btm.blog_id = b.id
                WHERE btm.tag_id IN ({$placeholders})
                  AND b.id NOT IN ({$excludePlaceholders})
                  AND b.status = 'published'
                  AND b.publish_date <= NOW()
                ORDER BY b.publish_date DESC
                LIMIT 3
            ");
            $bindParams = array_merge(array_values($tagIds), array_values($seen));
            $stmt->execute($bindParams);
            foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
                if (count($related) < 3) {
                    $related[] = $row;
                }
            }
        }

        return array_slice($related, 0, 3);
    }

    /**
     * Get all categories.
     */
    public function getAllCategories(): array
    {
        $pdo  = $this->database->getConnection();
        $stmt = $pdo->query("SELECT id, name, slug FROM blog_categories ORDER BY name ASC");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get all tags.
     */
    public function getAllTags(): array
    {
        $pdo  = $this->database->getConnection();
        $stmt = $pdo->query("SELECT id, name, slug FROM blog_tags ORDER BY name ASC");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // ──────────────────────────────────────────────────────────────────────
    // ADMIN QUERIES
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Admin: list all blogs with search, status filter, sorting, pagination.
     */
    public function adminGetBlogs(
        int $page = 1,
        int $limit = 20,
        string $search = '',
        string $status = '',
        string $sortBy = 'publish_date',
        string $sortDir = 'DESC'
    ): array {
        $pdo    = $this->database->getConnection();
        $offset = ($page - 1) * $limit;
        $params = [];
        $where  = '1=1';

        $allowedSort = ['id', 'title', 'publish_date', 'status', 'created_at'];
        if (!in_array($sortBy, $allowedSort)) $sortBy = 'publish_date';
        $sortDir = strtoupper($sortDir) === 'ASC' ? 'ASC' : 'DESC';

        if ($status !== '') {
            $where .= " AND b.status = :status";
            $params['status'] = $status;
        }

        if ($search !== '') {
            $where .= " AND (b.title LIKE :search OR b.excerpt LIKE :search2)";
            $params['search']  = '%' . $search . '%';
            $params['search2'] = '%' . $search . '%';
        }

        $countStmt = $pdo->prepare("SELECT COUNT(*) FROM blogs b WHERE {$where}");
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        $sql = "
            SELECT
                b.id, b.title, b.slug, b.featured_image, b.excerpt,
                b.publish_date, b.status, b.created_at, b.updated_at,
                b.seo_title, b.meta_description, b.meta_keywords,
                b.og_title, b.og_description, b.og_image,
                c.id   AS category_id,
                c.name AS category_name
            FROM blogs b
            LEFT JOIN blog_categories c ON c.id = b.category_id
            WHERE {$where}
            ORDER BY b.{$sortBy} {$sortDir}
            LIMIT :limit OFFSET :offset
        ";

        $params['limit']  = $limit;
        $params['offset'] = $offset;

        $stmt = $pdo->prepare($sql);
        foreach ($params as $key => $value) {
            $type = is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR;
            $stmt->bindValue($key, $value, $type);
        }
        $stmt->execute();
        $blogs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($blogs as &$blog) {
            $blog['tags'] = $this->getTagsForBlog((int) $blog['id']);
        }

        return [
            'data'        => $blogs,
            'total'       => $total,
            'page'        => $page,
            'limit'       => $limit,
            'total_pages' => (int) ceil($total / $limit),
        ];
    }

    /**
     * Admin: get single blog by ID (all statuses).
     */
    public function adminGetBlogById(int $id): ?array
    {
        $pdo  = $this->database->getConnection();
        $stmt = $pdo->prepare("
            SELECT
                b.id, b.title, b.slug, b.featured_image, b.excerpt, b.content,
                b.publish_date, b.status, b.created_at, b.updated_at,
                b.seo_title, b.meta_description, b.meta_keywords,
                b.og_title, b.og_description, b.og_image,
                c.id   AS category_id,
                c.name AS category_name,
                c.slug AS category_slug
            FROM blogs b
            LEFT JOIN blog_categories c ON c.id = b.category_id
            WHERE b.id = :id
        ");
        $stmt->execute(['id' => $id]);
        $blog = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$blog) return null;

        $blog['tags'] = $this->getTagsForBlog($id);
        return $blog;
    }

    /**
     * Admin: create a blog.
     */
    public function adminCreateBlog(array $data): int
    {
        $pdo  = $this->database->getConnection();
        $stmt = $pdo->prepare("
            INSERT INTO blogs
                (title, slug, featured_image, excerpt, content, category_id, publish_date, status,
                 seo_title, meta_description, meta_keywords, og_title, og_description, og_image)
            VALUES
                (:title, :slug, :featured_image, :excerpt, :content, :category_id, :publish_date, :status,
                 :seo_title, :meta_description, :meta_keywords, :og_title, :og_description, :og_image)
        ");
        $stmt->execute([
            'title'           => $data['title'],
            'slug'            => $data['slug'],
            'featured_image'  => $data['featured_image'] ?? null,
            'excerpt'         => $data['excerpt'] ?? null,
            'content'         => $data['content'] ?? null,
            'category_id'     => $data['category_id'] ?? null,
            'publish_date'    => $data['publish_date'] ?? date('Y-m-d H:i:s'),
            'status'          => $data['status'] ?? 'draft',
            'seo_title'       => $data['seo_title'] ?? null,
            'meta_description'=> $data['meta_description'] ?? null,
            'meta_keywords'   => $data['meta_keywords'] ?? null,
            'og_title'        => $data['og_title'] ?? null,
            'og_description'  => $data['og_description'] ?? null,
            'og_image'        => $data['og_image'] ?? null,
        ]);

        $newId = (int) $pdo->lastInsertId();
        $this->syncTags($newId, $data['tag_ids'] ?? []);
        return $newId;
    }

    /**
     * Admin: update the featured_image field only (called after image upload).
     */
    public function adminUpdateFeaturedImage(int $id, string $imageUrl): bool
    {
        $pdo  = $this->database->getConnection();
        $stmt = $pdo->prepare("UPDATE blogs SET featured_image = :url WHERE id = :id");
        return $stmt->execute(['url' => $imageUrl, 'id' => $id]);
    }

    /**
     * Admin: update a blog.
     */
    public function adminUpdateBlog(int $id, array $data): bool
    {
        $pdo  = $this->database->getConnection();
        $stmt = $pdo->prepare("
            UPDATE blogs SET
                title           = :title,
                slug            = :slug,
                featured_image  = :featured_image,
                excerpt         = :excerpt,
                content         = :content,
                category_id     = :category_id,
                publish_date    = :publish_date,
                status          = :status,
                seo_title       = :seo_title,
                meta_description= :meta_description,
                meta_keywords   = :meta_keywords,
                og_title        = :og_title,
                og_description  = :og_description,
                og_image        = :og_image
            WHERE id = :id
        ");
        $result = $stmt->execute([
            'title'           => $data['title'],
            'slug'            => $data['slug'],
            'featured_image'  => $data['featured_image'] ?? null,
            'excerpt'         => $data['excerpt'] ?? null,
            'content'         => $data['content'] ?? null,
            'category_id'     => $data['category_id'] ?? null,
            'publish_date'    => $data['publish_date'] ?? date('Y-m-d H:i:s'),
            'status'          => $data['status'] ?? 'draft',
            'seo_title'       => $data['seo_title'] ?? null,
            'meta_description'=> $data['meta_description'] ?? null,
            'meta_keywords'   => $data['meta_keywords'] ?? null,
            'og_title'        => $data['og_title'] ?? null,
            'og_description'  => $data['og_description'] ?? null,
            'og_image'        => $data['og_image'] ?? null,
            'id'              => $id,
        ]);

        if ($result) {
            $this->syncTags($id, $data['tag_ids'] ?? []);
        }

        return $result;
    }

    /**
     * Admin: delete a blog.
     */
    public function adminDeleteBlog(int $id): bool
    {
        $pdo  = $this->database->getConnection();
        $stmt = $pdo->prepare("DELETE FROM blogs WHERE id = :id");
        return $stmt->execute(['id' => $id]);
    }

    // ── Category Admin ────────────────────────────────────────────────────

    public function adminCreateCategory(array $data): int
    {
        $pdo  = $this->database->getConnection();
        $stmt = $pdo->prepare("INSERT INTO blog_categories (name, slug) VALUES (:name, :slug)");
        $stmt->execute(['name' => $data['name'], 'slug' => $data['slug']]);
        return (int) $pdo->lastInsertId();
    }

    public function adminUpdateCategory(int $id, array $data): bool
    {
        $pdo  = $this->database->getConnection();
        $stmt = $pdo->prepare("UPDATE blog_categories SET name = :name, slug = :slug WHERE id = :id");
        return $stmt->execute(['name' => $data['name'], 'slug' => $data['slug'], 'id' => $id]);
    }

    public function adminDeleteCategory(int $id): bool
    {
        $pdo  = $this->database->getConnection();
        $stmt = $pdo->prepare("DELETE FROM blog_categories WHERE id = :id");
        return $stmt->execute(['id' => $id]);
    }

    public function adminGetCategoryById(int $id): ?array
    {
        $pdo  = $this->database->getConnection();
        $stmt = $pdo->prepare("SELECT id, name, slug, created_at, updated_at FROM blog_categories WHERE id = :id");
        $stmt->execute(['id' => $id]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    // ── Tag Admin ─────────────────────────────────────────────────────────

    public function adminCreateTag(array $data): int
    {
        $pdo  = $this->database->getConnection();
        $stmt = $pdo->prepare("INSERT INTO blog_tags (name, slug) VALUES (:name, :slug)");
        $stmt->execute(['name' => $data['name'], 'slug' => $data['slug']]);
        return (int) $pdo->lastInsertId();
    }

    public function adminUpdateTag(int $id, array $data): bool
    {
        $pdo  = $this->database->getConnection();
        $stmt = $pdo->prepare("UPDATE blog_tags SET name = :name, slug = :slug WHERE id = :id");
        return $stmt->execute(['name' => $data['name'], 'slug' => $data['slug'], 'id' => $id]);
    }

    public function adminDeleteTag(int $id): bool
    {
        $pdo  = $this->database->getConnection();
        $stmt = $pdo->prepare("DELETE FROM blog_tags WHERE id = :id");
        return $stmt->execute(['id' => $id]);
    }

    public function adminGetTagById(int $id): ?array
    {
        $pdo  = $this->database->getConnection();
        $stmt = $pdo->prepare("SELECT id, name, slug, created_at, updated_at FROM blog_tags WHERE id = :id");
        $stmt->execute(['id' => $id]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    // ──────────────────────────────────────────────────────────────────────
    // HELPERS
    // ──────────────────────────────────────────────────────────────────────

    private function getTagsForBlog(int $blogId): array
    {
        $pdo  = $this->database->getConnection();
        $stmt = $pdo->prepare("
            SELECT t.id, t.name, t.slug
            FROM blog_tags t
            INNER JOIN blog_tag_map btm ON btm.tag_id = t.id
            WHERE btm.blog_id = :blog_id
            ORDER BY t.name ASC
        ");
        $stmt->execute(['blog_id' => $blogId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    private function syncTags(int $blogId, array $tagIds): void
    {
        $pdo = $this->database->getConnection();
        $pdo->prepare("DELETE FROM blog_tag_map WHERE blog_id = :blog_id")->execute(['blog_id' => $blogId]);
        if (empty($tagIds)) return;
        $stmt = $pdo->prepare("INSERT IGNORE INTO blog_tag_map (blog_id, tag_id) VALUES (:blog_id, :tag_id)");
        foreach ($tagIds as $tagId) {
            $stmt->execute(['blog_id' => $blogId, 'tag_id' => (int) $tagId]);
        }
    }
}
