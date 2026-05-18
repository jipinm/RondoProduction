<?php

declare(strict_types=1);

namespace XS2EventProxy\Controller;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Log\LoggerInterface;
use XS2EventProxy\Repository\EmailTemplateRepository;

/**
 * EmailTemplateController
 *
 * Admin routes (require AuthMiddleware):
 *   GET  /admin/email-templates           – list all templates
 *   GET  /admin/email-templates/{id}      – get one template by ID
 *   PUT  /admin/email-templates/{id}      – update a template
 *   POST /admin/email-templates/{id}/reset – reset a template to its default content
 */
class EmailTemplateController
{
    private EmailTemplateRepository $repo;
    private LoggerInterface $logger;

    public function __construct(EmailTemplateRepository $repo, LoggerInterface $logger)
    {
        $this->repo   = $repo;
        $this->logger = $logger;
    }

    // -------------------------------------------------------------------------
    // Admin endpoints
    // -------------------------------------------------------------------------

    /**
     * GET /admin/email-templates
     * Returns all email templates for the admin Email Management UI.
     */
    public function getAll(Request $request, Response $response): Response
    {
        try {
            $rows = $this->repo->getAll();
            // Strip body fields from the list view to keep the response compact
            $list = array_map(static function (array $row): array {
                return [
                    'id'          => (int)  $row['id'],
                    'event_key'   =>        $row['event_key'],
                    'event_label' =>        $row['event_label'],
                    'subject'     =>        $row['subject'],
                    'is_active'   => (bool) $row['is_active'],
                    'updated_at'  =>        $row['updated_at'],
                ];
            }, $rows);
            return $this->json($response, ['success' => true, 'data' => $list, 'count' => count($list)]);
        } catch (\Exception $e) {
            $this->logger->error('EmailTemplateController::getAll error', ['error' => $e->getMessage()]);
            return $this->json($response, ['success' => false, 'error' => 'Failed to retrieve email templates'], 500);
        }
    }

    /**
     * GET /admin/email-templates/{id}
     * Returns the full template (including body) for editing.
     */
    public function getOne(Request $request, Response $response, array $args): Response
    {
        $id = (int) ($args['id'] ?? 0);
        if ($id <= 0) {
            return $this->json($response, ['success' => false, 'error' => 'Invalid ID'], 400);
        }

        try {
            $row = $this->repo->getById($id);
            if ($row === null) {
                return $this->json($response, ['success' => false, 'error' => 'Email template not found'], 404);
            }
            // Cast types
            $row['id']        = (int)  $row['id'];
            $row['is_active'] = (bool) $row['is_active'];
            return $this->json($response, ['success' => true, 'data' => $row]);
        } catch (\Exception $e) {
            $this->logger->error('EmailTemplateController::getOne error', ['id' => $id, 'error' => $e->getMessage()]);
            return $this->json($response, ['success' => false, 'error' => 'Failed to retrieve email template'], 500);
        }
    }

    /**
     * PUT /admin/email-templates/{id}
     * Updates subject, body_html, body_text, and/or is_active for a template.
     */
    public function update(Request $request, Response $response, array $args): Response
    {
        $id = (int) ($args['id'] ?? 0);
        if ($id <= 0) {
            return $this->json($response, ['success' => false, 'error' => 'Invalid ID'], 400);
        }

        $body = $request->getParsedBody();
        if (empty($body) || !is_array($body)) {
            return $this->json($response, ['success' => false, 'error' => 'Request body is empty or invalid'], 400);
        }

        $data = [];

        if (isset($body['subject'])) {
            $subject = trim((string) $body['subject']);
            if ($subject === '') {
                return $this->json($response, ['success' => false, 'error' => 'Subject cannot be empty'], 422);
            }
            if (mb_strlen($subject) > 255) {
                return $this->json($response, ['success' => false, 'error' => 'Subject must be 255 characters or fewer'], 422);
            }
            $data['subject'] = $subject;
        }

        if (isset($body['body_html'])) {
            $html = (string) $body['body_html'];
            if (trim($html) === '') {
                return $this->json($response, ['success' => false, 'error' => 'HTML body cannot be empty'], 422);
            }
            $data['body_html'] = $html;
        }

        if (isset($body['body_text'])) {
            $text = (string) $body['body_text'];
            if (trim($text) === '') {
                return $this->json($response, ['success' => false, 'error' => 'Plain-text body cannot be empty'], 422);
            }
            $data['body_text'] = $text;
        }

        if (array_key_exists('is_active', $body)) {
            $data['is_active'] = $body['is_active'] ? 1 : 0;
        }

        if (empty($data)) {
            return $this->json($response, ['success' => false, 'error' => 'No valid fields provided'], 400);
        }

        try {
            $existing = $this->repo->getById($id);
            if ($existing === null) {
                return $this->json($response, ['success' => false, 'error' => 'Email template not found'], 404);
            }

            $this->repo->update($id, $data);
            $updated = $this->repo->getById($id);
            $updated['id']        = (int)  $updated['id'];
            $updated['is_active'] = (bool) $updated['is_active'];

            $this->logger->info('EmailTemplateController: template updated', [
                'id'        => $id,
                'event_key' => $existing['event_key'],
            ]);

            return $this->json($response, [
                'success' => true,
                'message' => 'Email template updated successfully',
                'data'    => $updated,
            ]);
        } catch (\Exception $e) {
            $this->logger->error('EmailTemplateController::update error', ['id' => $id, 'error' => $e->getMessage()]);
            return $this->json($response, ['success' => false, 'error' => 'Failed to update email template'], 500);
        }
    }

    /**
     * POST /admin/email-templates/{id}/reset
     * Resets a template to its built-in default content.
     * The defaults are defined here in code (mirrors the migration seed values).
     */
    public function reset(Request $request, Response $response, array $args): Response
    {
        $id = (int) ($args['id'] ?? 0);
        if ($id <= 0) {
            return $this->json($response, ['success' => false, 'error' => 'Invalid ID'], 400);
        }

        try {
            $existing = $this->repo->getById($id);
            if ($existing === null) {
                return $this->json($response, ['success' => false, 'error' => 'Email template not found'], 404);
            }

            $defaults = $this->getDefaultContent($existing['event_key']);
            if ($defaults === null) {
                return $this->json($response, ['success' => false, 'error' => 'No default content available for this template'], 400);
            }

            $this->repo->resetToDefault($id, $defaults);
            $updated = $this->repo->getById($id);
            $updated['id']        = (int)  $updated['id'];
            $updated['is_active'] = (bool) $updated['is_active'];

            $this->logger->info('EmailTemplateController: template reset to default', [
                'id'        => $id,
                'event_key' => $existing['event_key'],
            ]);

            return $this->json($response, [
                'success' => true,
                'message' => 'Email template reset to default content',
                'data'    => $updated,
            ]);
        } catch (\Exception $e) {
            $this->logger->error('EmailTemplateController::reset error', ['id' => $id, 'error' => $e->getMessage()]);
            return $this->json($response, ['success' => false, 'error' => 'Failed to reset email template'], 500);
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private function json(Response $response, array $data, int $status = 200): Response
    {
        $response->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus($status);
    }

    /**
     * Returns the original seed content for a given event_key.
     * Must stay in sync with the migration file.
     */
    private function getDefaultContent(string $eventKey): ?array
    {
        $logoBar    = '<div style="background:#245388;padding:1rem 1.5rem;text-align:center;">'
            . '<img src="https://rondosportstickets.com/logo.png" alt="Rondo Sports Travel" style="height:48px;max-width:180px;display:inline-block;" />'
            . '</div>';
        $footerBar  = '<div style="background:#245388;padding:1.5rem;text-align:center;">'
            . '<img src="https://rondosportstickets.com/logo.png" alt="Rondo Sports Travel" style="height:36px;max-width:150px;display:inline-block;margin-bottom:.5rem;" /><br>'
            . '<p style="margin:.4rem 0 0;color:rgba(255,255,255,.8);font-size:.85rem;">Rondo Sports Travel</p>'
            . '</div>';

        $defaults = [
            'email_verification' => [
                'subject'   => 'Verify your email address — Rondo Sport',
                'body_html' => '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your email address</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif;background-color:#F7F7F7;color:#1C191D;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.1);overflow:hidden;">'
    . $logoBar . '
    <div style="background:linear-gradient(135deg,#245388 0%,#83ACDC 100%);padding:2rem;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:1.75rem;font-weight:700;">Verify Your Email</h1>
      <p style="margin:.5rem 0 0;color:rgba(255,255,255,.9);">One quick step to activate your account</p>
    </div>
    <div style="padding:2.5rem;">
      <p style="font-size:1.05rem;">Hi {{customer_name}},</p>
      <p>Thank you for registering with Rondo Sport. Please click the button below to verify your email address.</p>
      <div style="text-align:center;margin:2rem 0;">
        <a href="{{verify_url}}" style="display:inline-block;padding:14px 28px;background:#C0504C;color:#fff;text-decoration:none;border-radius:10px;font-size:1rem;font-weight:600;">Verify Email Address</a>
      </div>
      <p style="color:#808080;font-size:.9rem;">Or copy and paste this link into your browser:<br>
        <a href="{{verify_url}}" style="color:#245388;word-break:break-all;">{{verify_url}}</a>
      </p>
      <p style="color:#808080;font-size:.9rem;">This link expires in <strong>24 hours</strong>.</p>
      <p style="color:#808080;font-size:.85rem;">If you did not create an account, you can safely ignore this email.</p>
    </div>'
    . $footerBar . '
  </div>
</body>
</html>',
                'body_text' => "Verify your email address\n\nHi {{customer_name}},\n\nThank you for registering with Rondo Sport. Please verify your email by visiting:\n{{verify_url}}\n\nThis link expires in 24 hours.\nIf you did not create an account, ignore this email.\n\n— Rondo Sports Travel",
            ],
            'password_reset' => [
                'subject'   => 'Reset your password — Rondo Sport',
                'body_html' => '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your password</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif;background-color:#F7F7F7;color:#1C191D;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.1);overflow:hidden;">'
    . $logoBar . '
    <div style="background:linear-gradient(135deg,#C0504C 0%,#DD938C 100%);padding:2rem;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:1.75rem;font-weight:700;">Reset Your Password</h1>
      <p style="margin:.5rem 0 0;color:rgba(255,255,255,.9);">We received a request to reset your password</p>
    </div>
    <div style="padding:2.5rem;">
      <p style="font-size:1.05rem;">Hi {{customer_name}},</p>
      <p>We received a request to reset the password for your Rondo Sport account.</p>
      <div style="text-align:center;margin:2rem 0;">
        <a href="{{reset_url}}" style="display:inline-block;padding:14px 28px;background:#C0504C;color:#fff;text-decoration:none;border-radius:10px;font-size:1rem;font-weight:600;">Reset Password</a>
      </div>
      <p style="color:#808080;font-size:.9rem;">Or copy and paste this link into your browser:<br>
        <a href="{{reset_url}}" style="color:#C0504C;word-break:break-all;">{{reset_url}}</a>
      </p>
      <p style="color:#808080;font-size:.9rem;">This link expires in <strong>1 hour</strong>.</p>
      <p style="color:#808080;font-size:.85rem;">If you did not request a password reset, you can safely ignore this email — your password will not be changed.</p>
    </div>'
    . $footerBar . '
  </div>
</body>
</html>',
                'body_text' => "Reset your password\n\nHi {{customer_name}},\n\nVisit the link below to reset your password (expires in 1 hour):\n{{reset_url}}\n\nIf you did not request this, ignore this email.\n\n— Rondo Sports Travel",
            ],
            'email_change_verification' => [
                'subject'   => 'Confirm your new email address — Rondo Sport',
                'body_html' => '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm your new email address</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif;background-color:#F7F7F7;color:#1C191D;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.1);overflow:hidden;">'
    . $logoBar . '
    <div style="background:linear-gradient(135deg,#245388 0%,#83ACDC 100%);padding:2rem;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:1.75rem;font-weight:700;">Confirm Email Change</h1>
      <p style="margin:.5rem 0 0;color:rgba(255,255,255,.9);">Verify your new email address</p>
    </div>
    <div style="padding:2.5rem;">
      <p style="font-size:1.05rem;">Hi {{customer_name}},</p>
      <p>You recently requested to change the email address on your Rondo Sport account to <strong>{{new_email}}</strong>.</p>
      <p>Please click the button below to confirm this change.</p>
      <div style="text-align:center;margin:2rem 0;">
        <a href="{{verify_url}}" style="display:inline-block;padding:14px 28px;background:#C0504C;color:#fff;text-decoration:none;border-radius:10px;font-size:1rem;font-weight:600;">Confirm Email Change</a>
      </div>
      <p style="color:#808080;font-size:.9rem;">Or copy and paste this link into your browser:<br>
        <a href="{{verify_url}}" style="color:#245388;word-break:break-all;">{{verify_url}}</a>
      </p>
      <p style="color:#808080;font-size:.9rem;">This link expires in <strong>24 hours</strong>.</p>
      <p style="color:#808080;font-size:.85rem;">If you did not request this change, please contact support immediately.</p>
    </div>'
    . $footerBar . '
  </div>
</body>
</html>',
                'body_text' => "Verify your new email address\n\nHi {{customer_name}},\n\nYou requested to change your email to: {{new_email}}\n\nConfirm this change by visiting:\n{{verify_url}}\n\nIf you did not request this, contact support immediately.\n\n— Rondo Sports Travel",
            ],
            'booking_confirmation' => [
                'subject'   => 'Booking Confirmed — {{booking_reference}}',
                'body_html' => '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmation</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif;background-color:#F7F7F7;color:#1C191D;">
  <div style="max-width:640px;margin:40px auto;background:#fff;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.1);overflow:hidden;">'
    . $logoBar . '
    <div style="background:linear-gradient(135deg,#245388 0%,#83ACDC 100%);padding:2rem;text-align:center;">
      <div style="width:70px;height:70px;margin:0 auto 1rem;background:rgba(255,255,255,.2);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:2.25rem;color:#fff;">✓</div>
      <h1 style="margin:0;color:#fff;font-size:2rem;font-weight:700;">Booking Confirmed!</h1>
      <p style="margin:.5rem 0 0;color:rgba(255,255,255,.9);">Your reservation has been successfully processed</p>
    </div>
    <div style="padding:2.5rem;">
      <p style="font-size:1.05rem;">Dear {{customer_name}},</p>
      <p>Thank you for your booking! Below are the details of your reservation:</p>
      <div style="background:#F7F7F7;border-radius:10px;padding:1.5rem;margin:1.5rem 0;border:1px solid #C7D9ED;">
        <table style="width:100%;border-collapse:collapse;">
          <tr style="border-bottom:1px solid #C7D9ED;">
            <td style="padding:.65rem 0;color:#808080;font-weight:500;">Booking ID</td>
            <td style="padding:.65rem 0;text-align:right;font-family:\'Courier New\',monospace;font-weight:700;color:#245388;">{{booking_id}}</td>
          </tr>
          <tr style="border-bottom:1px solid #C7D9ED;">
            <td style="padding:.65rem 0;color:#808080;font-weight:500;">Booking Reference</td>
            <td style="padding:.65rem 0;text-align:right;font-family:\'Courier New\',monospace;font-weight:700;color:#83ACDC;">{{booking_reference}}</td>
          </tr>
          <tr style="border-bottom:1px solid #C7D9ED;">
            <td style="padding:.65rem 0;color:#808080;font-weight:500;">Event</td>
            <td style="padding:.65rem 0;text-align:right;font-weight:600;">{{event_name}}</td>
          </tr>
          <tr style="border-bottom:1px solid #C7D9ED;">
            <td style="padding:.65rem 0;color:#808080;font-weight:500;">Date</td>
            <td style="padding:.65rem 0;text-align:right;font-weight:600;">{{event_date}}</td>
          </tr>
          <tr style="border-bottom:1px solid #C7D9ED;">
            <td style="padding:.65rem 0;color:#808080;font-weight:500;">Venue</td>
            <td style="padding:.65rem 0;text-align:right;font-weight:600;">{{venue_name}}</td>
          </tr>
          <tr style="border-bottom:1px solid #C7D9ED;">
            <td style="padding:.65rem 0;color:#808080;font-weight:500;">Tickets</td>
            <td style="padding:.65rem 0;text-align:right;font-weight:600;">{{ticket_count}}</td>
          </tr>
          <tr>
            <td style="padding:.65rem 0;color:#808080;font-weight:500;">Total</td>
            <td style="padding:.65rem 0;text-align:right;font-size:1.15rem;font-weight:700;color:#245388;">{{total_amount}} {{currency}}</td>
          </tr>
        </table>
      </div>
      <div style="background:#C7D9ED;border-radius:10px;padding:1.25rem 1.5rem;border:1px solid #DD938C;margin:1.5rem 0;">
        <h3 style="margin:0 0 .75rem;color:#C0504C;font-size:1.1rem;">Next Steps</h3>
        <ul style="margin:0;padding-left:1.5rem;color:#1C191D;">
          <li style="margin-bottom:.4rem;">Keep this email as your booking reference.</li>
          <li style="margin-bottom:.4rem;">Your e-tickets will be delivered separately.</li>
          <li>Contact support if you have any questions.</li>
        </ul>
      </div>
    </div>'
    . $footerBar . '
  </div>
</body>
</html>',
                'body_text' => "Booking Confirmed!\n\nDear {{customer_name}},\n\nThank you for your booking!\n\nBooking ID:        {{booking_id}}\nBooking Reference: {{booking_reference}}\nEvent:             {{event_name}}\nDate:              {{event_date}}\nVenue:             {{venue_name}}\nTickets:           {{ticket_count}}\nTotal:             {{total_amount}} {{currency}}\n\nKeep this email as your booking reference. Your e-tickets will be delivered separately.\n\n— Rondo Sports Travel",
            ],
        ];

        return $defaults[$eventKey] ?? null;
    }
}
