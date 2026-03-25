# SendGrid Email Migration — Implementation Guide

Migrate all email-sending functionality from PHPMailer/SMTP to the SendGrid PHP SDK.

## Background

The current `EmailService` uses PHPMailer with SMTP, but production credentials are placeholders
(`your-email@gmail.com` / `your-app-password`) — **no emails are being sent in production today**.
Additionally, three email types exist only as commented-out TODOs with no `EmailService` injection wired up.

### Email-Sending Locations (Full Audit)

| # | File | HTTP Trigger | Method | Status |
|---|---|---|---|---|
| 1 | `src/Controller/LocalBookingController.php` | `POST /api/v1/local-bookings` | `sendBookingConfirmation()` | Active call — broken (placeholder SMTP creds) |
| 2 | `src/Controller/CustomerAuthController.php` | `POST /api/v1/customers/auth/register` | `sendVerificationEmail()` | Commented out — `EmailService` not injected |
| 3 | `src/Controller/CustomerAuthController.php` | `POST /api/v1/customers/auth/forgot-password` | `sendPasswordResetEmail()` | Commented out — `EmailService` not injected |
| 4 | `src/Controller/CustomerProfileController.php` | `PUT /api/v1/customers/profile` (email change) | `sendEmailChangeVerification()` | Commented out — `EmailService` not injected |

---

## Phase 1 — Dependency Swap

### Task 1.1 — Install SendGrid PHP SDK
Run the following inside the `api/` directory:
```bash
composer require sendgrid/sendgrid
```

### Task 1.2 — Remove PHPMailer
```bash
composer remove phpmailer/phpmailer
```

---

## Phase 2 — Environment Configuration

Apply the following changes to all three env files: `.env`, `.env.production`, `.env.example`.

### Task 2.1 — Remove SMTP variables
Delete these five lines from each env file:
```
SMTP_HOST=...
SMTP_PORT=...
SMTP_USERNAME=...
SMTP_PASSWORD=...
SMTP_SECURE=...
```

### Task 2.2 — Add SendGrid variables
Add the following block in place of the removed SMTP vars under the `# Email Configuration` comment:
```dotenv
# Email Configuration
SENDGRID_API_KEY=        # .env and .env.example: leave blank
                         # .env.production: fill in the real key from SendGrid dashboard
MAIL_FROM_EMAIL=noreply@rondosportstickets.com
MAIL_FROM_NAME="Rondo Sport"
```

> `MAIL_FROM_EMAIL`, `MAIL_FROM_NAME`, and `FRONTEND_URL` already exist and are correct — do not change them.

---

## Phase 3 — Rewrite `EmailService`

**File:** `api/src/Service/EmailService.php`

### Task 3.1 — Replace imports and class properties
Remove all PHPMailer `use` statements and SMTP properties. Replace with:
```php
use SendGrid\Mail\Mail;
use SendGrid;
use Psr\Log\LoggerInterface;

class EmailService
{
    private LoggerInterface $logger;
    private string $sendGridApiKey;
    private string $fromEmail;
    private string $fromName;
    private string $frontendUrl;
```

### Task 3.2 — Rewrite `loadConfiguration()`
```php
private function loadConfiguration(): void
{
    $this->sendGridApiKey = $_ENV['SENDGRID_API_KEY'] ?? '';
    $this->fromEmail      = $_ENV['MAIL_FROM_EMAIL']  ?? 'noreply@rondosportstickets.com';
    $this->fromName       = $_ENV['MAIL_FROM_NAME']   ?? 'Rondo Sport';
    $this->frontendUrl    = rtrim($_ENV['FRONTEND_URL'] ?? 'https://rondosportstickets.com', '/');
}
```

### Task 3.3 — Add private helper `dispatch(Mail $mail): bool`
This is the single point that calls the SendGrid API and handles errors uniformly:
```php
private function dispatch(Mail $mail): bool
{
    if (empty($this->sendGridApiKey)) {
        $this->logger->error('SendGrid API key is not configured');
        return false;
    }

    try {
        $sendGrid = new SendGrid($this->sendGridApiKey);
        $response = $sendGrid->send($mail);

        if ($response->statusCode() === 202) {
            return true;
        }

        $this->logger->error('SendGrid rejected email', [
            'status_code' => $response->statusCode(),
            'body'        => $response->body(),
        ]);
        return false;
    } catch (\Exception $e) {
        $this->logger->error('SendGrid exception', ['error' => $e->getMessage()]);
        return false;
    }
}
```

### Task 3.4 — Rewrite `sendBookingConfirmation(array $bookingData): bool`
Replace the PHPMailer body with a `SendGrid\Mail\Mail` object:
```php
public function sendBookingConfirmation(array $bookingData): bool
{
    try {
        $customerFullName = trim(
            ($bookingData['customer_first_name'] ?? '') . ' ' .
            ($bookingData['customer_last_name']  ?? '')
        ) ?: 'Valued Customer';

        $mail = new Mail();
        $mail->setFrom($this->fromEmail, $this->fromName);
        $mail->setSubject('Booking Confirmation - ' . ($bookingData['booking_reference'] ?? ''));
        $mail->addTo($bookingData['customer_email'], $customerFullName);
        $mail->addContent('text/html',  $this->generateBookingConfirmationHTML($bookingData));
        $mail->addContent('text/plain', $this->generateBookingConfirmationText($bookingData));

        $sent = $this->dispatch($mail);

        if ($sent) {
            $this->logger->info('Booking confirmation email sent', [
                'booking_id'        => $bookingData['booking_id'] ?? null,
                'booking_reference' => $bookingData['booking_reference'] ?? null,
                'customer_email'    => $bookingData['customer_email'],
            ]);
        }

        return $sent;
    } catch (\Exception $e) {
        $this->logger->error('Failed to build booking confirmation email', [
            'booking_id' => $bookingData['booking_id'] ?? 'unknown',
            'error'      => $e->getMessage(),
        ]);
        return false;
    }
}
```

### Task 3.5 — Implement `sendVerificationEmail(array $customer): bool`
New method — did not exist before:
```php
public function sendVerificationEmail(array $customer): bool
{
    try {
        $verifyUrl = $this->frontendUrl
            . '/verify-email?token=' . urlencode($customer['email_verification_token'])
            . '&email='              . urlencode($customer['email']);

        $name = trim(($customer['first_name'] ?? '') . ' ' . ($customer['last_name'] ?? '')) ?: 'Valued Customer';

        $html = '<!DOCTYPE html><html><body style="font-family:sans-serif;color:#1e293b;">'
            . '<h2>Verify your email address</h2>'
            . '<p>Hi ' . htmlspecialchars($name) . ',</p>'
            . '<p>Thank you for registering with Rondo Sport. Please click the button below to verify your email address.</p>'
            . '<p><a href="' . htmlspecialchars($verifyUrl) . '" '
            .    'style="display:inline-block;padding:12px 24px;background:#3b82f6;color:#fff;'
            .    'text-decoration:none;border-radius:8px;font-weight:600;">Verify Email</a></p>'
            . '<p>Or copy and paste this link into your browser:<br><a href="' . htmlspecialchars($verifyUrl) . '">'
            . htmlspecialchars($verifyUrl) . '</a></p>'
            . '<p>This link expires in 24 hours.</p>'
            . '<p>If you did not create an account, you can safely ignore this email.</p>'
            . '<p>— The Rondo Sport Team</p>'
            . '</body></html>';

        $text = "Verify your email address\n\n"
            . "Hi {$name},\n\n"
            . "Please verify your email by visiting:\n{$verifyUrl}\n\n"
            . "This link expires in 24 hours.\n"
            . "If you did not create an account, ignore this email.";

        $mail = new Mail();
        $mail->setFrom($this->fromEmail, $this->fromName);
        $mail->setSubject('Verify your email address — Rondo Sport');
        $mail->addTo($customer['email'], $name);
        $mail->addContent('text/html',  $html);
        $mail->addContent('text/plain', $text);

        return $this->dispatch($mail);
    } catch (\Exception $e) {
        $this->logger->error('Failed to send verification email', [
            'customer_email' => $customer['email'] ?? 'unknown',
            'error'          => $e->getMessage(),
        ]);
        return false;
    }
}
```

### Task 3.6 — Implement `sendPasswordResetEmail(array $customer, string $resetToken): bool`
New method — did not exist before:
```php
public function sendPasswordResetEmail(array $customer, string $resetToken): bool
{
    try {
        $resetUrl = $this->frontendUrl
            . '/reset-password?token=' . urlencode($resetToken)
            . '&email='               . urlencode($customer['email']);

        $name = trim(($customer['first_name'] ?? '') . ' ' . ($customer['last_name'] ?? '')) ?: 'Valued Customer';

        $html = '<!DOCTYPE html><html><body style="font-family:sans-serif;color:#1e293b;">'
            . '<h2>Reset your password</h2>'
            . '<p>Hi ' . htmlspecialchars($name) . ',</p>'
            . '<p>We received a request to reset the password for your Rondo Sport account.</p>'
            . '<p><a href="' . htmlspecialchars($resetUrl) . '" '
            .    'style="display:inline-block;padding:12px 24px;background:#3b82f6;color:#fff;'
            .    'text-decoration:none;border-radius:8px;font-weight:600;">Reset Password</a></p>'
            . '<p>Or copy and paste this link:<br><a href="' . htmlspecialchars($resetUrl) . '">'
            . htmlspecialchars($resetUrl) . '</a></p>'
            . '<p>This link expires in 1 hour. If you did not request a password reset, '
            . 'you can safely ignore this email — your password will not be changed.</p>'
            . '<p>— The Rondo Sport Team</p>'
            . '</body></html>';

        $text = "Reset your password\n\n"
            . "Hi {$name},\n\n"
            . "Visit the link below to reset your password (expires in 1 hour):\n{$resetUrl}\n\n"
            . "If you did not request this, ignore this email.";

        $mail = new Mail();
        $mail->setFrom($this->fromEmail, $this->fromName);
        $mail->setSubject('Reset your password — Rondo Sport');
        $mail->addTo($customer['email'], $name);
        $mail->addContent('text/html',  $html);
        $mail->addContent('text/plain', $text);

        return $this->dispatch($mail);
    } catch (\Exception $e) {
        $this->logger->error('Failed to send password reset email', [
            'customer_email' => $customer['email'] ?? 'unknown',
            'error'          => $e->getMessage(),
        ]);
        return false;
    }
}
```

### Task 3.7 — Implement `sendEmailChangeVerification(array $customer, string $newEmail): bool`
New method — did not exist before:
```php
public function sendEmailChangeVerification(array $customer, string $newEmail): bool
{
    try {
        $verifyUrl = $this->frontendUrl
            . '/verify-email?token=' . urlencode($customer['email_verification_token'])
            . '&email='              . urlencode($newEmail);

        $name = trim(($customer['first_name'] ?? '') . ' ' . ($customer['last_name'] ?? '')) ?: 'Valued Customer';

        $html = '<!DOCTYPE html><html><body style="font-family:sans-serif;color:#1e293b;">'
            . '<h2>Verify your new email address</h2>'
            . '<p>Hi ' . htmlspecialchars($name) . ',</p>'
            . '<p>You recently requested to change the email address on your Rondo Sport account '
            . 'to <strong>' . htmlspecialchars($newEmail) . '</strong>.</p>'
            . '<p>Please click the button below to confirm this change.</p>'
            . '<p><a href="' . htmlspecialchars($verifyUrl) . '" '
            .    'style="display:inline-block;padding:12px 24px;background:#3b82f6;color:#fff;'
            .    'text-decoration:none;border-radius:8px;font-weight:600;">Confirm Email Change</a></p>'
            . '<p>Or copy and paste this link:<br><a href="' . htmlspecialchars($verifyUrl) . '">'
            . htmlspecialchars($verifyUrl) . '</a></p>'
            . '<p>This link expires in 24 hours. If you did not request this change, '
            . 'please contact support immediately.</p>'
            . '<p>— The Rondo Sport Team</p>'
            . '</body></html>';

        $text = "Verify your new email address\n\n"
            . "Hi {$name},\n\n"
            . "You requested to change your email to: {$newEmail}\n\n"
            . "Confirm this change by visiting:\n{$verifyUrl}\n\n"
            . "If you did not request this, contact support immediately.";

        $mail = new Mail();
        $mail->setFrom($this->fromEmail, $this->fromName);
        $mail->setSubject('Confirm your new email address — Rondo Sport');
        $mail->addTo($newEmail, $name);
        $mail->addContent('text/html',  $html);
        $mail->addContent('text/plain', $text);

        return $this->dispatch($mail);
    } catch (\Exception $e) {
        $this->logger->error('Failed to send email change verification', [
            'new_email' => $newEmail,
            'error'     => $e->getMessage(),
        ]);
        return false;
    }
}
```

### Task 3.8 — Remove `createMailer()` and `testConfiguration()`
Delete the `createMailer()` method entirely — it is PHPMailer-specific and replaced by the `dispatch()` helper.
Delete `testConfiguration()` — the SMTP connection test is no longer applicable.

### Task 3.9 — Remove the PHPMailer availability guard in `LocalBookingController`
In `LocalBookingController::createBooking()`, the email block is currently wrapped in:
```php
if (class_exists('PHPMailer\\PHPMailer\\PHPMailer')) { ... }
```
Remove that outer `if` check. The SendGrid SDK is always available as a Composer dependency,
so the guard is unnecessary. The block should call `sendBookingConfirmation()` directly:
```php
try {
    $emailData = array_merge($bookingData, [
        'booking_id'         => $bookingId,
        'customer_email'     => $customerEmail,
        'customer_first_name' => $data['customer_first_name'] ?? 'Guest',
        'customer_last_name'  => $data['customer_last_name']  ?? 'Customer',
    ]);
    $emailSent = $this->emailService->sendBookingConfirmation($emailData);
    if ($emailSent) {
        $this->logger->info('Booking confirmation email sent', ['booking_id' => $bookingId]);
    } else {
        $this->logger->warning('Failed to send booking confirmation email', ['booking_id' => $bookingId]);
    }
} catch (\Throwable $emailException) {
    $this->logger->error('Exception while sending booking confirmation email', [
        'booking_id' => $bookingId,
        'error'      => $emailException->getMessage(),
    ]);
}
```

---

## Phase 4 — Wire `EmailService` into `CustomerAuthController`

**File:** `api/src/Controller/CustomerAuthController.php`

### Task 4.1 — Add `use` import
```php
use XS2EventProxy\Service\EmailService;
```

### Task 4.2 — Add constructor parameter and property
```php
private EmailService $emailService;

public function __construct(
    CustomerRepository $customerRepository,
    CustomerJWTService $jwtService,
    CustomerValidationService $validator,
    LoggerInterface $logger,
    EmailService $emailService          // ← add this
) {
    ...
    $this->emailService = $emailService; // ← add this
}
```

### Task 4.3 — Uncomment verification email in `register()`
Remove the `// TODO` comment block and uncomment:
```php
$this->emailService->sendVerificationEmail($customer);
```

### Task 4.4 — Uncomment password reset email in `forgotPassword()`
Remove the `// TODO` comment block and uncomment:
```php
$this->emailService->sendPasswordResetEmail($customer, $resetToken);
```

---

## Phase 5 — Wire `EmailService` into `CustomerProfileController`

**File:** `api/src/Controller/CustomerProfileController.php`

### Task 5.1 — Add `use` import
```php
use XS2EventProxy\Service\EmailService;
```

### Task 5.2 — Add constructor parameter and property
Add `EmailService $emailService` as a new constructor parameter and assign `$this->emailService = $emailService`.

### Task 5.3 — Uncomment email change verification in `updateProfile()`
Remove the `// TODO` comment block and uncomment:
```php
$this->emailService->sendEmailChangeVerification($customer, $sanitizedData['email']);
```

---

## Phase 6 — Update Dependency Injection in `Application.php`

**File:** `api/src/Application.php`

### Task 6.1 — Pass `$this->emailService` to `CustomerAuthController`
Find the `CustomerAuthController` instantiation in `setupRoutes()` and add `$this->emailService` as the final argument:
```php
$customerAuthController = new CustomerAuthController(
    $customerRepository,
    $customerJWTService,
    $customerValidationService,
    $this->logger,
    $this->emailService    // ← add this
);
```

### Task 6.2 — Pass `$this->emailService` to `CustomerProfileController`
Find the `CustomerProfileController` instantiation and add `$this->emailService` as the final argument:
```php
$customerProfileController = new CustomerProfileController(
    $customerRepository,
    $customerJWTService,
    $customerValidationService,
    $this->logger,
    $this->emailService    // ← add this
);
```

---

## Phase 7 — Production Deployment

### Task 7.1 — Set the real SendGrid API key on the server
On the production server, update `.env.production`:
```
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxx
```
Obtain the key from: **SendGrid Dashboard → Settings → API Keys → Create API Key** (permission: *Mail Send*).

### Task 7.2 — Confirm the sender domain is verified in SendGrid
In the SendGrid dashboard, go to **Settings → Sender Authentication** and verify the domain `rondosportstickets.com`.
This is required for reliable delivery and to avoid spam filtering.

### Task 7.3 — Re-deploy / restart the API
Upload the updated files to the server and run `composer install --no-dev` to pull in the SendGrid package.

---

## Phase 8 — Verification Checklist

After deployment, manually trigger each email type and confirm receipt via **SendGrid Dashboard → Activity Feed**.

| # | How to trigger | Expected email |
|---|---|---|
| 1 | Complete a test booking via the checkout flow | **Booking Confirmation** to customer email |
| 2 | Register a new customer account | **Verify your email address** to the registered email |
| 3 | Trigger forgot-password for an existing account | **Reset your password** to the account email |
| 4 | Update profile email address for a logged-in customer | **Confirm your new email address** to the new email |
