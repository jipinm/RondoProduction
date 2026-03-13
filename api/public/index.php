<?php
declare(strict_types=1);

// Suppress HTML error output for API
ini_set('display_errors', '0');
ini_set('display_startup_errors', '0');
error_reporting(E_ALL);
ini_set('log_errors', '1');
ini_set('error_log', __DIR__ . '/../logs/php-errors.log');

// Disable PHP output compression for this API proxy.
// zlib.output_compression is enabled in php.ini (cPanel default) but it conflicts
// with HTTP/2: PHP gzip-compresses the body AFTER Slim has already emitted headers,
// causing Apache mod_http2 to send an inconsistent HEADERS+DATA frame pair, which
// browsers report as ERR_HTTP2_PROTOCOL_ERROR on the first (cold) connection.
// Apache mod_deflate / mod_brotli handle transport compression correctly at the
// connection layer, so disabling it here does not affect compression for end-users.
ini_set('zlib.output_compression', '0');

require_once __DIR__ . '/../vendor/autoload.php';

use XS2EventProxy\Application;

// Load environment variables
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

// Create application
$app = new Application();

// Run application
$app->run();
