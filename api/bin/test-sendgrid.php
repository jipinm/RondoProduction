<?php
/**
 * SendGrid test script — run from the api/ directory:
 *   php bin/test-sendgrid.php
 */
declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

// Load .env
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

use SendGrid\Mail\Mail;

$apiKey   = $_ENV['SENDGRID_API_KEY'] ?? '';
$fromEmail = $_ENV['MAIL_FROM_EMAIL']  ?? 'noreply@rondosportstickets.com';
$fromName  = $_ENV['MAIL_FROM_NAME']   ?? 'Rondo Sports Tickets';
$toEmail  = 'jipinm@gmail.com';

if (empty($apiKey)) {
    echo "ERROR: SENDGRID_API_KEY is not set in .env\n";
    exit(1);
}

echo "Sending test email...\n";
echo "  From : {$fromName} <{$fromEmail}>\n";
echo "  To   : {$toEmail}\n";

$mail = new Mail();
$mail->setFrom($fromEmail, $fromName);
$mail->setSubject('SendGrid Test — Rondo Sports Tickets');
$mail->addTo($toEmail, 'Rondo Admin');
$mail->addContent('text/html', '
<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;color:#1e293b;padding:2rem;">
  <h2 style="color:#10b981;">&#10003; SendGrid is working!</h2>
  <p>This is a test email confirming that the <strong>SendGrid PHP SDK</strong>
     is correctly configured for <strong>Rondo Sports Tickets</strong>.</p>
  <table style="border-collapse:collapse;margin-top:1rem;">
    <tr><td style="padding:4px 12px 4px 0;color:#64748b;">From</td>
        <td style="padding:4px 0;font-weight:600;">' . htmlspecialchars($fromEmail) . '</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#64748b;">API key prefix</td>
        <td style="padding:4px 0;font-weight:600;">' . substr($apiKey, 0, 10) . '...</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Sent at</td>
        <td style="padding:4px 0;font-weight:600;">' . date('Y-m-d H:i:s T') . '</td></tr>
  </table>
  <p style="margin-top:2rem;color:#64748b;font-size:0.875rem;">
    You can safely ignore this email — it was triggered by <code>bin/test-sendgrid.php</code>.
  </p>
</body>
</html>
');
$mail->addContent('text/plain',
    "SendGrid is working!\n\n"
    . "From    : {$fromEmail}\n"
    . "API key : " . substr($apiKey, 0, 10) . "...\n"
    . "Sent at : " . date('Y-m-d H:i:s T') . "\n\n"
    . "You can safely ignore this email — it was triggered by bin/test-sendgrid.php."
);

try {
    $sg       = new SendGrid($apiKey);
    $response = $sg->send($mail);

    $status = $response->statusCode();
    echo "  HTTP status : {$status}\n";

    if ($status === 202) {
        echo "  Result      : SUCCESS — email queued by SendGrid.\n";
        echo "  Check your inbox at {$toEmail}\n";
        exit(0);
    } else {
        echo "  Result      : FAILED\n";
        echo "  Body        : " . $response->body() . "\n";
        exit(1);
    }
} catch (\Exception $e) {
    echo "  EXCEPTION   : " . $e->getMessage() . "\n";
    exit(1);
}
