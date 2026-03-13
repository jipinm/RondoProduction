<?php

declare(strict_types=1);

namespace XS2EventProxy\Service;

use SendGrid\Mail\Mail;
use Psr\Log\LoggerInterface;

class EmailService
{
    private LoggerInterface $logger;
    private string $sendGridApiKey;
    private string $fromEmail;
    private string $fromName;
    private string $frontendUrl;

    public function __construct(LoggerInterface $logger)
    {
        $this->logger = $logger;
        $this->loadConfiguration();
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

        return '
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
            background-color: #EEF3F8;
            color: #1e293b;
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
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
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
            color: #1e293b;
            margin-bottom: 1.5rem;
        }
        
        .booking-details {
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            border-radius: 12px;
            padding: 1.5rem;
            margin: 2rem 0;
            border: 1px solid #e2e8f0;
        }
        
        .detail-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.75rem 0;
            border-bottom: 1px solid #e2e8f0;
            font-size: 1rem;
        }
        
        .detail-row:last-child {
            border-bottom: none;
        }
        
        .detail-label {
            color: #64748b;
            font-weight: 500;
        }
        
        .detail-value {
            font-weight: 600;
            color: #1e293b;
        }
        
        .booking-id {
            font-family: "Courier New", monospace;
            font-weight: 700;
            color: #3b82f6;
            background: rgba(59, 130, 246, 0.1);
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
        }
        
        .booking-reference {
            font-family: "Courier New", monospace;
            font-weight: 600;
            color: #7c3aed;
            background: rgba(124, 58, 237, 0.1);
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
        }
        
        .reservation-id {
            font-family: "Courier New", monospace;
            font-weight: 600;
            color: #dc2626;
            background: rgba(220, 38, 38, 0.1);
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
        }
        
        .amount {
            font-size: 1.25rem;
            font-weight: 700;
            color: #059669;
        }
        
        .next-steps {
            background: linear-gradient(135deg, #fef7ed 0%, #fed7aa 100%);
            border-radius: 12px;
            padding: 1.5rem;
            margin: 2rem 0;
            border: 1px solid #fdba74;
        }
        
        .next-steps h3 {
            margin: 0 0 1rem 0;
            color: #ea580c;
            font-size: 1.25rem;
            font-weight: 600;
        }
        
        .next-steps ul {
            margin: 0;
            padding-left: 1.5rem;
            color: #9a3412;
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
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: white;
            text-decoration: none;
            border-radius: 12px;
            font-size: 1rem;
            font-weight: 600;
            box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
            transition: all 0.3s ease;
        }
        
        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(59, 130, 246, 0.4);
        }
        
        .footer {
            background: #1e293b;
            padding: 2rem;
            text-align: center;
            color: #94a3b8;
        }
        
        .footer p {
            margin: 0;
            font-size: 0.875rem;
        }
        
        .footer .company-name {
            color: white;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="email-card">
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
                        <span class="detail-value" style="color: #059669; font-weight: 600;">CONFIRMED</span>
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
                <strong>The Rondo Sport Team</strong></p>
            </div>
            
            <div class="footer">
                <p>&copy; ' . date('Y') . ' <span class="company-name">Rondo Sport</span>. All rights reserved.</p>
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
        $text .= "The Rondo Sport Team\n\n";
        $text .= "© " . date('Y') . " Rondo Sport. All rights reserved.\n";
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