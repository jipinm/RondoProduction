<?php

declare(strict_types=1);

namespace XS2EventProxy\Service;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;
use Psr\Log\LoggerInterface;
use XS2EventProxy\Repository\BookingRepository;
use XS2EventProxy\Exception\ApiException;

/**
 * E-Ticket Service
 * 
 * Handles e-ticket availability checking, downloading, and tracking for customers.
 * Integrates with XS2Event API to fetch ticket URLs and proxy downloads.
 */
class ETicketService
{
    private const TICKET_CHECK_CACHE_TTL = 300; // 5 minutes
    private const MAX_DOWNLOAD_RETRIES = 3;

    public function __construct(
        private LoggerInterface $logger,
        private BookingRepository $bookingRepository,
        private Client $httpClient,
        private string $xs2eventBaseUrl,
        private string $xs2eventApiKey
    ) {
        $this->xs2eventBaseUrl = rtrim($xs2eventBaseUrl, '/');
    }

    /**
     * Get all tickets for a customer by customer ID
     * 
     * @param int $customerId Customer user ID
     * @return array List of bookings with ticket information
     */
    public function getCustomerTickets(int $customerId): array
    {
        try {
            $this->logger->info('Fetching customer tickets', [
                'customer_id' => $customerId
            ]);

            // Get all customer bookings with ticket data
            $sql = "SELECT 
                        b.id,
                        b.booking_reference,
                        b.api_booking_id,
                        b.event_name,
                        b.event_date,
                        b.quantity,
                        b.total_price,
                        b.eticket_status,
                        b.eticket_available_date,
                        b.eticket_urls,
                        b.zip_download_url,
                        b.download_count,
                        b.first_downloaded_at,
                        b.last_download_attempt,
                        b.xs2event_booking_status,
                        b.payment_status
                    FROM bookings b
                    WHERE b.customer_user_id = ?
                      AND b.payment_status = 'succeeded'
                      AND b.status != 'cancelled'
                    ORDER BY b.event_date DESC";

            $stmt = $this->bookingRepository->db->getConnection()->prepare($sql);
            $stmt->execute([$customerId]);
            $bookings = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            // Parse JSON fields
            foreach ($bookings as &$booking) {
                $booking['eticket_urls'] = !empty($booking['eticket_urls']) 
                    ? json_decode($booking['eticket_urls'], true) 
                    : [];
                
                $booking['ticket_available'] = $booking['eticket_status'] === 'available';
            }

            return $bookings;

        } catch (\Exception $e) {
            $this->logger->error('Failed to fetch customer tickets', [
                'customer_id' => $customerId,
                'error' => $e->getMessage()
            ]);

            throw new ApiException('Failed to fetch customer tickets: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Check ticket availability for a specific booking
     * 
     * @param int $bookingId Local booking ID
     * @return array Ticket availability status and URLs
     */
    public function checkTicketAvailability(int $bookingId): array
    {
        try {
            $booking = $this->bookingRepository->getBookingById($bookingId);

            if (!$booking) {
                throw new ApiException('Booking not found', 404);
            }

            // If no XS2Event booking ID, tickets can't be available
            if (empty($booking['api_booking_id'])) {
                return [
                    'available' => false,
                    'status' => 'pending',
                    'message' => 'Booking not yet synchronized with ticket system',
                    'booking_id' => $bookingId
                ];
            }

            // Check if we already have cached ticket URLs
            if ($booking['eticket_status'] === 'available' && !empty($booking['eticket_urls'])) {
                return [
                    'available' => true,
                    'status' => 'available',
                    'eticket_urls' => json_decode($booking['eticket_urls'], true),
                    'zip_download_url' => $booking['zip_download_url'],
                    'download_count' => (int)$booking['download_count'],
                    'booking_id' => $bookingId
                ];
            }

            // Fetch latest ticket data from XS2Event
            $ticketData = $this->fetchTicketsFromXS2Event($booking['api_booking_id']);

            if (!empty($ticketData['tickets'])) {
                // Update local database with ticket URLs
                $this->updateTicketStatus($bookingId, 'available', $ticketData);

                return [
                    'available' => true,
                    'status' => 'available',
                    'eticket_urls' => $ticketData['tickets'],
                    'zip_download_url' => $ticketData['zip_url'] ?? null,
                    'download_count' => (int)$booking['download_count'],
                    'booking_id' => $bookingId
                ];
            }

            // Tickets not yet available
            $this->updateTicketStatus($bookingId, 'processing', null);

            return [
                'available' => false,
                'status' => 'processing',
                'message' => 'Tickets are being processed and will be available soon',
                'booking_id' => $bookingId
            ];

        } catch (ApiException $e) {
            throw $e;
        } catch (\Exception $e) {
            $this->logger->error('Failed to check ticket availability', [
                'booking_id' => $bookingId,
                'error' => $e->getMessage()
            ]);

            throw new ApiException('Failed to check ticket availability: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Download a single ticket PDF
     *
     * @param int    $bookingId       Local booking ID
     * @param string $bookingorderId  XS2Event bookingorder_id (NOT the booking_id)
     * @param string $orderItemId     XS2Event orderitem_id
     * @param string $downloadUrl     download_link value from bookingorder items
     * @return array File data (content, filename, mime_type)
     */
    public function downloadSingleTicket(int $bookingId, string $bookingorderId, string $orderItemId, string $downloadUrl): array
    {
        try {
            $booking = $this->bookingRepository->getBookingById($bookingId);

            if (!$booking) {
                throw new ApiException('Booking not found', 404);
            }

            if (empty($booking['api_booking_id'])) {
                throw new ApiException('Tickets not available - booking not synchronized', 400);
            }

            $this->logger->info('Downloading single ticket', [
                'booking_id'       => $bookingId,
                'bookingorder_id'  => $bookingorderId,
                'order_item_id'    => $orderItemId
            ]);

            // Build download URL using bookingorder_id (not api_booking_id)
            $apiUrl = $this->xs2eventBaseUrl . '/v1/etickets/download/' .
                     urlencode($bookingorderId) . '/' .
                     urlencode($orderItemId) . '/url/' .
                     $downloadUrl;

            // Download file from XS2Event
            $response = $this->httpClient->get($apiUrl, [
                'headers' => $this->getXS2EventHeaders(),
                'timeout' => 60,
                'stream' => true
            ]);

            // Read file content
            $fileContent = $response->getBody()->getContents();
            $contentType = $response->getHeaderLine('Content-Type') ?: 'application/pdf';
            $filename = "ticket-{$booking['booking_reference']}-{$orderItemId}.pdf";

            // Log successful download
            $this->logDownloadAttempt($bookingId, true);

            return [
                'content' => $fileContent,
                'filename' => $filename,
                'mime_type' => $contentType,
                'size' => strlen($fileContent)
            ];

        } catch (RequestException $e) {
            $this->logger->error('Failed to download single ticket', [
                'booking_id' => $bookingId,
                'order_item_id' => $orderItemId,
                'error' => $e->getMessage()
            ]);

            $this->logDownloadAttempt($bookingId, false, $e->getMessage());

            throw new ApiException('Failed to download ticket: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Download all tickets as a ZIP file
     * 
     * @param int $bookingId Local booking ID
     * @return array File data (content, filename, mime_type)
     */
    public function downloadTicketZip(int $bookingId): array
    {
        try {
            $booking = $this->bookingRepository->getBookingById($bookingId);

            if (!$booking) {
                throw new ApiException('Booking not found', 404);
            }

            if (empty($booking['api_booking_id'])) {
                throw new ApiException('Tickets not available - booking not synchronized', 400);
            }

            if ($booking['eticket_status'] !== 'available') {
                throw new ApiException('Tickets are not yet available for download', 400);
            }

            $this->logger->info('Downloading ticket ZIP', [
                'booking_id' => $bookingId,
                'api_booking_id' => $booking['api_booking_id']
            ]);

            // Check if we have a cached ZIP URL
            $zipUrl = $booking['zip_download_url'];

            if (empty($zipUrl)) {
                // Resolve bookingorder_id from XS2Event — required for the ZIP endpoint
                $ticketData = $this->fetchTicketsFromXS2Event($booking['api_booking_id']);
                $bookingorderId = $ticketData['bookingorder_id'] ?? null;

                if (empty($bookingorderId)) {
                    throw new ApiException('Booking order not yet available for ZIP download', 404);
                }

                // Fetch temporary ZIP CDN URL from XS2Event
                $zipUrl = $this->getZipDownloadUrl($bookingorderId);

                if (empty($zipUrl)) {
                    throw new ApiException('ZIP download URL not available', 404);
                }

                // Update database with ZIP URL
                $this->bookingRepository->update($bookingId, [
                    'zip_download_url' => $zipUrl
                ]);
            }

            // Download ZIP file
            $response = $this->httpClient->get($zipUrl, [
                'headers' => $this->getXS2EventHeaders(),
                'timeout' => 120, // Longer timeout for ZIP files
                'stream' => true
            ]);

            $fileContent = $response->getBody()->getContents();
            $contentType = $response->getHeaderLine('Content-Type') ?: 'application/zip';
            $filename = "tickets-{$booking['booking_reference']}.zip";

            // Log successful download
            $this->logDownloadAttempt($bookingId, true);

            return [
                'content' => $fileContent,
                'filename' => $filename,
                'mime_type' => $contentType,
                'size' => strlen($fileContent)
            ];

        } catch (RequestException $e) {
            $this->logger->error('Failed to download ticket ZIP', [
                'booking_id' => $bookingId,
                'error' => $e->getMessage()
            ]);

            $this->logDownloadAttempt($bookingId, false, $e->getMessage());

            throw new ApiException('Failed to download tickets: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Update ticket status in database
     * 
     * @param int $bookingId Local booking ID
     * @param string $status Ticket status
     * @param array|null $ticketData Optional ticket data to store
     */
    public function updateTicketStatus(int $bookingId, string $status, ?array $ticketData = null): bool
    {
        try {
            if ($ticketData && !empty($ticketData['tickets'])) {
                // Store ticket URLs and metadata
                $this->bookingRepository->updateETicketData($bookingId, [
                    'ticket_urls' => $ticketData['tickets'],
                    'zip_url' => $ticketData['zip_url'] ?? null,
                    'checksums' => $ticketData['checksums'] ?? []
                ]);

                $this->logger->info('Ticket data updated', [
                    'booking_id' => $bookingId,
                    'ticket_count' => count($ticketData['tickets'])
                ]);
            } else {
                // Just update status
                $availableDate = ($status === 'available') ? date('Y-m-d H:i:s') : null;
                $this->bookingRepository->updateETicketStatus($bookingId, $status, $availableDate);
            }

            return true;

        } catch (\Exception $e) {
            $this->logger->error('Failed to update ticket status', [
                'booking_id' => $bookingId,
                'status' => $status,
                'error' => $e->getMessage()
            ]);

            return false;
        }
    }

    /**
     * Log download attempt
     * 
     * @param int $bookingId Local booking ID
     * @param bool $success Whether download was successful
     * @param string|null $errorMessage Error message if failed
     */
    public function logDownloadAttempt(int $bookingId, bool $success, ?string $errorMessage = null): void
    {
        try {
            $this->bookingRepository->logDownloadAttempt($bookingId, $success, $errorMessage);

            $this->logger->info('Download attempt logged', [
                'booking_id' => $bookingId,
                'success' => $success,
                'error' => $errorMessage
            ]);

        } catch (\Exception $e) {
            // Don't throw - logging failures shouldn't break the download
            $this->logger->warning('Failed to log download attempt', [
                'booking_id' => $bookingId,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Get ticket URLs from XS2Event API
     * 
     * @param string $apiBookingId XS2Event booking ID
     * @return array Ticket URLs and metadata
     */
    public function getTicketUrls(string $apiBookingId): array
    {
        return $this->fetchTicketsFromXS2Event($apiBookingId);
    }

    /**
     * Fetch tickets from XS2Event API
     *
     * Calls GET /v1/bookingorders?booking_id=in:[{id}]&logistic_status=completed
     * and maps the response into the internal ticket format expected by callers.
     *
     * @param string $apiBookingId XS2Event booking ID
     * @return array {tickets: [{bookingorder_id, orderitem_id, download_link, ticket_sha}], zip_url, bookingorder_id, checksums}
     */
    private function fetchTicketsFromXS2Event(string $apiBookingId): array
    {
        try {
            $this->logger->debug('Fetching tickets from XS2Event', [
                'api_booking_id' => $apiBookingId
            ]);

            $response = $this->httpClient->get(
                $this->xs2eventBaseUrl . '/v1/bookingorders/list?' . http_build_query([
                    'booking_id'      => 'in:[' . $apiBookingId . ']',
                    'logistic_status' => 'completed',
                ]),
                [
                    'headers' => $this->getXS2EventHeaders(),
                    'timeout' => 30
                ]
            );

            $data = json_decode($response->getBody()->getContents(), true);
            $bookingOrders = $data['bookingorders'] ?? [];

            if (empty($bookingOrders)) {
                return ['tickets' => [], 'zip_url' => null, 'bookingorder_id' => null, 'checksums' => []];
            }

            // Use the first booking order (one booking produces one order in most cases)
            $firstOrder = $bookingOrders[0];
            $bookingorderId = $firstOrder['bookingorder_id'] ?? null;
            $zipSha = $firstOrder['zip_sha'] ?? null;

            $tickets = [];
            $checksums = [];
            foreach ($firstOrder['items'] ?? [] as $item) {
                // Only xs2event distribution channel tickets can be downloaded via API
                if (($item['distribution_channel'] ?? '') !== 'xs2event') {
                    continue;
                }

                if (!empty($item['download_link'])) {
                    // Single-PDF ticket: direct download_link on the item
                    $tickets[] = [
                        'bookingorder_id' => $bookingorderId,
                        'orderitem_id'    => $item['orderitem_id'],
                        'download_link'   => $item['download_link'],
                        'ticket_sha'      => $item['ticket_sha'] ?? null,
                    ];
                    if (!empty($item['ticket_sha'])) {
                        $checksums[$item['orderitem_id']] = $item['ticket_sha'];
                    }
                } elseif (!empty($item['download_items'])) {
                    // Multi-PDF ticket (e.g. F1 with separate day tickets):
                    // expand each download_item as an individual downloadable entry.
                    foreach ($item['download_items'] as $subItem) {
                        if (empty($subItem['download_link'])) {
                            continue;
                        }
                        $subId = $subItem['downloaditem_id'] ?? $item['orderitem_id'];
                        $tickets[] = [
                            'bookingorder_id' => $bookingorderId,
                            'orderitem_id'    => $item['orderitem_id'],
                            'downloaditem_id' => $subId,
                            'download_link'   => $subItem['download_link'],
                            'ticket_sha'      => $subItem['ticket_sha'] ?? null,
                        ];
                        if (!empty($subItem['ticket_sha'])) {
                            $checksums[$subId] = $subItem['ticket_sha'];
                        }
                    }
                }
            }

            return [
                'tickets'         => $tickets,
                'zip_url'         => null, // ZIP URL is obtained separately via /v1/etickets/download/zip/{bookingorder_id}
                'bookingorder_id' => $bookingorderId,
                'zip_sha'         => $zipSha,
                'checksums'       => $checksums,
            ];

        } catch (RequestException $e) {
            $this->logger->warning('Failed to fetch tickets from XS2Event', [
                'api_booking_id' => $apiBookingId,
                'error' => $e->getMessage()
            ]);

            return [
                'tickets'         => [],
                'zip_url'         => null,
                'bookingorder_id' => null,
                'checksums'       => []
            ];
        }
    }

    /**
     * Get ZIP download URL from XS2Event
     *
     * @param string $bookingorderId XS2Event bookingorder_id (NOT the booking_id)
     * @return string ZIP CDN download URL
     */
    private function getZipDownloadUrl(string $bookingorderId): string
    {
        try {
            $response = $this->httpClient->get(
                $this->xs2eventBaseUrl . '/v1/etickets/download/zip/' . urlencode($bookingorderId),
                [
                    'headers' => $this->getXS2EventHeaders(),
                    'timeout' => 15
                ]
            );

            // XS2Event returns a plain JSON-encoded URL string, e.g. "https://..."
            $decoded = json_decode($response->getBody()->getContents(), true);
            if (!is_string($decoded) || empty($decoded)) {
                throw new ApiException('Unexpected ZIP URL response format from XS2Event', 502);
            }

            return $decoded;

        } catch (RequestException $e) {
            $this->logger->error('Failed to get ZIP download URL', [
                'bookingorder_id' => $bookingorderId,
                'error' => $e->getMessage()
            ]);

            throw new ApiException('Failed to get ZIP download URL: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get headers for XS2Event API requests
     */
    private function getXS2EventHeaders(): array
    {
        return [
            'X-Api-Key' => $this->xs2eventApiKey,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json'
        ];
    }
}
