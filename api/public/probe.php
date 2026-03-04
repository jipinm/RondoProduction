<?php
// Temporary diagnostic file - DELETE after testing
echo '<pre>';
echo 'PHP binary: ' . PHP_BINARY . "\n";
echo 'PHP version: ' . PHP_VERSION . "\n\n";

$pdo = new PDO(
    'mysql:host=localhost;dbname=d15609_rondosports_db',
    'd15609_rondosports_user',
    'pKdHSaHi7RlMma1f',
    [
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::ATTR_STRINGIFY_FETCHES => false,
    ]
);

$stmt = $pdo->query('SELECT id FROM admin_users LIMIT 1');
$row = $stmt->fetch(PDO::FETCH_ASSOC);

echo 'PDO client version: ' . $pdo->getAttribute(PDO::ATTR_CLIENT_VERSION) . "\n";
echo 'STRINGIFY_FETCHES: ' . var_export($pdo->getAttribute(PDO::ATTR_STRINGIFY_FETCHES), true) . "\n";
echo 'EMULATE_PREPARES: ' . var_export($pdo->getAttribute(PDO::ATTR_EMULATE_PREPARES), true) . "\n";
echo 'ID value: ' . $row['id'] . "\n";
echo 'ID type: ' . gettype($row['id']) . "\n";
echo '</pre>';
