<?php
declare(strict_types=1);

namespace XS2EventProxy\Controller;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Log\LoggerInterface;
use XS2EventProxy\Repository\NewsletterRepository;

class NewsletterController
{
    private NewsletterRepository $repo;
    private LoggerInterface $logger;

    public function __construct(NewsletterRepository $repo, LoggerInterface $logger)
    {
        $this->repo   = $repo;
        $this->logger = $logger;
    }

    // ── Public ───────────────────────────────────────────────────────────────

    /**
     * POST /api/v1/newsletter/subscribe
     * Body: { "email": "user@example.com", "name": "John Doe" (optional), "submit_from": "Interest register" (optional) }
     */
    public function subscribe(Request $request, Response $response): Response
    {
        $body  = (array) ($request->getParsedBody() ?? []);
        $email = trim((string) ($body['email'] ?? ''));
        $nameRaw = trim((string) ($body['name'] ?? ''));
        $name = ($nameRaw !== '') ? $nameRaw : null;
        $submitFrom = trim((string) ($body['submit_from'] ?? 'Newsletter subscription'));

        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Please provide a valid email address.',
            ]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(422);
        }

        // Normalise
        $email = strtolower($email);

        try {
            $result = $this->repo->subscribe($email, $name, $submitFrom);
        } catch (\Throwable $e) {
            $this->logger->error('Newsletter subscribe failed', ['error' => $e->getMessage()]);
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'An unexpected error occurred. Please try again.',
            ]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
        }

        if ($result === 'exists') {
            $response->getBody()->write(json_encode([
                'success' => true,
                'already' => true,
                'message' => 'You are already subscribed to our newsletter.',
            ]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
        }

        $response->getBody()->write(json_encode([
            'success' => true,
            'already' => false,
            'message' => 'Thank you for subscribing!',
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(201);
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    /**
     * GET /admin/newsletter-subscribers
     * Query params: search, page, limit
     */
    public function listSubscribers(Request $request, Response $response): Response
    {
        $params = $request->getQueryParams();
        $search = trim((string) ($params['search'] ?? ''));
        $page   = max(1, (int) ($params['page']  ?? 1));
        $limit  = min(200, max(1, (int) ($params['limit'] ?? 50)));

        $result = $this->repo->list($search, $page, $limit);

        $response->getBody()->write(json_encode(['success' => true] + $result));
        return $response->withHeader('Content-Type', 'application/json');
    }

    /**
     * DELETE /admin/newsletter-subscribers/{id}
     */
    public function deleteSubscriber(Request $request, Response $response, array $args): Response
    {
        $id      = (int) ($args['id'] ?? 0);
        $deleted = $this->repo->delete($id);

        if (!$deleted) {
            $response->getBody()->write(json_encode(['success' => false, 'message' => 'Subscriber not found.']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
        }

        $response->getBody()->write(json_encode(['success' => true, 'message' => 'Subscriber deleted.']));
        return $response->withHeader('Content-Type', 'application/json');
    }

    /**
     * POST /admin/newsletter-subscribers/bulk-import
     * Body: { "emails": ["a@b.com", "c@d.com", ...] }
     * Validates, deduplicates, and inserts up to 500 addresses in one request.
     */
    public function bulkImportSubscribers(Request $request, Response $response): Response
    {
        $body   = (array) ($request->getParsedBody() ?? []);
        $emails = $body['emails'] ?? [];

        if (!is_array($emails) || count($emails) === 0) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'No emails provided.',
            ]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(422);
        }

        if (count($emails) > 500) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Maximum 500 emails per import.',
            ]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(422);
        }

        try {
            $result = $this->repo->bulkSubscribe($emails);

            $response->getBody()->write(json_encode([
                'success'    => true,
                'added'      => $result['added'],
                'duplicates' => $result['duplicates'],
                'invalid'    => $result['invalid'],
            ]));
            return $response->withHeader('Content-Type', 'application/json');
        } catch (\Throwable $e) {
            $this->logger->error('Newsletter bulk import failed', ['error' => $e->getMessage()]);
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => 'Bulk import failed. Please try again.',
            ]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
        }
    }

    /**
     * GET /admin/newsletter-subscribers/export
     * Returns a CSV file download.
     */
    public function exportSubscribers(Request $request, Response $response): Response
    {
        $rows = $this->repo->listAll();

        $csv = "ID,Email,Name,Submit From,Subscribed At\r\n";
        foreach ($rows as $row) {
            $csv .= sprintf(
                "%d,%s,%s,%s,%s\r\n",
                (int) $row['id'],
                '"' . str_replace('"', '""', $row['email']) . '"',
                '"' . str_replace('"', '""', $row['name'] ?? '') . '"',
                '"' . str_replace('"', '""', $row['submit_from']) . '"',
                '"' . str_replace('"', '""', $row['subscribed_at']) . '"'
            );
        }

        $filename = 'newsletter-subscribers-' . date('Y-m-d') . '.csv';

        $response->getBody()->write($csv);
        return $response
            ->withHeader('Content-Type', 'text/csv; charset=UTF-8')
            ->withHeader('Content-Disposition', 'attachment; filename="' . $filename . '"')
            ->withHeader('Cache-Control', 'no-store, no-cache');
    }
}