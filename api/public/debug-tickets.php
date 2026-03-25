<?php
/**
 * Debug script: returns raw Xs2event API response for a specific event's tickets.
 * DELETE THIS FILE after debugging is complete.
 */

$eventId  = 'e14916eaabdd4175aa94a69af8554bd5_spp';
$apiBase  = 'https://api.xs2event.com';
$apiKey   = '29357f32d026462ea29bd491edf5f1bc';

$url = $apiBase . '/v1/tickets?event_id=' . urlencode($eventId);

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER     => [
        'Accept: application/json',
        'X-Api-Key: ' . $apiKey,
    ],
    CURLOPT_TIMEOUT        => 30,
]);

$body     = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error    = curl_error($ch);
curl_close($ch);

header('Content-Type: application/json');

if ($error) {
    echo json_encode(['curl_error' => $error]);
    exit;
}

// Pretty-print the JSON response
$decoded = json_decode($body);
echo json_encode([
    'http_status' => $httpCode,
    'event_id'    => $eventId,
    'url'         => $url,
    'response'    => $decoded ?? $body,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
