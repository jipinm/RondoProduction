<?php

declare(strict_types=1);

namespace XS2EventProxy\Service;

use SendGrid\Mail\Mail;
use Psr\Log\LoggerInterface;
use XS2EventProxy\Repository\EmailTemplateRepository;

class EmailService
{
    private LoggerInterface $logger;
    private string $sendGridApiKey;
    private string $fromEmail;
    private string $fromName;
    private string $frontendUrl;
    private ?EmailTemplateRepository $templateRepo;

    public function __construct(LoggerInterface $logger, ?EmailTemplateRepository $templateRepo = null)
    {
        $this->logger       = $logger;
        $this->templateRepo = $templateRepo;
        $this->loadConfiguration();
    }

    /**
     * Attempt to render a dynamic template from the database.
     * Returns an array with keys 'subject', 'html', 'text', or null when no
     * active DB template exists for the given event key.
     *
     * Placeholders use {{variable_name}} syntax and are replaced with the
     * values supplied in $vars.  Unknown placeholders are left untouched.
     *
     * @param  string  $eventKey  e.g. 'email_verification'
     * @param  array   $vars      Associative map of placeholder => value
     * @return array{subject:string,html:string,text:string}|null
     */
    private function renderTemplate(string $eventKey, array $vars): ?array
    {
        if ($this->templateRepo === null) {
            return null;
        }

        try {
            $tpl = $this->templateRepo->getActiveByEventKey($eventKey);
        } catch (\Exception $e) {
            $this->logger->warning('EmailService: failed to load template from DB, using hardcoded fallback', [
                'event_key' => $eventKey,
                'error'     => $e->getMessage(),
            ]);
            return null;
        }

        if ($tpl === null) {
            return null;
        }

        $subject = $this->interpolate($tpl['subject'],   $vars);
        $html    = $this->interpolate($tpl['body_html'], $vars);
        $text    = $this->interpolate($tpl['body_text'], $vars);

        return ['subject' => $subject, 'html' => $html, 'text' => $text];
    }

    /**
     * Replace {{placeholder}} tokens in $template with values from $vars.
     */
    private function interpolate(string $template, array $vars): string
    {
        foreach ($vars as $key => $value) {
            $template = str_replace('{{' . $key . '}}', (string) $value, $template);
        }
        return $template;
    }

    private function loadConfiguration(): void
    {
        $this->sendGridApiKey = $_ENV['SENDGRID_API_KEY'] ?? '';
        $this->fromEmail      = $_ENV['MAIL_FROM_EMAIL']  ?? 'noreply@rondosportstickets.com';
        $this->fromName       = $_ENV['MAIL_FROM_NAME']   ?? 'Rondo Sport';
        $this->frontendUrl    = rtrim($_ENV['FRONTEND_URL'] ?? 'https://rondosportstickets.com', '/');
    }

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

    public function sendBookingConfirmation(array $bookingData): bool
    {
        try {
            $customerFullName = trim(
                ($bookingData['customer_first_name'] ?? '') . ' ' .
                ($bookingData['customer_last_name']  ?? '')
            ) ?: 'Valued Customer';

            $formattedDate   = $this->formatDate((string)($bookingData['event_date'] ?? ''));
            $formattedAmount = $this->formatAmount($bookingData['total_amount'] ?? 0, (string)($bookingData['currency'] ?? 'USD'));

            $vars = [
                'customer_name'     => $customerFullName,
                'booking_id'        => (string)($bookingData['booking_id'] ?? ''),
                'booking_reference' => (string)($bookingData['booking_reference'] ?? ''),
                'event_name'        => (string)($bookingData['event_name'] ?? 'Event'),
                'event_date'        => $formattedDate,
                'venue_name'        => (string)($bookingData['venue_name'] ?? ''),
                'ticket_count'      => (string)(int)($bookingData['ticket_count'] ?? 1),
                'total_amount'      => $formattedAmount,
                'currency'          => (string)($bookingData['currency'] ?? 'USD'),
            ];

            $tpl = $this->renderTemplate('booking_confirmation', $vars);

            $mail = new Mail();
            $mail->setFrom($this->fromEmail, $this->fromName);
            $mail->addTo($bookingData['customer_email'], $customerFullName);

            if ($tpl !== null) {
                $mail->setSubject($tpl['subject']);
                $mail->addContent('text/html',  $tpl['html']);
                $mail->addContent('text/plain', $tpl['text']);
            } else {
                $mail->setSubject('Booking Confirmation - ' . ($bookingData['booking_reference'] ?? ''));
                $mail->addContent('text/html',  $this->generateBookingConfirmationHTML($bookingData));
                $mail->addContent('text/plain', $this->generateBookingConfirmationText($bookingData));
            }

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

    public function sendVerificationEmail(array $customer): bool
    {
        try {
            $verifyUrl = $this->frontendUrl
                . '/verify-email?token=' . urlencode($customer['email_verification_token'])
                . '&email='              . urlencode($customer['email']);

            $name = trim(($customer['first_name'] ?? '') . ' ' . ($customer['last_name'] ?? '')) ?: 'Valued Customer';

            $vars = [
                'customer_name' => $name,
                'verify_url'    => $verifyUrl,
            ];

            $tpl = $this->renderTemplate('email_verification', $vars);

            $mail = new Mail();
            $mail->setFrom($this->fromEmail, $this->fromName);
            $mail->addTo($customer['email'], $name);

            if ($tpl !== null) {
                $mail->setSubject($tpl['subject']);
                $mail->addContent('text/html',  $tpl['html']);
                $mail->addContent('text/plain', $tpl['text']);
            } else {
                $html = '<!DOCTYPE html><html><body style="margin:0;padding:0;font-family:sans-serif;background:#F7F7F7;">'
                    . '<div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;">'
                    . '<div style="background:#245388;padding:1rem 1.5rem;text-align:center;">'
                    . '<img src="https://rondosportstickets.com/logo.png" alt="Rondo Sports Travel" style="height:44px;max-width:170px;display:inline-block;" />'
                    . '</div>'
                    . '<div style="padding:2rem;color:#1C191D;">'
                    . '<h2>Verify your email address</h2>'
                    . '<p>Hi ' . htmlspecialchars($name) . ',</p>'
                    . '<p>Thank you for registering with Rondo Sport. Please click the button below to verify your email address.</p>'
                    . '<p><a href="' . htmlspecialchars($verifyUrl) . '" '
                    .    'style="display:inline-block;padding:12px 24px;background:#C0504C;color:#fff;'
                    .    'text-decoration:none;border-radius:8px;font-weight:600;">Verify Email</a></p>'
                    . '<p>Or copy and paste this link into your browser:<br><a href="' . htmlspecialchars($verifyUrl) . '">'
                    . htmlspecialchars($verifyUrl) . '</a></p>'
                    . '<p>This link expires in 24 hours.</p>'
                    . '<p>If you did not create an account, you can safely ignore this email.</p>'
                    . '</div>'
                    . '<div style="background:#245388;padding:1rem;text-align:center;">'
                    . '<img src="https://rondosportstickets.com/logo.png" alt="Rondo Sports Travel" style="height:32px;max-width:130px;display:inline-block;margin-bottom:.35rem;" /><br>'
                    . '<span style="color:rgba(255,255,255,.8);font-size:.8rem;">Rondo Sports Travel</span>'
                    . '</div>'
                    . '</div>'
                    . '</body></html>';

                $text = "Verify your email address\n\n"
                    . "Hi {$name},\n\n"
                    . "Please verify your email by visiting:\n{$verifyUrl}\n\n"
                    . "This link expires in 24 hours.\n"
                    . "If you did not create an account, ignore this email.\n\n"
                    . '— Rondo Sports Travel';

                $mail->setSubject('Verify your email address — Rondo Sport');
                $mail->addContent('text/html',  $html);
                $mail->addContent('text/plain', $text);
            }

            return $this->dispatch($mail);
        } catch (\Exception $e) {
            $this->logger->error('Failed to send verification email', [
                'customer_email' => $customer['email'] ?? 'unknown',
                'error'          => $e->getMessage(),
            ]);
            return false;
        }
    }

    public function sendPasswordResetEmail(array $customer, string $resetToken): bool
    {
        try {
            $resetUrl = $this->frontendUrl
                . '/reset-password?token=' . urlencode($resetToken)
                . '&email='               . urlencode($customer['email']);

            $name = trim(($customer['first_name'] ?? '') . ' ' . ($customer['last_name'] ?? '')) ?: 'Valued Customer';

            $vars = [
                'customer_name' => $name,
                'reset_url'     => $resetUrl,
            ];

            $tpl = $this->renderTemplate('password_reset', $vars);

            $mail = new Mail();
            $mail->setFrom($this->fromEmail, $this->fromName);
            $mail->addTo($customer['email'], $name);

            if ($tpl !== null) {
                $mail->setSubject($tpl['subject']);
                $mail->addContent('text/html',  $tpl['html']);
                $mail->addContent('text/plain', $tpl['text']);
            } else {
                $html = '<!DOCTYPE html><html><body style="margin:0;padding:0;font-family:sans-serif;background:#F7F7F7;">'
                    . '<div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;">'
                    . '<div style="background:#245388;padding:1rem 1.5rem;text-align:center;">'
                    . '<img src="https://rondosportstickets.com/logo.png" alt="Rondo Sports Travel" style="height:44px;max-width:170px;display:inline-block;" />'
                    . '</div>'
                    . '<div style="padding:2rem;color:#1C191D;">'
                    . '<h2>Reset your password</h2>'
                    . '<p>Hi ' . htmlspecialchars($name) . ',</p>'
                    . '<p>We received a request to reset the password for your Rondo Sport account.</p>'
                    . '<p><a href="' . htmlspecialchars($resetUrl) . '" '
                    .    'style="display:inline-block;padding:12px 24px;background:#C0504C;color:#fff;'
                    .    'text-decoration:none;border-radius:8px;font-weight:600;">Reset Password</a></p>'
                    . '<p>Or copy and paste this link:<br><a href="' . htmlspecialchars($resetUrl) . '">'
                    . htmlspecialchars($resetUrl) . '</a></p>'
                    . '<p>This link expires in 1 hour. If you did not request a password reset, '
                    . 'you can safely ignore this email — your password will not be changed.</p>'
                    . '</div>'
                    . '<div style="background:#245388;padding:1rem;text-align:center;">'
                    . '<img src="https://rondosportstickets.com/logo.png" alt="Rondo Sports Travel" style="height:32px;max-width:130px;display:inline-block;margin-bottom:.35rem;" /><br>'
                    . '<span style="color:rgba(255,255,255,.8);font-size:.8rem;">Rondo Sports Travel</span>'
                    . '</div>'
                    . '</div>'
                    . '</body></html>';

                $text = "Reset your password\n\n"
                    . "Hi {$name},\n\n"
                    . "Visit the link below to reset your password (expires in 1 hour):\n{$resetUrl}\n\n"
                    . "If you did not request this, ignore this email.\n\n"
                    . '— Rondo Sports Travel';

                $mail->setSubject('Reset your password — Rondo Sport');
                $mail->addContent('text/html',  $html);
                $mail->addContent('text/plain', $text);
            }

            return $this->dispatch($mail);
        } catch (\Exception $e) {
            $this->logger->error('Failed to send password reset email', [
                'customer_email' => $customer['email'] ?? 'unknown',
                'error'          => $e->getMessage(),
            ]);
            return false;
        }
    }

    public function sendEmailChangeVerification(array $customer, string $newEmail): bool
    {
        try {
            $verifyUrl = $this->frontendUrl
                . '/verify-email?token=' . urlencode($customer['email_verification_token'])
                . '&email='              . urlencode($newEmail);

            $name = trim(($customer['first_name'] ?? '') . ' ' . ($customer['last_name'] ?? '')) ?: 'Valued Customer';

            $vars = [
                'customer_name' => $name,
                'new_email'     => $newEmail,
                'verify_url'    => $verifyUrl,
            ];

            $tpl = $this->renderTemplate('email_change_verification', $vars);

            $mail = new Mail();
            $mail->setFrom($this->fromEmail, $this->fromName);
            $mail->addTo($newEmail, $name);

            if ($tpl !== null) {
                $mail->setSubject($tpl['subject']);
                $mail->addContent('text/html',  $tpl['html']);
                $mail->addContent('text/plain', $tpl['text']);
            } else {
                $html = '<!DOCTYPE html><html><body style="margin:0;padding:0;font-family:sans-serif;background:#F7F7F7;">'
                    . '<div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;">'
                    . '<div style="background:#245388;padding:1rem 1.5rem;text-align:center;">'
                    . '<img src="https://rondosportstickets.com/logo.png" alt="Rondo Sports Travel" style="height:44px;max-width:170px;display:inline-block;" />'
                    . '</div>'
                    . '<div style="padding:2rem;color:#1C191D;">'
                    . '<h2>Verify your new email address</h2>'
                    . '<p>Hi ' . htmlspecialchars($name) . ',</p>'
                    . '<p>You recently requested to change the email address on your Rondo Sport account '
                    . 'to <strong>' . htmlspecialchars($newEmail) . '</strong>.</p>'
                    . '<p>Please click the button below to confirm this change.</p>'
                    . '<p><a href="' . htmlspecialchars($verifyUrl) . '" '
                    .    'style="display:inline-block;padding:12px 24px;background:#C0504C;color:#fff;'
                    .    'text-decoration:none;border-radius:8px;font-weight:600;">Confirm Email Change</a></p>'
                    . '<p>Or copy and paste this link:<br><a href="' . htmlspecialchars($verifyUrl) . '">'
                    . htmlspecialchars($verifyUrl) . '</a></p>'
                    . '<p>This link expires in 24 hours. If you did not request this change, '
                    . 'please contact support immediately.</p>'
                    . '</div>'
                    . '<div style="background:#245388;padding:1rem;text-align:center;">'
                    . '<img src="https://rondosportstickets.com/logo.png" alt="Rondo Sports Travel" style="height:32px;max-width:130px;display:inline-block;margin-bottom:.35rem;" /><br>'
                    . '<span style="color:rgba(255,255,255,.8);font-size:.8rem;">Rondo Sports Travel</span>'
                    . '</div>'
                    . '</div>'
                    . '</body></html>';

                $text = "Verify your new email address\n\n"
                    . "Hi {$name},\n\n"
                    . "You requested to change your email to: {$newEmail}\n\n"
                    . "Confirm this change by visiting:\n{$verifyUrl}\n\n"
                    . "If you did not request this, contact support immediately.\n\n"
                    . '— Rondo Sports Travel';

                $mail->setSubject('Confirm your new email address — Rondo Sport');
                $mail->addContent('text/html',  $html);
                $mail->addContent('text/plain', $text);
            }

            return $this->dispatch($mail);
        } catch (\Exception $e) {
            $this->logger->error('Failed to send email change verification', [
                'new_email' => $newEmail,
                'error'     => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Generate HTML email template for booking confirmation
     */
    private function generateBookingConfirmationHTML(array $data): string
    {
        $bookingReference = (string)($data['booking_reference'] ?? '');
        $apiReservationId = (string)($data['api_reservation_id'] ?? '');
        $bookingId = (string)($data['booking_id'] ?? '');
        $eventName = (string)($data['event_name'] ?? 'Event');
        $eventDate = (string)($data['event_date'] ?? '');
        $totalAmount = $data['total_amount'] ?? 0;
        $currency = (string)($data['currency'] ?? 'USD');
        $customerName = trim(($data['customer_first_name'] ?? '') . ' ' . ($data['customer_last_name'] ?? '')) ?: 'Valued Customer';
        $venueInfo = (string)($data['venue_name'] ?? '');
        $ticketCount = (int)($data['ticket_count'] ?? 1);
        $seatInfo = (string)($data['seat_info'] ?? '');
        $eventStartTime = (string)($data['event_start_time'] ?? $eventDate);

        // Format amount
        $formattedAmount = $this->formatAmount($totalAmount, $currency);
        
        // Format date
        $formattedEventDate = $this->formatDate($eventDate);
        $formattedEventTime = $this->formatTime($eventStartTime);

        $html = '
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Booking Confirmation - ' . htmlspecialchars($bookingReference) . '</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background-color: #F7F7F7;
            color: #1C191D;
            line-height: 1.6;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem 1rem;
        }
        
        .email-card {
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            animation: slideUp 0.6s ease-out;
        }
        
        .header {
            background: linear-gradient(135deg, #245388 0%, #83ACDC 100%);
            padding: 2rem;
            text-align: center;
        }
        
        .success-icon {
            width: 80px;
            height: 80px;
            margin: 0 auto 1rem;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2.5rem;
            color: white;
            font-weight: bold;
        }
        
        .header h1 {
            margin: 0;
            color: white;
            font-size: 2.25rem;
            font-weight: 700;
        }
        
        .header p {
            margin: 0.5rem 0 0 0;
            color: rgba(255, 255, 255, 0.9);
            font-size: 1.125rem;
        }
        
        .content {
            padding: 3rem;
        }
        
        .greeting {
            font-size: 1.25rem;
            color: #1C191D;
            margin-bottom: 1.5rem;
        }
        
        .booking-details {
            background: linear-gradient(135deg, #F7F7F7 0%, #F7F7F7 100%);
            border-radius: 12px;
            padding: 1.5rem;
            margin: 2rem 0;
            border: 1px solid #C7D9ED;
        }
        
        .detail-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.75rem 0;
            border-bottom: 1px solid #C7D9ED;
            font-size: 1rem;
        }
        
        .detail-row:last-child {
            border-bottom: none;
        }
        
        .detail-label {
            color: #808080;
            font-weight: 500;
        }
        
        .detail-value {
            font-weight: 600;
            color: #1C191D;
        }
        
        .booking-id {
            font-family: "Courier New", monospace;
            font-weight: 700;
            color: #245388;
            background: rgba(36, 83, 136, 0.1);
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
        }
        
        .booking-reference {
            font-family: "Courier New", monospace;
            font-weight: 600;
            color: #83ACDC;
            background: rgba(131, 172, 220, 0.1);
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
        }
        
        .reservation-id {
            font-family: "Courier New", monospace;
            font-weight: 600;
            color: #C0504C;
            background: rgba(192, 80, 76, 0.1);
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
        }
        
        .amount {
            font-size: 1.25rem;
            font-weight: 700;
            color: #245388;
        }
        
        .next-steps {
            background: #C7D9ED;
            border-radius: 12px;
            padding: 1.5rem;
            margin: 2rem 0;
            border: 1px solid #DD938C;
        }
        
        .next-steps h3 {
            margin: 0 0 1rem 0;
            color: #C0504C;
            font-size: 1.25rem;
            font-weight: 600;
        }
        
        .next-steps ul {
            margin: 0;
            padding-left: 1.5rem;
            color: #1C191D;
        }
        
        .next-steps li {
            margin-bottom: 0.5rem;
        }
        
        .cta-section {
            text-align: center;
            margin: 2rem 0;
        }
        
        .cta-button {
            display: inline-block;
            padding: 1rem 2rem;
            background: #C0504C;
            color: white;
            text-decoration: none;
            border-radius: 12px;
            font-size: 1rem;
            font-weight: 600;
            box-shadow: 0 4px 15px rgba(192, 80, 76, 0.3);
            transition: all 0.3s ease;
        }
        
        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(192, 80, 76, 0.4);
        }
        
        .footer {
            background: #245388;
            padding: 2rem;
            text-align: center;
            color: rgba(255,255,255,.8);
        }
        
        .footer p {
            margin: 0;
            font-size: 0.875rem;
        }
        
        .footer .company-name {
            color: rgba(255,255,255,.9);
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="email-card">
            <div style="background:#245388;padding:1rem 1.5rem;text-align:center;">
                <img src="https://rondosportstickets.com/logo.png" alt="Rondo Sports Travel" style="height:44px;max-width:170px;display:inline-block;" />
            </div>
            <div class="header">
                <div class="success-icon">✓</div>
                <h1>Booking Confirmed!</h1>
                <p>Your reservation has been successfully processed</p>
            </div>
            
            <div class="content">
                <div class="greeting">
                    Dear ' . htmlspecialchars($customerName) . ',
                </div>
                
                <p>Thank you for your booking! We\'re excited to confirm your reservation. Below are the details of your booking:</p>
                
                <div class="booking-details">
                    <div class="detail-row">
                        <span class="detail-label">Booking ID:</span>
                        <span class="detail-value booking-id">#' . htmlspecialchars($bookingId) . '</span>
                    </div>';
                    
        if ($bookingReference) {
            $html .= '
                    <div class="detail-row">
                        <span class="detail-label">Booking Reference:</span>
                        <span class="detail-value booking-reference">' . htmlspecialchars($bookingReference) . '</span>
                    </div>';
        }
        
        if ($apiReservationId) {
            $html .= '
                    <div class="detail-row">
                        <span class="detail-label">Reservation ID:</span>
                        <span class="detail-value reservation-id">' . htmlspecialchars($apiReservationId) . '</span>
                    </div>';
        }
        
        $html .= '
                    <div class="detail-row">
                        <span class="detail-label">Event:</span>
                        <span class="detail-value">' . htmlspecialchars($eventName) . '</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Event Date:</span>
                        <span class="detail-value">' . htmlspecialchars($formattedEventDate) . '</span>
                    </div>';
                    
        if ($formattedEventTime && $formattedEventTime !== $formattedEventDate) {
            $html .= '
                    <div class="detail-row">
                        <span class="detail-label">Event Time:</span>
                        <span class="detail-value">' . htmlspecialchars($formattedEventTime) . '</span>
                    </div>';
        }
        
        if ($venueInfo) {
            $html .= '
                    <div class="detail-row">
                        <span class="detail-label">Venue:</span>
                        <span class="detail-value">' . htmlspecialchars($venueInfo) . '</span>
                    </div>';
        }
        
        $html .= '
                    <div class="detail-row">
                        <span class="detail-label">Ticket Count:</span>
                        <span class="detail-value">' . htmlspecialchars($ticketCount) . '</span>
                    </div>';
                    
        if ($seatInfo) {
            $html .= '
                    <div class="detail-row">
                        <span class="detail-label">Seat Information:</span>
                        <span class="detail-value">' . htmlspecialchars($seatInfo) . '</span>
                    </div>';
        }
        
        $html .= '
                    <div class="detail-row">
                        <span class="detail-label">Total Amount:</span>
                        <span class="detail-value amount">' . htmlspecialchars($formattedAmount) . '</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Payment Status:</span>
                        <span class="detail-value" style="color: #245388; font-weight: 600;">CONFIRMED</span>
                    </div>
                </div>
                
                <div class="next-steps">
                    <h3>What\'s Next?</h3>
                    <ul>
                        <li>Save this email for your records</li>
                        <li>Keep your booking ID: <strong>#' . htmlspecialchars($bookingId) . '</strong>';
                        
        if ($bookingReference) {
            $html .= ' (Reference: <strong>' . htmlspecialchars($bookingReference) . '</strong>)';
        }
        
        $html .= '</li>
                        <li>Arrive at the venue 30 minutes before the event starts</li>
                        <li>Bring a valid ID for verification</li>
                        <li>Present this email or your booking reference at the entrance</li>
                    </ul>
                </div>
                
                <div class="cta-section">
                    <a href="' . ($_ENV['FRONTEND_URL'] ?? 'https://rondosport.com') . '/customer/bookings" class="cta-button">
                        View My Bookings
                    </a>
                </div>
                
                <p>If you have any questions or need to make changes to your booking, please contact our support team at <a href="mailto:support@rondosport.com">support@rondosport.com</a> or call us at +971-XX-XXX-XXXX.</p>
                
                <p>We look forward to seeing you at the event!</p>
                
                <p>Best regards,<br>
                <strong>Rondo Sports Travel</strong></p>
            </div>
            
            <div class="footer">
                <img src="https://rondosportstickets.com/logo.png" alt="Rondo Sports Travel" style="height:36px;max-width:140px;display:inline-block;margin-bottom:.5rem;" /><br>
                <p>&copy; ' . date('Y') . ' <span class="company-name">Rondo Sports Travel</span>. All rights reserved.</p>
                <p>This is an automated message. Please do not reply to this email.</p>
            </div>
        </div>
    </div>
</body>
</html>';

        return $html;
    }

    /**
     * Generate plain text email for booking confirmation
     */
    private function generateBookingConfirmationText(array $data): string
    {
        $bookingReference = $data['booking_reference'] ?? '';
        $apiReservationId = $data['api_reservation_id'] ?? '';
        $bookingId = $data['booking_id'] ?? '';
        $eventName = $data['event_name'] ?? 'Event';
        $eventDate = $data['event_date'] ?? '';
        $totalAmount = $data['total_amount'] ?? 0;
        $currency = $data['currency'] ?? 'USD';
        $customerName = trim(($data['customer_first_name'] ?? '') . ' ' . ($data['customer_last_name'] ?? '')) ?: 'Valued Customer';
        $venueInfo = $data['venue_name'] ?? '';
        $ticketCount = $data['ticket_count'] ?? 1;
        $seatInfo = $data['seat_info'] ?? '';

        // Format amount
        $formattedAmount = $this->formatAmount($totalAmount, $currency);
        
        // Format date
        $formattedEventDate = $this->formatDate($eventDate);

        $text = "BOOKING CONFIRMATION\n";
        $text .= "=====================\n\n";
        $text .= "Dear {$customerName},\n\n";
        $text .= "Thank you for your booking! We're excited to confirm your reservation.\n\n";
        $text .= "BOOKING DETAILS:\n";
        $text .= "----------------\n";
        $text .= "Booking ID: #{$bookingId}\n";
        
        if ($bookingReference) {
            $text .= "Booking Reference: {$bookingReference}\n";
        }
        
        if ($apiReservationId) {
            $text .= "Reservation ID: {$apiReservationId}\n";
        }
        
        $text .= "Event: {$eventName}\n";
        $text .= "Event Date: {$formattedEventDate}\n";
        
        if ($venueInfo) {
            $text .= "Venue: {$venueInfo}\n";
        }
        
        $text .= "Ticket Count: {$ticketCount}\n";
        
        if ($seatInfo) {
            $text .= "Seat Information: {$seatInfo}\n";
        }
        
        $text .= "Total Amount: {$formattedAmount}\n";
        $text .= "Payment Status: CONFIRMED\n\n";
        
        $text .= "WHAT'S NEXT?\n";
        $text .= "------------\n";
        $text .= "• Save this email for your records\n";
        $text .= "• Keep your booking ID: #{$bookingId}";
        
        if ($bookingReference) {
            $text .= " (Reference: {$bookingReference})";
        }
        
        $text .= "\n";
        $text .= "• Arrive at the venue 30 minutes before the event starts\n";
        $text .= "• Bring a valid ID for verification\n";
        $text .= "• Present this email or your booking reference at the entrance\n\n";
        
        $text .= "If you have any questions or need to make changes to your booking, ";
        $text .= "please contact our support team at support@rondosport.com or call us at +971-XX-XXX-XXXX.\n\n";
        
        $text .= "We look forward to seeing you at the event!\n\n";
        $text .= "Best regards,\n";
        $text .= "Rondo Sports Travel\n\n";
        $text .= '© ' . date('Y') . " Rondo Sports Travel. All rights reserved.\n";
        $text .= "This is an automated message. Please do not reply to this email.";

        return $text;
    }

    /**
     * Format amount with currency
     */
    private function formatAmount(float $amount, string $currency): string
    {
        return number_format($amount, 2) . ' ' . strtoupper($currency);
    }

    /**
     * Format date for display
     */
    private function formatDate(string $date): string
    {
        try {
            $dateTime = new \DateTime($date);
            return $dateTime->format('F j, Y');
        } catch (\Exception $e) {
            return $date;
        }
    }

    /**
     * Format time for display
     */
    private function formatTime(string $datetime): string
    {
        try {
            $dateTime = new \DateTime($datetime);
            return $dateTime->format('g:i A');
        } catch (\Exception $e) {
            return '';
        }
    }

}