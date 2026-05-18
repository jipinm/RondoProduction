-- =============================================================================
-- Migration: create_email_templates_table
-- Description: Creates the email_templates table for dynamic email template
--              management via the admin panel.
-- =============================================================================

CREATE TABLE IF NOT EXISTS email_templates (
    id              INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    event_key       VARCHAR(100) NOT NULL UNIQUE COMMENT 'Machine key, e.g. email_verification',
    event_label     VARCHAR(150) NOT NULL              COMMENT 'Human-readable label shown in admin UI',
    subject         VARCHAR(255) NOT NULL              COMMENT 'Email subject line',
    body_html       MEDIUMTEXT   NOT NULL              COMMENT 'HTML body; supports {{variable}} placeholders',
    body_text       MEDIUMTEXT   NOT NULL              COMMENT 'Plain-text body; supports {{variable}} placeholders',
    is_active       TINYINT(1)   NOT NULL DEFAULT 1    COMMENT '1 = enabled, 0 = disabled (falls back to hardcoded template)',
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: default templates (match the hardcoded strings in EmailService.php)
-- Admin can later customise these via the Email Management UI.
-- Placeholders use {{double_curly}} syntax.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO email_templates (event_key, event_label, subject, body_html, body_text) VALUES

-- 1. Email Verification (registration)
(
    'email_verification',
    'Email Verification',
    'Verify your email address — Rondo Sport',
    '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your email address</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,''Helvetica Neue'',Arial,sans-serif;background-color:#F7F7F7;color:#1C191D;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.1);overflow:hidden;">
    <div style="background:#245388;padding:1rem 1.5rem;text-align:center;">
      <img src="https://rondosportstickets.com/logo.png" alt="Rondo Sports Travel" style="height:48px;max-width:180px;display:inline-block;" />
    </div>
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
    </div>
    <div style="background:#245388;padding:1.5rem;text-align:center;">
      <img src="https://rondosportstickets.com/logo.png" alt="Rondo Sports Travel" style="height:36px;max-width:150px;display:inline-block;margin-bottom:.5rem;" /><br>
      <p style="margin:.4rem 0 0;color:rgba(255,255,255,.8);font-size:.85rem;">Rondo Sports Travel</p>
    </div>
  </div>
</body>
</html>',
    'Verify your email address

Hi {{customer_name}},

Thank you for registering with Rondo Sport. Please verify your email by visiting:
{{verify_url}}

This link expires in 24 hours.
If you did not create an account, ignore this email.

— Rondo Sports Travel'
),

-- 2. Password Reset
(
    'password_reset',
    'Password Reset',
    'Reset your password — Rondo Sport',
    '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your password</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,''Helvetica Neue'',Arial,sans-serif;background-color:#F7F7F7;color:#1C191D;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.1);overflow:hidden;">
    <div style="background:#245388;padding:1rem 1.5rem;text-align:center;">
      <img src="https://rondosportstickets.com/logo.png" alt="Rondo Sports Travel" style="height:48px;max-width:180px;display:inline-block;" />
    </div>
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
    </div>
    <div style="background:#245388;padding:1.5rem;text-align:center;">
      <img src="https://rondosportstickets.com/logo.png" alt="Rondo Sports Travel" style="height:36px;max-width:150px;display:inline-block;margin-bottom:.5rem;" /><br>
      <p style="margin:.4rem 0 0;color:rgba(255,255,255,.8);font-size:.85rem;">Rondo Sports Travel</p>
    </div>
  </div>
</body>
</html>',
    'Reset your password

Hi {{customer_name}},

Visit the link below to reset your password (expires in 1 hour):
{{reset_url}}

If you did not request this, ignore this email.

— Rondo Sports Travel'
),

-- 3. Email Change Verification
(
    'email_change_verification',
    'Email Change Verification',
    'Confirm your new email address — Rondo Sport',
    '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm your new email address</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,''Helvetica Neue'',Arial,sans-serif;background-color:#F7F7F7;color:#1C191D;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.1);overflow:hidden;">
    <div style="background:#245388;padding:1rem 1.5rem;text-align:center;">
      <img src="https://rondosportstickets.com/logo.png" alt="Rondo Sports Travel" style="height:48px;max-width:180px;display:inline-block;" />
    </div>
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
    </div>
    <div style="background:#245388;padding:1.5rem;text-align:center;">
      <img src="https://rondosportstickets.com/logo.png" alt="Rondo Sports Travel" style="height:36px;max-width:150px;display:inline-block;margin-bottom:.5rem;" /><br>
      <p style="margin:.4rem 0 0;color:rgba(255,255,255,.8);font-size:.85rem;">Rondo Sports Travel</p>
    </div>
  </div>
</body>
</html>',
    'Verify your new email address

Hi {{customer_name}},

You requested to change your email to: {{new_email}}

Confirm this change by visiting:
{{verify_url}}

If you did not request this, contact support immediately.

— Rondo Sports Travel'
),

-- 4. Booking Confirmation
(
    'booking_confirmation',
    'Booking Confirmation',
    'Booking Confirmed — {{booking_reference}}',
    '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmation</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,''Helvetica Neue'',Arial,sans-serif;background-color:#F7F7F7;color:#1C191D;">
  <div style="max-width:640px;margin:40px auto;background:#fff;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.1);overflow:hidden;">
    <div style="background:#245388;padding:1rem 1.5rem;text-align:center;">
      <img src="https://rondosportstickets.com/logo.png" alt="Rondo Sports Travel" style="height:48px;max-width:180px;display:inline-block;" />
    </div>
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
            <td style="padding:.65rem 0;text-align:right;font-family:''Courier New'',monospace;font-weight:700;color:#245388;">{{booking_id}}</td>
          </tr>
          <tr style="border-bottom:1px solid #C7D9ED;">
            <td style="padding:.65rem 0;color:#808080;font-weight:500;">Booking Reference</td>
            <td style="padding:.65rem 0;text-align:right;font-family:''Courier New'',monospace;font-weight:700;color:#83ACDC;">{{booking_reference}}</td>
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
    </div>
    <div style="background:#245388;padding:1.5rem;text-align:center;">
      <img src="https://rondosportstickets.com/logo.png" alt="Rondo Sports Travel" style="height:36px;max-width:150px;display:inline-block;margin-bottom:.5rem;" /><br>
      <p style="margin:.4rem 0 0;color:rgba(255,255,255,.8);font-size:.85rem;">Rondo Sports Travel</p>
    </div>
  </div>
</body>
</html>',
    'Booking Confirmed!

Dear {{customer_name}},

Thank you for your booking!

Booking ID:        {{booking_id}}
Booking Reference: {{booking_reference}}
Event:             {{event_name}}
Date:              {{event_date}}
Venue:             {{venue_name}}
Tickets:           {{ticket_count}}
Total:             {{total_amount}} {{currency}}

Keep this email as your booking reference. Your e-tickets will be delivered separately.

— Rondo Sports Travel'
);
