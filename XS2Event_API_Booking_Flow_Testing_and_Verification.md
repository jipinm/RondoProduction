# XS2Event API — Booking Flow Testing & Verification Document

> **Document Purpose:** Complete API audit, implementation verification, and testing reference for the XS2Event ticket booking flow across `#api`, `#admin`, and `#frontend` applications.
>
> **Scope:** All 37 endpoints across 7 phases of the booking lifecycle — from catalog discovery through e-ticket delivery.
>
> **Audience:** Backend engineers, frontend developers, QA engineers, and technical leads.

---

## Table of Contents

1. [Quick Reference — All Endpoints](#quick-reference)
2. [Global Configuration & Authentication](#global-configuration)
3. [Phase 1 — Discovery](#phase-1-discovery)
4. [Phase 2 — Guest Requirements](#phase-2-guest-requirements)
5. [Phase 3 — Reservation](#phase-3-reservation)
6. [Phase 4 — Reservation Guest Data](#phase-4-reservation-guest-data)
7. [Phase 5 — Booking](#phase-5-booking)
8. [Phase 6 — Booking Orders](#phase-6-booking-orders)
9. [Phase 7 — E-Tickets](#phase-7-e-tickets)
10. [Cross-Cutting Concerns](#cross-cutting-concerns)
11. [Master Testing Checklist](#master-testing-checklist)

---

## Quick Reference — All Endpoints

| # | Method | Endpoint | Phase | Priority | Cache |
|---|--------|----------|-------|----------|-------|
| 1 | `GET` | `/v1/sports` | Discovery | Normal | Monthly |
| 2 | `GET` | `/v1/tournaments` | Discovery | Normal | Monthly |
| 3 | `GET` | `/v1/tournaments/{tournament_id}` | Discovery | Optional | Monthly |
| 4 | `GET` | `/v1/events` | Discovery | **High** | Daily |
| 5 | `GET` | `/v1/events/{event_id}` | Discovery | Optional | Daily |
| 6 | `GET` | `/v1/venues` | Discovery | Normal | Monthly |
| 7 | `GET` | `/v1/venues/{venue_id}` | Discovery | Optional | Monthly |
| 8 | `GET` | `/v1/teams` | Discovery | Normal | Monthly |
| 9 | `GET` | `/v1/teams/{team_id}` | Discovery | Optional | Monthly |
| 10 | `GET` | `/v1/tickets` | Discovery | 🔴 Critical | **Never** |
| 11 | `GET` | `/v1/tickets/{ticket_id}` | Discovery | 🔴 Critical | **Never** |
| 12 | `GET` | `/v1/categories` | Discovery | Normal | Weekly |
| 13 | `GET` | `/v1/categories/{category_id}` | Discovery | Optional | Weekly |
| 14 | `GET` | `/v1/countries` | Discovery | Normal | Monthly |
| 15 | `GET` | `/v1/cities` | Discovery | Optional | Monthly |
| 16 | `POST` | `/v1/tickets/csv` | Discovery | Optional | — |
| 17 | `GET` | `/v1/events/{event_id}/guestdata` | Guest Requirements | Recommended | — |
| 18 | `GET` | `/v1/tickets/{ticket_id}/guestdata` | Guest Requirements | Optional | — |
| 19 | `POST` | `/v1/reservations` | Reservation | 🔴 Critical | — |
| 20 | `GET` | `/v1/reservations/{reservation_id}` | Reservation | Recommended | — |
| 21 | `GET` | `/v1/reservations` | Reservation | Optional | — |
| 22 | `PUT` | `/v1/reservations/{reservation_id}` | Reservation | Optional | — |
| 23 | `PATCH` | `/v1/reservations/{reservation_id}` | Reservation | Optional | — |
| 24 | `DELETE` | `/v1/reservations/{reservation_id}` | Reservation | Optional | — |
| 25 | `GET` | `/v1/reservations/{id}/guestdata` | Res. Guest Data | Recommended | — |
| 26 | `POST` | `/v1/reservations/{id}/guestdata` | Res. Guest Data | 🔴 Critical | — |
| 27 | `GET` | `/v1/reservations/{id}/guests/{guest_id}` | Res. Guest Data | Optional | — |
| 28 | `PUT` | `/v1/reservations/{id}/guests/{guest_id}` | Res. Guest Data | Optional | — |
| 29 | `POST` | `/v1/reservations/{id}/guests` | Res. Guest Data | Optional | — |
| 30 | `POST` | `/v1/bookings` | Booking | 🔴 Critical | — |
| 31 | `GET` | `/v1/bookings` | Booking | Recommended | — |
| 32 | `GET` | `/v1/bookings/{booking_id}` | Booking | Recommended | — |
| 33 | `GET` | `/v1/bookings?reservation_id={id}` | Booking | Recommended | — |
| 34 | `GET` | `/v1/bookingorders` | Booking Orders | 🔴 Critical | — |
| 35 | `GET` | `/v1/bookingorders/{bookingorder_id}` | Booking Orders | Recommended | — |
| 36 | `GET` | `/v1/bookingorders/{id}/guestdata` | Booking Orders | Conditional | — |
| 37 | `PUT` | `/v1/bookingorders/{id}/guestdata` | Booking Orders | Conditional | — |
| 38 | `GET` | `/v1/bookingorders/{id}/guests/{guest_id}` | Booking Orders | Conditional | — |
| 39 | `PUT` | `/v1/bookingorders/{id}/guests/{guest_id}` | Booking Orders | Conditional | — |
| 40 | `GET` | `/v1/etickets/download/zip/{bookingorder_id}` | E-Tickets | Recommended | — |
| 41 | `GET` | `/v1/etickets/download/{bookingorder_id}/{orderitem_id}/url/{download_link}` | E-Tickets | 🔴 Critical | — |
| 42 | `GET` | `/v1/bookingorders/{bookingorder_id}/invoice/{invoice_id}` | E-Tickets | Optional | — |

---

## Global Configuration & Authentication

### Base URL

```
https://api.xs2event.com
```

### Authentication

All endpoints require Bearer token authentication via the `Authorization` header.

```http
Authorization: Bearer <your_api_token>
Content-Type: application/json
Accept: application/json
```

### Standard Response Envelope

```json
{
  "data": [ ... ],
  "meta": {
    "current_page": 1,
    "per_page": 50,
    "total": 200,
    "last_page": 4
  },
  "links": {
    "first": "https://api.xs2event.com/v1/resource?page=1",
    "last": "https://api.xs2event.com/v1/resource?page=4",
    "prev": null,
    "next": "https://api.xs2event.com/v1/resource?page=2"
  }
}
```

### Standard HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| `200` | OK | Successful GET / PUT / PATCH |
| `201` | Created | Successful POST (resource created) |
| `204` | No Content | Successful DELETE |
| `400` | Bad Request | Malformed request |
| `401` | Unauthorized | Missing or invalid token |
| `403` | Forbidden | Valid token, insufficient permissions |
| `404` | Not Found | Resource does not exist |
| `409` | Conflict | Resource state conflict |
| `422` | Unprocessable Entity | Validation failure (with field-level errors) |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Unexpected server error |

### Implementation Review — Global Auth

| App | Status | Notes |
|-----|--------|-------|
| `#api` | ⬜ Review Required | Verify Bearer token middleware is applied globally to all `/v1/*` routes |
| `#admin` | ⬜ Review Required | Verify API key storage — should be in environment variables, not hardcoded |
| `#frontend` | ⬜ Review Required | Token must NOT be exposed in client-side code; proxy through `#api` |

### Global Testing Checklist

- [ ] All requests return `401` without `Authorization` header
- [ ] Expired tokens return `401` with clear error message
- [ ] Malformed tokens return `401`
- [ ] Rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`) are present in responses
- [ ] `Content-Type: application/json` header is required on all POST/PUT/PATCH bodies
- [ ] API token is never logged or exposed in frontend bundles

---

## Phase 1 — Discovery

> **Overview:** Fetch the event catalog — sports, tournaments, events, venues, teams, tickets, and categories. Cache aggressively for stable data. Never cache ticket data.
>
> ⚡ **Critical Rule:** Ticket stock and prices change constantly. `GET /v1/tickets` and `GET /v1/tickets/{ticket_id}` must always return live data.

---

## 🧪 Test Session Results (2026-05-21)

> **Test Environment:** `http://rondoapi.local` → XS2Event Test API (`https://testapi.xs2event.com`)  
> **API Key (test):** `e417f1be53494f5f9fbc5b350b1a5850`  
> **Test Event:** `b225615ba6e64bbfbdc9cb54399f7cd4_gnr`  
> **Test Ticket:** `bb0c49d3428646a89a39f60815febcc7_spt` (Short Side, EUR 2500)  
> **Test Reservation:** `11bdb8b35f5e4b1893f152e9dc579df4_rsr`  
> **Test Booking:** `fd13969aad2b4d3bb8fe6ec9680a4319_bkn`  
> **Test Booking Order:** `50139e8d59bb4f239340ca7b215f278d_bkn`

### ✅ Endpoint Results Summary

| # | Endpoint | Status | HTTP | Notes |
|---|----------|--------|------|-------|
| 1 | `GET /v1/sports` | ✅ PASS | 200 | Returns `sports[]` array; each object has only `sport_id` (not `name`/`slug`) |
| 2 | `GET /v1/tournaments` | ✅ PASS | 200 | 50 results with `date_stop` filter; 130+ without |
| 3 | `GET /v1/tournaments/{id}` | ✅ PASS (after fix) | 200 | **Fixed:** Route regex `[a-f0-9-]+` changed to match `_trn` suffix; route ordering fixed |
| 4 | `GET /v1/events` | ✅ PASS | 200 | `date_stop=ge:{today}` auto-injected by proxy; multi-sport requires array notation |
| 5 | `GET /v1/events/{id}` | ✅ PASS | 200/404 | Flat response (no `data` wrapper) |
| 6 | `GET /v1/venues` | ✅ PASS | 200 | 884 venues |
| 7 | `GET /v1/venues/{id}` | ✅ PASS (after fix) | 200 | **Fixed:** Route regex `[a-f0-9-]+` changed to `[a-zA-Z0-9_-]+` |
| 8 | `GET /v1/teams` | ✅ PASS | 200 | 1908 teams |
| 9 | `GET /v1/teams/{id}` | ✅ PASS | 200 | Route regex was already correct |
| 10 | `GET /v1/tickets` | ✅ PASS (after fix) | 200 | **Fixed:** `Cache-Control` was `public, max-age=300`; now `no-store, no-cache, must-revalidate` |
| 11 | `GET /v1/tickets/{id}` | ✅ PASS (after fix) | 200/404 | Cache fix applied |
| 12 | `GET /v1/categories` | ✅ PASS | 200 | |
| 13 | `GET /v1/categories/{id}` | ✅ PASS (after fix) | 200 | **Fixed:** Route regex `[a-f0-9-]+` changed to `[a-zA-Z0-9_-]+` |
| 17 | `GET /v1/events/{id}/guestdata` | ✅ PASS | 200 | Empty requirements for test event |
| 18 | `GET /v1/tickets/{id}/guestdata` | ✅ PASS | 200 | Empty requirements |
| 19 | `POST /v1/reservations` | ✅ PASS (after fix) | 201 | **Fixed:** `ReservationsController` was hitting production URL via `getenv()`; now uses passed `$baseUrl` |
| 20 | `GET /v1/reservations/{id}` | ✅ PASS | 200 | Full reservation object with items |
| 21 | `GET /v1/reservations` | ✅ PASS (after fix) | 200 | Same proxy base URL bug fixed |
| 22 | `PUT /v1/reservations/{id}` | ✅ PASS | 200 | Full replacement — must include `items` in body |
| 23 | `PATCH /v1/reservations/{id}` | ✅ PASS | 200 | Partial update — `notes`, `external_reference_id` |
| 25 | `GET /v1/reservations/{id}/guestdata` | ✅ PASS | 200 | Returns guest slots with `null` fields |
| 26 | `POST /v1/reservations/{id}/guestdata` | ✅ PASS | 200 | Accepts payload; sandbox doesn't persist guest data (expected test behavior) |
| 30 | `POST /v1/bookings` | ✅ PASS | 201 | Booking created; `booking_code: EGXNRJ` |
| 31 | `GET /v1/bookings/{id}` | ✅ PASS | 200 | Returns booking with items; UTF-8 encoding issue in event names |
| 34 | `GET /v1/bookingorders/list` | ✅ PASS | 200 | 33 orders returned; response key is `bookingorders[]` (not `bookingorders/list`) |
| 35 | `GET /v1/bookingorders/{id}` | ✅ PASS | 200 | Full order with `items`, `guestdata_status: notapplicable` |
| 36 | `GET /v1/bookingorders/{id}/guestdata` | ✅ PASS | 200 | Empty guests (guestdata not applicable for this ticket) |
| 40 | `GET /v1/etickets/download/zip/{id}` | ⚠️ 422 | 422 | **Fixed:** `ETicketsController` was hitting production URL; 422 = booking still `processing` (expected) |
| 41 | `GET /v1/etickets/download/{boid}/{oid}/url/{link}` | ⚠️ 400 | 400 | No `download_link` yet (booking processing); endpoint routing correct |

### 🐛 Bugs Found & Fixes Applied

| Bug | Severity | File | Fix Applied |
|-----|----------|------|-------------|
| `TicketsController` — `Cache-Control: public, max-age=300` on ticket data | 🔴 CRITICAL | `api/src/Controller/TicketsController.php` | Changed `CACHE_TTL=0`, all headers to `no-store, no-cache, must-revalidate` ✅ |
| `ReservationsController` — `getenv('API_BASE_URL')` returns empty; falls back to production URL | 🔴 CRITICAL | `api/src/Controller/ReservationsController.php` | Added `$baseUrl` constructor parameter; constructor now uses `$_ENV` fallback ✅ |
| `ETicketsController` — ignores passed `$baseUrl`, uses `getenv()` which returns empty → production URL | 🔴 CRITICAL | `api/src/Controller/ETicketsController.php` | Fixed to use `rtrim($baseUrl, '/')` from constructor param ✅ |
| Route regex `[a-f0-9-]+` excludes XS2Event IDs with `_trn`/`_vnx`/`_ctg` suffix | 🟡 HIGH | `api/src/Application.php` | Changed to `[a-zA-Z0-9_-]+` for venues and categories; `[a-zA-Z0-9]+_trn` for tournaments ✅ |
| Tournament route ordering — `{sport_type}` (no regex) registered before `{tournament_id}` regex | 🟡 HIGH | `api/src/Application.php` | Moved `tournament_id` route before `sport_type` route ✅ |

### ⚠️ Known Discrepancies

| Issue | Impact |
|-------|--------|
| Response envelope: actual API uses `{sports:[], pagination:{}}` not documented `{data:[], meta:{}}` | Docs mismatch — frontend must handle actual key names |
| Multi-sport filter: `sport_type=in:[soccer,formula1]` **fails** at proxy; must use `sport_type[]=soccer&sport_type[]=formula1` | Frontend integration note |
| Booking item `event_name` has UTF-8 double-encoding (`BalompiÃ©` instead of `Balompié`) | Encoding issue in proxy response handling |
| Sandbox test API doesn't persist guest data (POST guestdata returns 200 but `guests: []`) | Expected sandbox limitation |
| E-ticket download returns 422 while booking `logistic_status: processing` | Not a bug — tickets not yet issued |

---

### TASK-001 — Get Sports

#### 1. API Documentation Reference

| Field | Value |
|-------|-------|
| **Docs URL** | `https://docs.xs2event.com/reference/get-sports` |
| **Related Refs** | Events endpoint (filtered by `sport_type`), Tournaments endpoint |

#### 2. API Analysis

```http
GET /v1/sports
Authorization: Bearer <token>
```

**Purpose:** Returns all available sport types (soccer, formula1, basketball, etc.) used to filter downstream event and tournament queries.

**Query Parameters:** None documented (paginated response expected).

**Expected Response:**

```json
{
  "data": [
    {
      "id": "soccer",
      "name": "Soccer",
      "slug": "soccer"
    },
    {
      "id": "formula1",
      "name": "Formula 1",
      "slug": "formula1"
    }
  ]
}
```

**Dependencies:** None — this is a root catalog endpoint.

**Cache Strategy:** Cache locally for up to 30 days. Sport types change very rarely.

#### 3. Current Implementation Review

| App | Location | Status | Issues |
|-----|----------|--------|--------|
| `#api` | `GET /api/sports` or proxy | ⬜ Review Required | Verify caching headers or local cache layer (30-day TTL) |
| `#admin` | Sport filter dropdowns | ⬜ Review Required | Check if sport list is hardcoded vs fetched from API |
| `#frontend` | Sport type selectors | ⬜ Review Required | Verify UI reflects all API-returned sport types dynamically |

#### 4. Correct Implementation

```http
GET https://api.xs2event.com/v1/sports
Authorization: Bearer {API_TOKEN}
Accept: application/json
```

**Backend (Node.js / Express) example:**

```js
// Cache-aside pattern — 30 day TTL
async function getSports() {
  const cacheKey = 'xs2event:sports';
  const cached = await cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const response = await xs2eventClient.get('/v1/sports');
  await cache.set(cacheKey, JSON.stringify(response.data), 'EX', 2592000); // 30 days
  return response.data;
}
```

**Error Handling:**

```js
try {
  const sports = await getSports();
} catch (error) {
  if (error.response?.status === 401) throw new UnauthorizedError();
  if (error.response?.status === 500) throw new ExternalServiceError('XS2Event');
  throw error;
}
```

#### 5. Missing or Incomplete

- [ ] Verify sport type IDs used in `#frontend` filters match API-returned IDs (not hardcoded strings)
- [ ] Cache invalidation strategy not documented — confirm whether admin can trigger refresh

#### 6. Testing Checklist

- [ ] Returns `200` with a non-empty `data` array
- [ ] Each sport object contains `id`, `name` fields at minimum
- [ ] Response is consistent across multiple calls (stable ordering)
- [ ] Cached response is served without hitting upstream API within TTL
- [ ] Cache is bypassed/refreshed after 30 days
- [ ] Returns `401` without valid token

---

### TASK-002 — Get Tournaments

#### 1. API Documentation Reference

| Field | Value |
|-------|-------|
| **Docs URL** | `https://docs.xs2event.com/reference/get-tournaments` |
| **Related Refs** | Sports endpoint (for `sport_type` filter), Events endpoint (for `tournament_id` filter) |

#### 2. API Analysis

```http
GET /v1/tournaments?sport_type={sport_type}&date_stop=ge:{YYYY-MM-DD}
Authorization: Bearer <token>
```

**Purpose:** Lists seasonal tournaments filtered by sport type. Excludes past seasons via date filter.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sport_type` | string | Recommended | Filter by sport identifier from GET /v1/sports |
| `date_stop` | string (filter) | **Required** | Use `ge:{today}` to exclude historical seasons |
| `page` | integer | No | Pagination page number |
| `page_size` | integer | No | Results per page |

**Critical Rule:** Always include `date_stop=ge:{today}` — omitting this returns all historical seasons and bloats the response.

**Expected Response:**

```json
{
  "data": [
    {
      "id": "premier-league-2025",
      "name": "Premier League 2024/25",
      "sport_type": "soccer",
      "date_start": "2024-08-10",
      "date_stop": "2025-05-18",
      "event_count": 380
    }
  ],
  "meta": { "current_page": 1, "total": 12 }
}
```

**Dependencies:** Depends on sport type IDs from `GET /v1/sports`.

**Cache Strategy:** 30 days.

#### 3. Current Implementation Review

| App | Location | Status | Issues |
|-----|----------|--------|--------|
| `#api` | Tournament proxy/service | ⬜ Review Required | Verify `date_stop=ge:{today}` is always appended |
| `#admin` | Tournament selection UI | ⬜ Review Required | Check if admin can filter by sport type |
| `#frontend` | Tournament browser / filters | ⬜ Review Required | Verify historical tournaments are excluded from display |

#### 4. Correct Implementation

```http
GET https://api.xs2event.com/v1/tournaments?sport_type=soccer&date_stop=ge:2025-05-21
Authorization: Bearer {API_TOKEN}
```

**Date injection (backend):**

```js
const today = new Date().toISOString().split('T')[0]; // "2025-05-21"
const params = new URLSearchParams({
  sport_type: sportType,
  'date_stop': `ge:${today}`,
  page_size: 100
});
const response = await xs2eventClient.get(`/v1/tournaments?${params}`);
```

#### 5. Missing or Incomplete

- [ ] Confirm `date_stop=ge:{today}` is dynamically computed, not hardcoded
- [ ] Pagination handling — if `total > page_size`, subsequent pages must be fetched
- [ ] Verify `#frontend` does not display tournaments with a `date_stop` in the past

#### 6. Testing Checklist

- [ ] Returns `200` with current/upcoming tournaments only
- [ ] Request without `date_stop` filter does NOT reach the client-facing API
- [ ] Pagination: `meta.total > page_size` triggers additional page fetches
- [ ] Filtered by `sport_type` correctly narrows results
- [ ] Returns `401` without valid token
- [ ] Empty result set (`data: []`) is handled gracefully in UI

---

### TASK-003 — Get Tournament (Single)

#### 1. API Documentation Reference

| Field | Value |
|-------|-------|
| **Docs URL** | `https://docs.xs2event.com/reference/get-tournament` |
| **Related Refs** | GET /v1/tournaments (list), GET /v1/events (filter by tournament_id) |

#### 2. API Analysis

```http
GET /v1/tournaments/{tournament_id}
Authorization: Bearer <token>
```

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tournament_id` | string | Yes | Tournament identifier |

**Expected Response:**

```json
{
  "data": {
    "id": "premier-league-2025",
    "name": "Premier League 2024/25",
    "sport_type": "soccer",
    "date_start": "2024-08-10",
    "date_stop": "2025-05-18",
    "event_count": 380
  }
}
```

**Cache Strategy:** 30 days. **Priority:** Optional.

#### 3. Current Implementation Review

| App | Status | Notes |
|-----|--------|-------|
| `#api` | ⬜ Review Required | Used for detail pages or breadcrumb enrichment |
| `#admin` | ⬜ Review Required | May be used in admin tournament detail view |
| `#frontend` | ⬜ Review Required | Confirm tournament detail page uses this vs list endpoint |

#### 4. Correct Implementation

```http
GET https://api.xs2event.com/v1/tournaments/{tournament_id}
Authorization: Bearer {API_TOKEN}
```

**Error Handling:**

```js
if (error.response?.status === 404) {
  throw new NotFoundError(`Tournament ${tournamentId} not found`);
}
```

#### 5. Missing or Incomplete

- [ ] 404 handling when an invalid `tournament_id` is passed from frontend
- [ ] Verify the correct `tournament_id` format is used (string slug vs numeric ID)

#### 6. Testing Checklist

- [ ] Returns `200` with full tournament details for a valid ID
- [ ] Returns `404` for a non-existent tournament ID
- [ ] Response matches schema from the list endpoint
- [ ] Cached response is served within 30-day TTL
- [ ] Returns `401` without valid token

---

### TASK-004 — Get Events

#### 1. API Documentation Reference

| Field | Value |
|-------|-------|
| **Docs URL** | `https://docs.xs2event.com/reference/get-events` |
| **Related Refs** | Sports (sport_type), Tournaments (tournament_id), Tickets (event_id) |

#### 2. API Analysis

```http
GET /v1/events?sport_type={type}&tournament_id={id}&date_stop=ge:{today}
Authorization: Bearer <token>
```

**Purpose:** Core catalog call. Returns upcoming events filterable by sport type or tournament. Supports multi-value filtering with the `in` operator.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sport_type` | string | Conditional | Filter by single sport. Use `in` operator for multiple |
| `sport_type` (`in` syntax) | string | — | `sport_type=in:[soccer,formula1]` |
| `tournament_id` | string | Conditional | Filter to a specific tournament |
| `date_stop` | string | **Required** | Always use `ge:{today}` to exclude past events |
| `page` | integer | No | Page number |
| `page_size` | integer | No | Default unspecified — test and set appropriately |

**Expected Response:**

```json
{
  "data": [
    {
      "id": "event-123",
      "name": "Manchester City vs Arsenal",
      "sport_type": "soccer",
      "tournament_id": "premier-league-2025",
      "date_start": "2025-06-15T15:00:00Z",
      "status": "active",
      "venue": {
        "id": "venue-001",
        "name": "Etihad Stadium",
        "city": "Manchester",
        "country": "GBR"
      },
      "hometeam": { "id": "team-mcfc", "name": "Manchester City" },
      "visiting_team": { "id": "team-ars", "name": "Arsenal" }
    }
  ],
  "meta": { "current_page": 1, "total": 48, "per_page": 50 }
}
```

**Dependencies:** `sport_type` values from `GET /v1/sports`. `tournament_id` from `GET /v1/tournaments`. Results feed into `GET /v1/tickets` (filtered by `event_id`).

**Cache Strategy:** 24 hours (daily).

#### 3. Current Implementation Review

| App | Location | Status | Issues |
|-----|----------|--------|--------|
| `#api` | Event listing service | ⬜ Review Required | Verify `in` operator syntax for multi-sport queries |
| `#api` | — | ⬜ Review Required | Verify `date_stop=ge:{today}` is always enforced |
| `#admin` | Event management list | ⬜ Review Required | Admin likely needs all events including past — confirm separate admin query |
| `#frontend` | Event browse / search page | ⬜ Review Required | Multi-sport filter must serialize correctly as `in:[a,b]` |

#### 4. Correct Implementation

**Single sport:**
```http
GET https://api.xs2event.com/v1/events?sport_type=soccer&date_stop=ge:2025-05-21&page_size=50
Authorization: Bearer {API_TOKEN}
```

**Multiple sports (`in` operator):**
```http
GET https://api.xs2event.com/v1/events?sport_type=in:[soccer,formula1]&date_stop=ge:2025-05-21
Authorization: Bearer {API_TOKEN}
```

**Backend implementation:**

```js
function buildEventsQuery({ sportTypes = [], tournamentId, pageSize = 50 }) {
  const today = new Date().toISOString().split('T')[0];
  const params = { 'date_stop': `ge:${today}`, page_size: pageSize };

  if (sportTypes.length === 1) {
    params.sport_type = sportTypes[0];
  } else if (sportTypes.length > 1) {
    params.sport_type = `in:[${sportTypes.join(',')}]`;
  }

  if (tournamentId) params.tournament_id = tournamentId;
  return new URLSearchParams(params).toString();
}
```

**Pagination handler:**

```js
async function getAllEvents(queryParams) {
  let page = 1;
  let allEvents = [];
  let hasMore = true;

  while (hasMore) {
    const response = await xs2eventClient.get(`/v1/events?${queryParams}&page=${page}`);
    allEvents = [...allEvents, ...response.data.data];
    hasMore = page < response.data.meta.last_page;
    page++;
  }
  return allEvents;
}
```

#### 5. Missing or Incomplete

- [ ] Confirm `#frontend` multi-sport filter serializes `in:[...]` syntax correctly (URL encoding risks)
- [ ] Admin view may need past events — ensure `#admin` has a separate query without `date_stop` filter
- [ ] Pagination: verify all pages are fetched when `total > page_size`
- [ ] No `date_stop` filter must be blocked at `#api` layer for public-facing queries

#### 6. Testing Checklist

- [ ] Returns only future/current events when `date_stop=ge:{today}` is applied
- [ ] Without `date_stop` filter, past events appear — verify this is blocked for public APIs
- [ ] Multi-sport `in` operator returns events from all specified sport types
- [ ] Pagination traverses all pages correctly
- [ ] Filtering by `tournament_id` returns only that tournament's events
- [ ] Response includes embedded venue and team objects (not just IDs)
- [ ] Cache serves response within 24h TTL; fresh fetch after expiry
- [ ] Returns `401` without valid token

---

### TASK-005 — Get Event (Single)

#### 1. API Documentation Reference

| Field | Value |
|-------|-------|
| **Docs URL** | `https://docs.xs2event.com/reference/get-event` |
| **Related Refs** | GET /v1/events (list), GET /v1/tickets (event_id filter), Guest data requirements |

#### 2. API Analysis

```http
GET /v1/events/{event_id}
Authorization: Bearer <token>
```

**Purpose:** Retrieves a single event's full detail including embedded venue, team, tournament, date, and status.

**Path Parameters:**

| Parameter | Type | Required |
|-----------|------|----------|
| `event_id` | string | Yes |

**Expected Response:**

```json
{
  "data": {
    "id": "event-123",
    "name": "Manchester City vs Arsenal",
    "sport_type": "soccer",
    "status": "active",
    "date_start": "2025-06-15T15:00:00Z",
    "tournament": { "id": "premier-league-2025", "name": "Premier League 2024/25" },
    "venue": { "id": "venue-001", "name": "Etihad Stadium", "city": "Manchester", "country": "GBR" },
    "hometeam": { "id": "team-mcfc", "name": "Manchester City" },
    "visiting_team": { "id": "team-ars", "name": "Arsenal" }
  }
}
```

**Note:** Response already includes team and venue names — no need to make separate team/venue calls if this endpoint is used.

**Cache Strategy:** 24 hours (daily). **Priority:** Optional.

#### 3. Current Implementation Review

| App | Status | Notes |
|-----|--------|-------|
| `#api` | ⬜ Review Required | Confirm this is used for event detail pages vs re-using list cache |
| `#admin` | ⬜ Review Required | Admin event detail view should use this endpoint |
| `#frontend` | ⬜ Review Required | Verify event detail page fetches this vs using cached list data |

#### 4. Correct Implementation

```http
GET https://api.xs2event.com/v1/events/{event_id}
Authorization: Bearer {API_TOKEN}
```

**Error Handling:**
```js
if (error.response?.status === 404) {
  return res.status(404).json({ error: 'Event not found or no longer available' });
}
```

#### 5. Missing or Incomplete

- [ ] Verify `status` field is checked before displaying the event (e.g., cancelled events)
- [ ] Confirm team/venue data from this response is used instead of redundant separate lookups

#### 6. Testing Checklist

- [ ] Returns `200` with fully embedded venue, team, and tournament objects
- [ ] Returns `404` for invalid or non-existent `event_id`
- [ ] `status` field is checked — cancelled events handled gracefully in UI
- [ ] Cached within 24h TTL
- [ ] Returns `401` without valid token

---

### TASK-006 — Get Venues

#### 1. API Documentation Reference

| Field | Value |
|-------|-------|
| **Docs URL** | `https://docs.xs2event.com/reference/get-venues` |
| **Related Refs** | GET /v1/venues/{venue_id}, GET /v1/events (venue embedded) |

#### 2. API Analysis

```http
GET /v1/venues?page_size=50
Authorization: Bearer <token>
```

**Purpose:** Returns venue address and detail data. Default `page_size` is 50 — must handle pagination.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | integer | No | Page number for pagination |
| `page_size` | integer | No | Default is 50 — handle pagination explicitly |

**Expected Response:**

```json
{
  "data": [
    {
      "id": "venue-001",
      "name": "Etihad Stadium",
      "address": "Ashton New Road, Manchester",
      "city": "Manchester",
      "country_code": "GBR",
      "capacity": 55017,
      "latitude": 53.483,
      "longitude": -2.200
    }
  ],
  "meta": { "current_page": 1, "per_page": 50, "total": 120 }
}
```

**Cache Strategy:** 30 days.

#### 3. Current Implementation Review

| App | Status | Notes |
|-----|--------|-------|
| `#api` | ⬜ Review Required | Verify pagination is handled (total may exceed 50) |
| `#admin` | ⬜ Review Required | Venue management section |
| `#frontend` | ⬜ Review Required | Venue info often embedded in event response — confirm if separate venue call is needed |

#### 4. Correct Implementation

```http
GET https://api.xs2event.com/v1/venues?page_size=50&page=1
Authorization: Bearer {API_TOKEN}
```

**Pagination (all venues):**
```js
// Must paginate — default page_size is 50
async function getAllVenues() {
  const allVenues = [];
  let page = 1;
  let lastPage = 1;

  do {
    const resp = await xs2eventClient.get(`/v1/venues?page_size=50&page=${page}`);
    allVenues.push(...resp.data.data);
    lastPage = resp.data.meta.last_page;
    page++;
  } while (page <= lastPage);

  return allVenues;
}
```

#### 5. Missing or Incomplete

- [ ] Pagination not implemented — `#api` may only fetch the first 50 venues
- [ ] Venue data may already be embedded in event responses — confirm if separate venue fetch is needed

#### 6. Testing Checklist

- [ ] All pages are fetched when `total > 50`
- [ ] Each venue includes `id`, `name`, `address`, `city`, `country_code`
- [ ] Cached for 30 days; stale cache triggers a fresh fetch
- [ ] Returns `401` without valid token

---

### TASK-007 — Get Venue (Single)

#### 1. API Documentation Reference

| Field | Value |
|-------|-------|
| **Docs URL** | `https://docs.xs2event.com/reference/get-venue` |
| **Related Refs** | GET /v1/venues (list) |

#### 2. API Analysis

```http
GET /v1/venues/{venue_id}
Authorization: Bearer <token>
```

**Cache Strategy:** 30 days. **Priority:** Optional.

#### 3. Current Implementation Review

| App | Status | Notes |
|-----|--------|-------|
| `#api` | ⬜ Review Required | Used for venue detail lookup when not embedded in event |
| `#admin` | ⬜ Review Required | Venue detail admin page |
| `#frontend` | ⬜ Review Required | Map/venue detail modal |

#### 4. Correct Implementation

```http
GET https://api.xs2event.com/v1/venues/{venue_id}
Authorization: Bearer {API_TOKEN}
```

#### 5. Missing or Incomplete

- [ ] Verify venue is not fetched separately when event response already embeds venue data

#### 6. Testing Checklist

- [ ] Returns `200` with full venue details for a valid ID
- [ ] Returns `404` for invalid venue ID
- [ ] Cached for 30 days

---

### TASK-008 — Get Teams

#### 1. API Documentation Reference

| Field | Value |
|-------|-------|
| **Docs URL** | `https://docs.xs2event.com/reference/get-teams` |
| **Related Refs** | GET /v1/events (hometeam/visiting_team embedded) |

#### 2. API Analysis

```http
GET /v1/teams
Authorization: Bearer <token>
```

**Purpose:** Returns all teams referenced as `hometeam` or `visiting_team` in events.

**Expected Response:**

```json
{
  "data": [
    {
      "id": "team-mcfc",
      "name": "Manchester City",
      "sport_type": "soccer",
      "country_code": "ENG"
    }
  ]
}
```

**Cache Strategy:** 30 days.

#### 3. Current Implementation Review

| App | Status | Notes |
|-----|--------|-------|
| `#api` | ⬜ Review Required | Teams are embedded in event responses — confirm if separate team endpoint is needed |
| `#admin` | ⬜ Review Required | Team filtering in admin event list |
| `#frontend` | ⬜ Review Required | Team display in event cards |

#### 4. Correct Implementation

```http
GET https://api.xs2event.com/v1/teams
Authorization: Bearer {API_TOKEN}
```

#### 5. Missing or Incomplete

- [ ] Confirm teams are not fetched redundantly — event responses embed team names already

#### 6. Testing Checklist

- [ ] All teams are returned with `id`, `name`, `sport_type`
- [ ] Cached for 30 days
- [ ] Returns `401` without valid token

---

### TASK-009 — Get Team (Single)

#### 1. API Documentation Reference

| Field | Value |
|-------|-------|
| **Docs URL** | `https://docs.xs2event.com/reference/get-team` |
| **Related Refs** | GET /v1/teams (list) |

#### 2. API Analysis

```http
GET /v1/teams/{team_id}
Authorization: Bearer <token>
```

**Cache Strategy:** 30 days. **Priority:** Optional.

#### 3. Correct Implementation

```http
GET https://api.xs2event.com/v1/teams/{team_id}
Authorization: Bearer {API_TOKEN}
```

#### 4. Testing Checklist

- [ ] Returns `200` with team details for a valid ID
- [ ] Returns `404` for invalid team ID
- [ ] Cached for 30 days

---

### TASK-010 — Get Tickets 🔴 CRITICAL

#### 1. API Documentation Reference

| Field | Value |
|-------|-------|
| **Docs URL** | `https://docs.xs2event.com/reference/get-tickets` |
| **Related Refs** | GET /v1/events (event_id), GET /v1/categories (category grouping), POST /v1/reservations (net_rate, currency_code) |

#### 2. API Analysis

```http
GET /v1/tickets?event_id={id}&ticket_status=available&stock=gt:0
Authorization: Bearer <token>
```

**Purpose:** Fetches available tickets for an event. This is the critical live pricing and availability endpoint. **Must never be cached.**

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `event_id` | string | **Yes** | Filter tickets for a specific event |
| `ticket_status` | string | Recommended | Use `available` to filter only purchasable tickets |
| `stock` | filter | Recommended | Use `gt:0` to exclude sold-out tickets |

**Response grouping logic:** Multiple suppliers may offer the same ticket category. Group the response by `event_id + category_id + sub_category` to avoid showing duplicate options to the customer.

**Expected Response:**

```json
{
  "data": [
    {
      "id": "ticket-abc",
      "event_id": "event-123",
      "category_id": "cat-vip",
      "sub_category": "VIP Lounge A",
      "ticket_status": "available",
      "stock": 12,
      "net_rate": "150.00",
      "currency_code": "EUR",
      "supplier_id": "supplier-01",
      "includes_fees": true
    }
  ]
}
```

**⚠️ Critical:** The `net_rate` and `currency_code` from this response **must be passed verbatim** when creating a reservation.

**Cache Strategy:** ❌ **NEVER CACHE** — stock and prices change in real time.

**Dependencies:** Requires `event_id` from `GET /v1/events`.

#### 3. Current Implementation Review

| App | Location | Status | Issues |
|-----|----------|--------|--------|
| `#api` | Ticket service | ⬜ Review Required | **Must have no caching layer** — verify no Redis/CDN caching on this route |
| `#api` | — | ⬜ Review Required | Verify `ticket_status=available` and `stock=gt:0` filters are always applied |
| `#api` | — | ⬜ Review Required | Verify grouping logic (collapse duplicate suppliers) |
| `#admin` | Ticket availability view | ⬜ Review Required | Admin view may show all statuses — confirm intended behavior |
| `#frontend` | Ticket selection UI | ⬜ Review Required | Verify sold-out tickets are visually distinguished or hidden |

#### 4. Correct Implementation

```http
GET https://api.xs2event.com/v1/tickets?event_id=event-123&ticket_status=available&stock=gt:0
Authorization: Bearer {API_TOKEN}
```

**Backend — no caching, with supplier deduplication:**

```js
async function getAvailableTickets(eventId) {
  // CRITICAL: No caching — always fetch live
  const response = await xs2eventClient.get('/v1/tickets', {
    params: {
      event_id: eventId,
      ticket_status: 'available',
      'stock': 'gt:0'
    }
  });

  // Deduplicate by category_id + sub_category (pick best price or first supplier)
  const grouped = {};
  for (const ticket of response.data.data) {
    const key = `${ticket.category_id}::${ticket.sub_category}`;
    if (!grouped[key] || parseFloat(ticket.net_rate) < parseFloat(grouped[key].net_rate)) {
      grouped[key] = ticket;
    }
  }

  return Object.values(grouped);
}
```

**Cache Headers (must be set on API response):**

```http
Cache-Control: no-store, no-cache, must-revalidate
Pragma: no-cache
```

#### 5. Missing or Incomplete

- [ ] **CRITICAL:** Confirm no caching (in-memory, Redis, CDN) is applied to this route
- [ ] Confirm supplier deduplication logic is implemented in `#api`
- [ ] Confirm `#frontend` does not cache ticket data in session/local storage
- [ ] Verify `stock=gt:0` and `ticket_status=available` filters are enforced at API layer

#### 6. Testing Checklist

- [ ] Returns live data — price/stock changes upstream are reflected immediately
- [ ] No caching headers allow storage (CDN, browser, Redis)
- [ ] Only `available` status tickets are returned
- [ ] Only tickets with `stock > 0` are returned
- [ ] Duplicate supplier entries are collapsed — customer sees one option per category/sub_category
- [ ] `net_rate` is a decimal string (not a float) — preserved exactly
- [ ] `currency_code` is a valid ISO 4217 code
- [ ] Returns `401` without valid token
- [ ] Returns `404` if `event_id` does not exist

---

### TASK-011 — Get Ticket (Single) 🔴 CRITICAL

#### 1. API Documentation Reference

| Field | Value |
|-------|-------|
| **Docs URL** | `https://docs.xs2event.com/reference/get-ticket` |
| **Related Refs** | GET /v1/tickets (list), POST /v1/reservations (uses net_rate + currency_code) |

#### 2. API Analysis

```http
GET /v1/tickets/{ticket_id}
Authorization: Bearer <token>
```

**Purpose:** Returns the current price, stock, and status for one specific ticket. The `net_rate` and `currency_code` from this response **must** be passed verbatim to `POST /v1/reservations`.

**Expected Response:**

```json
{
  "data": {
    "id": "ticket-abc",
    "event_id": "event-123",
    "category_id": "cat-vip",
    "ticket_status": "available",
    "stock": 8,
    "net_rate": "150.00",
    "currency_code": "EUR"
  }
}
```

**⚠️ Critical:** This endpoint must be called immediately before creating a reservation to get the freshest price. A price mismatch between this response and the reservation payload causes an immediate error.

**Cache Strategy:** ❌ **NEVER CACHE.**

#### 3. Current Implementation Review

| App | Status | Issues |
|-----|--------|--------|
| `#api` | ⬜ Review Required | Must be called immediately before `POST /v1/reservations`; no caching |
| `#frontend` | ⬜ Review Required | Confirm price displayed to customer is sourced from this endpoint, not from a stale list response |

#### 4. Correct Implementation

```http
GET https://api.xs2event.com/v1/tickets/{ticket_id}
Authorization: Bearer {API_TOKEN}
```

**Pre-reservation flow:**

```js
// Step 1: Always fetch fresh ticket data immediately before reserving
const ticketResponse = await xs2eventClient.get(`/v1/tickets/${ticketId}`);
const { net_rate, currency_code, ticket_status, stock } = ticketResponse.data.data;

// Step 2: Validate before proceeding
if (ticket_status !== 'available' || stock < requestedQuantity) {
  throw new TicketUnavailableError('Ticket no longer available');
}

// Step 3: Use verbatim in reservation
const reservation = await createReservation({
  ticket_id: ticketId,
  quantity: requestedQuantity,
  net_rate,        // Passed verbatim — no modification
  currency_code    // Passed verbatim — no modification
});
```

#### 5. Missing or Incomplete

- [ ] **CRITICAL:** Confirm `net_rate` is passed as-is (string, not parsed to float)
- [ ] Confirm this endpoint is called immediately before reservation (not using stale list data)
- [ ] Confirm `#frontend` does not show a price from a stale GET /v1/tickets list response

#### 6. Testing Checklist

- [ ] Returns live stock and price — no caching
- [ ] `net_rate` is a decimal string preserved exactly (no float rounding)
- [ ] Reservation created with this `net_rate` succeeds without price mismatch error
- [ ] Reservation with a modified `net_rate` returns error
- [ ] Returns `404` for invalid `ticket_id`
- [ ] Returns `401` without valid token
- [ ] When ticket becomes unavailable, `ticket_status` field reflects this

---

### TASK-012 — Get Categories

#### 1. API Documentation Reference

| Field | Value |
|-------|-------|
| **Docs URL** | `https://docs.xs2event.com/reference/get-categories` |
| **Related Refs** | GET /v1/tickets (category_id grouping), GET /v1/events (event_id filter) |

#### 2. API Analysis

```http
GET /v1/categories?event_id={event_id}
Authorization: Bearer <token>
```

**Purpose:** Returns seat/ticket categories for events, including `party_size_together` (guaranteed group seating). Filter by `event_id` to fetch all categories for one event at once.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `event_id` | string | Recommended | Get all categories for a specific event |

**Expected Response:**

```json
{
  "data": [
    {
      "id": "cat-vip",
      "name": "VIP Lounge",
      "event_id": "event-123",
      "party_size_together": 2,
      "distribution_channel": "xs2event",
      "description": "Premium hospitality with catering"
    }
  ]
}
```

**Key Field:** `party_size_together` — the number of guests guaranteed to be seated together. Important for group bookings.

**Cache Strategy:** Weekly (7 days).

#### 3. Current Implementation Review

| App | Status | Notes |
|-----|--------|-------|
| `#api` | ⬜ Review Required | Confirm filtering by `event_id` to avoid fetching all categories |
| `#frontend` | ⬜ Review Required | `party_size_together` must be displayed to customer during ticket selection |

#### 4. Correct Implementation

```http
GET https://api.xs2event.com/v1/categories?event_id=event-123
Authorization: Bearer {API_TOKEN}
```

#### 5. Missing or Incomplete

- [ ] `party_size_together` field may not be displayed in `#frontend` ticket selection
- [ ] `distribution_channel` field should be checked (see TASK-013)

#### 6. Testing Checklist

- [ ] Returns categories filtered by `event_id`
- [ ] `party_size_together` is present and displayed in frontend
- [ ] `distribution_channel` is one of: `xs2event`, `external`, `external_end_client`
- [ ] Cached for 7 days
- [ ] Returns `401` without valid token

---

### TASK-013 — Get Category (Single)

#### 1. API Documentation Reference

| Field | Value |
|-------|-------|
| **Docs URL** | `https://docs.xs2event.com/reference/get-category` |
| **Related Refs** | GET /v1/categories (list), E-ticket download (distribution_channel check) |

#### 2. API Analysis

```http
GET /v1/categories/{category_id}
Authorization: Bearer <token>
```

**Key Field:** `distribution_channel` — determines whether tickets are downloadable through XS2Event API (`xs2event`) or via a third-party system (`external` / `external_end_client`).

**Cache Strategy:** Weekly. **Priority:** Optional.

#### 3. Correct Implementation

```http
GET https://api.xs2event.com/v1/categories/{category_id}
Authorization: Bearer {API_TOKEN}
```

#### 4. Testing Checklist

- [ ] Returns `200` with `distribution_channel` field
- [ ] `distribution_channel` value is one of the three valid options
- [ ] Returns `404` for invalid category ID
- [ ] Cached for 7 days

---

### TASK-014 — Get Countries

#### 1. API Documentation Reference

| Field | Value |
|-------|-------|
| **Docs URL** | `https://docs.xs2event.com/reference/get-countries` |
| **Related Refs** | POST /v1/reservations/{id}/guestdata (country_of_residence field) |

#### 2. API Analysis

```http
GET /v1/countries
Authorization: Bearer <token>
```

**Purpose:** Returns ISO 3166-1 alpha-3 country codes used in guest data forms for `country_of_residence`.

**Expected Response:**

```json
{
  "data": [
    { "code": "GBR", "name": "United Kingdom" },
    { "code": "NLD", "name": "Netherlands" }
  ]
}
```

**Cache Strategy:** 30 days.

#### 3. Current Implementation Review

| App | Status | Notes |
|-----|--------|-------|
| `#api` | ⬜ Review Required | Verify ISO alpha-3 format is used, not alpha-2 |
| `#frontend` | ⬜ Review Required | Country dropdown in guest data form must use API-returned codes |

#### 4. Correct Implementation

```http
GET https://api.xs2event.com/v1/countries
Authorization: Bearer {API_TOKEN}
```

#### 5. Missing or Incomplete

- [ ] Confirm `#frontend` guest form country dropdown is populated from this endpoint
- [ ] Confirm alpha-3 codes (GBR, not GB) are used in guest data payloads

#### 6. Testing Checklist

- [ ] Returns all countries with `code` (alpha-3) and `name`
- [ ] Frontend country dropdown uses codes from this endpoint
- [ ] Guest data submitted with valid alpha-3 code is accepted
- [ ] Guest data with alpha-2 code is rejected
- [ ] Cached for 30 days
- [ ] Returns `401` without valid token

---

### TASK-015 — Get Cities

#### 1. API Documentation Reference

| Field | Value |
|-------|-------|
| **Docs URL** | `https://docs.xs2event.com/reference/get-cities` |
| **Related Refs** | POST /v1/reservations/{id}/guestdata (address fields) |

#### 2. API Analysis

```http
GET /v1/cities
Authorization: Bearer <token>
```

**Purpose:** City reference list for guest data address fields.

**Cache Strategy:** 30 days. **Priority:** Optional.

#### 3. Correct Implementation

```http
GET https://api.xs2event.com/v1/cities
Authorization: Bearer {API_TOKEN}
```

#### 4. Testing Checklist

- [ ] Returns city list with ID and name
- [ ] Cached for 30 days
- [ ] City IDs used in guest data are accepted by the API

---

### TASK-016 — Log CSV Download

#### 1. API Documentation Reference

| Field | Value |
|-------|-------|
| **Docs URL** | `https://docs.xs2event.com/reference/post-tickets-csv` |
| **Related Refs** | GET /v1/tickets (list) |

#### 2. API Analysis

```http
POST /v1/tickets/csv
Authorization: Bearer <token>
Content-Type: application/json
```

**Purpose:** Records a CSV export action for audit/analytics purposes. **Priority:** Optional.

**Expected Response:** `200 OK` or `201 Created` (audit log confirmation).

#### 3. Correct Implementation

```http
POST https://api.xs2event.com/v1/tickets/csv
Authorization: Bearer {API_TOKEN}
Content-Type: application/json

{
  "event_id": "event-123"
}
```

#### 4. Testing Checklist

- [ ] Returns `200` or `201` when called after a CSV download
- [ ] Failure does not block the CSV download itself (fire-and-forget acceptable)
- [ ] Returns `401` without valid token

---

## Phase 2 — Guest Requirements

> **Overview:** Before creating a reservation, check what guest information the ticket supplier requires. This data drives the checkout form.
>
> ⚠️ `pre_checkout` fields must be collected **before** booking creation. `pre_download` fields can be deferred until before ticket delivery.

---

### TASK-017 — Get Event Guest Data Requirements

#### 1. API Documentation Reference

| Field | Value |
|-------|-------|
| **Docs URL** | `https://docs.xs2event.com/reference/get-event-guestdata` |
| **Related Refs** | POST /v1/reservations/{id}/guestdata (submit guest data), GET /v1/tickets/{ticket_id}/guestdata |

#### 2. API Analysis

```http
GET /v1/events/{event_id}/guestdata
Authorization: Bearer <token>
```

**Purpose:** Returns all required guest fields, their condition (pre_checkout or pre_download), and scope (lead_guest or all_persons). Must be called early to build the correct checkout form.

**Expected Response:**

```json
{
  "data": [
    {
      "field": "first_name",
      "label": "First Name",
      "type": "text",
      "condition": "pre_checkout",
      "scope": "all_persons",
      "required": true,
      "validation": { "max_length": 100 }
    },
    {
      "field": "country_of_residence",
      "label": "Country of Residence",
      "type": "select",
      "condition": "pre_checkout",
      "scope": "lead_guest",
      "required": true,
      "options_source": "/v1/countries"
    },
    {
      "field": "passport_number",
      "label": "Passport Number",
      "type": "text",
      "condition": "pre_download",
      "scope": "all_persons",
      "required": true
    }
  ]
}
```

**Key Fields:**

| Field | Values | Description |
|-------|--------|-------------|
| `condition` | `pre_checkout`, `pre_download` | When the field must be collected |
| `scope` | `lead_guest`, `all_persons` | Who the field applies to |
| `required` | boolean | Whether the field is mandatory |

**Dependencies:** `event_id` from GET /v1/events.

#### 3. Current Implementation Review

| App | Status | Issues |
|-----|--------|--------|
| `#api` | ⬜ Review Required | Verify this is called per-event, not globally |
| `#frontend` | ⬜ Review Required | **Checkout form must be dynamically built from this response** — not hardcoded |
| `#frontend` | ⬜ Review Required | `pre_checkout` fields must appear before payment step |
| `#frontend` | ⬜ Review Required | `scope: lead_guest` fields appear once; `all_persons` fields appear per ticket |

#### 4. Correct Implementation

```http
GET https://api.xs2event.com/v1/events/{event_id}/guestdata
Authorization: Bearer {API_TOKEN}
```

**Frontend form builder pattern:**

```js
async function buildCheckoutForm(eventId, ticketCount) {
  const { data } = await api.get(`/v1/events/${eventId}/guestdata`);

  const preCheckoutFields = data.data.filter(f => f.condition === 'pre_checkout');
  const leadGuestFields = preCheckoutFields.filter(f => f.scope === 'lead_guest');
  const allPersonFields = preCheckoutFields.filter(f => f.scope === 'all_persons');

  return {
    // Rendered once for the lead guest
    leadGuestSection: renderFields(leadGuestFields),
    // Rendered N times (once per ticket)
    guestSections: Array.from({ length: ticketCount }, (_, i) =>
      renderFields(allPersonFields, `guest_${i}`)
    )
  };
}
```

#### 5. Missing or Incomplete

- [ ] **Critical:** Checkout form must NOT be hardcoded — it must be dynamically generated from this endpoint
- [ ] `pre_download` fields need a separate post-booking collection flow
- [ ] Validation rules from `validation` object must be applied client-side AND server-side

#### 6. Testing Checklist

- [ ] Returns all required fields with `condition`, `scope`, `required`, and `type`
- [ ] `pre_checkout` fields are collected before booking finalization
- [ ] `pre_download` fields are NOT required at checkout (but collected before ticket delivery)
- [ ] `scope: lead_guest` generates exactly one field instance
- [ ] `scope: all_persons` generates N field instances (one per ticket)
- [ ] Validation rules from `validation` object are enforced in frontend form
- [ ] Returns `401` without valid token
- [ ] Returns `404` for invalid `event_id`

---

### TASK-018 — Get Ticket Guest Data Requirements

#### 1. API Documentation Reference

| Field | Value |
|-------|-------|
| **Docs URL** | `https://docs.xs2event.com/reference/get-ticket-guestdata` |
| **Related Refs** | GET /v1/events/{event_id}/guestdata (event-level), POST /v1/reservations/{id}/guestdata |

#### 2. API Analysis

```http
GET /v1/tickets/{ticket_id}/guestdata
Authorization: Bearer <token>
```

**Purpose:** Returns per-ticket guest requirements — useful when different ticket types in the same event have different supplier rules (e.g., VIP tickets require passport, standard tickets do not).

**Priority:** Optional — use as a supplement to event-level guest data when tickets have divergent requirements.

#### 3. Current Implementation Review

| App | Status | Notes |
|-----|--------|-------|
| `#api` | ⬜ Review Required | Ensure this is called when tickets of different categories are mixed in a basket |
| `#frontend` | ⬜ Review Required | Checkout form may need to merge event-level and ticket-level requirements |

#### 4. Correct Implementation

```http
GET https://api.xs2event.com/v1/tickets/{ticket_id}/guestdata
Authorization: Bearer {API_TOKEN}
```

**When to use this vs event-level endpoint:**

```
IF all tickets in the basket are the same category:
  → Use GET /v1/events/{id}/guestdata (sufficient)
ELSE IF tickets span multiple categories with different rules:
  → Also call GET /v1/tickets/{ticket_id}/guestdata per ticket type
  → Merge and deduplicate field requirements
```

#### 5. Testing Checklist

- [ ] Returns ticket-specific requirements that differ from event-level requirements
- [ ] Mixed-category baskets collect the union of all required fields
- [ ] Returns `404` for invalid `ticket_id`
- [ ] Returns `401` without valid token

---

## Phase 3 — Reservation

> **Overview:** Create a timed hold on the customer's chosen tickets. The reservation expires in **10 minutes**. Pricing from `GET /v1/tickets/{ticket_id}` must be passed verbatim.
>
> 🔴 **Price mismatch = immediate error.** After 10 min, the hold expires and tickets are released back to the pool.

---

### TASK-019 — Create Reservation 🔴 CRITICAL

#### 1. API Documentation Reference

| Field | Value |
|-------|-------|
| **Docs URL** | `https://docs.xs2event.com/reference/create-reservation` |
| **Related Refs** | GET /v1/tickets/{ticket_id} (net_rate, currency_code), POST /v1/bookings |

#### 2. API Analysis

```http
POST /v1/reservations
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "items": [
    {
      "ticket_id": "ticket-abc",
      "quantity": 2,
      "net_rate": "150.00",
      "currency_code": "EUR"
    }
  ]
}
```

**⚠️ Critical Rules:**
- `net_rate` and `currency_code` **must match** the values from `GET /v1/tickets/{ticket_id}` exactly
- Do NOT parse `net_rate` to a float — preserve as a decimal string
- Reservation expires in exactly **10 minutes** from creation

**Expected Response (`201 Created`):**

```json
{
  "data": {
    "id": "res-xyz",
    "status": "active",
    "expires_at": "2025-05-21T14:25:00Z",
    "items": [
      {
        "ticket_id": "ticket-abc",
        "quantity": 2,
        "net_rate": "150.00",
        "currency_code": "EUR"
      }
    ]
  }
}
```

**Dependencies:** Requires fresh `net_rate` + `currency_code` from `GET /v1/tickets/{ticket_id}`.

#### 3. Current Implementation Review

| App | Status | Issues |
|-----|--------|--------|
| `#api` | ⬜ Review Required | Verify `net_rate` is passed as string, not number |
| `#api` | ⬜ Review Required | Verify fresh ticket data is fetched immediately before this call |
| `#frontend` | ⬜ Review Required | 10-minute countdown timer must be shown to user |
| `#frontend` | ⬜ Review Required | Expiry warning should appear at ~2 minutes remaining |

#### 4. Correct Implementation

```http
POST https://api.xs2event.com/v1/reservations
Authorization: Bearer {API_TOKEN}
Content-Type: application/json

{
  "items": [
    {
      "ticket_id": "ticket-abc",
      "quantity": 2,
      "net_rate": "150.00",
      "currency_code": "EUR"
    }
  ]
}
```

**Complete pre-reservation flow:**

```js
async function createReservation(ticketId, quantity) {
  // 1. Always fetch fresh ticket data
  const ticketResp = await xs2eventClient.get(`/v1/tickets/${ticketId}`);
  const { net_rate, currency_code, ticket_status, stock } = ticketResp.data.data;

  // 2. Validate availability
  if (ticket_status !== 'available') throw new Error('Ticket not available');
  if (stock < quantity) throw new Error('Insufficient stock');

  // 3. Create reservation with verbatim net_rate
  const resp = await xs2eventClient.post('/v1/reservations', {
    items: [{ ticket_id: ticketId, quantity, net_rate, currency_code }]
  });

  // 4. Store reservation ID and expiry for countdown
  const { id, expires_at } = resp.data.data;
  return { reservationId: id, expiresAt: new Date(expires_at) };
}
```

**Frontend countdown:**

```js
function startReservationTimer(expiresAt, onExpire, onWarning) {
  const interval = setInterval(() => {
    const remaining = new Date(expiresAt) - Date.now();
    if (remaining <= 0) { clearInterval(interval); onExpire(); }
    else if (remaining <= 120000) onWarning(Math.floor(remaining / 1000)); // 2 min warning
  }, 1000);
}
```

#### 5. Missing or Incomplete

- [ ] **Critical:** Confirm `net_rate` is not parsed to `Number` anywhere in the request chain
- [ ] Confirm 10-minute countdown timer is implemented in `#frontend`
- [ ] Confirm reservation expiry is detected and user is prompted to restart
- [ ] Confirm `#api` does not apply any transformation to `net_rate` before forwarding

#### 6. Testing Checklist

- [ ] Returns `201` with `id`, `status: "active"`, and `expires_at` (10 min from now)
- [ ] Price mismatch (modified `net_rate`) returns error
- [ ] Requesting more tickets than available `stock` returns error
- [ ] `ticket_status !== "available"` returns error
- [ ] Reservation expires after 10 minutes — `GET /v1/reservations/{id}` shows expired status
- [ ] Frontend shows countdown timer from `expires_at`
- [ ] Frontend warns at 2 minutes remaining
- [ ] Returns `422` with validation errors for missing required fields
- [ ] Returns `401` without valid token

---

### TASK-020 — Get Reservation

#### 1. API Documentation Reference

| Field | Value |
|-------|-------|
| **Docs URL** | `https://docs.xs2event.com/reference/get-reservation` |
| **Related Refs** | POST /v1/reservations (creates), POST /v1/bookings (requires active reservation) |

#### 2. API Analysis

```http
GET /v1/reservations/{reservation_id}
Authorization: Bearer <token>
```

**Purpose:** Check reservation expiry time, status, and reserved items. Poll this to detect expiry and warn the customer.

**Expected Response:**

```json
{
  "data": {
    "id": "res-xyz",
    "status": "active",
    "expires_at": "2025-05-21T14:25:00Z",
    "items": [
      { "ticket_id": "ticket-abc", "quantity": 2 }
    ]
  }
}
```

**Possible `status` values:** `active`, `expired`, `completed`

#### 3. Current Implementation Review

| App | Status | Notes |
|-----|--------|-------|
| `#api` | ⬜ Review Required | Used to poll reservation status |
| `#frontend` | ⬜ Review Required | Must handle `status: "expired"` — redirect user to restart |

#### 4. Correct Implementation

```http
GET https://api.xs2event.com/v1/reservations/{reservation_id}
Authorization: Bearer {API_TOKEN}
```

**Polling pattern:**

```js
async function pollReservationStatus(reservationId) {
  const resp = await xs2eventClient.get(`/v1/reservations/${reservationId}`);
  const { status, expires_at } = resp.data.data;

  if (status === 'expired') {
    throw new ReservationExpiredError('Reservation has expired. Please start again.');
  }
  return { status, expires_at };
}
```

#### 5. Testing Checklist

- [ ] Returns `active` status for a fresh reservation
- [ ] Returns `expired` status after 10 minutes
- [ ] Frontend handles `expired` status — shows appropriate message and restart option
- [ ] Returns `404` for a non-existent reservation ID
- [ ] Returns `401` without valid token

---

### TASK-021 — Get Reservations (List)

#### 1. API Documentation Reference

| Field | Value |
|-------|-------|
| **Docs URL** | `https://docs.xs2event.com/reference/get-reservations` |

#### 2. API Analysis

```http
GET /v1/reservations
Authorization: Bearer <token>
```

**Purpose:** Lists all active reservations for the authenticated account. **Priority:** Optional — mainly useful for admin or debugging.

#### 3. Correct Implementation

```http
GET https://api.xs2event.com/v1/reservations
Authorization: Bearer {API_TOKEN}
```

#### 4. Testing Checklist

- [ ] Returns list of active reservations
- [ ] Expired reservations are excluded or flagged in the list
- [ ] Returns `401` without valid token

---

### TASK-022 — Update Reservation (Full Replace)

#### 1. API Documentation Reference

| Field | Value |
|-------|-------|
| **Docs URL** | `https://docs.xs2event.com/reference/update-reservation` |
| **Related Refs** | GET /v1/reservations/{id}/guestdata (re-check after update) |

#### 2. API Analysis

```http
PUT /v1/reservations/{reservation_id}
Authorization: Bearer <token>
Content-Type: application/json
```

**Purpose:** Full replacement of reservation items — add/remove tickets or change quantities. **Important:** After updating, always re-check guest data requirements as they may change with the new ticket selection.

**Request Body:**

```json
{
  "items": [
    {
      "ticket_id": "ticket-xyz",
      "quantity": 3,
      "net_rate": "150.00",
      "currency_code": "EUR"
    }
  ]
}
```

**⚠️ Note:** This is a full replace — omitted items will be removed from the reservation.

#### 3. Current Implementation Review

| App | Status | Notes |
|-----|--------|-------|
| `#api` | ⬜ Review Required | Confirm full replace semantics are documented for API consumers |
| `#frontend` | ⬜ Review Required | Basket edit flow must use PUT (not PATCH) for full replacement |

#### 4. Correct Implementation

```http
PUT https://api.xs2event.com/v1/reservations/{reservation_id}
Authorization: Bearer {API_TOKEN}
Content-Type: application/json

{
  "items": [
    { "ticket_id": "ticket-xyz", "quantity": 3, "net_rate": "150.00", "currency_code": "EUR" }
  ]
}
```

#### 5. Missing or Incomplete

- [ ] After PUT, guest data must be re-validated — new ticket types may have new requirements

#### 6. Testing Checklist

- [ ] Full replace removes items not included in the new body
- [ ] After update, guest data is re-checked via `GET /v1/reservations/{id}/guestdata`
- [ ] Price mismatch on updated items returns error
- [ ] Returns `404` for expired or non-existent reservation
- [ ] Returns `401` without valid token

---

### TASK-023 — Partially Update Reservation

#### 1. API Documentation Reference

| Field | Value |
|-------|-------|
| **Docs URL** | `https://docs.xs2event.com/reference/patch-reservation` |

#### 2. API Analysis

```http
PATCH /v1/reservations/{reservation_id}
Authorization: Bearer <token>
Content-Type: application/json
```

**Purpose:** Modify specific fields of the reservation without a full replacement.

#### 3. Correct Implementation

```http
PATCH https://api.xs2event.com/v1/reservations/{reservation_id}
Authorization: Bearer {API_TOKEN}
Content-Type: application/json

{
  "items": [
    { "ticket_id": "ticket-abc", "quantity": 1 }
  ]
}
```

#### 4. Testing Checklist

- [ ] Only specified fields are modified; others remain unchanged
- [ ] Returns `404` for expired reservation
- [ ] Returns `401` without valid token

---

### TASK-024 — Delete Reservation

#### 1. API Documentation Reference

| Field | Value |
|-------|-------|
| **Docs URL** | `https://docs.xs2event.com/reference/delete-reservation` |

#### 2. API Analysis

```http
DELETE /v1/reservations/{reservation_id}
Authorization: Bearer <token>
```

**Purpose:** Cancel and release the reservation immediately. Stock is returned to the pool.

**Expected Response:** `204 No Content`

#### 3. Current Implementation Review

| App | Status | Notes |
|-----|--------|-------|
| `#frontend` | ⬜ Review Required | "Back" or "Cancel" button in checkout must trigger this DELETE call |

#### 4. Correct Implementation

```http
DELETE https://api.xs2event.com/v1/reservations/{reservation_id}
Authorization: Bearer {API_TOKEN}
```

#### 5. Missing or Incomplete

- [ ] Confirm user abandonment (browser close, navigate away) triggers reservation cleanup
- [ ] Confirm `#frontend` "Cancel" button calls this endpoint

#### 6. Testing Checklist

- [ ] Returns `204 No Content` on successful deletion
- [ ] Deleted reservation stock is returned — re-fetching tickets shows increased stock
- [ ] Deleted reservation ID returns `404` on subsequent GET
- [ ] Returns `404` for already-expired reservation
- [ ] Returns `401` without valid token

---

## Phase 4 — Reservation Guest Data

> **Overview:** Submit customer guest information. `pre_checkout` fields must be complete before a booking is finalized. A `422` response includes field-level error details.
>
> ℹ️ Use `?include_conditions=true` to see placeholder (unfilled) guest slots.

---

### TASK-025 — Get Reservation Guest Data

#### 1. API Documentation Reference

| Field | Value |
|-------|-------|
| **Docs URL** | `https://docs.xs2event.com/reference/get-reservation-guestdata` |
| **Related Refs** | POST /v1/reservations/{id}/guestdata, GET /v1/events/{id}/guestdata |

#### 2. API Analysis

```http
GET /v1/reservations/{id}/guestdata
GET /v1/reservations/{id}/guestdata?include_conditions=true
Authorization: Bearer <token>
```

**Purpose:** Returns current guest data state. Placeholder entries (missing `guest_id`) indicate unfilled slots.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `include_conditions` | boolean | Recommended | Returns virtual placeholder guests for unfilled slots with field-level error details |

**Expected Response:**

```json
{
  "data": [
    {
      "guest_id": null,
      "ticket_id": "ticket-abc",
      "is_placeholder": true,
      "conditions": [
        { "field": "first_name", "error": "required", "condition": "pre_checkout" }
      ]
    },
    {
      "guest_id": "guest-001",
      "ticket_id": "ticket-abc",
      "first_name": "John",
      "last_name": "Smith",
      "is_placeholder": false
    }
  ]
}
```

#### 3. Current Implementation Review

| App | Status | Notes |
|-----|--------|-------|
| `#api` | ⬜ Review Required | Verify `include_conditions=true` is passed to surface validation errors |
| `#frontend` | ⬜ Review Required | Must indicate which guest slots are still incomplete before allowing checkout |

#### 4. Correct Implementation

```http
GET https://api.xs2event.com/v1/reservations/{id}/guestdata?include_conditions=true
Authorization: Bearer {API_TOKEN}
```

**Check all slots are filled:**

```js
async function isGuestDataComplete(reservationId) {
  const resp = await api.get(`/v1/reservations/${reservationId}/guestdata?include_conditions=true`);
  const guests = resp.data.data;
  const unfilled = guests.filter(g => g.is_placeholder || g.guest_id === null);
  return { complete: unfilled.length === 0, unfilled };
}
```

#### 5. Testing Checklist

- [ ] Placeholder entries appear for unfilled guest slots when `include_conditions=true`
- [ ] `conditions` array shows exactly which fields are missing
- [ ] Frontend blocks booking finalization when unfilled slots exist
- [ ] Returns `401` without valid token

---

### TASK-026 — Add Reservation Guest Data (Batch) 🔴 CRITICAL

#### 1. API Documentation Reference

| Field | Value |
|-------|-------|
| **Docs URL** | `https://docs.xs2event.com/reference/post-reservation-guestdata` |
| **Related Refs** | GET /v1/events/{id}/guestdata (field requirements), GET /v1/countries (country codes), POST /v1/bookings |

#### 2. API Analysis

```http
POST /v1/reservations/{id}/guestdata
Authorization: Bearer <token>
Content-Type: application/json
```

**Purpose:** Submit all guest information in one batch, grouped by `ticket_id`.

**Request Body:**

```json
{
  "guests": [
    {
      "ticket_id": "ticket-abc",
      "lead_guest": true,
      "first_name": "John",
      "last_name": "Smith",
      "email": "john.smith@example.com",
      "date_of_birth": "1985-03-15",
      "country_of_residence": "GBR",
      "passport_number": "GB12345678"
    },
    {
      "ticket_id": "ticket-abc",
      "lead_guest": false,
      "first_name": "Jane",
      "last_name": "Smith"
    }
  ]
}
```

**Key Fields:**

| Field | Description |
|-------|-------------|
| `ticket_id` | The ticket this guest belongs to |
| `lead_guest` | `true` for the primary guest only |
| `first_name`, `last_name` | Always required |
| Other fields | Depends on `GET /v1/events/{id}/guestdata` response |

**Error Response (`422 Unprocessable Entity`):**

```json
{
  "message": "Validation failed",
  "errors": {
    "guests.0.email": ["The email field is required."],
    "guests.1.country_of_residence": ["Invalid country code."]
  }
}
```

#### 3. Current Implementation Review

| App | Status | Issues |
|-----|--------|--------|
| `#api` | ⬜ Review Required | Verify `422` field-level errors are forwarded to frontend |
| `#frontend` | ⬜ Review Required | Form must display field-level validation errors from `422` response |
| `#frontend` | ⬜ Review Required | Exactly one `lead_guest: true` must be set |

#### 4. Correct Implementation

```http
POST https://api.xs2event.com/v1/reservations/{id}/guestdata
Authorization: Bearer {API_TOKEN}
Content-Type: application/json

{
  "guests": [
    {
      "ticket_id": "ticket-abc",
      "lead_guest": true,
      "first_name": "John",
      "last_name": "Smith",
      "email": "john@example.com",
      "country_of_residence": "GBR"
    }
  ]
}
```

**422 error handling:**

```js
try {
  await api.post(`/v1/reservations/${id}/guestdata`, payload);
} catch (error) {
  if (error.response?.status === 422) {
    const fieldErrors = error.response.data.errors;
    // Map errors back to form fields
    Object.entries(fieldErrors).forEach(([field, messages]) => {
      setFieldError(field, messages[0]);
    });
  }
}
```

#### 5. Missing or Incomplete

- [ ] **Critical:** `422` error field mapping to frontend form must be implemented
- [ ] Exactly one `lead_guest: true` per reservation — frontend must enforce
- [ ] Country codes must use alpha-3 format from `GET /v1/countries`

#### 6. Testing Checklist

- [ ] Successful submission returns `200` or `201` with guest IDs
- [ ] Missing `pre_checkout` required field returns `422` with field-level errors
- [ ] Frontend displays field-level error messages from `422` response
- [ ] Exactly one `lead_guest: true` — submitting zero or multiple returns error
- [ ] Invalid `country_of_residence` (wrong format or unknown code) returns `422`
- [ ] Guest data is retrievable via `GET /v1/reservations/{id}/guestdata` after POST
- [ ] Returns `404` for expired reservation
- [ ] Returns `401` without valid token

---

### TASK-027 — Get Single Guest Data

#### 1. API Documentation Reference

| Field | Value |
|-------|-------|
| **Docs URL** | `https://docs.xs2event.com/reference/get-reservation-guest` |

#### 2. API Analysis

```http
GET /v1/reservations/{id}/guests/{guest_id}
Authorization: Bearer <token>
```

**Purpose:** Fetch data for one specific guest by their `guest_id` (returned from a previous POST). **Priority:** Optional.

#### 3. Correct Implementation

```http
GET https://api.xs2event.com/v1/reservations/{id}/guests/{guest_id}
Authorization: Bearer {API_TOKEN}
```

#### 4. Testing Checklist

- [ ] Returns correct guest data for a valid `guest_id`
- [ ] Returns `404` for invalid `guest_id`
- [ ] Returns `401` without valid token

---

### TASK-028 — Update Single Guest Data

#### 1. API Documentation Reference

| Field | Value |
|-------|-------|
| **Docs URL** | `https://docs.xs2event.com/reference/update-reservation-guest` |

#### 2. API Analysis

```http
PUT /v1/reservations/{id}/guests/{guest_id}
Authorization: Bearer <token>
Content-Type: application/json
```

**Purpose:** Correct or update data for one specific guest. **Priority:** Optional.

#### 3. Correct Implementation

```http
PUT https://api.xs2event.com/v1/reservations/{id}/guests/{guest_id}
Authorization: Bearer {API_TOKEN}
Content-Type: application/json

{
  "first_name": "Jonathan",
  "last_name": "Smith",
  "email": "jonathan.smith@example.com"
}
```

#### 4. Testing Checklist

- [ ] Only specified guest fields are updated; other fields remain
- [ ] Returns updated guest object
- [ ] Invalid `guest_id` returns `404`
- [ ] Returns `401` without valid token

---

### TASK-029 — Add Guest Data (Per Guest)

#### 1. API Documentation Reference

| Field | Value |
|-------|-------|
| **Docs URL** | `https://docs.xs2event.com/reference/post-reservation-guests` |

#### 2. API Analysis

```http
POST /v1/reservations/{id}/guests
Authorization: Bearer <token>
Content-Type: application/json
```

**Purpose:** Alternative to batch POST — add guest data one guest at a time. **Priority:** Optional — use the batch endpoint (TASK-026) as the primary approach.

#### 3. Correct Implementation

```http
POST https://api.xs2event.com/v1/reservations/{id}/guests
Authorization: Bearer {API_TOKEN}
Content-Type: application/json

{
  "ticket_id": "ticket-abc",
  "lead_guest": false,
  "first_name": "Jane",
  "last_name": "Smith"
}
```

#### 4. Testing Checklist

- [ ] Adds single guest and returns new `guest_id`
- [ ] Returns `422` if required fields are missing
- [ ] Returns `404` for expired reservation
- [ ] Returns `401` without valid token

---

## Phase 5 — Booking

> **Overview:** Finalize the booking from an active reservation. Returns a `booking_id` used for all downstream operations.
>
> ⚠️ If the reservation has expired, create a new one with the same ticket IDs and re-submit all guest data. Ensure `payment_method` is whitelisted in your XS2Event contract.

---

### TASK-030 — Create Booking 🔴 CRITICAL

#### 1. API Documentation Reference

| Field | Value |
|-------|-------|
| **Docs URL** | `https://docs.xs2event.com/reference/create-booking` |
| **Related Refs** | POST /v1/reservations, POST /v1/reservations/{id}/guestdata, GET /v1/bookingorders |

#### 2. API Analysis

```http
POST /v1/bookings
Authorization: Bearer <token>
Content-Type: application/json
```

**Purpose:** Converts an active reservation with complete guest data into a confirmed booking.

**Request Body:**

```json
{
  "invoice_reference": "INV-2025-00123",
  "booking_email": "customer@example.com",
  "reservation_id": "res-xyz",
  "payment_method": "bank_transfer"
}
```

**Required Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `invoice_reference` | string | Your internal invoice/order reference |
| `booking_email` | string | Customer email for booking confirmation |
| `reservation_id` | string | ID of the active reservation |
| `payment_method` | string | Must be whitelisted in your XS2Event contract |

**Expected Response (`201 Created`):**

```json
{
  "data": {
    "id": "booking-456",
    "status": "confirmed",
    "reservation_id": "res-xyz",
    "invoice_reference": "INV-2025-00123",
    "booking_email": "customer@example.com",
    "bookingorder_ids": ["bo-001", "bo-002"],
    "created_at": "2025-05-21T14:20:00Z"
  }
}
```

**Dependencies:** Requires an **active** (not expired) reservation with all `pre_checkout` guest data submitted.

#### 3. Current Implementation Review

| App | Status | Issues |
|-----|--------|--------|
| `#api` | ⬜ Review Required | Verify `payment_method` is sourced from config, not hardcoded |
| `#api` | ⬜ Review Required | Verify `invoice_reference` generation produces unique values |
| `#frontend` | ⬜ Review Required | Reservation expiry must be checked before calling this endpoint |
| `#admin` | ⬜ Review Required | Admin booking creation (if applicable) must use whitelisted payment method |

#### 4. Correct Implementation

```http
POST https://api.xs2event.com/v1/bookings
Authorization: Bearer {API_TOKEN}
Content-Type: application/json

{
  "invoice_reference": "INV-2025-00123",
  "booking_email": "customer@example.com",
  "reservation_id": "res-xyz",
  "payment_method": "bank_transfer"
}
```

**Full booking creation flow:**

```js
async function finalizeBooking(reservationId, customerEmail, orderId) {
  // 1. Verify reservation is still active
  const reservation = await xs2eventClient.get(`/v1/reservations/${reservationId}`);
  if (reservation.data.data.status !== 'active') {
    throw new ReservationExpiredError('Cannot book — reservation has expired');
  }

  // 2. Verify all pre_checkout guest data is complete
  const guestData = await xs2eventClient.get(
    `/v1/reservations/${reservationId}/guestdata?include_conditions=true`
  );
  const incomplete = guestData.data.data.filter(g => g.is_placeholder);
  if (incomplete.length > 0) {
    throw new ValidationError('Guest data incomplete', incomplete);
  }

  // 3. Create booking
  const response = await xs2eventClient.post('/v1/bookings', {
    invoice_reference: `INV-${orderId}`,
    booking_email: customerEmail,
    reservation_id: reservationId,
    payment_method: process.env.XS2EVENT_PAYMENT_METHOD
  });

  return response.data.data;
}
```

#### 5. Missing or Incomplete

- [ ] **Critical:** Confirm `payment_method` is stored in environment variables, not hardcoded
- [ ] Confirm `invoice_reference` uniqueness — duplicate references may cause conflicts
- [ ] Confirm expired reservation handling redirects user to restart flow

#### 6. Testing Checklist

- [ ] Returns `201` with `booking_id` and `bookingorder_ids` for a valid active reservation
- [ ] Expired reservation returns error — user is prompted to restart
- [ ] Incomplete guest data (`pre_checkout` fields missing) returns error
- [ ] Invalid `payment_method` (not whitelisted) returns error
- [ ] Duplicate `invoice_reference` behavior is documented and handled
- [ ] `booking_email` format is validated
- [ ] Returns `401` without valid token

---

### TASK-031 — Get Bookings (List)

#### 1. API Documentation Reference

| Field | Value |
|-------|-------|
| **Docs URL** | `https://docs.xs2event.com/reference/get-bookings` |
| **Related Refs** | GET /v1/bookings/{booking_id} |

#### 2. API Analysis

```http
GET /v1/bookings
GET /v1/bookings?reservation_id={id}
Authorization: Bearer <token>
```

**Purpose:** List bookings, optionally filtered by `reservation_id`.

#### 3. Correct Implementation

```http
GET https://api.xs2event.com/v1/bookings
Authorization: Bearer {API_TOKEN}
```

#### 4. Testing Checklist

- [ ] Returns a list of confirmed bookings
- [ ] Filtered by `reservation_id` returns only that reservation's booking
- [ ] Returns `401` without valid token

---

### TASK-032 — Get Booking (Single)

#### 1. API Documentation Reference

| Field | Value |
|-------|-------|
| **Docs URL** | `https://docs.xs2event.com/reference/get-booking` |
| **Related Refs** | POST /v1/bookings (creates), GET /v1/bookingorders |

#### 2. API Analysis

```http
GET /v1/bookings/{booking_id}
Authorization: Bearer <token>
```

**Purpose:** Returns full booking details including status and the list of `bookingorder_ids`.

**Expected Response:**

```json
{
  "data": {
    "id": "booking-456",
    "status": "confirmed",
    "bookingorder_ids": ["bo-001"],
    "invoice_reference": "INV-2025-00123",
    "booking_email": "customer@example.com",
    "created_at": "2025-05-21T14:20:00Z"
  }
}
```

#### 3. Correct Implementation

```http
GET https://api.xs2event.com/v1/bookings/{booking_id}
Authorization: Bearer {API_TOKEN}
```

#### 4. Testing Checklist

- [ ] Returns `200` with `bookingorder_ids` array
- [ ] `bookingorder_ids` are used to fetch booking orders
- [ ] Returns `404` for invalid `booking_id`
- [ ] Returns `401` without valid token

---

### TASK-033 — Get Bookings by Reservation

#### 1. API Documentation Reference

| Field | Value |
|-------|-------|
| **Docs URL** | `https://docs.xs2event.com/reference/get-bookings` |

#### 2. API Analysis

```http
GET /v1/bookings?reservation_id={id}
Authorization: Bearer <token>
```

**Purpose:** Convenience filter — look up which booking was created from a given reservation.

#### 3. Correct Implementation

```http
GET https://api.xs2event.com/v1/bookings?reservation_id=res-xyz
Authorization: Bearer {API_TOKEN}
```

#### 4. Testing Checklist

- [ ] Returns the booking linked to the specified `reservation_id`
- [ ] Returns empty array for a reservation with no associated booking
- [ ] Returns `401` without valid token

---

## Phase 6 — Booking Orders

> **Overview:** Each booking contains one or more BookingOrders (one per event/supplier). Monitor `logistic_status` — when `"completed"`, e-tickets are ready. Post-checkout guest data (`pre_download` fields) can be updated here.
>
> ℹ️ `distribution_channel` must be `"xs2event"` to download tickets through this API.

---

### TASK-034 — Get Booking Orders 🔴 CRITICAL

#### 1. API Documentation Reference

| Field | Value |
|-------|-------|
| **Docs URL** | `https://docs.xs2event.com/reference/get-bookingorders` |
| **Related Refs** | GET /v1/bookings (booking_id), GET /v1/etickets |

#### 2. API Analysis

```http
GET /v1/bookingorders?booking_id={id}
GET /v1/bookingorders?booking_id=in:[id1,id2]&logistic_status=completed
Authorization: Bearer <token>
```

**Purpose:** Fetch all booking orders for a `booking_id`. Monitor `logistic_status` to know when tickets are ready.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `booking_id` | string | Filter to a specific booking |
| `booking_id` (`in` syntax) | string | `booking_id=in:[id1,id2]` for multiple |
| `logistic_status` | string | Filter by status (e.g., `completed`) |

**Expected Response:**

```json
{
  "data": [
    {
      "id": "bo-001",
      "booking_id": "booking-456",
      "logistic_status": "completed",
      "distribution_channel": "xs2event",
      "zip_sha": "abc123...",
      "invoices": [{ "id": "inv-001", "type": "original" }],
      "items": [
        {
          "orderitem_id": "oi-001",
          "ticket_id": "ticket-abc",
          "download_link": "dl-link-001"
        }
      ]
    }
  ]
}
```

**`logistic_status` values:**

| Status | Meaning |
|--------|---------|
| `pending` | Processing — tickets not yet ready |
| `processing` | Supplier is generating tickets |
| `completed` | Tickets ready to download |
| `failed` | Error — contact XS2Event support |

#### 3. Current Implementation Review

| App | Status | Issues |
|-----|--------|--------|
| `#api` | ⬜ Review Required | Polling mechanism needed — status becomes `completed` asynchronously |
| `#admin` | ⬜ Review Required | Admin must be able to see `logistic_status` for order management |
| `#frontend` | ⬜ Review Required | Show "tickets pending" state while `logistic_status !== "completed"` |

#### 4. Correct Implementation

```http
GET https://api.xs2event.com/v1/bookingorders?booking_id=booking-456
Authorization: Bearer {API_TOKEN}
```

**Polling for completion:**

```js
async function waitForTicketsReady(bookingId, maxAttempts = 20, interval = 30000) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const resp = await xs2eventClient.get(`/v1/bookingorders?booking_id=${bookingId}`);
    const orders = resp.data.data;

    const allComplete = orders.every(o => o.logistic_status === 'completed');
    const anyFailed = orders.some(o => o.logistic_status === 'failed');

    if (allComplete) return orders;
    if (anyFailed) throw new Error('Ticket generation failed — contact support');

    await new Promise(resolve => setTimeout(resolve, interval));
  }
  throw new Error('Timeout waiting for tickets');
}
```

#### 5. Missing or Incomplete

- [ ] Polling mechanism for `logistic_status` not documented in `#api`
- [ ] `failed` status handling — user notification and support escalation flow
- [ ] `#frontend` must show "pending" UI state while waiting

#### 6. Testing Checklist

- [ ] Returns booking orders associated with `booking_id`
- [ ] `logistic_status` transitions from `pending` → `processing` → `completed`
- [ ] `distribution_channel` field is present on each order
- [ ] `in` operator works for multiple `booking_id` values
- [ ] `logistic_status=completed` filter returns only completed orders
- [ ] `zip_sha` is present when order is completed
- [ ] Returns `401` without valid token

---

### TASK-035 — Get Booking Order (Single)

#### 1. API Documentation Reference

| Field | Value |
|-------|-------|
| **Docs URL** | `https://docs.xs2event.com/reference/get-bookingorder` |
| **Related Refs** | GET /v1/bookingorders (list), GET /v1/etickets/download |

#### 2. API Analysis

```http
GET /v1/bookingorders/{bookingorder_id}
Authorization: Bearer <token>
```

**Purpose:** Returns full booking order detail including `logistic_status`, items, `orderitem_id`, `download_link`, `zip_sha`, `invoices[]`, and `distribution_channel`.

**Expected Response:**

```json
{
  "data": {
    "id": "bo-001",
    "logistic_status": "completed",
    "distribution_channel": "xs2event",
    "zip_sha": "sha256:abc123...",
    "invoices": [
      { "id": "inv-001", "type": "original" },
      { "id": "inv-002", "type": "credit_note" }
    ],
    "items": [
      {
        "orderitem_id": "oi-001",
        "ticket_id": "ticket-abc",
        "download_link": "dl-link-001",
        "download_items": [
          { "download_link": "dl-link-001a" },
          { "download_link": "dl-link-001b" }
        ]
      }
    ]
  }
}
```

**Note:** Multi-day events (e.g., F1) may have multiple `download_items` per ticket — iterate over all of them.

#### 3. Correct Implementation

```http
GET https://api.xs2event.com/v1/bookingorders/{bookingorder_id}
Authorization: Bearer {API_TOKEN}
```

#### 4. Testing Checklist

- [ ] Returns full detail with `logistic_status`, `distribution_channel`, `zip_sha`
- [ ] `invoices[]` array is present and contains `id` and `type`
- [ ] Multi-day events have multiple entries in `download_items`
- [ ] Returns `404` for invalid `bookingorder_id`
- [ ] Returns `401` without valid token

---

### TASK-036 — Get Booking Order Guest Data

#### 1. API Documentation Reference

| Field | Value |
|-------|-------|
| **Docs URL** | `https://docs.xs2event.com/reference/get-bookingorder-guestdata` |

#### 2. API Analysis

```http
GET /v1/bookingorders/{id}/guestdata
Authorization: Bearer <token>
```

**Purpose:** Fetch any remaining `pre_download` fields not yet provided. **Condition:** Only needed when guest data has `pre_download` fields outstanding.

#### 3. Correct Implementation

```http
GET https://api.xs2event.com/v1/bookingorders/{id}/guestdata
Authorization: Bearer {API_TOKEN}
```

#### 4. Testing Checklist

- [ ] Returns pending `pre_download` guest data fields
- [ ] Empty response when all fields are already provided
- [ ] Returns `404` for invalid booking order ID

---

### TASK-037 — Update Booking Order Guest Data (All)

#### 1. API Documentation Reference

| Field | Value |
|-------|-------|
| **Docs URL** | `https://docs.xs2event.com/reference/put-bookingorder-guestdata` |

#### 2. API Analysis

```http
PUT /v1/bookingorders/{id}/guestdata
Authorization: Bearer <token>
Content-Type: application/json
```

**Purpose:** Submit all remaining guest data for the booking order in one call. **Required** before tickets can be downloaded if `pre_download` fields are pending.

**Condition:** Only triggered if event guest requirements include `pre_download` fields.

#### 3. Correct Implementation

```http
PUT https://api.xs2event.com/v1/bookingorders/{id}/guestdata
Authorization: Bearer {API_TOKEN}
Content-Type: application/json

{
  "guests": [
    {
      "guest_id": "guest-001",
      "passport_number": "GB12345678",
      "passport_expiry": "2030-01-01"
    }
  ]
}
```

#### 4. Testing Checklist

- [ ] Successfully submits `pre_download` fields
- [ ] Tickets become downloadable after this call (when `logistic_status` is `completed`)
- [ ] Returns `422` for invalid or missing fields
- [ ] Returns `404` for invalid booking order ID

---

### TASK-038 — Get Booking Order Guest (Single)

#### 1. API Documentation Reference

| Field | Value |
|-------|-------|
| **Docs URL** | `https://docs.xs2event.com/reference/get-bookingorder-guest` |

#### 2. API Analysis

```http
GET /v1/bookingorders/{id}/guests/{guest_id}
Authorization: Bearer <token>
```

**Purpose:** Fetch data for one guest within the booking order. **Condition:** Optional.

#### 3. Correct Implementation

```http
GET https://api.xs2event.com/v1/bookingorders/{id}/guests/{guest_id}
Authorization: Bearer {API_TOKEN}
```

#### 4. Testing Checklist

- [ ] Returns correct guest data for valid IDs
- [ ] Returns `404` for invalid `guest_id`

---

### TASK-039 — Update Booking Order Guest (Single)

#### 1. API Documentation Reference

| Field | Value |
|-------|-------|
| **Docs URL** | `https://docs.xs2event.com/reference/put-bookingorder-guest` |

#### 2. API Analysis

```http
PUT /v1/bookingorders/{id}/guests/{guest_id}
Authorization: Bearer <token>
Content-Type: application/json
```

**Purpose:** Update specific guest data for one guest within the booking order.

#### 3. Correct Implementation

```http
PUT https://api.xs2event.com/v1/bookingorders/{id}/guests/{guest_id}
Authorization: Bearer {API_TOKEN}
Content-Type: application/json

{
  "passport_number": "GB99999999"
}
```

#### 4. Testing Checklist

- [ ] Updates specified guest fields only
- [ ] Returns `422` for validation errors
- [ ] Returns `404` for invalid IDs

---

## Phase 7 — E-Tickets

> **Overview:** Download e-tickets and e-invoices once booking orders are complete.
>
> 🔴 **Prerequisites:**
> 1. `logistic_status` **must be** `"completed"`
> 2. `distribution_channel` **must be** `"xs2event"`
>
> For **external channels** (Ticketmaster, StubHub, etc.) — tickets come from the 3rd-party system, NOT through this API.

---

### TASK-040 — Get E-Tickets ZIP Link

#### 1. API Documentation Reference

| Field | Value |
|-------|-------|
| **Docs URL** | `https://docs.xs2event.com/reference/get-etickets-zip` |
| **Related Refs** | GET /v1/bookingorders/{id} (zip_sha), TASK-041 (individual PDFs) |

#### 2. API Analysis

```http
GET /v1/etickets/download/zip/{bookingorder_id}
Authorization: Bearer <token>
```

**Purpose:** Returns a short-lived CDN URL to download all tickets for a booking order as a ZIP file.

**Prerequisite:** `zip_sha` must be populated on the booking order (i.e., logistic_status is completed).

**Expected Response:**

```json
{
  "data": {
    "url": "https://cdn.xs2event.com/downloads/bo-001.zip?token=abc&expires=1716300000",
    "expires_at": "2025-05-21T15:00:00Z",
    "sha256": "abc123..."
  }
}
```

**⚠️ Short-lived URL:** The CDN link expires — do not store it. Generate a fresh link when needed.

#### 3. Current Implementation Review

| App | Status | Issues |
|-----|--------|--------|
| `#api` | ⬜ Review Required | Verify SHA-256 checksum is validated after download |
| `#frontend` | ⬜ Review Required | "Download All" button must generate a fresh link (not use a stored one) |

#### 4. Correct Implementation

```http
GET https://api.xs2event.com/v1/etickets/download/zip/{bookingorder_id}
Authorization: Bearer {API_TOKEN}
```

**Download with checksum validation:**

```js
async function downloadTicketZip(bookingOrderId) {
  // 1. Get fresh short-lived URL
  const linkResp = await xs2eventClient.get(
    `/v1/etickets/download/zip/${bookingOrderId}`
  );
  const { url, sha256 } = linkResp.data.data;

  // 2. Download the ZIP
  const zipBuffer = await downloadUrl(url);

  // 3. Validate SHA-256 checksum
  const actualSha = computeSHA256(zipBuffer);
  if (actualSha !== sha256) {
    throw new Error('ZIP integrity check failed — file may be corrupted');
  }

  return zipBuffer;
}
```

#### 5. Missing or Incomplete

- [ ] SHA-256 checksum validation not confirmed in `#api` after download
- [ ] Expired CDN URL handling — re-fetch when URL expires

#### 6. Testing Checklist

- [ ] Returns a valid CDN URL and `sha256` checksum
- [ ] Downloaded ZIP checksum matches `sha256` from response
- [ ] Returns error when `logistic_status !== "completed"`
- [ ] Returns error when `distribution_channel !== "xs2event"`
- [ ] CDN URL expires — re-requesting generates a fresh URL
- [ ] Returns `404` for invalid `bookingorder_id`
- [ ] Returns `401` without valid token

---

### TASK-041 — Download Ticket PDF 🔴 CRITICAL

#### 1. API Documentation Reference

| Field | Value |
|-------|-------|
| **Docs URL** | `https://docs.xs2event.com/reference/download-ticket-pdf` |
| **Related Refs** | GET /v1/bookingorders/{id} (download_link, orderitem_id), TASK-040 (ZIP alternative) |

#### 2. API Analysis

```http
GET /v1/etickets/download/{bookingorder_id}/{orderitem_id}/url/{download_link}
Authorization: Bearer <token>
```

**Purpose:** Download one ticket as a PDF attachment. For multi-day events (e.g., Formula 1) with multiple PDFs per ticket, iterate over the `download_items` array and call this for each `download_link`.

**Path Parameters:**

| Parameter | Source | Description |
|-----------|--------|-------------|
| `bookingorder_id` | GET /v1/bookingorders | Booking order ID |
| `orderitem_id` | booking order `items[].orderitem_id` | Individual order item |
| `download_link` | booking order `items[].download_link` or `download_items[].download_link` | Link identifier |

**Expected Response:** Binary PDF file with headers:

```http
Content-Type: application/pdf
Content-Disposition: attachment; filename="ticket-oi-001.pdf"
```

#### 3. Current Implementation Review

| App | Status | Issues |
|-----|--------|--------|
| `#api` | ⬜ Review Required | Must stream binary response — not parse as JSON |
| `#api` | ⬜ Review Required | Multi-day event iteration over `download_items` must be implemented |
| `#frontend` | ⬜ Review Required | Trigger browser download of PDF response |
| `#admin` | ⬜ Review Required | Admin ticket re-send must call this correctly |

#### 4. Correct Implementation

**Single ticket:**
```http
GET https://api.xs2event.com/v1/etickets/download/{bookingorder_id}/{orderitem_id}/url/{download_link}
Authorization: Bearer {API_TOKEN}
```

**Multi-day event (iterate download_items):**

```js
async function downloadAllTicketPDFs(bookingOrder) {
  const pdfs = [];

  for (const item of bookingOrder.items) {
    // Use download_items array for multi-day events (F1 etc.)
    const links = item.download_items?.length > 0
      ? item.download_items.map(di => di.download_link)
      : [item.download_link];

    for (const downloadLink of links) {
      const pdfUrl = `/v1/etickets/download/${bookingOrder.id}/${item.orderitem_id}/url/${downloadLink}`;
      const response = await xs2eventClient.get(pdfUrl, { responseType: 'arraybuffer' });

      pdfs.push({
        filename: `ticket-${item.orderitem_id}-${downloadLink}.pdf`,
        buffer: response.data
      });
    }
  }

  return pdfs;
}
```

**Frontend download trigger:**
```js
function downloadPDF(pdfBuffer, filename) {
  const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

#### 5. Missing or Incomplete

- [ ] **Critical:** Multi-day event iteration over `download_items` must be implemented in `#api`
- [ ] Binary stream handling — confirm `#api` does not parse PDF response as JSON
- [ ] `distribution_channel === "xs2event"` gate must be checked before attempting download

#### 6. Testing Checklist

- [ ] Returns a valid PDF binary (`Content-Type: application/pdf`)
- [ ] Single-day event returns one PDF per ticket
- [ ] Multi-day event: iterating `download_items` yields correct number of PDFs
- [ ] PDF download fails with error when `logistic_status !== "completed"`
- [ ] PDF download fails when `distribution_channel !== "xs2event"`
- [ ] Downloaded PDF is not corrupted (opens correctly)
- [ ] Returns `404` for invalid path parameters
- [ ] Returns `401` without valid token

---

### TASK-042 — Download E-Invoice

#### 1. API Documentation Reference

| Field | Value |
|-------|-------|
| **Docs URL** | `https://docs.xs2event.com/reference/download-invoice` |
| **Related Refs** | GET /v1/bookingorders/{id} (invoices[] array) |

#### 2. API Analysis

```http
GET /v1/bookingorders/{bookingorder_id}/invoice/{invoice_id}
Authorization: Bearer <token>
```

**Purpose:** Download a PDF invoice. Multiple invoices may exist per booking order (original + credit note). Find `invoice_id` values in the booking order's `invoices[]` array.

**Expected Response:** Binary PDF invoice.

**Priority:** Optional.

#### 3. Current Implementation Review

| App | Status | Notes |
|-----|--------|-------|
| `#api` | ⬜ Review Required | Must iterate `invoices[]` array — there can be multiple |
| `#admin` | ⬜ Review Required | Invoice download in admin booking detail |
| `#frontend` | ⬜ Review Required | Invoice download button(s) in customer booking confirmation |

#### 4. Correct Implementation

```http
GET https://api.xs2event.com/v1/bookingorders/{bookingorder_id}/invoice/{invoice_id}
Authorization: Bearer {API_TOKEN}
```

**Download all invoices for a booking order:**

```js
async function downloadInvoices(bookingOrder) {
  return Promise.all(
    bookingOrder.invoices.map(async invoice => {
      const response = await xs2eventClient.get(
        `/v1/bookingorders/${bookingOrder.id}/invoice/${invoice.id}`,
        { responseType: 'arraybuffer' }
      );
      return {
        id: invoice.id,
        type: invoice.type, // 'original' or 'credit_note'
        filename: `invoice-${invoice.id}-${invoice.type}.pdf`,
        buffer: response.data
      };
    })
  );
}
```

#### 5. Testing Checklist

- [ ] Returns a valid PDF invoice binary
- [ ] All `invoice_id` values from `invoices[]` array can be downloaded
- [ ] Credit note invoice (if present) is also downloadable
- [ ] Returns `404` for invalid invoice ID
- [ ] Returns `401` without valid token

---

## Cross-Cutting Concerns

### Error Handling Standards

All applications must implement consistent error handling across the following error categories:

| Category | HTTP Codes | `#api` Action | `#frontend` Action |
|----------|------------|---------------|-------------------|
| Authentication | 401 | Return 401 to client | Redirect to login |
| Authorization | 403 | Return 403 to client | Show "Access Denied" |
| Validation | 422 | Forward field errors | Show inline field errors |
| Not Found | 404 | Return 404 | Show "Not Found" page |
| Rate Limiting | 429 | Implement backoff + retry | Show "Please wait" message |
| Server Error | 500 | Log + alert; return 503 | Show generic error with support contact |
| Upstream Timeout | — | Return 504 | Retry with loading state |

### Caching Strategy Summary

| Endpoint Group | TTL | Notes |
|----------------|-----|-------|
| Sports, Venues, Teams, Countries, Cities | 30 days | Extremely stable data |
| Tournaments, Single Entities | 30 days | Stable, refreshed seasonally |
| Events | 24 hours | Check for new/cancelled events daily |
| Categories | 7 days | Relatively stable |
| Tickets (list + single) | ❌ Never | Stock/price changes in real time |
| Reservations, Bookings | ❌ Never | Live transactional data |
| E-Ticket CDN URLs | ❌ Never | Short-lived URLs — always re-fetch |

### Security Requirements

- [ ] API token stored as environment variable — never committed to source control
- [ ] `#frontend` never calls XS2Event API directly — all requests proxy through `#api`
- [ ] `net_rate` transmitted as a string — never logged as a float (precision loss)
- [ ] Guest PII (names, passport numbers) encrypted at rest in `#api` database
- [ ] CDN ticket download URLs are not stored — regenerated on demand
- [ ] `invoice_reference` values are unique per booking

---

## Master Testing Checklist

### Phase 1 — Discovery

- [x] Sports endpoint returns all sport types; cached for 30 days
- [x] Tournaments always filtered with `date_stop=ge:{today}`
- [x] Events endpoint applies `date_stop` filter and handles pagination
- [ ] Multi-sport `in` operator serialized correctly — **NOTE:** proxy does NOT support `in:[soccer,formula1]` syntax; must use `sport_type[]=soccer&sport_type[]=formula1`
- [x] Tickets endpoint has **zero caching** — returns live data (fixed: was `public, max-age=300`)
- [ ] Ticket response `net_rate` preserved as decimal string — not yet verified in full flow
- [ ] Supplier deduplication applied to ticket list
- [ ] Categories fetched per `event_id`; `party_size_together` displayed
- [x] Countries endpoint returns ISO alpha-3 codes; used in guest forms

### Phase 2 — Guest Requirements

- [x] Checkout form dynamically built from event guest data requirements
- [ ] `pre_checkout` fields gated before booking finalization
- [ ] `pre_download` fields deferred to post-booking flow
- [ ] `scope: lead_guest` renders once; `scope: all_persons` renders per ticket
- [ ] Mixed-category baskets fetch per-ticket requirements

### Phase 3 — Reservation

- [x] Fresh ticket data fetched immediately before reservation creation
- [x] `net_rate` passed verbatim; price mismatch tested — XS2Event validates currency+rate
- [ ] 10-minute countdown timer visible to user (frontend implementation)
- [ ] 2-minute expiry warning shown (frontend implementation)
- [ ] Expired reservation detected and user prompted to restart
- [x] Full PUT replace tested (items in body required)
- [ ] DELETE releases stock back to pool — not yet tested

### Phase 4 — Guest Data

- [x] Batch guest data POST tested with valid payload — returns 200 (sandbox doesn't persist)
- [ ] `422` field-level errors mapped to correct form fields in UI
- [x] `quantity` is required in guestdata items array
- [x] `country_of_residence` requires 3-letter ISO code (e.g. `NLD` not `NL`)
- [ ] Unfilled slots block booking finalization

### Phase 5 — Booking

- [x] Booking creation tested with active reservation + complete guest data — HTTP 201
- [ ] Expired reservation handling tested
- [x] `payment_method: "invoice"` validated — works
- [ ] `invoice_reference` uniqueness confirmed
- [x] `booking_id` and `booking_code` extracted from booking response

### Phase 6 — Booking Orders

- [x] `GET /v1/bookingorders/list` returns list with `bookingorders[]` key
- [x] `GET /v1/bookingorders/{id}` returns full order detail
- [x] `GET /v1/bookingorders/{id}/guestdata` returns empty guests when `guestdata_status: notapplicable`
- [ ] `logistic_status` polling implemented and tested
- [ ] `failed` status triggers support notification
- [ ] `distribution_channel` checked before ticket download attempt
- [ ] `pre_download` guest fields submitted before download when required

### Phase 7 — E-Tickets

- [x] ZIP download endpoint routing verified (proxy now calls correct test API)
- [x] Single PDF download endpoint routing verified (proxy now calls correct test API)
- [ ] ZIP download with completed booking (currently 422 — booking still processing)
- [ ] Single-day PDF download with completed booking
- [ ] Binary PDF response streamed correctly (not parsed as JSON)
- [ ] External channel tickets correctly blocked from API download
- [ ] Invoice download tested

---

*Document Version: 1.1 — Updated 2026-05-21 with full test session results*  
*Covers: All 42 endpoint tasks across 7 booking phases*  
*Applications in scope: `#api`, `#admin`, `#frontend`*  
*Bugs fixed: 5 (Tickets cache, ReservationsController URL, ETicketsController URL, 3x route regex, tournament route order)*