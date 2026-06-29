<?php

/**
 * Team Credentials – Rename Image Files on Disk
 *
 * Run this script AFTER executing the SQL migration
 * team_credentials_remove_tournament_dependency.sql
 *
 * The SQL migration already updates the database filename/url columns
 * to the new {team_id}_{type}.{ext} pattern.
 * This script renames the actual physical files on disk to match.
 *
 * Usage (from the project root):
 *   php api/bin/team-credentials-rename-files.php
 */

declare(strict_types=1);

// ── Bootstrap ──────────────────────────────────────────────────────────────

$rootDir = dirname(__DIR__);  // e.g. /var/www/api

// Load .env if available
$envFile = $rootDir . '/../.env';
if (!file_exists($envFile)) {
    $envFile = $rootDir . '/.env';
}

if (file_exists($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        if (str_starts_with(trim($line), '#') || !str_contains($line, '=')) {
            continue;
        }
        [$key, $value] = explode('=', $line, 2);
        $key   = trim($key);
        $value = trim($value, " \t\n\r\0\x0B\"'");
        if (!isset($_ENV[$key])) {
            $_ENV[$key] = $value;
            putenv("$key=$value");
        }
    }
}

$dbHost = $_ENV['DB_HOST'] ?? 'localhost';
$dbPort = (int)($_ENV['DB_PORT'] ?? 3306);
$dbName = $_ENV['DB_NAME'] ?? '';
$dbUser = $_ENV['DB_USER'] ?? '';
$dbPass = $_ENV['DB_PASS'] ?? '';

// Image base directory (the public folder of the API)
$imageBase = $rootDir . '/public/images/team';

// ── Database Connection ─────────────────────────────────────────────────────

try {
    $pdo = new PDO(
        "mysql:host={$dbHost};port={$dbPort};dbname={$dbName};charset=utf8mb4",
        $dbUser,
        $dbPass,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (PDOException $e) {
    echo "ERROR: Cannot connect to database: " . $e->getMessage() . PHP_EOL;
    exit(1);
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function renameFile(string $oldPath, string $newPath): string
{
    if ($oldPath === $newPath) {
        return "SKIP (same name)";
    }
    if (!file_exists($oldPath)) {
        return "SKIP (source not found: {$oldPath})";
    }
    if (file_exists($newPath)) {
        return "SKIP (destination already exists: {$newPath})";
    }
    if (rename($oldPath, $newPath)) {
        return "OK";
    }
    return "FAILED";
}

// ── Main ────────────────────────────────────────────────────────────────────

echo PHP_EOL;
echo "==================================================================" . PHP_EOL;
echo " Team Credentials – File Rename Script" . PHP_EOL;
echo "==================================================================" . PHP_EOL;
echo " Image base dir : {$imageBase}" . PHP_EOL;
echo PHP_EOL;

// Fetch all credentials that have files
$stmt = $pdo->query("
    SELECT id, sport_type, team_id, logo_filename, banner_filename
    FROM team_credentials
    WHERE logo_filename IS NOT NULL OR banner_filename IS NOT NULL
    ORDER BY id
");

$rows       = $stmt->fetchAll(PDO::FETCH_ASSOC);
$totalLogo  = 0;
$totalBanner = 0;
$skipLogo   = 0;
$skipBanner = 0;

foreach ($rows as $row) {
    $teamId        = $row['team_id'];
    $logoFilename  = $row['logo_filename'];
    $bannerFilename = $row['banner_filename'];

    echo "ID {$row['id']} – {$teamId}" . PHP_EOL;

    // ── Logo ────────────────────────────────────────────────────────────────
    if ($logoFilename) {
        $newLogoPath = "{$imageBase}/logo/{$logoFilename}";

        // Derive what the OLD filename would have been:
        // Old pattern: {tournament_id}_{team_id}_logo.{ext}
        // If the current filename already matches the new pattern (team_id prefix)
        // we try to find the old file by checking if any file in the logo dir
        // ends with "_{teamId}_{suffix}" and rename it.
        $oldLogoPath = null;

        // Scan for a file that was named with the old pattern
        $logoDir = "{$imageBase}/logo";
        if (is_dir($logoDir)) {
            foreach (scandir($logoDir) as $file) {
                if ($file === '.' || $file === '..') {
                    continue;
                }
                // Old pattern ends with _{team_id}_{suffix}
                if (str_contains($file, "_{$teamId}_") && $file !== $logoFilename) {
                    $oldLogoPath = "{$logoDir}/{$file}";
                    break;
                }
            }
        }

        if ($oldLogoPath) {
            $result = renameFile($oldLogoPath, $newLogoPath);
            echo "  logo  : {$oldLogoPath}" . PHP_EOL;
            echo "       → {$newLogoPath}" . PHP_EOL;
            echo "    [{$result}]" . PHP_EOL;
            if ($result === 'OK') {
                $totalLogo++;
            } else {
                $skipLogo++;
            }
        } else {
            // Check if the new file is already in place
            if (file_exists($newLogoPath)) {
                echo "  logo  : already at new path – no rename needed" . PHP_EOL;
            } else {
                echo "  logo  : WARN – cannot locate old file for {$logoFilename}" . PHP_EOL;
                $skipLogo++;
            }
        }
    }

    // ── Banner ──────────────────────────────────────────────────────────────
    if ($bannerFilename) {
        $newBannerPath = "{$imageBase}/banner/{$bannerFilename}";

        $oldBannerPath = null;
        $bannerDir = "{$imageBase}/banner";
        if (is_dir($bannerDir)) {
            foreach (scandir($bannerDir) as $file) {
                if ($file === '.' || $file === '..') {
                    continue;
                }
                if (str_contains($file, "_{$teamId}_") && $file !== $bannerFilename) {
                    $oldBannerPath = "{$bannerDir}/{$file}";
                    break;
                }
            }
        }

        if ($oldBannerPath) {
            $result = renameFile($oldBannerPath, $newBannerPath);
            echo "  banner: {$oldBannerPath}" . PHP_EOL;
            echo "       → {$newBannerPath}" . PHP_EOL;
            echo "    [{$result}]" . PHP_EOL;
            if ($result === 'OK') {
                $totalBanner++;
            } else {
                $skipBanner++;
            }
        } else {
            if (file_exists($newBannerPath)) {
                echo "  banner: already at new path – no rename needed" . PHP_EOL;
            } else {
                echo "  banner: WARN – cannot locate old file for {$bannerFilename}" . PHP_EOL;
                $skipBanner++;
            }
        }
    }

    echo PHP_EOL;
}

echo "==================================================================" . PHP_EOL;
echo " Done." . PHP_EOL;
echo " Logos  renamed : {$totalLogo}  |  skipped/warn: {$skipLogo}" . PHP_EOL;
echo " Banners renamed: {$totalBanner}  |  skipped/warn: {$skipBanner}" . PHP_EOL;
echo "==================================================================" . PHP_EOL;
