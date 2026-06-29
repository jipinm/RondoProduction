-- =============================================================================
-- Migration: add_account_created_email_template
-- Description: Inserts the "Account Created" welcome email template into the
--              email_templates table. This email is sent to the customer
--              immediately after successful registration.
-- Placeholders: {{customer_name}}, {{customer_email}}, {{login_url}}
-- Run once; INSERT IGNORE prevents duplicate-key errors on re-run.
-- =============================================================================

INSERT IGNORE INTO `email_templates`
    (`event_key`, `event_label`, `subject`, `body_html`, `body_text`, `is_active`)
VALUES (
    'account_created',
    'Account Created',
    'Welcome to Rondo Sport, {{customer_name}}!',

-- ── HTML body ────────────────────────────────────────────────────────────────
'<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Rondo Sport</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,''Helvetica Neue'',Arial,sans-serif;background-color:#F7F7F7;color:#1C191D;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.1);overflow:hidden;">

    <div style="background:#245388;padding:1rem 1.5rem;text-align:center;">
      <img src="https://rondosportstickets.com/logo.png" alt="Rondo Sports Travel" style="height:48px;max-width:180px;display:inline-block;" />
    </div>

    <div style="background:linear-gradient(135deg,#245388 0%,#83ACDC 100%);padding:2rem;text-align:center;">
      <div style="width:70px;height:70px;margin:0 auto 1rem;background:rgba(255,255,255,.2);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:2.25rem;color:#fff;">&#10003;</div>
      <h1 style="margin:0;color:#fff;font-size:1.75rem;font-weight:700;">Welcome to Rondo Sport!</h1>
      <p style="margin:.5rem 0 0;color:rgba(255,255,255,.9);">Your account has been created successfully</p>
    </div>

    <div style="padding:2.5rem;">
      <p style="font-size:1.05rem;">Hi {{customer_name}},</p>
      <p>Thank you for joining Rondo Sport! Your account is now active and ready to use. Start exploring upcoming sports events and book your tickets today.</p>

      <div style="background:#F7F7F7;border-radius:10px;padding:1.25rem 1.5rem;margin:1.5rem 0;border:1px solid #C7D9ED;">
        <p style="margin:0 0 .4rem;font-weight:600;color:#245388;font-size:1rem;">Your Account Details</p>
        <p style="margin:0;color:#555;font-size:.95rem;">Email: <strong>{{customer_email}}</strong></p>
      </div>

      <div style="text-align:center;margin:2rem 0;">
        <a href="{{login_url}}" style="display:inline-block;padding:14px 28px;background:#C0504C;color:#fff;text-decoration:none;border-radius:10px;font-size:1rem;font-weight:600;">Login to Your Account</a>
      </div>

      <p style="color:#808080;font-size:.9rem;">If you did not create this account, please contact our support team immediately at <a href="mailto:support@rondosport.com" style="color:#245388;">support@rondosport.com</a>.</p>
    </div>

    <div style="background:#245388;padding:1.5rem;text-align:center;">
      <img src="https://rondosportstickets.com/logo.png" alt="Rondo Sports Travel" style="height:36px;max-width:150px;display:inline-block;margin-bottom:.5rem;" /><br>
      <p style="margin:.4rem 0 0;color:rgba(255,255,255,.8);font-size:.85rem;">Rondo Sports Travel</p>
    </div>

  </div>
</body>
</html>',

-- ── Plain-text body ───────────────────────────────────────────────────────────
'Welcome to Rondo Sport!

Hi {{customer_name}},

Thank you for joining Rondo Sport! Your account is now active and ready to use.

Account Details
---------------
Email: {{customer_email}}

Login to your account:
{{login_url}}

If you did not create this account, please contact our support team immediately at support@rondosport.com.

— Rondo Sports Travel',

    1
);
