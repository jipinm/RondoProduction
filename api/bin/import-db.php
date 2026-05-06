<?php
require_once __DIR__ . '/../vendor/autoload.php';

// Load environment variables
if (file_exists(__DIR__ . '/../.env')) {
    $lines = file(__DIR__ . '/../.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, '=') !== false && !str_starts_with($line, '#')) {
            [$key, $value] = explode('=', $line, 2);
            $_ENV[trim($key)] = trim($value);
        }
    }
}

$host = $_ENV['DB_HOST'] ?? '127.0.0.1';
$port = $_ENV['DB_PORT'] ?? '3306';
$username = $_ENV['DB_USER'] ?? 'root';
$password = $_ENV['DB_PASS'] ?? '';
$database = $_ENV['DB_NAME'] ?? 'rondo';
$sqlFile = 'e:/Rondo-Production/db_rondo.sql';

try {
    $pdo = new PDO("mysql:host={$host};port={$port}", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "🗑️ Dropping database `{$database}`...\n";
    $pdo->exec("DROP DATABASE IF EXISTS `{$database}`");
    
    echo "🏗️ Creating database `{$database}`...\n";
    $pdo->exec("CREATE DATABASE `{$database}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("USE `{$database}`");
    
    echo "📄 Loading SQL script from {$sqlFile}...\n";
    $sql = file_get_contents($sqlFile);
    
    echo "⚡ Executing SQL script (this may take a moment)...\n";
    // Using exec for the whole file. If it fails due to size or multi-queries, 
    // we might need a more robust parser, but standard PDO allows multi-queries if configured.
    $pdo->exec($sql);
    
    echo "✅ Database `{$database}` has been reset and populated successfully.\n";
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
