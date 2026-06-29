<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Log\LoggerInterface;
use XS2EventProxy\Repository\SystemSettingsRepository;
use XS2EventProxy\Exception\DatabaseException;

/**
 * Controller for frontend display settings.
 *
 * Admin routes  (all require AuthMiddleware):
 *   GET  /admin/display-settings        — list all display-category settings
 *   PUT  /admin/display-settings/{key}  — update a single display setting
 *
 * Public route (no auth):
 *   GET  /api/v1/display-settings       — list is_public display settings
 *                                         (safe for frontend consumption)
 *
 * Managed settings:
 *   football_visible_tournaments  — JSON array  ([] = show all)
 *   excluded_teams                — JSON object ({} = exclude none)
 *   other_sports_visible          — JSON array  ([] = show all)
 */
class DisplaySettingsController
{
    private SystemSettingsRepository $repository;
    private LoggerInterface $logger;

    /** Keys that belong to this controller; only these may be written via PUT */
    private const ALLOWED_KEYS = [
        'football_visible_tournaments',
        'excluded_teams',
        'other_sports_visible',
        'active_season',
    ];

    public function __construct(
        SystemSettingsRepository $repository,
        LoggerInterface $logger
    ) {
        $this->repository = $repository;
        $this->logger     = $logger;
    }

    // -------------------------------------------------------------------------
    // PUBLIC endpoint
    // -------------------------------------------------------------------------

    /**
     * GET /api/v1/display-settings
     *
     * Returns all is_public settings in the 'display' category.
     * Values stored as JSON strings are decoded before returning so the
     * frontend receives native arrays / objects.
     */
    public function getPublicSettings(Request $request, Response $response): Response
    {
        try {
            $rows = $this->repository->getByCategory('display', true);
            $payload = $this->formatRows($rows);

            $response->getBody()->write(json_encode([
                'success' => true,
                'data'    => $payload,
            ]));
            return $response->withHeader('Content-Type', 'application/json');

        } catch (DatabaseException $e) {
            $this->logger->error('DisplaySettingsController::getPublicSettings DB error', [
                'error' => $e->getMessage(),
            ]);
            $response->getBody()->write(json_encode([
                'success' => false,
                'error'   => 'Failed to fetch display settings',
            ]));
            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('DisplaySettingsController::getPublicSettings unexpected error', [
                'error' => $e->getMessage(),
            ]);
            $response->getBody()->write(json_encode([
                'success' => false,
                'error'   => 'An unexpected error occurred',
            ]));
            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }
    }

    // -------------------------------------------------------------------------
    // ADMIN endpoints (protected by AuthMiddleware in Application.php)
    // -------------------------------------------------------------------------

    /**
     * GET /admin/display-settings
     *
     * Returns all settings in the 'display' category (public + private).
     */
    public function getAdminSettings(Request $request, Response $response): Response
    {
        try {
            $adminUser = $request->getAttribute('user');
            $rows      = $this->repository->getByCategory('display', false);
            $payload   = $this->formatRows($rows);

            $this->logger->info('Admin fetched display settings', [
                'admin_user_id' => $adminUser['id'] ?? null,
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'data'    => $payload,
            ]));
            return $response->withHeader('Content-Type', 'application/json');

        } catch (DatabaseException $e) {
            $this->logger->error('DisplaySettingsController::getAdminSettings DB error', [
                'error' => $e->getMessage(),
            ]);
            $response->getBody()->write(json_encode([
                'success' => false,
                'error'   => 'Failed to fetch display settings',
            ]));
            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('DisplaySettingsController::getAdminSettings unexpected error', [
                'error' => $e->getMessage(),
            ]);
            $response->getBody()->write(json_encode([
                'success' => false,
                'error'   => 'An unexpected error occurred',
            ]));
            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }
    }

    /**
     * PUT /admin/display-settings/{key}
     *
     * Updates the value of a single display setting.
     *
     * Request body (JSON):
     *   { "value": <array|object|scalar> }
     *
     * The value is validated to be valid JSON for 'json' type settings,
     * then stored as a JSON string.
     */
    public function updateSetting(Request $request, Response $response, array $args): Response
    {
        try {
            $adminUser = $request->getAttribute('user');
            $key       = $args['key'] ?? '';

            // Whitelist: only allow the known display setting keys
            if (!in_array($key, self::ALLOWED_KEYS, true)) {
                $response->getBody()->write(json_encode([
                    'success' => false,
                    'error'   => "Unknown or disallowed display setting key: {$key}",
                ]));
                return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
            }

            $body = $request->getParsedBody();

            if (!isset($body['value'])) {
                $response->getBody()->write(json_encode([
                    'success' => false,
                    'error'   => "'value' field is required",
                ]));
                return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
            }

            $rawValue = $body['value'];

            // Fetch existing row to preserve meta fields
            $existing = $this->repository->getByKey($key);
            $settingType = $existing['setting_type'] ?? 'json';

            // For scalar types (string, number, boolean) store the value directly;
            // for json types (arrays, objects) encode it as a JSON string.
            if ($settingType === 'string') {
                $encoded = is_string($rawValue) ? $rawValue : (string) $rawValue;
            } else {
                $encoded = json_encode($rawValue);
                if ($encoded === false) {
                    $response->getBody()->write(json_encode([
                        'success' => false,
                        'error'   => 'Provided value could not be serialised to JSON',
                    ]));
                    return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
                }
            }

            $this->repository->upsert(
                key:         $key,
                value:       $encoded,
                type:        $existing['setting_type']  ?? 'json',
                category:    $existing['category']      ?? 'display',
                description: $existing['description']   ?? '',
                isPublic:    (bool) ($existing['is_public'] ?? true),
                defaultVal:  $existing['default_value'] ?? '',
                updatedBy:   (int) ($adminUser['id'] ?? 0)
            );

            $this->logger->info('Display setting updated', [
                'key'           => $key,
                'admin_user_id' => $adminUser['id'] ?? null,
            ]);

            $response->getBody()->write(json_encode([
                'success' => true,
                'message' => "Setting '{$key}' updated successfully",
                'data'    => [
                    'key'   => $key,
                    'value' => $rawValue,
                ],
            ]));
            return $response->withHeader('Content-Type', 'application/json');

        } catch (DatabaseException $e) {
            $this->logger->error('DisplaySettingsController::updateSetting DB error', [
                'key'   => $args['key'] ?? '',
                'error' => $e->getMessage(),
            ]);
            $response->getBody()->write(json_encode([
                'success' => false,
                'error'   => 'Failed to update display setting',
            ]));
            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');

        } catch (\Exception $e) {
            $this->logger->error('DisplaySettingsController::updateSetting unexpected error', [
                'key'   => $args['key'] ?? '',
                'error' => $e->getMessage(),
            ]);
            $response->getBody()->write(json_encode([
                'success' => false,
                'error'   => 'An unexpected error occurred',
            ]));
            return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Convert raw DB rows into a keyed map and decode JSON values.
     *
     * Returns:
     * {
     *   "football_visible_tournaments": [],
     *   "excluded_teams": {},
     *   "other_sports_visible": []
     * }
     */
    private function formatRows(array $rows): array
    {
        $out = [];
        foreach ($rows as $row) {
            $value = $row['setting_value'];
            // Always attempt JSON decode — values are json_encode'd on save
            // regardless of setting_type, so they must always be decoded on read.
            // Falls back to the raw string when it is not valid JSON (e.g. plain
            // text inserted directly via migration / seed data).
            $decoded = json_decode($value, true);
            if (json_last_error() === JSON_ERROR_NONE && $decoded !== null) {
                $value = $decoded;
            }
            $out[$row['setting_key']] = $value;
        }
        return $out;
    }
}
