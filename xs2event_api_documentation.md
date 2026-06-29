# XS2Event API Documentation

> **Source:** [docs.xs2event.com](https://docs.xs2event.com)  
> **Authentication:** All endpoints require an API Key passed as `X-Api-Key` in the request header.  
> **Base URL:** `/v1/`

---

## Table of Contents

1. [Booking Flow](#booking-flow)
2. [E-Tickets / E-Invoice API](#e-tickets--e-invoice-api)
3. [BookingOrders](#bookingorders)
   - [GET Get Bookingorders](#get-get-bookingorders)
   - [GET Get Bookingorder](#get-get-bookingorder)
   - [GET Get Bookingorder Guestdata](#get-get-bookingorder-guestdata)
   - [PUT Update Bookingorder Guestdata](#put-update-bookingorder-guestdata)
   - [GET Get Bookingorder Guestdata for One Guest](#get-get-bookingorder-guestdata-for-one-guest)
   - [PUT Update Bookingorder Guestdata for One Guest](#put-update-bookingorder-guestdata-for-one-guest)
4. [Bookings](#bookings)
   - [GET Get Bookings on Reservation ID](#get-get-bookings-on-reservation-id)
   - [GET Get Bookings](#get-get-bookings)
   - [POST Create Booking](#post-create-booking)
   - [GET Get Booking](#get-get-booking)
5. [Reservations](#reservations)
   - [GET Get Reservations](#get-get-reservations)
   - [POST Create Reservation](#post-create-reservation)
   - [GET Get Reservation](#get-get-reservation)
   - [PUT Update Reservation](#put-update-reservation)
   - [DELETE Delete Reservation](#delete-delete-reservation)
   - [PATCH Partially Update Reservation](#patch-partially-update-reservation)
   - [GET Get Reservation Guestdata](#get-get-reservation-guestdata)
   - [POST Add Reservation Guestdata](#post-add-reservation-guestdata)
   - [GET Get Reservation Guest Data of a Single Guest](#get-get-reservation-guest-data-of-a-single-guest)
   - [PUT Update Reservation Guest Data of a Single Guest](#put-update-reservation-guest-data-of-a-single-guest)
   - [POST Add Reservation Guest Data](#post-add-reservation-guest-data)
6. [Etickets](#etickets)
   - [GET Gets Link to E-tickets Zipfile](#get-gets-link-to-e-tickets-zipfile)
   - [GET Download Ticket (PDF)](#get-download-ticket-pdf)

---

## Booking Flow

**Reference:** https://docs.xs2event.com/booking-flow.html

The booking flow describes how to make a booking in the XS2Event system. A fixed fee per ticket applies for each booking, which will appear on the invoice.

### Models

The following core models are used throughout the booking flow:

| Model | Description |
|-------|-------------|
| **Reservation** | A temporary resource used to hold tickets during the booking process (10-minute window). |
| **Booking** | The top-level resource representing the entire booking. |
| **BookingOrder** | An administrative sub-unit of a booking, grouping tickets for a specific event and supplier. |
| **GuestData** | Information required by the ticket supplier (can be per ticket, per group, or a single entry). |

A Booking can contain multiple BookingOrders (e.g., tickets from different events or suppliers), though most bookings will have just one.

---

### Step 1 — Find Guest Requirements

Before making a reservation, you can look up what guest data is required for a specific event via the guest data endpoints. See the [guest data docs](https://docs.xs2event.com/guest-data.html) for details.

---

### Step 2 — Create a Reservation

Use the [Create Reservation](#post-create-reservation) endpoint to hold tickets.

- Reservations expire after **10 minutes**.
- After expiry, tickets are released.
- `net_rate` and `currency_code` sent must exactly match the values from `GET /v1/ticket/:ticket_id`.

**Reservation error situations:**
1. Out of stock
2. Unknown `ticket_id`
3. Price information mismatch
4. Reservation has expired

You can update the reservation at any time (add/remove tickets, change quantities) using the [Update Reservation](#put-update-reservation) endpoint.

---

### Step 3 — Provide Guest Data

Use the [Add Reservation Guestdata](#post-add-reservation-guestdata) endpoint to submit guest information:

```json
{
  "items": [
    {
      "quantity": 2,
      "ticket_id": "ticket_123456",
      "guests": [
        {
          "first_name": "John",
          "last_name": "Doe",
          "lead_guest": true
        }
      ]
    }
  ]
}
```

A `422` response is returned if required `pre_checkout` fields are missing. The error response details each field's value, condition, and any validation errors.

---

### Step 4 — Finalize the Booking

Use the [Create Booking](#post-create-booking) endpoint once the reservation is valid and guest data is submitted.

```json
{
  "invoice_reference": "Reference to use on the invoice",
  "booking_email": "customer@example.com",
  "reservation_id": "our_reservation_id",
  "payment_method": "invoice"
}
```

> Use only payment methods permitted under your contract.

**Booking error situations:**
1. Reservation expired
2. Invalid or unavailable payment method
3. Invalid `booking_email`

---

### Step 5 — Fetch Booking Orders

After booking creation, use the `booking_id` from the response to retrieve all booking orders via [GET Get Bookingorders](#get-get-bookingorders) with the `booking_id` filter.

---

### Providing Guest Data Later

Some suppliers allow guest data submission after checkout. Use:
- [GET Get Bookingorder Guestdata](#get-get-bookingorder-guestdata) — to see what's still needed.
- [PUT Update Bookingorder Guestdata](#put-update-bookingorder-guestdata) — to update all guest data at once.
- [PUT Update Bookingorder Guestdata for One Guest](#put-update-bookingorder-guestdata-for-one-guest) — to update per individual guest.

---

## E-Tickets / E-Invoice API

**Reference:** https://docs.xs2event.com/etickets.html

This API allows travel industry partners to automate ticket distribution. It supports downloading:
- E-tickets (PDF)
- E-tickets bundled as a ZIP file
- E-invoices (PDF)

> Documentation is subject to modifications. Tickets can also be downloaded manually via the [portal](https://portal.xs2event.com) or [xs2ticket.com](https://xs2ticket.com).

---

### Background

Each booking produces one or more booking orders (usually 1:1, but multi-event bookings generate multiple). Each booking order represents the lifecycle of a ticket for a given event.

**Three steps to download tickets:**
1. Check if booking orders are completed (`logistic_status == completed`)
2. Verify the distribution channel
3. Download e-tickets from the CDN via the API

---

### Step 1 — Check if the Bookingorder is Fulfilled

Use the `IN` operator to check multiple bookings at once to respect rate limits:

```
GET /v1/bookingorders?booking_id=in:[716e4d8a84ce416797848cf982b5695f_bkn]&logistic_status=completed
```

**Key fields in the response:**
- `bookingorder_id`
- `orderitem_id` (per item)
- `download_link` (per item)

Each booking order has one item per ticket purchased. For 4 tickets, you get 4 `orderitem_id` + `download_link` pairs.

**Example Response (relevant fields):**
```json
{
  "bookingorders": [
    {
      "booking_id": "716e4d8a84ce416797848cf982b5695f_bkn",
      "bookingorder_id": "30fbd3b23f774a9daec4fb16bbd39daa_bkn",
      "logistic_status": "completed",
      "items": [
        {
          "orderitem_id": "9183473d88e1456da1676f39f00754ff_bkd",
          "distribution_channel": "xs2event",
          "ticket_sha": "bef57ec7f...",
          "download_link": "ticket-ehmll.pdf",
          "download_items": []
        }
      ],
      "zip_sha": "dummysha",
      "invoices": ["12345", "56789"]
    }
  ]
}
```

---

### Step 2 — Distribution Channels

| Name | Description | Downloadable via XS2Event |
|------|-------------|--------------------------|
| `xs2event` | Distribution through XS2Event | ✅ Yes |
| `external` | Controlled by 3rd party (e.g., Ticketmaster, StubHub) | ❌ No |
| `external_end_client` | Controlled by event organiser, distributed directly to end client | ❌ No |

> The distribution channel may change during the lifecycle of a booking.

---

### Step 3 — Download E-Tickets (PDF)

#### Single PDF per ticket (default, 99% of cases)

```
GET /v1/etickets/download/{bookingorder_id}/{orderitem_id}/url/{download_link}
```

Example:
```
/v1/etickets/download/30fbd3b23f774a9daec4fb16bbd39daa_bkn/9183473d88e1456da1676f39f00754ff_bkd/url/ticket-ehmll.pdf
```

Response is sent as an attachment (`Content-Disposition: attachment`).

#### Multiple PDFs per ticket (e.g., Formula 1 — Friday, Saturday, Sunday)

Iterate over `download_items` for each order item. The `download_link` at the item level will be empty in this case.

```
/v1/etickets/download/{bookingorder_id}/{orderitem_id}/url/{download_link_from_download_items}
```

---

### Download ZIP File

If a `zip_sha` is present in the booking order response, a ZIP is available via CDN. Retrieve a temporary secure link:

```
GET /v1/etickets/download/zip/{bookingorder_id}
```

Returns a plain CDN URL that expires shortly. The ZIP contains all ticket PDFs.

---

### CRC / Integrity

A SHA-256 checksum is calculated for every ZIP and PDF. Always verify the returned SHA against the SHA in the booking response to ensure file integrity.

---

### E-Invoice Download

Invoice IDs are listed in the `invoices` array of booking order responses. To download:

```
GET /v1/bookingorders/{bookingorder_id}/invoice/{invoice_id}
```

Multiple invoices may exist per booking order (invoice, credit invoice). Multiple booking orders can exist per booking (for tax reasons, each gets a separate invoice).

---

## BookingOrders

### GET Get Bookingorders

**Endpoint:** `GET /v1/bookingorders/list`  
**Description:** Returns a flat (non-nested) list of booking orders.

#### Authorization
- Type: API Key — `X-Api-Key` header

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `sorting` | string | `null` | Sort order |
| `page_size` | integer | `50` | Number of items per page |
| `page` | integer | `1` | Current page |
| `reservation_id` | string | `null` | Filter by reservation ID |
| `booking_id` | string | `null` | Filter by booking ID |
| `query` | string | `null` | Free-text search |
| `booking_email` | string | `null` | Filter by email |
| `compare_mode` | string | `"AND"` | Filter combination mode: `AND` / `OR` |
| `ticket_id` | string | `null` | Filter by ticket ID |
| `event_id` | string | `null` | Filter by event ID |
| `event_startdate` | string | `null` | Filter by event start date (e.g. `2025-01-01`) |
| `event_stopdate` | string | `null` | Filter by event stop date (e.g. `2025-01-02`) |
| `created` | string | `null` | Filter by creation date |
| `api_booking` | boolean | — | Filter by API booking status |
| `guestdata_status` | string (enum) | — | One of: `waitingfordistributor`, `waitingforprocessing`, `completed`, `waitingforendcustomer`, `notapplicable`, `waitingtosendtosupplier` |
| `booking_code` | string | `null` | Filter by booking code |
| `sport_type` | string | — | Filter by sport type (e.g. `soccer`) |
| `tournament_id` | string | — | Filter by tournament ID |
| `logistic_status` | string (enum) | — | One of: `processing`, `cancelled`, `postponed`, `completed`, `waitforactivation`, `administrative`, `returned`, `review`, `blocked`, `pendingticketupload` |
| `mass_booking` | boolean | — | Filter by mass booking status |

#### Response — 200 OK

```json
{
  "bookingorders": [
    {
      "booking_id": "1b97adfc8a3a4fe4ad13b58f40372cca_bkn",
      "bookingorder_id": "3fa6eb7f123a4f5ab2c9d8e7a6b7c9d0_bor",
      "event_id": "dd82ecd6931749819942c4aff9dd23cb_evt",
      "created": "2025-04-20T12:00:00",
      "distributor_id": "b05f667dcaa843bd8c171c522217eb81_dst",
      "accepted_gt": true,
      "marketing_optin": false,
      "mass_booking_allowed": true,
      "api_booking": true,
      "offline_booking": false,
      "booking_code": "CODE123",
      "zip_sha": null,
      "guestdata_status": "waitingfordistributor",
      "max_pdfs_per_ticket": 5,
      "distributorfinancial_status": "paid",
      "logistic_status": "processing",
      "event_name": "Concert X",
      "payment_method": "card",
      "payment_reference": "8c4a2b9d123e4f5a876c5d4e3f2b1a09_pay",
      "booking_reference": "9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a_ref",
      "parent_id": "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d_bkn",
      "client_id": "5edec2b99b1b4c449a8ca2b1d6e4723e_cli",
      "booking_email": "user@example.com",
      "notify_client_status": "completed",
      "invoices": ["string"],
      "bookingorder_source": "na",
      "is_test_booking": false,
      "marketplace_logistic_purchaseorder_id": "abc123def456_po",
      "items": [
        {
          "quantity": 2,
          "ticket_id": "a5cf8e7b39c14aeba4de30a8f67b9e23_tck",
          "ticket_name": "VIP Ticket",
          "type_ticket": "eticket",
          "ticket_status": "completed"
        }
      ],
      "event_startdate": "2025-01-01",
      "event_stopdate": "2025-01-02",
      "booking_group": "Group A",
      "supplier_id": "7acfed7b0d874c5e870b531e5a4f0e43_spp",
      "deleted": null,
      "external_payment_reference": "ext_123",
      "financial_status": "topurchase",
      "general_terms_url": "https://.../terms.pdf",
      "onbehalfclient_id": "a1b2c3d4e5f67890123456789abcdef0_cli"
    }
  ],
  "pagination": {
    "total_size": 1,
    "page_size": 50,
    "page_number": 1,
    "next_page": "string",
    "previous_page": "string"
  }
}
```

---

### GET Get Bookingorder

**Endpoint:** `GET /v1/bookingorders/{bookingorder_id}`  
**Description:** Returns a specific booking order with full detail including item-level information.

#### Authorization
- Type: API Key — `X-Api-Key` header

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bookingorder_id` | string | ✅ Yes | XS2Event ID of the Bookingorder |

#### Response — 200 OK

Returns the same top-level fields as the list endpoint, plus full item detail per ticket:

```json
{
  "booking_id": "...",
  "bookingorder_id": "...",
  "items": [
    {
      "activated": "2025-04-24T12:00:00",
      "category_id": "7df2fbc7f06e4985be92fb263b1f9c63_ctg",
      "category_name": "Gold Stand",
      "currency": "EUR",
      "distribution_channel": "xs2event",
      "download_items": [
        {
          "download_link": "https://.../download.pdf",
          "external_activation_link": "https://.../activate",
          "ticket_sha": "abc123",
          "downloaditem_id": "1bdae1eafa3b4ff2907f48637ee03095_dli",
          "activated": "2025-04-24T12:00:00",
          "label": "e-ticket"
        }
      ],
      "download_link": "https://.../download.pdf",
      "face_value": 5000,
      "face_value_eur": 5500,
      "face_value_local": 6000,
      "guest": {
        "first_name": "John",
        "last_name": "Doe",
        "passport_number": "ABC123456",
        "contact_email": "user@example.com",
        "contact_phone": "+31123456789",
        "lead_guest": true,
        "date_of_birth": "1991-01-30",
        "gender": "male",
        "country_of_residence": "NLD",
        "street_name": "Hereweg 95",
        "additional_street_name": "e",
        "city": "Groningen",
        "zip": "9721AA",
        "province": "Groningen",
        "guest_id": null
      },
      "net_rate": 4000,
      "orderitem_id": "f3c67de9087d48aa9a5b7aa4e2d75b01_oit",
      "quantity": 2,
      "row": "A",
      "seat": "12",
      "section": "East Wing",
      "ticket_id": "a5cf8e7b39c14aeba4de30a8f67b9e23_tck",
      "ticket_name": "VIP Ticket",
      "ticket_startdate": "2025-01-01",
      "ticket_status": "completed",
      "type_ticket": "eticket",
      "number_of_pdfs": 1
    }
  ]
}
```

---

### GET Get Bookingorder Guestdata

**Endpoint:** `GET /v1/bookingorders/{bookingorder_id}/guestdata`  
**Description:** Returns the current guest data for a booking order, including validation conditions.

#### Authorization
- Type: API Key — `X-Api-Key` header

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bookingorder_id` | string | ✅ Yes | XS2Event ID of the Bookingorder |

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `sorting` | string | `null` | Sort order |
| `include_conditions` | boolean | `false` | Include validation conditions in the response |
| `country_hint` | string | — | Hint for country code (e.g. `NLD`) |

#### Response — 200 OK

```json
{
  "bookingorder_id": null,
  "items": [
    {
      "ticket_id": "a5cf8e7b39c14aeba4de30a8f67b9e23_tck",
      "quantity": 2,
      "guests": [
        {
          "first_name": "John",
          "last_name": "Doe",
          "passport_number": "ABC123456",
          "contact_email": "user@example.com",
          "contact_phone": "+31123456789",
          "lead_guest": true,
          "date_of_birth": "1991-01-30",
          "gender": "male",
          "country_of_residence": "NLD",
          "street_name": "Hereweg 95",
          "additional_street_name": "e",
          "city": "Groningen",
          "zip": "9721AA",
          "province": "Groningen",
          "guest_id": null
        }
      ]
    }
  ]
}
```

---

### PUT Update Bookingorder Guestdata

**Endpoint:** `PUT /v1/bookingorders/{bookingorder_id}/guestdata`  
**Description:** Updates all guest data for a booking order in a single request.

#### Authorization
- Type: API Key — `X-Api-Key` header

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bookingorder_id` | string | ✅ Yes | XS2Event ID of the Bookingorder |

#### Request Body (`application/json`)

```json
{
  "items": [
    {
      "ticket_id": "a5cf8e7b39c14aeba4de30a8f67b9e23_tck",
      "guests": [
        {
          "first_name": "John",
          "last_name": "Doe",
          "passport_number": "ABC123456",
          "contact_email": "user@example.com",
          "contact_phone": "+31123456789",
          "lead_guest": true,
          "date_of_birth": "1991-01-30",
          "gender": "male",
          "country_of_residence": "NLD",
          "street_name": "Hereweg 95",
          "additional_street_name": "e",
          "city": "Groningen",
          "zip": "9721AA",
          "province": "Groningen",
          "guest_id": null,
          "reservation_id": "5e3ae0658c9e405a9a62367293b8f56b_rsv",
          "ticket_id": "ac8e9e918b4b4756b0f32e583a9cb3e4_tck"
        }
      ]
    }
  ]
}
```

#### Response — 200 OK

Returns the updated guest data in the same structure as the GET response.

---

### GET Get Bookingorder Guestdata for One Guest

**Endpoint:** `GET /v1/bookingorders/{bookingorder_id}/guestdata/{guest_id}`  
**Description:** Returns guest data and applicable conditions for a single guest within a booking order.

#### Authorization
- Type: API Key — `X-Api-Key` header

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bookingorder_id` | string | ✅ Yes | XS2Event ID of the Bookingorder |
| `guest_id` | string | ✅ Yes | XS2Event ID of the Guest |

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `sorting` | string | `null` | Sort order |
| `include_conditions` | boolean | `false` | Include validation conditions |
| `country_hint` | string | — | Hint for country code (e.g. `NLD`) |

#### Response — 200 OK

```json
{
  "first_name": "John",
  "last_name": "Doe",
  "passport_number": "ABC123456",
  "contact_email": "user@example.com",
  "contact_phone": "+31123456789",
  "lead_guest": true,
  "date_of_birth": "1991-01-30",
  "gender": "male",
  "country_of_residence": "NLD",
  "street_name": "Hereweg 95",
  "additional_street_name": "e",
  "city": "Groningen",
  "zip": "9721AA",
  "province": "Groningen",
  "guest_id": null,
  "conditions": {}
}
```

---

### PUT Update Bookingorder Guestdata for One Guest

**Endpoint:** `PUT /v1/bookingorders/{bookingorder_id}/guestdata/{guest_id}`  
**Description:** Updates guest data for a specific guest within a booking order.

#### Authorization
- Type: API Key — `X-Api-Key` header

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bookingorder_id` | string | ✅ Yes | XS2Event ID of the Bookingorder |
| `guest_id` | string | ✅ Yes | XS2Event ID of the Guest |

#### Request Body (`application/json`)

```json
{
  "first_name": "John",
  "last_name": "Doe",
  "passport_number": "ABC123456",
  "contact_email": "user@example.com",
  "contact_phone": "+31123456789",
  "lead_guest": true,
  "date_of_birth": "1991-01-30",
  "gender": "male",
  "country_of_residence": "NLD",
  "street_name": "Hereweg 95",
  "additional_street_name": "e",
  "city": "Groningen",
  "zip": "9721AA",
  "province": "Groningen",
  "guest_id": null,
  "conditions": {}
}
```

#### Response — 200 OK

Returns the updated single guest object in the same structure.

---

## Bookings

### GET Get Bookings on Reservation ID

**Endpoint:** `GET /v1/bookings/reservation/{reservation_id}`  
**Description:** Retrieves the booking associated with a specific reservation ID.

#### Authorization
- Type: API Key — `X-Api-Key` header

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `reservation_id` | string | ✅ Yes | XS2Event ID of the Reservation |

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `sorting` | string | `null` | Sort order |

#### Response — 200 OK

```json
{
  "booking_id": "5867e9941e924a7bb169e244b26589ba_bkn",
  "reservation_id": "5e3ae0658c9e405a9a62367293b8f56b_rsr",
  "booking_code": "DQW32M",
  "created": "2025-06-11T14:29:25",
  "updated": "2025-06-11T15:12:03",
  "client_id": "19941a73d2b5498caf6894d62bb6c3a4_cln",
  "booking_email": "customer@example.com",
  "payment_method": "invoice",
  "payment_reference": "INV-2025-0001",
  "booking_reference": "BOOK-2025-0001",
  "distributorfinancial_status": "OPEN",
  "logistic_status": "COMPLETED",
  "deleted": null,
  "items": [
    {
      "quantity": 2,
      "salesprice": 41100,
      "net_rate": 41100,
      "currency": "EUR",
      "ticket_id": "dbe592106db4431a8260c2656dc753ac_tck",
      "ticket_name": "Category 2",
      "event_id": "a0351f57524a4119ab838038c2718588_evt",
      "event_name": "Grand Prix Netherlands",
      "event_season": "2026",
      "tournament_name": "Formula 1"
    }
  ]
}
```

---

### GET Get Bookings

**Endpoint:** `GET /v1/bookings`  
**Description:** Returns a paginated list of bookings.

#### Authorization
- Type: API Key — `X-Api-Key` header

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `sorting` | string | `null` | Sort order |
| `page_size` | integer | `50` | Items per page |
| `page` | integer | `1` | Current page |
| `reservation_id` | string | `null` | Filter by reservation ID |
| `booking_id` | string | `null` | Filter by booking ID |
| `booking_code` | string | `null` | Filter by booking code |
| `booking_email` | string | `null` | Filter by customer email |
| `distributor_id` | string | `null` | Filter by distributor ID |
| `client_id` | string | `null` | Filter by client ID |
| `compare_mode` | string | `"OR"` | Combine filters: `AND` / `OR` |
| `query` | string | `null` | Free-text search (e.g. name, email) |
| `mass_booking` | boolean | `null` | Filter by mass booking status |
| `event_id` | string | `null` | Filter by event ID |

#### Response — 200 OK

Returns a list of booking objects with pagination. Each booking contains the same structure as the single booking GET response.

---

### POST Create Booking

**Endpoint:** `POST /v1/bookings`  
**Description:** Creates a new booking from an existing reservation.

#### Authorization
- Type: API Key — `X-Api-Key` header

#### Request Body (`application/json`) — From Reservation

```json
{
  "reservation_id": "5e3ae0658c9e405a9a62367293b8f56b_rsr",
  "booking_email": "customer@example.com",
  "invoice_reference": "INV-2025-001",
  "booking_reference": "BOOK-2025-001",
  "payment_method": "invoice",
  "is_test_booking": false
}
```

> When creating from a reservation, ticket details are already stored — only booking metadata is needed.

#### Response — 201 Created

```json
{
  "booking_id": "5867e9941e924a7bb169e244b26589ba_bkn",
  "reservation_id": "5e3ae0658c9e405a9a62367293b8f56b_rsr",
  "booking_code": "DQW32M",
  "created": "2025-06-11T14:29:25",
  "updated": "2025-06-11T15:12:03",
  "client_id": "19941a73d2b5498caf6894d62bb6c3a4_cln",
  "booking_email": "customer@example.com",
  "payment_method": "invoice",
  "payment_reference": "INV-2025-0001",
  "booking_reference": "BOOK-2025-0001",
  "distributorfinancial_status": "OPEN",
  "logistic_status": "COMPLETED",
  "deleted": null,
  "items": [
    {
      "quantity": 2,
      "salesprice": 41100,
      "net_rate": 41100,
      "currency": "EUR",
      "ticket_id": "dbe592106db4431a8260c2656dc753ac_tck",
      "ticket_name": "Category 2",
      "event_id": "a0351f57524a4119ab838038c2718588_evt",
      "event_name": "Grand Prix Netherlands",
      "event_season": "2026",
      "tournament_name": "Formula 1"
    }
  ]
}
```

---

### GET Get Booking

**Endpoint:** `GET /v1/bookings/{booking_id}`  
**Description:** Retrieves a specific booking by its ID.

#### Authorization
- Type: API Key — `X-Api-Key` header

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `booking_id` | string | ✅ Yes | XS2Event ID of the Booking |

#### Response — 200 OK

Returns the booking object in the same structure as the Create Booking response.

---

## Reservations

### GET Get Reservations

**Endpoint:** `GET /v1/reservations`  
**Description:** Returns a paginated list of reservations for the authenticated client/distributor.

#### Authorization
- Type: API Key — `X-Api-Key` header

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `sorting` | string | Sort order |
| `page_size` | integer | Items per page (default: 50) |
| `page` | integer | Current page (default: 1) |
| `created` | string | Filter by creation date |
| `valid_until` | string | Filter by expiry date |
| `status` | string (enum) | One of: `active`, `booked`, `void`, `error`, `extended` |
| `query` | string | Free-text search |
| `event_id` | string | Filter by event ID |
| `distributor_id` | string | Filter by distributor ID |
| `on_behalf` | boolean | Filter by on-behalf booking flag |
| `ticket_id` | string | Find reservations with specific ticket |
| `sport_type` | string | Filter by sport type |
| `external_reference_id` | string | Filter by external reference |

#### Response — 200 OK

```json
{
  "reservations": [
    {
      "client_id": "34e7303056c84c74abe9d48a5fbf68aa_cln",
      "reservation_id": "64dab4ad7b7a442389a71bc253de0a09_rsv",
      "status": "active",
      "notify_client": true,
      "notes": "Example note.",
      "valid_until": "2025-05-01T12:30:32",
      "created": "2025-05-01T12:20:32",
      "updated": "2025-05-01T12:20:32",
      "parent_allocation_id": null,
      "external_reference_id": "octo-order-12345",
      "items": [
        {
          "ticket_id": "b30c5d2d019e4eeba8de2bdd96e93434_tck",
          "quantity": 10,
          "salesprice": 340000,
          "net_rate": 340000,
          "currency": "EUR",
          "ticket_name": "Debenture seat",
          "event_name": "4th Round (Men's & Ladies) - Centre Court - Day 8 - Wimbledon (2026)"
        }
      ]
    }
  ],
  "pagination": {
    "total_size": 1,
    "page_size": 50,
    "page_number": 1,
    "next_page": "string",
    "previous_page": "string"
  }
}
```

---

### POST Create Reservation

**Endpoint:** `POST /v1/reservations`  
**Description:** Creates a new reservation for one or more tickets. Tickets are held for 10 minutes.

#### Authorization
- Type: API Key — `X-Api-Key` header

#### Request Body (`application/json`)

```json
{
  "items": [
    {
      "ticket_id": "b30c5d2d019e4eeba8de2bdd96e93434_tck",
      "quantity": 4,
      "net_rate": 1000,
      "currency_code": "EUR"
    }
  ],
  "booking_email": "customer@example.com",
  "notify_client": null,
  "notify_me": true,
  "notes": "Example note.",
  "external_reference_id": null,
  "target_currency": "EUR"
}
```

> **Important:** `net_rate` and `currency_code` must exactly match the values from `GET /v1/ticket/:ticket_id`.

#### Response — 201 Created

Returns the created reservation object (same structure as GET reservation response).

---

### GET Get Reservation

**Endpoint:** `GET /v1/reservations/{reservation_id}`  
**Description:** Retrieves a specific reservation by its ID.

#### Authorization
- Type: API Key — `X-Api-Key` header

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `reservation_id` | string | ✅ Yes | XS2Event ID of the Reservation |

#### Response — 200 OK

```json
{
  "client_id": "34e7303056c84c74abe9d48a5fbf68aa_cln",
  "reservation_id": "64dab4ad7b7a442389a71bc253de0a09_rsv",
  "status": "active",
  "notify_client": true,
  "notes": "Example note.",
  "valid_until": "2025-05-01T12:30:32",
  "created": "2025-05-01T12:20:32",
  "updated": "2025-05-01T12:20:32",
  "parent_allocation_id": null,
  "external_reference_id": "octo-order-12345",
  "items": [
    {
      "ticket_id": "b30c5d2d019e4eeba8de2bdd96e93434_tck",
      "quantity": 10,
      "salesprice": 340000,
      "net_rate": 340000,
      "currency": "EUR",
      "ticket_name": "Debenture seat",
      "event_name": "4th Round (Men's & Ladies) - Centre Court - Day 8 - Wimbledon (2026)"
    }
  ]
}
```

---

### PUT Update Reservation

**Endpoint:** `PUT /v1/reservations/{reservation_id}`  
**Description:** Updates a specific reservation — modify items, quantities, or settings.

#### Authorization
- Type: API Key — `X-Api-Key` header

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `reservation_id` | string | ✅ Yes | XS2Event ID of the Reservation |

#### Request Body (`application/json`)

```json
{
  "items": [
    {
      "ticket_id": "b30c5d2d019e4eeba8de2bdd96e93434_tck",
      "quantity": 4,
      "net_rate": 1000,
      "currency_code": "EUR"
    }
  ],
  "local_currency": "EUR",
  "valid_until": null,
  "notify_me": true,
  "external_reference_id": null
}
```

#### Response — 200 OK

Returns the updated reservation object.

---

### DELETE Delete Reservation

**Endpoint:** `DELETE /v1/reservations/{reservation_id}`  
**Description:** Deletes (voids) a specific reservation, releasing all held tickets.

#### Authorization
- Type: API Key — `X-Api-Key` header

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `reservation_id` | string | ✅ Yes | XS2Event ID of the Reservation |

#### Response — 200 OK

Empty response on success.

---

### PATCH Partially Update Reservation

**Endpoint:** `PATCH /v1/reservations/{reservation_id}`  
**Description:** Partially updates a reservation — useful for changing individual fields without sending the entire payload.

#### Authorization
- Type: API Key — `X-Api-Key` header

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `reservation_id` | string | ✅ Yes | XS2Event ID of the Reservation |

#### Request Body (`application/json`)

```json
{
  "notify_me": true
}
```

#### Response — 200 OK

Returns the full updated reservation object.

---

### GET Get Reservation Guestdata

**Endpoint:** `GET /v1/reservations/{reservation_id}/guestdata`  
**Description:** Returns the current guest data for a reservation, including per-field conditions and validation errors.

#### Authorization
- Type: API Key — `X-Api-Key` header

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `reservation_id` | string | ✅ Yes | XS2Event ID of the Reservation |

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `sorting` | string | `null` | Sort order |
| `include_conditions` | boolean | `false` | Include validation conditions |
| `country_hint` | string | — | Country code hint (e.g. `NLD`) |

#### Response — 200 OK

Each field is returned as an object with `value`, `condition`, and `error` properties:

```json
{
  "items": [
    {
      "ticket_id": "ac8e9e918b4b4756b0f32e583a9cb3e4_tck",
      "quantity": 4,
      "guests": [
        {
          "first_name": { "value": "John", "condition": null, "error": null },
          "last_name": { "value": "Doe", "condition": null, "error": null },
          "passport_number": { "value": "...", "condition": null, "error": null },
          "contact_email": { "value": "...", "condition": null, "error": null },
          "contact_phone": { "value": "...", "condition": null, "error": null },
          "date_of_birth": { "value": "...", "condition": null, "error": null },
          "gender": { "value": "...", "condition": null, "error": null },
          "country_of_residence": { "value": "...", "condition": null, "error": null },
          "lead_guest": true,
          "guest_id": "5661e8fd160a48e18ec363cad686ba2c_gst",
          "street_name": { "value": "...", "condition": null, "error": null },
          "additional_street_name": { "value": "...", "condition": null, "error": null },
          "city": { "value": "...", "condition": null, "error": null },
          "zip": { "value": "...", "condition": null, "error": null },
          "province": { "value": "...", "condition": null, "error": null }
        }
      ]
    }
  ]
}
```

---

### POST Add Reservation Guestdata

**Endpoint:** `POST /v1/reservations/{reservation_id}/guestdata`  
**Description:** Adds or updates guest data for a reservation, organised by ticket.

#### Authorization
- Type: API Key — `X-Api-Key` header

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `reservation_id` | string | ✅ Yes | XS2Event ID of the Reservation |

#### Request Body (`application/json`)

```json
{
  "items": [
    {
      "ticket_id": "string",
      "quantity": 0,
      "guests": [
        {
          "first_name": null,
          "last_name": null,
          "passport_number": "ABC123456",
          "contact_email": "user@example.com",
          "contact_phone": "+31123456789",
          "lead_guest": true,
          "date_of_birth": "1991-01-30",
          "gender": "male",
          "country_of_residence": "NLD",
          "street_name": "Hereweg 95",
          "additional_street_name": "e",
          "city": "Groningen",
          "zip": "9721AA",
          "province": "Groningen",
          "guest_id": null
        }
      ]
    }
  ]
}
```

#### Response — 200 OK

Returns the submitted guest data in the same structure.

---

### GET Get Reservation Guest Data of a Single Guest

**Endpoint:** `GET /v1/reservations/{reservation_id}/guestdata/{guest_id}`  
**Description:** Returns the guest data and validation conditions for one specific guest within a reservation.

#### Authorization
- Type: API Key — `X-Api-Key` header

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `reservation_id` | string | ✅ Yes | XS2Event ID of the Reservation |
| `guest_id` | string | ✅ Yes | XS2Event ID of the Guest |

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `sorting` | string | `null` | Sort order |
| `include_conditions` | boolean | `false` | Include validation conditions |
| `country_hint` | string | — | Country code hint (e.g. `NLD`) |

#### Response — 200 OK

Returns a flat guest object with per-field `value` / `condition` / `error` structure plus `lead_guest` and `guest_id`.

---

### PUT Update Reservation Guest Data of a Single Guest

**Endpoint:** `PUT /v1/reservations/{reservation_id}/guestdata/{guest_id}`  
**Description:** Updates guest data for a single specific guest within a reservation.

#### Authorization
- Type: API Key — `X-Api-Key` header

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `reservation_id` | string | ✅ Yes | XS2Event ID of the Reservation |
| `guest_id` | string | ✅ Yes | XS2Event ID of the Guest |

#### Request Body (`application/json`)

```json
{
  "first_name": "John",
  "last_name": "Doe",
  "passport_number": "ABC123456",
  "contact_email": "user@example.com",
  "contact_phone": "+31123456789",
  "lead_guest": true,
  "date_of_birth": "1991-01-30",
  "gender": "male",
  "country_of_residence": "NLD",
  "street_name": "Hereweg 95",
  "additional_street_name": "e",
  "city": "Groningen",
  "zip": "9721AA",
  "province": "Groningen",
  "guest_id": null
}
```

#### Response — 200 OK

Returns the updated guest object.

---

### POST Add Reservation Guest Data

**Endpoint:** `POST /v1/reservations/{reservation_id}/guests`  
**Description:** Adds guest data directly to a reservation without ticket-level grouping.

#### Authorization
- Type: API Key — `X-Api-Key` header

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `reservation_id` | string | ✅ Yes | XS2Event ID of the Reservation |

#### Request Body (`application/json`)

```json
{
  "guests": [
    {
      "first_name": "John",
      "last_name": "Doe",
      "passport_number": "ABC123456",
      "contact_email": "user@example.com",
      "contact_phone": "+31123456789",
      "lead_guest": true,
      "date_of_birth": "1991-01-30",
      "gender": "male",
      "country_of_residence": "NLD",
      "street_name": "Hereweg 95",
      "additional_street_name": "e",
      "city": "Groningen",
      "zip": "9721AA",
      "province": "Groningen",
      "guest_id": null
    }
  ]
}
```

#### Response — 200 OK

Returns the guests array with additional `reservation_id` and `ticket_id` fields appended to each guest entry.

---

## Etickets

### GET Gets Link to E-tickets Zipfile

**Endpoint:** `GET /v1/etickets/download/zip/{bookingorder_id}`  
**Description:** Returns a temporary, secured CDN URL to download the ZIP file containing all ticket PDFs for a booking order.

#### Authorization
- Type: API Key — `X-Api-Key` header

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bookingorder_id` | string | ✅ Yes | XS2Event ID of the Bookingorder |

#### Response — 200 OK

```json
"https://download.example.com/ticket/5867e9941e924a7bb169e244b26589ba_bor"
```

> The CDN link expires shortly after being issued. Download the ZIP immediately.

---

### GET Download Ticket (PDF)

**Endpoint:** `GET /v1/etickets/download/{bookingorder_id}/{orderitem_id}/url/{url}`  
**Description:** Downloads a single e-ticket PDF for a specific order item within a booking order.

#### Authorization
- Type: API Key — `X-Api-Key` header

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bookingorder_id` | string | ✅ Yes | XS2Event ID of the Bookingorder |
| `orderitem_id` | string | ✅ Yes | XS2Event ID of the Order Item |
| `url` | string | ✅ Yes | The `download_link` filename (e.g. `ticket-ehmll.pdf`) |

#### Response — 200 OK

Returns the PDF file as an attachment (`Content-Disposition: attachment`).

**Example URL:**
```
/v1/etickets/download/30fbd3b23f774a9daec4fb16bbd39daa_bkn/9183473d88e1456da1676f39f00754ff_bkd/url/ticket-ehmll.pdf
```

---

## Common Guest Data Fields

The following fields are used across guest data endpoints:

| Field | Type | Description |
|-------|------|-------------|
| `first_name` | string | Guest's first name |
| `last_name` | string | Guest's last name |
| `passport_number` | string | Passport number |
| `contact_email` | string | Email address |
| `contact_phone` | string | Phone number (e.g. `+31123456789`) |
| `lead_guest` | boolean | Whether this is the primary/lead guest |
| `date_of_birth` | string | Date of birth (e.g. `1991-01-30`) |
| `gender` | string | Gender (e.g. `male`, `female`) |
| `country_of_residence` | string | ISO 3-letter country code (e.g. `NLD`) |
| `street_name` | string | Street name and number |
| `additional_street_name` | string | Additional address info |
| `city` | string | City |
| `zip` | string | Postal code |
| `province` | string | Province or state |
| `guest_id` | string | XS2Event Guest ID (assigned after initial submission) |
| `conditions` | object | Supplier-specific validation conditions |

---

## Notes

- **Rate limiting:** Use the `IN` operator for batch queries (e.g. checking multiple booking orders at once) to stay within rate limits.
- **SHA integrity:** Always verify SHA-256 checksums for all downloaded PDFs and ZIP files.
- **Monitoring:** All API access and downloads are logged. Abuse may result in temporary or permanent account suspension.
- **Reservation expiry:** Reservations are valid for **10 minutes**. If expired, create a new reservation with the same ticket IDs.
- **Distribution channel:** Always check the `distribution_channel` field before attempting to download — only `xs2event` channel tickets can be downloaded via the API.
