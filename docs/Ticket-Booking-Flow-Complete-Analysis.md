# Rondo Sports Tickets — Complete Ticket Booking Flow: End-to-End Technical Reference

**Document Version:** 1.0  
**Date:** May 2026  
**Scope:** Frontend (`/frontend`), Admin Panel (`/admin`), API/Backend (`/api`), XS2Event API, Stripe Payment Gateway  
**Audience:** Developers, QA Engineers, Business Stakeholders

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Event Discovery Flow](#2-event-discovery-flow)
3. [Ticket Selection & Cart Flow](#3-ticket-selection--cart-flow)
4. [Checkout Flow (Step-by-Step)](#4-checkout-flow-step-by-step)
   - 4.1 [Step 1: Authentication (Login / Registration)](#41-step-1-authentication-login--registration)
   - 4.2 [Step 2: Guest Details Entry](#42-step-2-guest-details-entry)
   - 4.3 [Step 3: XS2Event Reservation Creation](#43-step-3-xs2event-reservation-creation)
   - 4.4 [Step 4: Payment via Stripe](#44-step-4-payment-via-stripe)
   - 4.5 [Step 5: Local Booking Creation (Post-Payment)](#45-step-5-local-booking-creation-post-payment)
   - 4.6 [Step 6: XS2Event Booking Synchronization](#46-step-6-xs2event-booking-synchronization)
   - 4.7 [Step 7: Booking Confirmation Email](#47-step-7-booking-confirmation-email)
   - 4.8 [Step 8: Payment Success Page](#48-step-8-payment-success-page)
5. [XS2Event API Integration Flow](#5-xs2event-api-integration-flow)
6. [E-Ticket Generation & Delivery Flow](#6-e-ticket-generation--delivery-flow)
7. [Admin Application Booking Management Flow](#7-admin-application-booking-management-flow)
8. [Customer Cancellation & Refund Flow](#8-customer-cancellation--refund-flow)
9. [Database Schema Reference](#9-database-schema-reference)
10. [API Endpoint Reference](#10-api-endpoint-reference)
11. [Data Flow & Sequence Diagrams](#11-data-flow--sequence-diagrams)
12. [Error Handling Scenarios](#12-error-handling-scenarios)
13. [Technical Configuration Summary](#13-technical-configuration-summary)

---

## 1. System Architecture Overview

The Rondo Sports Tickets platform consists of three independently deployed applications that communicate via REST APIs:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        RONDO SYSTEM ARCHITECTURE                            │
│                                                                             │
│  ┌──────────────────┐    ┌──────────────────────┐    ┌──────────────────┐  │
│  │  Frontend App    │    │    Backend API        │    │   Admin Panel    │  │
│  │  (React/Vite)    │◄──►│  (PHP/Slim/Guzzle)   │◄──►│  (React/Vite)   │  │
│  │  Port: 5173      │    │  Port: 80/443         │    │  Port: 5174      │  │
│  └──────────────────┘    └──────────────────────┘    └──────────────────┘  │
│           │                        │                                        │
│           │                        ▼                                        │
│           │             ┌─────────────────────┐                            │
│           │             │   MySQL Database     │                            │
│           │             │  (rondo schema)      │                            │
│           │             └─────────────────────┘                            │
│           │                        │                                        │
│           │              ┌─────────┴──────────┐                            │
│           │              │                    │                             │
│           ▼              ▼                    ▼                             │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐               │
│  │  XS2Event API  │  │  Stripe API    │  │  SendGrid API  │               │
│  │  (Ticketing)   │  │  (Payments)    │  │  (Emails)      │               │
│  └────────────────┘  └────────────────┘  └────────────────┘               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Frontend** | React 18 + TypeScript + Vite | Public-facing website for event browsing and booking |
| **Admin Panel** | React 18 + TypeScript + Vite | Internal booking management, reporting, user management |
| **Backend API** | PHP 8 + Slim 4 + Guzzle HTTP | REST API proxy between frontend and external services |
| **XS2Event API** | External REST API | Primary ticket inventory, reservations, and e-ticket source |
| **Stripe** | Payment Gateway | Handles all credit/debit card payment processing |
| **SendGrid** | Email Service | Transactional email delivery (booking confirmation, verification) |
| **MySQL** | Database | Local persistence of bookings, customers, and configuration |

### Environment Variables (Key)

| Variable | Application | Purpose |
|----------|-------------|---------|
| `VITE_XS2EVENT_BASE_URL` | Frontend | XS2Event proxy base URL |
| `VITE_CUSTOMER_API_BASE_URL` | Frontend | Local backend API URL |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Frontend | Stripe.js client initialization |
| `STRIPE_SECRET_KEY` | Backend API | Stripe server-side operations |
| `STRIPE_WEBHOOK_SECRET` | Backend API | Stripe webhook signature verification |
| `API_BASE_URL` | Backend API | XS2Event API base URL |
| `API_KEY` | Backend API | XS2Event API key (X-Api-Key header) |
| `SENDGRID_API_KEY` | Backend API | Email delivery |

---

## 2. Event Discovery Flow

### 2.1 Application Entry Points

Public users can discover events through multiple URL-based entry points on the frontend:

| Route | Page | Filter Parameters |
|-------|------|-------------------|
| `/events` | EventsPage | None (show all) |
| `/events?sport_type=soccer` | EventsPage | Sport type |
| `/tournaments/:tournamentId/events` | EventsPage | `tournament_id` |
| `/teams/:teamId/events` | EventsPage | `team_id` |
| `/sports/:sport/tournaments` | TournamentsPage | Sport-level filtering |

### 2.2 Event Listing API Flow

```
User visits /events  
       │
       ▼
EventsPage.tsx renders
       │
       ▼
useEvents() hook called with URL params:
  { sport_type, tournament_id, team_id, date }
       │
       ▼
GET {VITE_XS2EVENT_BASE_URL}/v1/events?
  sport_type=soccer
  &tournament_id=xxx
  &team_id=xxx
  &date_stop=ge:2026-05-25  ← Default: only future events
       │
       ▼
Backend: EventsController::listEvents()
  Proxies to: GET https://api.xs2event.com/v1/events
  Headers: X-Api-Key, Accept: application/json
  Cache-Control: public, max-age=3600 (1 hour cache)
       │
       ▼
XS2Event API returns event list:
  [ { event_id, event_name, date_start, date_stop,
      tournament_id, tournament_name, venue_name,
      city, sport_type, season, hometeam_id, 
      visiting_id, min_ticket_price_eur, 
      max_ticket_price_eur, number_of_tickets, 
      event_status, slug } ]
       │
       ▼
Frontend renders event cards with:
  - Event name, date/time, venue
  - Team names and logos
  - Price range (converted to user's selected currency)
  - Availability status
```

### 2.3 Currency Conversion on Event Listing

The frontend uses multi-currency conversion hooks to display prices in the user's selected currency:

```
useMultiCurrencyConversion(['EUR'], selectedCurrencyCode)
  → GET /api/v1/currencies/exchange-rates
  → Converts min_ticket_price_eur and max_ticket_price_eur
  → Displayed as: "USD 450 – USD 1,200" (example)
```

### 2.4 Supported XS2Event Event Query Filters

| Parameter | Description | Format |
|-----------|-------------|--------|
| `sport_type` | Filter by sport | `soccer`, `tennis`, `rugby`, `motorsport` |
| `tournament_id` | Specific tournament | UUID |
| `team_id` | Events involving a specific team | UUID |
| `hometeam_id` | Events where team is home | UUID |
| `date_start` | Start date range | `ge:YYYY-MM-DD` |
| `date_stop` | End date range | `ge:YYYY-MM-DD` |
| `event_status` | Filter by status | `notstarted`, `soldout`, `cancelled` |
| `city` | Filter by city | String |
| `country` | Filter by country | ISO-3 (e.g., `GBR`) |
| `season` | Season filter | `2025/26` |
| `slug` | SEO URL slug | String |
| `page` / `page_size` | Pagination | Numbers |

---

## 3. Ticket Selection & Cart Flow

### 3.1 Event Details Page

After clicking an event, the user navigates to `/events/:eventId/tickets` which renders `EventTicketsPage.tsx`.

**API calls made simultaneously on page load:**

```
1. GET /v1/events/{eventId}              → Event details (name, date, venue, teams)
2. GET /v1/tickets?event_id={eventId}   → Available ticket categories
   &ticket_status=available
   &stock=gt:0                          ← Only in-stock tickets (never cached)
3. GET /v1/events/{eventId}/guestdata   → Guest data requirements for the event
4. GET /api/v1/markup-rules/effective   → Tiered pricing markups (sport/tournament/team/ticket)
5. GET /api/v1/hospitalities/public     → Hospitality packages assigned to this event
```

> **Important:** The `TicketsController` sets `Cache-Control: no-store, no-cache` for ticket data — ticket stock and prices must always reflect live inventory.

### 3.2 Ticket Data Structure (XS2Event)

Each ticket returned from XS2Event contains:

```typescript
interface Ticket {
  ticket_id: string;          // XS2Event ticket UUID (e.g., "c4d8eba21b964f06bc5b80da69e3b8dc_spp")
  ticket_title: string;       // Display name (e.g., "Matchday Plus")
  face_value: number;         // Base price
  net_rate: number;           // Net cost to distributor
  currency_code: string;      // "EUR" | "GBP" | "USD"
  ticket_status: string;      // "available" | "soldout" | "cancelled"
  stock: number;              // Available quantity
  category_id: string;        // Category UUID
  category_name: string;      // Category display name
  event_id: string;           // Parent event UUID
}
```

### 3.3 Markup Pricing Engine

The platform applies hierarchical ticket markups configured in the admin panel. The markup resolution priority is:

```
Legacy Ticket Markup (highest priority)
    ↓
Ticket-Level Markup Rule
    ↓
Event-Level Markup Rule
    ↓
Team-Level Markup Rule
    ↓
Tournament-Level Markup Rule
    ↓
Sport-Level Markup Rule (lowest priority)
```

**Markup types:**
- **Percentage** — e.g., add 15% to net_rate
- **Fixed Amount** — e.g., add USD 50.00 flat

The final price shown to the user:
```
final_price = face_value + markup_amount
(converted to user's selected display currency)
```

### 3.4 Hospitality Packages

Hospitality services are optionally bundled with tickets. The `usePublicEventHospitalities` hook resolves which hospitalities are available per ticket category using the same hierarchical resolution as markups:

```
Sport → Tournament → Team → Event → Ticket → Category
```

Hospitalities are **included with the ticket price** (informational only — no separate pricing at checkout). They are displayed as amenity badges on the ticket card and appear in the order summary.

### 3.5 Cart Management

The cart is managed in **React local state** within `EventTicketsPage.tsx` using `CartItem[]`:

```typescript
interface CartItem {
  ticket: Ticket;
  quantity: number;
  includedHospitalities?: { hospitality_id: number; name: string; description?: string }[];
}
```

**Cart Operations:**
- `Add to Cart` → Increments quantity or adds new CartItem
- `Remove from Cart` → Decrements quantity or removes item
- **Cart maximum** → Limited by `ticket.stock` (live from XS2Event)
- **Cart Panel** → Slide-in panel showing selected items and totals

**Price finalization before checkout:**
When the user proceeds to checkout from the `CartPanel`, the final prices are calculated in the user's selected currency and passed via React Router navigation state:

```typescript
navigate('/checkout/login', {
  state: {
    cartItems,           // Each item with finalPriceUSD and markupAmount
    eventData,           // Event name, venue, date
    guestRequirements,   // XS2Event guest data requirements
    markupsData,         // Applied markup rules
    selectedCurrencyCode // e.g., "USD"
  }
});
```

---

## 4. Checkout Flow (Step-by-Step)

The checkout is a **multi-page linear flow** using React Router with state propagation between pages:

```
/checkout
    → redirects to →
/checkout/login  →  /checkout/guest-details  →  /checkout/payment  →  /payment/success
```

### 4.1 Step 1: Authentication (Login / Registration)

**Page:** `CheckoutLoginPage.tsx`  
**Route:** `/checkout/login`

**Purpose:** Ensure the customer is authenticated before proceeding. Unauthenticated users must log in or create an account.

**Guard:** If no `cartItems` in navigation state → redirect to `/`

**Authentication Modes:**

| Mode | Action |
|------|--------|
| `login` | POST `/api/v1/customers/auth/login` → Returns JWT token → stored in `localStorage` as `customer_access_token` |
| `register` | POST `/api/v1/customers/auth/register` → Creates account → Sends email verification → Switches to login mode |
| `forgot-password` | POST `/api/v1/customers/auth/forgot-password` → Sends reset email |

**Registration Data Collected:**
```json
{
  "email": "customer@example.com",
  "password": "min 8 chars",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+44xxxxxxxxx",
  "street": "123 High Street",
  "house_number": "Flat 2",
  "city": "London",
  "zipcode": "SW1A 1AA",
  "country_code": "GBR"
}
```

**On Successful Authentication:**
```
isAuthenticated === true
  → navigate('/checkout/guest-details', { state: { ...checkoutState, userInfo: customer } })
```

### 4.2 Step 2: Guest Details Entry

**Page:** `CheckoutGuestDetailsPage.tsx`  
**Route:** `/checkout/guest-details`

**Guards:**
- Not authenticated → redirect to `/checkout/login`
- No cart items → redirect to `/`

**What Happens:**
1. The authenticated customer's profile is loaded via `GET /api/v1/customers/profile`
2. Guest forms are initialized — one form per ticket (based on total quantity)
3. **Lead guest** (Guest 1) is pre-filled from customer profile data
4. Additional guests have empty forms

**Guest Data Fields (driven by XS2Event requirements from `guestRequirements`):**

| Field | Required | Notes |
|-------|----------|-------|
| `first_name` | Always | |
| `last_name` | Always | |
| `contact_email` | Always | Validated as proper email format |
| `date_of_birth` | Event-specific | XS2Event `guestdata` requirements |
| `country_of_residence` | Event-specific | ISO-3 code |
| `gender` | Event-specific | `male` / `female` / `other` |
| `passport_number` | Event-specific | For international events |
| `street_name` / `city` / `zip` | Event-specific | Address data |
| `contact_phone` | Event-specific | |

**On Continue:**
1. Client-side validation runs (`validateAllGuests()`)
2. If valid → `createReservation()` is called
3. Guest data is attached to the reservation
4. Navigation proceeds to payment page

**Navigation to Payment:**
```typescript
navigate('/checkout/payment', {
  state: {
    ...checkoutState,
    guests: guestFormData[],
    reservation: { reservation_id: "xxx_rsr", expires_at: "...", status: "open" }
  }
});
```

### 4.3 Step 3: XS2Event Reservation Creation

**Triggered by:** `handleContinueToPayment()` in `CheckoutGuestDetailsPage.tsx`  
**Hook:** `useReservation()`

**Step 3a — Create Reservation:**

```
POST {VITE_XS2EVENT_BASE_URL}/v1/reservations
Headers: Authorization: Bearer {customer_jwt}

Body:
{
  "items": [
    {
      "ticket_id": "c4d8eba21b964f06bc5b80da69e3b8dc_spp",
      "quantity": 2,
      "net_rate": 37400,
      "currency_code": "EUR"
    }
  ]
}
```

**Backend → XS2Event:**
```
ReservationsController::createReservation()
  → POST https://api.xs2event.com/v1/reservations
  → Returns: { reservation_id: "xxx_rsr", status: "open", expires_at: "...", items: [...] }
```

**XS2Event Reservation Response:**
```json
{
  "reservation_id": "feee05f4ac8c4fe1a551a4382335f9d9_rsr",
  "status": "open",
  "expires_at": "2026-01-27T13:14:02",
  "items": [
    {
      "ticket_id": "c4d8eba21b964f06bc5b80da69e3b8dc_spp",
      "quantity": 2,
      "net_rate": 37400,
      "currency": "EUR"
    }
  ]
}
```

> **Ticket Locking:** XS2Event locks the requested ticket quantity for the duration of the reservation (typically 15–30 minutes). This prevents overselling during checkout.

**Step 3b — Submit Guest Data to Reservation:**

```
POST {VITE_XS2EVENT_BASE_URL}/v1/reservations/{reservation_id}/guestdata

Body:
{
  "items": [
    {
      "ticket_id": "c4d8eba21b964f06bc5b80da69e3b8dc_spp",
      "quantity": 2,
      "guests": [
        {
          "first_name": "John",
          "last_name": "Doe",
          "contact_email": "john@example.com",
          "date_of_birth": "1985-06-15",
          "country_of_residence": "GBR",
          "lead_guest": true
        },
        {
          "first_name": "Jane",
          "last_name": "Doe",
          "contact_email": "jane@example.com",
          "date_of_birth": "1988-03-22",
          "country_of_residence": "GBR",
          "lead_guest": false
        }
      ]
    }
  ]
}
```

**Backend → XS2Event:**
```
ReservationsController::addGuestData()
  → POST https://api.xs2event.com/v1/reservations/{reservation_id}/guestdata
```

### 4.4 Step 4: Payment via Stripe

**Page:** `CheckoutPaymentPage.tsx`  
**Route:** `/checkout/payment`  
**Component:** `StripeCheckout.tsx`

**Guards:**
- No `state.reservation` → Show "Invalid Access" error + link to restart

**Step 4a — Create Stripe Payment Intent:**

```
POST {VITE_CUSTOMER_API_BASE_URL}/api/v1/payments/create-intent

Body:
{
  "total_amount": 88653.28,
  "currency": "USD",
  "customer_email": "john@example.com"
}
```

**Backend PaymentController::createPaymentIntent():**
```
Stripe::setApiKey($stripeSecretKey)
PaymentIntent::create([
  'amount' => 8865328,      // Amount in cents
  'currency' => 'usd',
  'receipt_email' => 'john@example.com',
  'description' => 'Sports Event Booking',
  'automatic_payment_methods' => ['enabled' => true]
])
→ Returns: { client_secret: "pi_xxx_secret_yyy", payment_intent_id: "pi_xxx" }
```

**Step 4b — Stripe Elements Renders Payment Form:**

The `StripeCheckout` component uses `@stripe/stripe-js` and `@stripe/react-stripe-js`:

```typescript
const stripePromise = loadStripe(VITE_STRIPE_PUBLISHABLE_KEY);

// Stripe Elements with client_secret
<Elements stripe={stripePromise} options={{ clientSecret }}>
  <PaymentElement options={{
    layout: { type: 'tabs', defaultCollapsed: false },
    defaultValues: {
      billingDetails: { name, email, phone }
    }
  }} />
</Elements>
```

**Step 4c — Payment Confirmation:**

```typescript
const { error, paymentIntent } = await stripe.confirmPayment({
  elements,
  confirmParams: {
    return_url: `${window.location.origin}/payment/success`,
    receipt_email: customerEmail
  },
  redirect: 'if_required'  // Use Payment Intent flow (no redirect for cards)
});
```

**On Success:**
```
paymentIntent.status === 'succeeded'
  → Extract payment details:
    { payment_intent_id, payment_method_id, customer_id,
      amount, currency, status, created, charge_id, full_response }
  → Call handlePaymentSuccess(paymentDetails)
```

### 4.5 Step 5: Local Booking Creation (Post-Payment)

**Triggered by:** `handlePaymentSuccess()` in `CheckoutPaymentPage.tsx`

> **Design Decision:** The booking is created **after** successful payment, not before. This prevents orphaned "pending" bookings when payment fails.

```
POST {VITE_CUSTOMER_API_BASE_URL}/api/v1/local-bookings

Body:
{
  "customer_email": "john@example.com",
  "customer_first_name": "John",
  "customer_last_name": "Doe",
  "event_name": "Manchester United vs Liverpool FC",
  "event_date": "2026-05-02",
  "venue_name": "Old Trafford",
  "sport_type": "Football",
  "tournament_name": "Premier League",
  "total_amount": 88653.28,
  "currency": "USD",
  "ticket_count": 2,
  "ticket_info": [
    {
      "title": "Ticket Plus",
      "quantity": 2,
      "price": 51297.22,
      "ticket_id": "c4d8eba21b964f06bc5b80da69e3b8dc_spp",
      "net_rate": 39400,
      "currency_code": "EUR"
    }
  ],
  "category_name": "Ticket Plus",
  "reservation_id": "feee05f4ac8c4fe1a551a4382335f9d9_rsr",
  "customer_notes": "John Doe, Jane Doe",
  "hospitalities": [
    { "hospitality_id": 1, "name": "VIP Lounge Access", "ticket_id": "c4d8eba..." }
  ],
  "payment_method": "stripe",
  "payment_reference": "pi_3SuBcTAACrTbXrje0hrrFSlW",
  "payment_intent_id": "pi_3SuBcTAACrTbXrje0hrrFSlW",
  "stripe_payment_method_id": "pm_xxx",
  "stripe_customer_id": "cus_xxx",
  "stripe_charge_id": "ch_xxx",
  "payment_gateway_response": "{...full stripe response...}",
  "payment_completed_at": "2026-05-02T12:43:45",
  "payment_status": "completed",
  "status": "confirmed"
}
```

**Backend `LocalBookingController::createBooking()` Processing:**

```
1. Validate required fields: customer_email, event_name, event_date, total_amount, ticket_count
2. Find or create customer in customer_users table
   → If not found: Create guest account (empty password_hash)
   → customer_id = existing or new id
3. Generate booking reference: "BK-{YEAR}-{6-digit-random}" (e.g., "BK-2026-985461")
4. INSERT into bookings table with all payment and booking data
5. If hospitalities provided: INSERT into booking_hospitalities table
6. If payment_status = 'completed' AND reservation_id exists:
   → Trigger XS2EventBookingBridge::processBookingAfterPayment($bookingId)
7. Send booking confirmation email via SendGrid
8. Return: { success: true, data: { booking_id, booking_reference, api_reservation_id } }
```

### 4.6 Step 6: XS2Event Booking Synchronization

**Service:** `XS2EventBookingBridge::processBookingAfterPayment()`  
**Triggered:** Automatically after successful payment and local booking creation

```
processBookingAfterPayment($localBookingId):

1. Load booking from database
2. Check if already synced (api_booking_id exists → skip)
3. Increment xs2event_sync_attempts counter
4. Check if api_reservation_id exists in booking:
   
   ├── YES (normal flow — reservation was created during checkout):
   │     Skip reservation creation, use existing reservation_id
   │
   └── NO (fallback flow — should not occur normally):
         createXS2EventReservation($bookingData)
         → POST https://api.xs2event.com/v1/reservations
         submitGuestDataToXS2Event($reservationId, $bookingData)
         → POST https://api.xs2event.com/v1/reservations/{id}/guestdata

5. createXS2EventBooking($reservationId, $bookingData):
   POST https://api.xs2event.com/v1/bookings
   {
     "reservation_id": "feee05f4ac8c4fe1a551a4382335f9d9_rsr",
     "payment_method": "invoice",
     "payment_reference": "pi_3SuBcTAACrTbXrje0hrrFSlW",
     "booking_reference": "BK-2026-985461",
     "booking_email": "john@example.com"
   }
   → Returns: {
       "booking_id": "b730247f84864aba9c04825d47f799d5_bkn",
       "booking_code": "DMLHFH",
       "financial_status": "OPEN",
       "logistic_status": null,
       "created": "2026-01-27T12:44:05"
     }

6. updateLocalBookingWithXS2EventData($localBookingId, $xs2eventBooking):
   → UPDATE bookings SET
       api_booking_id = "b730247f84864aba9c04825d47f799d5_bkn",
       xs2event_booking_code = "DMLHFH",
       xs2event_booking_status = "OPEN",
       xs2event_logistic_status = null,
       xs2event_response_data = "{...}",
       xs2event_synced_at = NOW(),
       xs2event_sync_attempts = 1
```

> **Resilience:** If XS2Event booking creation fails, the local booking is NOT rolled back. The error is stored in `xs2event_last_error` and the sync can be retried manually from the admin panel.

### 4.7 Step 7: Booking Confirmation Email

**Service:** `EmailService::sendBookingConfirmation()`  
**Provider:** SendGrid API  
**Triggered:** After successful local booking creation

**Template Resolution:**
1. Try to load active template from `email_templates` table with `event_key = 'booking_confirmation'`
2. If no DB template found: Use hardcoded HTML fallback template
3. Replace `{{placeholder}}` tokens with booking data

**Email Variables:**
```
{{customer_name}}     → "John Doe"
{{booking_id}}        → "34"
{{booking_reference}} → "BK-2026-985461"
{{event_name}}        → "Manchester United vs Liverpool FC"
{{event_date}}        → "May 2, 2026"
{{venue_name}}        → "Old Trafford"
{{ticket_count}}      → "2"
{{total_amount}}      → "USD 102,794.45"
{{currency}}          → "USD"
```

**SendGrid Dispatch:**
```php
$sendGrid->send($mail);
// Expected response status: 202 Accepted
```

### 4.8 Step 8: Payment Success Page

**Page:** `PaymentSuccessPage.tsx`  
**Route:** `/payment/success`

**State received from navigation:**
```typescript
{
  paymentIntentId: "pi_3SuBcTAACrTbXrje0hrrFSlW",
  bookingId: 34,
  bookingReference: "BK-2026-985461",
  apiReservationId: "feee05f4ac8c4fe1a551a4382335f9d9_rsr",
  totalAmount: 102794.45,
  currency: "USD",
  eventData: { event_name, date_start, venue_name, city },
  customerEmail: "john@example.com"
}
```

**Page Actions:**
1. Display booking confirmation with booking reference
2. Show total amount paid
3. Confirm that confirmation email has been sent
4. Inform customer that e-tickets will be available for download before the event
5. Link to `/bookings` to view all bookings

---

## 5. XS2Event API Integration Flow

### 5.1 API Client Architecture

The frontend uses two separate API clients:

| Client | File | Auth Method | Target |
|--------|------|-------------|--------|
| `XS2EventAPI` (apiClient) | `apiRoutes.ts` | `X-Api-Key` header | XS2Event proxy on backend |
| `CustomerAPIClient` (customerApiClient) | `customerApiClient.ts` | `Bearer {JWT}` in Authorization header | Local backend API |

The backend acts as a **transparent proxy** for most XS2Event API calls — forwarding query parameters and returning responses unmodified. Authentication headers are added server-side from environment variables.

### 5.2 Complete XS2Event API Call Map

| # | Operation | HTTP Method | XS2Event Endpoint | Called When |
|---|-----------|-------------|-------------------|-------------|
| 1 | List Events | GET | `/v1/events` | User browses events |
| 2 | Get Event | GET | `/v1/events/{id}` | User opens event ticket page |
| 3 | Event Guest Requirements | GET | `/v1/events/{id}/guestdata` | Ticket page loads |
| 4 | List Tickets | GET | `/v1/tickets?event_id={id}` | Ticket page loads (no cache) |
| 5 | Get Ticket | GET | `/v1/tickets/{id}` | Individual ticket detail |
| 6 | Ticket Guest Requirements | GET | `/v1/tickets/{id}/guestdata` | Guest form configuration |
| 7 | List Sports | GET | `/v1/sports` | Sports navigation |
| 8 | List Tournaments | GET | `/v1/tournaments` | Tournament filtering |
| 9 | List Teams | GET | `/v1/teams` | Team browsing |
| 10 | Get Team | GET | `/v1/teams/{id}` | Team event page |
| 11 | Create Reservation | POST | `/v1/reservations` | Guest details submitted |
| 12 | Get Reservation | GET | `/v1/reservations/{id}` | Status check |
| 13 | Submit Guest Data | POST | `/v1/reservations/{id}/guestdata` | Guest details submitted |
| 14 | List Reservations | GET | `/v1/reservations` | Admin view |
| 15 | Create Booking | POST | `/v1/bookings` | Post-payment sync |
| 16 | Get Booking | GET | `/v1/bookings/{id}` | Status sync |
| 17 | Get Bookings by Reservation | GET | `/v1/bookings/reservation/{id}` | Reservation lookup |
| 18 | List Booking Orders | GET | `/v1/bookingorders/list` | E-ticket availability check |
| 19 | Get Booking Order | GET | `/v1/bookingorders/{id}` | Ticket download prep |
| 20 | Booking Order Guest Data | GET | `/v1/bookingorders/{id}/guestdata` | Guest info retrieval |
| 21 | Download E-Ticket ZIP | GET | `/v1/etickets/download/zip/{bookingorder_id}` | ZIP download |
| 22 | Download Single E-Ticket | GET | `/v1/etickets/download/{bookingorder_id}/{item_id}/url/{url}` | Individual ticket download |

### 5.3 XS2Event Booking State Machine

```
Reservation Created (status: "open")
         │
         │ Reservation expires (typically 15-30 min)
         │      ↓
         │  [Expired — tickets released back to inventory]
         │
         │ Guest data submitted
         ↓
Guest Data Attached (status: "open" with guest data)
         │
         │ Payment completed
         ↓
Booking Created (POST /v1/bookings)
  → financial_status: "OPEN"
  → logistic_status: null
         │
         │ Fulfillment processing by XS2Event
         ↓
Booking Processing
  → logistic_status: "processing"
         │
         │ E-tickets generated
         ↓
Booking Completed
  → logistic_status: "COMPLETED"
  → xs2event_distribution_channel: "eticket"
  → xs2event_booking_code: "DMLHFH"
         │
         │ Booking orders available
         ↓
E-tickets Available (GET /v1/bookingorders/list)
  → bookingorders[].items[].download_link populated
  → distribution_channel: "xs2event"
```

### 5.4 XS2Event ID Reference Guide

XS2Event uses UUID-style IDs with a suffix indicating the entity type:

| Suffix | Entity Type | Example |
|--------|-------------|---------|
| `_gnr` | Event | `4c0f77d299d94e4bbb23a0adcb094cd2_gnr` |
| `_spp` / `_spt` | Ticket/Seat | `c4d8eba21b964f06bc5b80da69e3b8dc_spp` |
| `_rsr` | Reservation | `feee05f4ac8c4fe1a551a4382335f9d9_rsr` |
| `_bkn` | Booking | `b730247f84864aba9c04825d47f799d5_bkn` |
| `_cln` | Client/Distributor | `cd319f22153047bdb449a6506c8392af_cln` |

---

## 6. E-Ticket Generation & Delivery Flow

### 6.1 How E-Tickets Are Generated

E-tickets are **generated by XS2Event**, not by the Rondo platform. Rondo acts as the distributor and proxies the download.

```
Payment Completed
       │
       ▼
XS2Event Booking Created (POST /v1/bookings)
       │
       ▼
XS2Event Fulfillment Processing
  → Internal ticket generation
  → Ticket PDFs created and stored on XS2Event CDN
  → download_link generated per ticket item
       │
       ▼
Booking Order Completed (GET /v1/bookingorders/list)
  → logistic_status: "completed"
  → items[].distribution_channel: "xs2event"
  → items[].download_link: "https://cdn.xs2event.com/tickets/..."
```

### 6.2 E-Ticket Availability Check

**Customer Action:** From `/bookings` page, click "Check Ticket Availability"

```
GET {VITE_CUSTOMER_API_BASE_URL}/api/v1/customers/bookings/{id}/tickets/status
Headers: Authorization: Bearer {customer_jwt}

CustomerETicketController::getTicketStatus():
  1. Verify booking ownership (customer_user_id matches JWT)
  2. ETicketService::checkTicketAvailability($bookingId):
     a. Load booking from DB
     b. If no api_booking_id → return { available: false, status: "pending" }
     c. If eticket_status = 'available' AND eticket_urls cached → return cached data
     d. Otherwise: fetchTicketsFromXS2Event($api_booking_id):
        GET https://api.xs2event.com/v1/bookingorders/list
          ?booking_id=in:[b730247f84864aba9c04825d47f799d5_bkn]
          &logistic_status=completed
        Filter items where distribution_channel = "xs2event" AND download_link exists
     e. If tickets found:
        → UPDATE bookings SET eticket_status = 'available', eticket_urls = [...], eticket_available_date = NOW()
        → Return { available: true, status: "available", eticket_urls: [...] }
     f. If not found:
        → UPDATE bookings SET eticket_status = 'processing'
        → Return { available: false, status: "processing" }
```

### 6.3 E-Ticket Download Flow

**Download All as ZIP:**

```
GET {VITE_CUSTOMER_API_BASE_URL}/api/v1/customers/bookings/{id}/tickets/zip
Headers: Authorization: Bearer {customer_jwt}

CustomerETicketController::downloadZip():
  1. Verify booking ownership
  2. ETicketService::downloadTicketZip($bookingId):
     a. Check cached zip_download_url in DB
     b. If no cache:
        → fetchTicketsFromXS2Event() to get bookingorder_id
        → GET https://api.xs2event.com/v1/etickets/download/zip/{bookingorder_id}
        → Returns CDN ZIP URL (temporary signed URL)
        → Store in bookings.zip_download_url
     c. Download ZIP from CDN via Guzzle
     d. Stream binary content back to customer
        Content-Disposition: attachment; filename="tickets-BK-2026-985461.zip"
        Content-Type: application/zip
```

**Download Individual Ticket:**

```
GET {VITE_CUSTOMER_API_BASE_URL}/api/v1/customers/bookings/{id}/tickets/download
  ?bookingorder_id={bookingorder_id}
  &order_item_id={orderitem_id}
  &download_url={url}
Headers: Authorization: Bearer {customer_jwt}

CustomerETicketController::downloadTicket():
  ETicketService::downloadSingleTicket():
    GET https://api.xs2event.com/v1/etickets/download/{bookingorder_id}/{orderitem_id}/url/{url}
    → Stream PDF back to customer
    → Log download attempt (increments download_count)
```

### 6.4 E-Ticket Status Values

| Status | Meaning | Customer Action |
|--------|---------|----------------|
| `pending` | Booking not yet synced with XS2Event | Wait / contact support |
| `processing` | XS2Event booking exists but tickets not fulfilled yet | Check back later |
| `available` | Tickets ready for download | Download ZIP or individual PDFs |
| `failed` | Download failed | Contact support |

### 6.5 Customer Bookings Page (`/bookings`)

The `BookingsPage.tsx` fetches all bookings for the authenticated customer:

```
GET {VITE_CUSTOMER_API_BASE_URL}/api/v1/local-bookings/customer/{email}

Returns: List of bookings sorted by booking_date DESC
Each booking includes: eticket_status, eticket_available, download_count,
  xs2event_booking_status, xs2event_booking_code, cancellation_status
```

**Customer Actions Available Per Booking:**
- **Download Tickets** (if `eticket_available = true`) → ZIP download
- **Check Availability** → Force refresh from XS2Event
- **Request Cancellation** → Opens cancellation modal

---

## 7. Admin Application Booking Management Flow

### 7.1 Admin Bookings List

**Page:** `admin/src/pages/Bookings.tsx`  
**API:** `GET /admin/bookings`

**BookingManagementController::getBookings():**
```
Supports filters:
  - search (event name, customer name, booking reference)
  - status (pending / confirmed / cancelled / refunded / expired)
  - payment_status (pending / completed / failed / refunded / partially_refunded)
  - cancellation_status (none / requested / approved / declined / cancelled)
  - event_date_from, event_date_to (YYYY-MM-DD)
  - booking_date_from, booking_date_to
  - sport_type
  
Pagination:
  - page (default: 1)
  - limit (1–100, default: 20)

Returns:
  {
    success: true,
    data: [ booking objects with user info ],
    pagination: { page, limit, total_items, total_pages }
  }
```

### 7.2 Admin Booking Detail View

**API:** `GET /admin/bookings/{id}`

**BookingManagementController::getBookingById():**
```
Returns full booking object including:
  - Basic booking info (reference, event, venue, tournament)
  - Customer info (name, email, phone)
  - Payment details (method, reference, Stripe IDs, gateway response)
  - XS2Event sync status (booking_id, booking_code, logistic_status)
  - Hospitality services booked (booking_hospitalities JOIN)
  - Cancellation/refund status
  - E-ticket status and download count
  - Admin notes history
```

**Admin Booking Detail Panel Displays:**
- Booking Reference, Event, Venue, Tournament, Sport Type
- Customer name, email, phone
- Total amount + currency
- Hospitality services with quantities and pricing
- Payment method, Stripe payment_intent_id (transaction ID), payment_reference
- Payment completion timestamp
- XS2Event booking_id, booking_code
- Booking status, payment status, cancellation status
- E-ticket status and download metrics

### 7.3 Admin Booking Status Management

**API:** `PUT /admin/bookings/{id}/status`

**BookingManagementController::updateBookingStatus():**

**Allowed Status Transitions:**
```
pending     → confirmed, cancelled, expired
confirmed   → cancelled, refunded
cancelled   → (no transitions allowed)
refunded    → (no transitions allowed)
expired     → (no transitions allowed)
```

**Cancellation/Refund requires a `reason` field (max 1,000 characters).**

### 7.4 Manual XS2Event Sync from Admin

Admins can manually trigger XS2Event booking synchronization for bookings that failed to sync automatically.

**Admin Action:** Click "Sync Now" in Booking Details modal

**API:** `POST /admin/bookings/{id}/sync-xs2event`

**Process:**
```
BookingManagementController::syncWithXS2Event():
  → XS2EventBookingBridge::processBookingAfterPayment($bookingId)
  → Creates/updates XS2Event booking
  → Updates local DB with xs2event_booking_id, xs2event_booking_code
  → Clears xs2event_last_error
```

**Sync Confirmation Modal:**
```
"This will create a reservation, submit guest data, and retrieve e-tickets from XS2Event."
MAX_SYNC_ATTEMPTS = 3
```

### 7.5 Refund Management (Admin)

**Page:** `admin/src/pages/Refunds.tsx`

**API:** `POST /admin/bookings/{id}/refund`

**Stripe Refund Service Process:**
```
StripeRefundService::processRefund():
  → Stripe::Refund::create([
       'payment_intent' => $booking['payment_intent_id'],
       'amount' => $refundAmount * 100,  // in cents
       'reason' => 'requested_by_customer'
     ])
  → On success: UPDATE bookings SET
       payment_status = 'refunded',
       refund_id = 're_xxx',
       refund_amount = $amount,
       refund_reason = $reason,
       refunded_at = NOW()
  → RefundLogService::logRefund() (stores in refund_requests table)
```

### 7.6 Cancellation Request Management

**Page:** `admin/src/pages/CancellationRequests.tsx`

**Workflow:**
```
Customer requests cancellation (frontend)
      ↓
booking_cancellation_requests table (status: "pending")
      ↓
Admin reviews in CancellationRequests page
      ↓
Admin approves or declines:
  → APPROVED: Set cancellation_status = 'approved', set refund_amount, queue refund
  → DECLINED: Set cancellation_status = 'declined', add admin_notes

On Approval:
  → bookings.cancellation_status = 'approved'
  → booking_cancellation_requests.status = 'approved'
  → booking_cancellation_requests.refund_amount = $amount
  → booking_cancellation_requests.reviewed_date = NOW()
  → Admin manually processes refund via Refund Management page
```

### 7.7 Admin XS2Event Sync Dashboard

**Page:** `admin/src/pages/XS2EventSync.tsx`

**Capabilities:**
- View all bookings with sync status
- Filter by `xs2event_synced_at` (never synced, synced today, etc.)
- View `xs2event_sync_attempts` and `xs2event_last_error`
- Bulk sync failed bookings
- View full `xs2event_response_data` JSON for debugging

---

## 8. Customer Cancellation & Refund Flow

### 8.1 Customer Cancellation Request

**Page:** `BookingsPage.tsx` → `CancellationRequestModal.tsx`  
**API:** `POST {VITE_CUSTOMER_API_BASE_URL}/api/v1/customers/cancellations`

```
Customer clicks "Request Cancellation" on a booking
  → CancellationRequestModal opens
  → Customer enters cancellation reason (required) and optional notes
  → Submit:
      POST /api/v1/customers/cancellations
      {
        "booking_id": 34,
        "cancellation_reason": "I cannot attend",
        "customer_notes": "Please process refund"
      }
  → INSERT into booking_cancellation_requests:
      status: 'pending'
      booking.cancellation_status: 'requested'
  → Customer sees: "Cancellation request submitted"
```

### 8.2 Admin Cancellation Processing

```
Admin views CancellationRequests page
  → Lists all pending cancellation requests
  → Admin reviews booking details and customer reason
  
Admin Decision:
  APPROVE:
    PUT /admin/cancellations/{id}/approve
    { refund_amount: 34000.00 }
    → booking_cancellation_requests.status = 'approved'
    → booking_cancellation_requests.refund_amount = 34000.00
    → booking_cancellation_requests.reviewed_date = NOW()
    → bookings.cancellation_status = 'approved'

  DECLINE:
    PUT /admin/cancellations/{id}/decline
    { admin_notes: "Cancellation window has closed" }
    → booking_cancellation_requests.status = 'declined'
    → bookings.cancellation_status = 'declined'
```

---

## 9. Database Schema Reference

### 9.1 `bookings` Table (Primary Booking Record)

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT | Auto-increment primary key |
| `booking_reference` | VARCHAR(100) | Human-readable reference (e.g., `BK-2026-985461`) |
| `api_booking_id` | VARCHAR(100) | XS2Event booking UUID (e.g., `b730xxx_bkn`) |
| `api_reservation_id` | VARCHAR(100) | XS2Event reservation UUID (e.g., `feeexxxxx_rsr`) |
| `customer_user_id` | BIGINT FK | Links to `customer_users.id` |
| `event_name` | VARCHAR(255) | Event display name |
| `event_id` | VARCHAR(100) | XS2Event event UUID |
| `event_date` | DATETIME | Event date/time |
| `venue_name` | VARCHAR(255) | Venue name |
| `sport_type` | VARCHAR(100) | e.g., "Football" |
| `tournament_name` | VARCHAR(255) | e.g., "Premier League" |
| `total_amount` | DECIMAL(12,2) | Total charged to customer |
| `hospitality_total` | DECIMAL(10,2) | Hospitality component total (USD) |
| `currency` | CHAR(3) | Payment currency (USD, EUR, GBP, CAD, etc.) |
| `payment_method` | VARCHAR(50) | "stripe" |
| `payment_reference` | VARCHAR(100) | Payment reference string |
| `payment_intent_id` | VARCHAR(200) | Stripe Payment Intent ID (`pi_xxx`) |
| `stripe_payment_method_id` | VARCHAR(100) | Stripe Payment Method (`pm_xxx`) |
| `stripe_customer_id` | VARCHAR(100) | Stripe Customer ID (`cus_xxx`) |
| `stripe_charge_id` | VARCHAR(100) | Stripe Charge ID (`ch_xxx`) |
| `payment_gateway_response` | TEXT | Full Stripe PaymentIntent JSON |
| `payment_status` | ENUM | `pending`, `completed`, `failed`, `refunded`, `partially_refunded` |
| `status` | ENUM | `pending`, `confirmed`, `cancelled`, `refunded`, `expired` |
| `cancellation_status` | ENUM | `none`, `requested`, `approved`, `declined`, `cancelled` |
| `ticket_count` | INT | Number of tickets in booking |
| `ticket_info` | LONGTEXT (JSON) | Array of ticket details |
| `category_name` | VARCHAR(100) | Primary ticket category name |
| `xs2event_booking_status` | VARCHAR(50) | XS2Event financial status (e.g., `OPEN`) |
| `xs2event_logistic_status` | VARCHAR(50) | XS2Event logistic status (e.g., `COMPLETED`) |
| `xs2event_booking_code` | VARCHAR(100) | Human-readable XS2Event code (e.g., `DMLHFH`) |
| `xs2event_response_data` | TEXT | Full XS2Event booking creation response JSON |
| `xs2event_synced_at` | DATETIME | Last successful XS2Event sync |
| `xs2event_sync_attempts` | INT | Number of sync attempts |
| `xs2event_last_error` | TEXT | Last sync error message |
| `eticket_status` | VARCHAR(50) | `pending`, `processing`, `available`, `failed` |
| `eticket_urls` | TEXT (JSON) | Array of individual ticket download URLs |
| `zip_download_url` | VARCHAR(500) | ZIP bundle download URL (cached) |
| `download_count` | INT | Total times tickets downloaded |
| `refund_id` | VARCHAR(100) | Stripe Refund ID (`re_xxx`) |
| `refund_amount` | DECIMAL(10,2) | Amount refunded |
| `booking_date` | TIMESTAMP | When booking was created |
| `confirmed_at` | TIMESTAMP | When status changed to confirmed |
| `payment_completed_at` | DATETIME | Exact Stripe payment completion time |

### 9.2 `customer_users` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT | Auto-increment primary key |
| `customer_id` | VARCHAR(50) | Generated identifier (e.g., `CUST76619439`) |
| `email` | VARCHAR(255) | Unique customer email |
| `first_name` | VARCHAR(255) | First name |
| `last_name` | VARCHAR(255) | Last name |
| `password_hash` | VARCHAR(255) | Bcrypt hash (empty for guest accounts) |
| `email_verified` | TINYINT | 0 or 1 |
| `status` | ENUM | `active`, `inactive`, `blocked`, `deleted`, `pending_verification` |
| `street` / `house_number` / `zipcode` / `city` / `country_code` | VARCHAR | Address fields |
| `last_login` | TIMESTAMP | Last authentication |
| `total_bookings` | INT | Aggregated booking count |
| `total_spent` | DECIMAL(12,2) | Aggregated spend |

### 9.3 `booking_hospitalities` Table

| Column | Type | Description |
|--------|------|-------------|
| `booking_id` | BIGINT FK | References `bookings.id` |
| `hospitality_id` | BIGINT FK | References `hospitalities.id` |
| `hospitality_name` | VARCHAR(255) | Name cached at booking time |
| `price_usd` | DECIMAL(10,2) | Price per unit in USD |
| `quantity` | INT | Quantity (matches ticket quantity) |
| `total_usd` | DECIMAL(10,2) | `price_usd * quantity` |
| `ticket_id` | VARCHAR(100) | XS2Event ticket UUID this hospitality applied to |

### 9.4 `booking_cancellation_requests` Table

| Column | Type | Description |
|--------|------|-------------|
| `booking_id` | BIGINT FK | References `bookings.id` |
| `customer_user_id` | BIGINT FK | Customer who requested |
| `cancellation_reason` | TEXT | Required reason |
| `status` | ENUM | `pending`, `approved`, `declined`, `completed`, `cancelled` |
| `admin_user_id` | BIGINT FK | Admin who reviewed |
| `admin_notes` | TEXT | Admin decision notes |
| `refund_amount` | DECIMAL(10,2) | Approved refund amount |
| `refund_status` | ENUM | `not_applicable`, `pending`, `processed`, `failed` |

---

## 10. API Endpoint Reference

### 10.1 Public Endpoints (No Authentication)

| Method | Path | Controller | Purpose |
|--------|------|-----------|---------|
| GET | `/v1/events` | EventsController | List events with filters |
| GET | `/v1/events/{id}` | EventsController | Get event details |
| GET | `/v1/events/{id}/guestdata` | EventsController | Event guest requirements |
| GET | `/v1/tickets` | TicketsController | List tickets (event_id required) |
| GET | `/v1/tickets/{id}` | TicketsController | Get single ticket |
| GET | `/v1/tickets/{id}/guestdata` | TicketsController | Ticket guest requirements |
| GET | `/v1/sports` | SportsController | List all sports |
| GET | `/v1/tournaments` | TournamentsController | List tournaments |
| GET | `/v1/teams` | TeamsController | List teams |
| GET | `/v1/teams/{id}` | TeamsController | Get team details |
| GET | `/v1/reservations` | ReservationsController | List reservations |
| GET | `/v1/reservations/{id}` | ReservationsController | Get reservation |
| POST | `/v1/reservations` | ReservationsController | Create reservation |
| POST | `/v1/reservations/{id}/guestdata` | ReservationsController | Submit guest data |
| GET | `/api/v1/display-settings` | DisplaySettingsController | Site configuration |
| GET | `/api/v1/markup-rules/effective` | MarkupRuleController | Effective ticket markups |
| GET | `/api/v1/hospitalities/public` | PublicTicketEnhancementsController | Public hospitality data |

### 10.2 Customer Authenticated Endpoints (JWT Required)

| Method | Path | Controller | Purpose |
|--------|------|-----------|---------|
| POST | `/api/v1/customers/auth/login` | CustomerAuthController | Customer login |
| POST | `/api/v1/customers/auth/register` | CustomerAuthController | Customer registration |
| POST | `/api/v1/customers/auth/forgot-password` | CustomerAuthController | Password reset request |
| GET | `/api/v1/customers/profile` | CustomerProfileController | Get customer profile |
| PUT | `/api/v1/customers/profile` | CustomerProfileController | Update profile |
| GET | `/api/v1/local-bookings/customer/{email}` | LocalBookingController | Get customer's bookings |
| POST | `/api/v1/local-bookings` | LocalBookingController | Create booking (post-payment) |
| GET | `/api/v1/local-bookings/{id}` | LocalBookingController | Get booking details |
| GET | `/api/v1/customers/bookings/{id}/tickets/status` | CustomerETicketController | Check ticket availability |
| GET | `/api/v1/customers/bookings/{id}/tickets/download` | CustomerETicketController | Download single ticket PDF |
| GET | `/api/v1/customers/bookings/{id}/tickets/zip` | CustomerETicketController | Download all tickets as ZIP |
| POST | `/api/v1/customers/cancellations` | CustomerCancellationController | Submit cancellation request |
| POST | `/api/v1/payments/create-intent` | PaymentController | Create Stripe Payment Intent |

### 10.3 Admin Authenticated Endpoints (Admin JWT Required)

| Method | Path | Controller | Purpose |
|--------|------|-----------|---------|
| GET | `/admin/bookings` | BookingManagementController | List all bookings |
| GET | `/admin/bookings/{id}` | BookingManagementController | Get booking details |
| PUT | `/admin/bookings/{id}/status` | BookingManagementController | Update booking status |
| POST | `/admin/bookings/{id}/refund` | BookingManagementController | Process Stripe refund |
| POST | `/admin/bookings/{id}/sync-xs2event` | BookingManagementController | Manual XS2Event sync |
| GET | `/admin/cancellations` | AdminCancellationController | List cancellation requests |
| PUT | `/admin/cancellations/{id}/approve` | AdminCancellationController | Approve cancellation |
| PUT | `/admin/cancellations/{id}/decline` | AdminCancellationController | Decline cancellation |
| GET | `/admin/refunds` | RefundManagementController | List refund history |

---

## 11. Data Flow & Sequence Diagrams

### 11.1 Complete Booking Sequence

```
Customer        Frontend          Backend API       XS2Event API      Stripe          Database
   │                │                   │                │               │                │
   │ Browse Events  │                   │                │               │                │
   │──────────────►│                   │                │               │                │
   │                │ GET /v1/events    │                │               │                │
   │                │──────────────────►│                │               │                │
   │                │                   │ GET /v1/events │               │                │
   │                │                   │────────────────►               │                │
   │                │                   │ ◄──Events──── │               │                │
   │                │ ◄──Events────────│                │               │                │
   │ ◄─Event List──│                   │                │               │                │
   │                │                   │                │               │                │
   │ View Tickets   │                   │                │               │                │
   │──────────────►│                   │                │               │                │
   │                │ GET /v1/tickets   │                │               │                │
   │                │──────────────────►│                │               │                │
   │                │                   │ GET /v1/tickets│               │                │
   │                │                   │ (no-cache)─────►               │                │
   │                │                   │ ◄──Tickets────│               │                │
   │                │ ◄──Tickets───────│                │               │                │
   │ ◄─Ticket Page─│                   │                │               │                │
   │                │                   │                │               │                │
   │ Add to Cart    │                   │                │               │                │
   │──────────────►│ (local state)     │                │               │                │
   │                │                   │                │               │                │
   │ Checkout       │                   │                │               │                │
   │──────────────►│ → /checkout/login │                │               │                │
   │                │                   │                │               │                │
   │ Login/Register │                   │                │               │                │
   │──────────────►│                   │                │               │                │
   │                │ POST /auth/login  │                │               │                │
   │                │──────────────────►│                │               │                │
   │                │                   │                │               │    Verify pwd  │
   │                │                   │                │               │   ─────────────►
   │                │                   │                │               │    JWT token   │
   │                │ ◄──JWT Token─────│                │               │                │
   │ ◄─Authenticated│                   │                │               │                │
   │                │                   │                │               │                │
   │ Fill Guests    │                   │                │               │                │
   │──────────────►│                   │                │               │                │
   │                │                   │                │               │                │
   │ Continue       │                   │                │               │                │
   │──────────────►│                   │                │               │                │
   │                │ POST /reservations│                │               │                │
   │                │──────────────────►│                │               │                │
   │                │                   │POST /v1/reserv.│               │                │
   │                │                   │────────────────►               │                │
   │                │                   │ ◄──reserv_id──│               │                │
   │                │ ◄──reservation───│                │               │                │
   │                │                   │                │               │                │
   │                │ POST /guestdata   │                │               │                │
   │                │──────────────────►│                │               │                │
   │                │                   │POST /guestdata │               │                │
   │                │                   │────────────────►               │                │
   │                │                   │ ◄──success────│               │                │
   │                │ ◄──success───────│                │               │                │
   │ → Payment Page │                   │                │               │                │
   │──────────────►│                   │                │               │                │
   │                │ POST /create-intent│               │               │                │
   │                │──────────────────►│                │               │                │
   │                │                   │                │   Create PI   │                │
   │                │                   │                │   ───────────►│                │
   │                │                   │                │ ◄─client_sec.─│                │
   │                │ ◄──client_secret──│                │               │                │
   │                │                   │                │               │                │
   │ Pay with Card  │                   │                │               │                │
   │──────────────►│ confirmPayment()  │                │               │                │
   │                │──────────────────────────────────────────────────►│                │
   │                │ ◄──PI succeeded───────────────────────────────────│                │
   │                │                   │                │               │                │
   │                │ POST /local-bookings│               │               │                │
   │                │──────────────────►│                │               │                │
   │                │                   │                │               │    INSERT      │
   │                │                   │                │               │   ─────────────►
   │                │                   │                │               │   booking_id   │
   │                │                   │POST /v1/bookings│              │                │
   │                │                   │────────────────►               │                │
   │                │                   │ ◄──xs2event_bkn│               │                │
   │                │                   │                │               │    UPDATE      │
   │                │                   │                │               │   ─────────────►
   │                │                   │ SendGrid email │               │                │
   │                │ ◄──booking result─│                │               │                │
   │ → Success Page │                   │                │               │                │
   │──────────────►│                   │                │               │                │
   │ ◄─Confirmation │                   │                │               │                │
```

### 11.2 E-Ticket Download Sequence

```
Customer          Frontend          Backend API         XS2Event API
   │                  │                   │                   │
   │ View /bookings   │                   │                   │
   │─────────────────►│                   │                   │
   │                  │ GET /local-bookings│                  │
   │                  │──────────────────►│                   │
   │ ◄─Booking List───│                   │                   │
   │                  │                   │                   │
   │ Check Availability│                  │                   │
   │─────────────────►│                   │                   │
   │                  │ GET /tickets/status│                  │
   │                  │──────────────────►│                   │
   │                  │                   │ GET /bookingorders│
   │                  │                   │──────────────────►│
   │                  │                   │ ◄─Orders with     │
   │                  │                   │   download_links  │
   │                  │                   │                   │
   │                  │                   │ UPDATE DB         │
   │                  │                   │ eticket_status=   │
   │                  │                   │ 'available'       │
   │ ◄─Status Response│                   │                   │
   │                  │                   │                   │
   │ Download ZIP     │                   │                   │
   │─────────────────►│                   │                   │
   │                  │ GET /tickets/zip  │                   │
   │                  │──────────────────►│                   │
   │                  │                   │ GET /etickets/zip │
   │                  │                   │──────────────────►│
   │                  │                   │ ◄─ZIP CDN URL─────│
   │                  │                   │ GET {CDN URL}     │
   │                  │                   │──────────────────►│
   │                  │                   │ ◄─Binary ZIP──────│
   │ ◄─ZIP Download───│                   │                   │
   │  (PDF tickets)   │                   │                   │
```

---

## 12. Error Handling Scenarios

### 12.1 Ticket Out of Stock (XS2Event 422)

```
Customer attempts to reserve already-sold tickets:

XS2Event returns HTTP 422:
{
  "items": [{
    "error": {
      "detail": "We do not have enough tickets in stock",
      "available": 0,
      "quantity": 2
    }
  }]
}

Frontend handling (apiRoutes.ts):
  → Extract "detail" field from error
  → Display user-friendly: "We do not have enough tickets in stock (Available: 0, Requested: 2)"
  → Cart is not cleared; user can adjust quantity
```

### 12.2 Payment Failure (Stripe)

```
Stripe confirmPayment() returns error:
  → setPaymentError(error.message)
  → Display inline error in payment form
  → setIsLoading(false) (re-enables Pay button)
  → No booking is created (payment-first design)
  → Reservation remains open until expiry
  → User can retry payment
```

### 12.3 Booking Creation Failure (Post-Payment)

```
Stripe payment succeeds BUT local booking creation fails:
  → Error logged: "Failed to create booking after payment"
  → navigate('/payment/success', { state: { error: 'Booking creation failed - contact support', ... } })
  → PaymentSuccessPage shows:
      - "Payment succeeded"
      - Error banner: "Booking creation failed. Please contact support."
      - Payment Intent ID visible for reference
```

### 12.4 XS2Event Sync Failure (Post-Booking)

```
Local booking created BUT XS2Event sync fails:
  → Local booking is NOT rolled back
  → Error stored in bookings.xs2event_last_error
  → bookings.xs2event_sync_attempts incremented
  → Booking status remains 'confirmed' (payment was successful)
  → Admin can retry sync from Bookings admin panel
  → Max 3 automatic retry attempts (MAX_SYNC_ATTEMPTS = 3)
```

### 12.5 E-Ticket Not Yet Available

```
Customer checks ticket status before XS2Event fulfillment:
  → ETicketService returns { available: false, status: "processing" }
  → Frontend shows: "Tickets are being processed and will be available soon"
  → Customer can refresh status at any time
  → Typical availability: varies by event (minutes to hours after booking)
```

### 12.6 Authentication Expiry During Checkout

```
JWT token expires mid-checkout:
  → CustomerAPIClient detects 401 response
  → Calls onUnauthorized() callback
  → Clears localStorage customer_access_token
  → Redirects to /checkout/login
  → Navigation state (cart items) should be preserved via sessionStorage
```

### 12.7 Reservation Expiry

```
User takes too long in checkout (reservation expires):
  → XS2Event POST /v1/bookings returns error (reservation not found/expired)
  → XS2EventBookingBridge catches ApiException
  → Logs: "Failed to create XS2Event booking"
  → bookings.xs2event_last_error = error message
  → Admin must manually resolve (may need to create new reservation)
```

---

## 13. Technical Configuration Summary

### 13.1 Caching Strategy

| Data Type | Cache TTL | Rationale |
|-----------|-----------|-----------|
| Events | 3600s (1 hour) | Infrequently updated |
| Event details | 3600s (1 hour) | Infrequently updated |
| Sports / Tournaments | 3600s (1 hour) | Rarely updated |
| Teams | 3600s (1 hour) | Rarely updated |
| Venue / City data | 3600s (1 hour) | Static data |
| Reservations | 300s (5 min) | Short-lived operational data |
| **Tickets** | **No cache (no-store)** | **Real-time stock and pricing** |
| E-ticket URLs | Cached in DB | Stored after first retrieval |

### 13.2 Booking Reference Format

```
Format: BK-{YEAR}-{6-digit-padded-random}
Examples:
  BK-2026-985461
  BK-2025-126476
  BK-2026-880258
```

### 13.3 Multi-Currency Support

The platform supports payment in any Stripe-supported currency. The currency is:
1. **Displayed** in the user's selected currency (from `CurrencyContext`)
2. **Charged** in the user's selected currency via Stripe
3. **Stored** in `bookings.currency` as a 3-letter ISO code
4. Sent to XS2Event as `EUR` net_rate (XS2Event's base currency)

Supported currencies observed in live data: USD, EUR, GBP, CAD.

### 13.4 Stripe Integration Mode

The platform uses **Stripe Payment Intents** with embedded Elements (not Stripe Checkout redirect):

```
Flow: Payment Intent → Elements iframe → confirmPayment() → Success callback
Redirect: Only if required by payment method (most cards: no redirect)
```

### 13.5 JWT Authentication Architecture

| Audience | JWT Service | Storage | Expiry |
|----------|-------------|---------|--------|
| Customers | `CustomerJWTService` | `localStorage.customer_access_token` | Configurable |
| Admins | `JWTService` | HTTP-only cookie or localStorage | Configurable |

### 13.6 Booking Status vs Payment Status Matrix

| Booking Status | Payment Status | Meaning |
|---------------|----------------|---------|
| `pending` | `pending` | Booking initiated, payment not started |
| `confirmed` | `completed` | Normal successful booking |
| `confirmed` | `partially_refunded` | Partial refund issued |
| `confirmed` | `refunded` | Full refund processed |
| `cancelled` | `refunded` | Booking cancelled and refunded |
| `confirmed` | `pending` | Booking confirmed, XS2Event sync in progress |

---

*This document was generated by analyzing all three applications:*
- *`/frontend/src/` — React frontend (pages, hooks, services, components)*
- *`/api/src/` — PHP backend (controllers, services, repositories)*
- *`/admin/src/` — React admin panel (pages, services)*
- *`/db_rondo.sql` — MySQL database schema and live booking records*
