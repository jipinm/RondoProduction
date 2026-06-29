# Rondo Sports — Booking Flow & XS2Event API Integration

## Overview

This document describes the complete booking flow for the Rondo Sports platform, covering:
- User journey from homepage to e-ticket download
- Connections between the **Frontend** (React/TypeScript), **PHP Proxy API**, and **XS2Event API**
- Every XS2Event API endpoint used and how it maps to frontend actions

---

## System Architecture

```
User Browser (Frontend)
    ↓  HTTPS
PHP Proxy API (Slim 4 @ VITE_CUSTOMER_API_BASE_URL)
    ↓  HTTPS + X-Api-Key header
XS2Event API (https://api.xs2event.com)
```

| Layer | Technology | Location |
|---|---|---|
| Customer Frontend | React 18 + TypeScript + Vite | `frontend/` |
| Admin Panel | React 18 + TypeScript + Vite | `admin/` |
| PHP Proxy API | PHP 8 + Slim 4 + Guzzle | `api/` |
| XS2Event API | External REST API | `https://api.xs2event.com` |
| Database | MySQL/MariaDB | Local (PDO) |
| Payments | Stripe | Stripe API |
| Email | SendGrid | SendGrid API |

**Auth:** All PHP proxy → XS2Event requests include `X-Api-Key: {key}` header.

---

## Step-by-Step Booking Flow

### Step 0 — Authentication (Pre-Requisite)

Before checkout, the user must be logged in. The system uses JWT tokens stored in `localStorage`.

**Pages:** `/login`, `/checkout/login`
**Services:** `customerAuth.tsx` → `POST /api/v1/customers/auth/login`

---

### Step 1 — Browse Sports & Tournaments

**User action:** Navigate homepage → Sports → Tournaments → Events

| Page | Route | XS2Event API Call | PHP Proxy Route |
|---|---|---|---|
| `AllSportsPage` | `/sports` | `GET /v1/sports` | `GET /v1/sports` → `ProxyController` |
| `TournamentsPage` | `/sports/:sport/tournaments` | `GET /v1/tournaments?sport_id=...` | `GET /v1/tournaments` → `ProxyController` |
| `EventsPage` | `/tournaments/:id/events` | `GET /v1/events?tournament_id=...` | `GET /v1/events` → `ProxyController` |

**XS2Event Response (events list):**
```json
{
  "data": [
    {
      "event_id": "abc123",
      "event_name": "Match Name",
      "date_start": "2025-06-01T15:00:00Z",
      "venue": { "venue_id": "v1", "venue_name": "Stadium" },
      "tournament": { "tournament_id": "t1", "tournament_name": "League" }
    }
  ]
}
```

---

### Step 2 — View Event Tickets

**User action:** Click on an event → View ticket categories and prices → Select tickets → "Proceed to Checkout"

**Page:** `EventTicketsPage` → `/events/:eventId/tickets`

| Action | XS2Event API Call | PHP Proxy Route |
|---|---|---|
| Load event details | `GET /v1/events/{event_id}` | `GET /v1/events/{id}` → `ProxyController` |
| Load tickets | `GET /v1/tickets?event_id={id}` | `GET /v1/tickets` → `ProxyController` |
| Load guest requirements | `GET /v1/events/{event_id}/guestdata` | `GET /v1/events/{id}/guestdata` → `EventGuestDataRequirements` |
| Load categories | `GET /v1/categories?event_id={id}` | `GET /v1/categories` → `ProxyController` |
| Load venue | `GET /v1/venues/{venue_id}` | `GET /v1/venues/{id}` → `ProxyController` |

**XS2Event Tickets Response:**
```json
{
  "data": [
    {
      "ticket_id": "t123",
      "ticket_name": "Category A",
      "face_value": 150.00,
      "currency_code": "USD",
      "availability": "available",
      "available_quantity": 50
    }
  ]
}
```

**Guest Requirements Response (`GET /v1/events/{id}/guestdata`):**
```json
{
  "required_fields": ["first_name", "last_name", "date_of_birth", "gender", "country_of_residence"],
  "optional_fields": ["passport_number", "contact_phone", "contact_email"]
}
```

**State passed to checkout:**
```typescript
{
  cartItems: [{ ticket, quantity, finalPriceUSD, includedHospitalities }],
  eventData: { event_name, tournament_name, season, date_start, venue_name, city },
  guestRequirements: EventGuestRequirements | null,
  selectedCurrencyCode: string
}
```

---

### Step 3 — Checkout Login Gate

**Page:** `/checkout/login`

If not authenticated, user is redirected here to log in or register.

| Action | PHP Proxy Route |
|---|---|
| Login | `POST /api/v1/customers/auth/login` |
| Register | `POST /api/v1/customers/auth/register` |

After login, user is redirected back to `/checkout/guest-details` with cart state preserved.

---

### Step 4 — Guest Details + Reservation Creation

**Page:** `CheckoutGuestDetailsPage` → `/checkout/guest-details`

This is the most critical step: creates the XS2Event reservation and submits guest data.

**Reservation is valid for 10 minutes only.**

#### Step 4a — Create Reservation

**Hook:** `useReservation.createReservation(items)`
**PHP Route:** `POST /v1/reservations` → `ReservationsController::createReservation`
**XS2Event Endpoint:** `POST /v1/reservations`

**Request body sent to XS2Event:**
```json
{
  "items": [
    {
      "ticket_id": "t123",
      "quantity": 2,
      "net_rate": 150.00,
      "currency_code": "USD"
    }
  ]
}
```

**XS2Event Response:**
```json
{
  "reservation_id": "res_abc123",
  "status": "OPEN",
  "expires_at": "2025-06-01T15:10:00Z",
  "items": [...]
}
```

#### Step 4b — Fill Guest Data Form

User fills in details for each ticket holder:
- First name, Last name (required)
- Date of birth in `YYYY-MM-DD` format (required)
- Gender: `male | female | unknown` (required)
- Country of residence: ISO 3166-1 alpha-3 (3-letter code, e.g. `GBR`, `USA`) (required)
- Passport number (optional)
- Contact phone (optional)

#### Step 4c — Submit Guest Data

**Hook:** `useReservation.addGuestData(reservationId, guests, cartItems)`
**PHP Route:** `POST /v1/reservations/{id}/guests` → `ReservationsController::addReservationGuests`
**→ Forwards to XS2Event:** `POST /v1/reservations/{id}/guestdata`

**Request body sent to XS2Event:**
```json
{
  "items": [
    {
      "ticket_id": "t123",
      "quantity": 2,
      "guests": [
        {
          "first_name": "John",
          "last_name": "Smith",
          "date_of_birth": "1985-03-15",
          "gender": "male",
          "country_of_residence": "GBR",
          "lead_guest": true,
          "contact_phone": "+44712345678",
          "passport_number": "AB123456"
        },
        {
          "first_name": "Jane",
          "last_name": "Smith",
          "date_of_birth": "1987-07-22",
          "gender": "female",
          "country_of_residence": "GBR",
          "lead_guest": false
        }
      ]
    }
  ]
}
```

**After success**, navigates to `/checkout/payment` passing:
```typescript
{
  cartItems, eventData, guests,
  reservation: { reservation_id, expires_at, ... },
  guestRequirements, markupsData, selectedCurrencyCode
}
```

---

### Step 5 — Payment (Stripe)

**Page:** `CheckoutPaymentPage` → `/checkout/payment`
**Component:** `StripeCheckout`

Stripe processes the customer's card payment client-side via Stripe.js.

#### Step 5a — Stripe Payment

**Service:** `stripeService.ts` → Stripe `PaymentIntent`
- Creates/confirms `PaymentIntent` using `VITE_STRIPE_PUBLISHABLE_KEY`
- **No XS2Event API call** at this stage

On Stripe success, a `StripePaymentDetails` object is returned:
```typescript
{
  payment_intent_id: "pi_...",
  payment_method_id: "pm_...",
  customer_id: "cus_...",
  amount: 30000,
  currency: "usd",
  status: "succeeded",
  charge_id: "ch_...",
  full_response: { ... }
}
```

#### Step 5b — Create Local Booking

After Stripe success, the frontend calls the local booking endpoint.

**Frontend call:** `POST /api/v1/local-bookings`
**PHP Route:** `LocalBookingController::createBooking`

**Request body:**
```json
{
  "customer_email": "john@example.com",
  "customer_first_name": "John",
  "customer_last_name": "Smith",
  "event_name": "Match Name",
  "event_id": "e123",
  "event_date": "2025-06-01",
  "venue_name": "Stadium Name",
  "reservation_id": "res_abc123",
  "total_amount": 300.00,
  "ticket_count": 2,
  "currency": "USD",
  "payment_method": "stripe",
  "payment_reference": "pi_...",
  "payment_intent_id": "pi_...",
  "stripe_payment_method_id": "pm_...",
  "stripe_customer_id": "cus_...",
  "stripe_charge_id": "ch_...",
  "payment_status": "completed",
  "status": "confirmed"
}
```

**PHP `LocalBookingController` actions:**
1. Creates/finds customer record in local DB
2. Stores booking record with all payment fields + `api_reservation_id`
3. Because `payment_status = "completed"` AND `reservation_id` is present, triggers **XS2Event booking creation** via `XS2EventBookingBridge::processBookingAfterPayment(localBookingId)`

**Response to frontend:**
```json
{
  "success": true,
  "data": {
    "booking_id": 42,
    "booking_reference": "BK-2025-001234",
    "api_reservation_id": "res_abc123",
    "customer_id": 7,
    "status": "confirmed",
    "payment_status": "completed"
  }
}
```

Frontend then navigates to `/payment/success` with location state.

---

### Step 6 — XS2Event Booking Creation (Server-Side Bridge)

After local booking is created, `XS2EventBookingBridge::processBookingAfterPayment()` runs **server-side** (within the same PHP request).

**Service:** `api/src/Service/XS2EventBookingBridge.php`

**XS2Event Endpoint:** `POST /v1/bookings`
**PHP Proxy Route:** Called internally (not via proxy) using Guzzle with `X-Api-Key` header

**Request body sent to XS2Event:**
```json
{
  "reservation_id": "res_abc123",
  "booking_email": "john@example.com",
  "payment_method": "invoice",
  "invoice_reference": "BK-2025-001234",
  "booking_reference": "BK-2025-001234",
  "payment_reference": "pi_..."
}
```

> **Note:** `payment_method` must always be `"invoice"` per XS2Event API contract, regardless of the actual Stripe payment. Stripe is the internal payment processor; XS2Event treats all bookings as "invoice".

**XS2Event Response:**
```json
{
  "booking_id": "xs2_bk_789",
  "booking_code": "RONDO-001",
  "financial_status": "OPEN",
  "logistic_status": "COMPLETED",
  "reservation_id": "res_abc123"
}
```

**Bridge then updates local DB with:**
- `api_booking_id = "xs2_bk_789"`
- `xs2event_booking_code = "RONDO-001"`
- `xs2event_financial_status = "OPEN"`
- `xs2event_logistic_status = "COMPLETED"`
- `xs2event_synced_at = NOW()`

**Fallback:** If the local booking has no `api_reservation_id` (shouldn't happen in normal flow), the bridge attempts to create a new reservation and guest data before creating the booking.

---

### Step 7 — Payment Success Page

**Page:** `PaymentSuccessPage` → `/payment/success`

Fetches the completed local booking to display confirmation details:
- `GET /api/v1/local-bookings/{bookingId}` → `LocalBookingController::getBooking`

Displays: booking reference, event name, payment status, XS2Event reservation ID.

Sends booking confirmation email via SendGrid (triggered server-side in `LocalBookingController`).

---

### Step 8 — View Bookings & Download E-Tickets

**Page:** `BookingsPage` → `/bookings`

Requires authentication (JWT).

#### 8a — Fetch Bookings List

**Frontend call:** `GET /api/v1/local-bookings/customer/{email}`
**PHP Route:** `LocalBookingController` → returns all local bookings for this customer email

Each booking includes e-ticket status fields: `eticket_status`, `eticket_available`, `eticket_available_date`, `download_count`.

#### 8b — Check Ticket Availability

**Frontend:** `eTicketService.checkAvailability(bookingId)`
**PHP Route:** `POST /api/v1/customers/bookings/{id}/tickets/check-availability`
**Controller:** `CustomerETicketController::checkAvailability`
**Service:** `ETicketService::checkAvailability`
**XS2Event Endpoint:** `GET /v1/bookingorders?booking_id={xs2event_booking_id}`

Checks `logistic_status` from XS2Event booking orders:
- `COMPLETED` = tickets available for download
- `PROCESSING` = tickets being processed
- `PENDING` = not yet available

#### 8c — Download Tickets (ZIP)

**Frontend:** `eTicketService.downloadTicketZip(bookingId)`
**PHP Route:** `GET /api/v1/customers/bookings/{id}/tickets/zip`
**Controller:** `CustomerETicketController::downloadZip`
**Service:** `ETicketService::getZipDownloadUrl`
**XS2Event Endpoint:** `GET /v1/etickets/download/zip/{bookingorder_id}`
**PHP Proxy Route (direct):** `GET /v1/etickets/download/zip/{bookingorder_id}` → `ETicketsController::getETicketsZipUrl`

Returns a URL to the ZIP file containing all PDF tickets for the booking order.

#### 8d — Download Individual Ticket

**Frontend:** `eTicketService.downloadSingleTicket(bookingId, orderItemId, downloadUrl)`
**PHP Route:** `GET /api/v1/customers/bookings/{id}/tickets/download?order_item_id=...&download_url=...`
**Controller:** `CustomerETicketController::downloadTicket`
**XS2Event Endpoint:** `GET /v1/etickets/download/{bookingorder_id}/{orderitem_id}/url/{url}`
**PHP Proxy Route (direct):** `GET /v1/etickets/download/{bookingorder_id}/{orderitem_id}/url/{url}` → `ETicketsController::downloadETicket`

Downloads individual ticket PDF.

---

## Complete API Endpoint Map

### XS2Event API Endpoints → PHP Proxy Routes

| XS2Event Endpoint | Method | PHP Proxy Route | Controller |
|---|---|---|---|
| `/v1/sports` | GET | `/v1/sports` | `ProxyController` |
| `/v1/tournaments` | GET | `/v1/tournaments` | `ProxyController` |
| `/v1/events` | GET | `/v1/events` | `ProxyController` |
| `/v1/events/{id}` | GET | `/v1/events/{id}` | `ProxyController` |
| `/v1/events/{id}/guestdata` | GET | `/v1/events/{id}/guestdata` | `EventGuestDataRequirements` |
| `/v1/tickets` | GET | `/v1/tickets` | `ProxyController` |
| `/v1/tickets/{id}/guestdata` | GET | `/v1/tickets/{id}/guestdata` | `TicketGuestDataRequirements` |
| `/v1/categories` | GET | `/v1/categories` | `ProxyController` |
| `/v1/venues` | GET | `/v1/venues` | `ProxyController` |
| `/v1/venues/{id}` | GET | `/v1/venues/{id}` | `ProxyController` |
| `/v1/countries` | GET | `/v1/countries` | `ProxyController` |
| `/v1/cities` | GET | `/v1/cities` | `ProxyController` |
| `/v1/teams` | GET | `/v1/teams` | `ProxyController` |
| `/v1/reservations` | POST | `/v1/reservations` | `ReservationsController::createReservation` |
| `/v1/reservations` | GET | `/v1/reservations` | `ReservationsController::getReservations` |
| `/v1/reservations/{id}` | GET/PUT/DELETE | `/v1/reservations/{id}` | `ReservationsController` |
| `/v1/reservations/{id}/guestdata` | POST | `/v1/reservations/{id}/guests` | `ReservationsController::addReservationGuests` |
| `/v1/reservations/{id}/guestdata` | GET | `/v1/reservations/{id}/guestdata` | `ReservationsController::getReservationGuestData` |
| `/v1/reservations/{id}/guestdata/{guest_id}` | GET/PUT | `/v1/reservations/{id}/guestdata/{guest_id}` | `ReservationsController` |
| `/v1/bookings` | POST | `/v1/bookings` | `BookingsController::createBooking` |
| `/v1/bookings` | GET | `/v1/bookings` | `BookingsController::getBookings` |
| `/v1/bookings/{id}` | GET | `/v1/bookings/{id}` | `BookingsController::getBooking` |
| `/v1/bookingorders` | GET | `/v1/bookingorders/list` | `BookingOrdersController::getBookingOrders` |
| `/v1/bookingorders/{id}` | GET | `/v1/bookingorders/{id}` | `BookingOrdersController::getBookingOrder` |
| `/v1/bookingorders/{id}/guestdata` | GET/PUT | `/v1/bookingorders/{id}/guestdata` | `BookingOrdersController` |
| `/v1/etickets` | GET | `/v1/etickets` | `ETicketsController::getETickets` |
| `/v1/etickets/download/zip/{id}` | GET | `/v1/etickets/download/zip/{id}` | `ETicketsController::getETicketsZipUrl` |
| `/v1/etickets/download/{id}/{item}/url/{url}` | GET | `/v1/etickets/download/{id}/{item}/url/{url}` | `ETicketsController::downloadETicket` |

### Local PHP Proxy Endpoints (not forwarded to XS2Event)

| PHP Route | Method | Controller | Purpose |
|---|---|---|---|
| `/api/v1/local-bookings` | POST | `LocalBookingController::createBooking` | Create local booking + trigger XS2Event bridge |
| `/api/v1/local-bookings/{id}` | GET | `LocalBookingController::getBooking` | Get local booking by ID |
| `/api/v1/local-bookings/customer/{email}` | GET | `LocalBookingController` | Get all bookings by customer email |
| `/api/v1/customers/auth/login` | POST | `CustomerAuthController` | Customer login |
| `/api/v1/customers/auth/register` | POST | `CustomerAuthController` | Customer register |
| `/api/v1/customers/auth/refresh` | POST | `CustomerAuthController` | Refresh JWT token |
| `/api/v1/customers/profile` | GET/PUT | `CustomerProfileController` | Customer profile |
| `/api/v1/customers/bookings` | GET | `CustomerBookingController::getBookings` | Customer bookings (XS2Event) |
| `/api/v1/customers/bookings/{id}/tickets/status` | GET | `CustomerETicketController::getTicketStatus` | Check ticket status |
| `/api/v1/customers/bookings/{id}/tickets/zip` | GET | `CustomerETicketController::downloadZip` | Download all tickets ZIP |
| `/api/v1/customers/bookings/{id}/tickets/download` | GET | `CustomerETicketController::downloadTicket` | Download single ticket PDF |
| `/api/v1/customers/bookings/{id}/tickets/check-availability` | POST | `CustomerETicketController::checkAvailability` | Force refresh from XS2Event |

---

## Data Flow Diagram

```
USER                    FRONTEND               PHP PROXY              XS2EVENT API
 |                         |                       |                        |
 |-- Browse Events ------->|                       |                        |
 |                         |-- GET /v1/sports ---->|-- GET /v1/sports ----->|
 |                         |                       |                        |
 |-- Select Tickets ------>|                       |                        |
 |                         |-- GET /v1/tickets?--->|-- GET /v1/tickets? --->|
 |                         |-- GET /v1/events/{id}/guestdata             |
 |                         |                       |                        |
 |-- Checkout (login) ---->|-- POST /auth/login -->|-- local DB only -------|
 |                         |                       |                        |
 |-- Fill guest details -->|                       |                        |
 |                         |-- POST /v1/reservations                        |
 |                         |                       |-- POST /v1/reservations>|
 |                         |                       |<-- reservation_id ------|
 |                         |-- POST /v1/reservations/{id}/guests           |
 |                         |                       |-- POST /v1/reservations/{id}/guestdata ->|
 |                         |                       |<-- 200 OK --------------|
 |                         |                       |                        |
 |-- Enter card ---------->|                       |                        |
 |                         |-- Stripe PaymentIntent (direct)               |
 |                         |<-- payment_intent_id --------------------------|
 |                         |                       |                        |
 |                         |-- POST /api/v1/local-bookings                 |
 |                         |                       |-- saves to local DB    |
 |                         |                       |-- POST /v1/bookings -->|
 |                         |                       |                        |-- xs2event booking
 |                         |                       |<-- booking_id, code ---|
 |                         |                       |-- updates local DB     |
 |                         |                       |-- sends confirm email  |
 |                         |<-- booking_id, ref ---|                        |
 |<-- Payment confirmed ---|                       |                        |
 |                         |                       |                        |
 |-- View My Bookings ---->|                       |                        |
 |                         |-- GET /local-bookings/customer/{email}        |
 |                         |                       |-- local DB query       |
 |<-- Booking list --------|                       |                        |
 |                         |                       |                        |
 |-- Check Tickets ------->|                       |                        |
 |                         |-- POST .../check-availability                 |
 |                         |                       |-- GET /v1/bookingorders?booking_id=... ->|
 |                         |                       |<-- logistic_status ----|
 |<-- "Available" ---------|                       |                        |
 |                         |                       |                        |
 |-- Download Tickets ---->|                       |                        |
 |                         |-- GET .../tickets/zip |                        |
 |                         |                       |-- GET /v1/etickets/download/zip/{id} ->|
 |                         |                       |<-- zip_url ------------|
 |<-- PDF ZIP download ----|                       |                        |
```

---

## Key Business Rules

| Rule | Detail |
|---|---|
| Reservation TTL | XS2Event reservations expire after **10 minutes**. Payment must be completed within this window. |
| `payment_method` for XS2Event | Always `"invoice"` regardless of how the customer actually paid (Stripe, etc.) |
| Guest country format | Must be ISO 3166-1 **alpha-3** (3-letter code: `GBR`, `USA`, `DEU`) not alpha-2 |
| Gender values | Exactly: `male`, `female`, or `unknown` |
| `net_rate` in reservation | Must exactly match the `face_value` returned by the XS2Event tickets endpoint |
| Lead guest | Exactly one guest per ticket group must have `lead_guest: true` |
| XS2Event auth | All server-side requests to XS2Event use `X-Api-Key: {key}` header |
| Stripe auth | Client-side payment via `VITE_STRIPE_PUBLISHABLE_KEY`; confirmation server-side |
| XS2Event booking creation | Triggered server-side automatically after Stripe payment succeeds — frontend does NOT call `POST /v1/bookings` directly |

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| Reservation expires before payment | XS2Event returns `422` on guest data / booking; user must restart checkout |
| Stripe payment fails | No local booking is created; user sees Stripe error |
| XS2Event booking creation fails | Local booking is still saved as `confirmed`; bridge error is logged; booking can be re-synced manually |
| E-ticket not yet available | `eticket_available = false`; user sees "check back later" message; can click "Check Availability" to force refresh |

---

## Files Reference

| File | Purpose |
|---|---|
| `frontend/src/pages/EventTicketsPage.tsx` | Event + ticket browsing, guest requirements fetch |
| `frontend/src/pages/CheckoutGuestDetailsPage.tsx` | Guest form, reservation creation, guest data submission |
| `frontend/src/pages/CheckoutPaymentPage.tsx` | Stripe payment, local booking creation |
| `frontend/src/pages/PaymentSuccessPage.tsx` | Post-payment confirmation display |
| `frontend/src/pages/BookingsPage.tsx` | My bookings list + e-ticket download |
| `frontend/src/hooks/useReservation.ts` | `createReservation()`, `addGuestData()` |
| `frontend/src/hooks/useBooking.ts` | `createBooking()` — exists but unused (bridge handles this server-side) |
| `frontend/src/services/eTicketService.ts` | E-ticket status check + download |
| `frontend/src/services/apiRoutes.ts` | All API endpoint constants + TypeScript types |
| `api/src/Controller/ReservationsController.php` | Proxy for XS2Event reservations + guest data |
| `api/src/Controller/BookingsController.php` | Proxy for XS2Event bookings |
| `api/src/Controller/BookingOrdersController.php` | Proxy for XS2Event booking orders |
| `api/src/Controller/ETicketsController.php` | Proxy for XS2Event e-ticket downloads |
| `api/src/Controller/LocalBookingController.php` | Local booking CRUD + XS2Event bridge trigger |
| `api/src/Controller/CustomerETicketController.php` | Customer e-ticket endpoints (auth-protected) |
| `api/src/Service/XS2EventBookingBridge.php` | Server-side bridge: creates XS2Event booking after payment |
| `api/src/Service/ETicketService.php` | Server-side e-ticket status + download URL resolution |
| `api/src/Controller/ProxyController.php` | Catch-all proxy for unregistered `/v1/*` routes |
| `api/src/Application.php` | All route registrations |
