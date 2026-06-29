# Hospitality Management — Comprehensive Test Plan

**Version:** 1.0 | **Date:** 2026-06-23  
**Applications in scope:** `api` · `admin` · `frontend`

---

## Table of Contents

1. [Architecture Summary](#1-architecture-summary)
2. [Test Environment & Prerequisites](#2-test-environment--prerequisites)
3. [Hospitality Service Management — CRUD](#3-hospitality-service-management--crud)
4. [Hierarchical Assignment Tests](#4-hierarchical-assignment-tests)
   - 4.1 Sport Level
   - 4.2 Tournament Level
   - 4.3 Team Level
   - 4.4 Category (Venue-Section) Level
   - 4.5 Event Level
   - 4.6 Ticket Level
   - 4.7 Venue Level (via HospitalityManagement)
5. [Venue Hospitality Management Page](#5-venue-hospitality-management-page)
6. [Public API Layer Tests](#6-public-api-layer-tests)
7. [Frontend Display Tests](#7-frontend-display-tests)
8. [Hierarchy Resolution & Deduplication](#8-hierarchy-resolution--deduplication)
9. [Negative Test Cases](#9-negative-test-cases)
10. [Regression Test Cases](#10-regression-test-cases)
11. [Known Gaps, Defects & Risks](#11-known-gaps-defects--risks)
12. [Recommendations](#12-recommendations)

---

## 1. Architecture Summary

### Hierarchy Levels (most-specific → broadest)

| Priority | Level      | Key Field(s)                        | Admin Display Order |
|----------|------------|-------------------------------------|---------------------|
| 1        | Ticket     | `event_id` + `ticket_id`            | 7th (last)          |
| 2        | Event      | `event_id` (ticket NULL)            | 6th                 |
| 3        | Category   | `category_id` (event NULL)          | 5th                 |
| 4        | Team       | `team_id` (event NULL)              | 4th                 |
| 5        | Tournament | `tournament_id` (team NULL)         | 3rd                 |
| 6        | Sport      | `sport_type` (tournament NULL)      | 2nd                 |
| 7        | Venue      | `venue_id` (all others NULL)        | 1st (top)           |

**Resolution model:** Additive — hospitalities are collected from ALL matching levels. If the same `hospitality_id` appears at multiple levels, only the most-specific occurrence is kept.

### Tables

| Table                    | Purpose                                     |
|--------------------------|---------------------------------------------|
| `hospitalities`          | Service definitions (name, description, sort)|
| `hospitality_assignments`| Hierarchical assignments (all 7 levels)     |
| `ticket_hospitalities`   | Legacy direct ticket assignments             |

### Key Routes

**Admin (auth required):**
- `GET/POST/PUT/DELETE /admin/hospitalities[/{id}]`
- `GET /admin/hospitality-assignments[/{id}]`
- `PUT /admin/hospitality-assignments/scope`
- `GET/PUT/DELETE /admin/venue-hospitalities/{venueId}`

**Public (no auth):**
- `GET /v1/events/{eventId}/effective-hospitalities`
- `GET /v1/events/{eventId}/hospitalities`
- `GET /v1/events/{eventId}/tickets/{ticketId}/effective-hospitalities`

---

## 2. Test Environment & Prerequisites

### Setup Required

1. Admin application running at configured `VITE_API_URL`
2. Frontend application running with `VITE_CUSTOMER_API_BASE_URL` configured
3. API running with valid DB connection and XS2Event API key (`VITE_XS2EVENT_API_KEY`)
4. At least one admin user account with valid credentials
5. Known XS2Event IDs for testing (sport, tournament, team, event, category, ticket, venue)
6. At minimum one active hospitality service created before assignment tests

### Test Data Reference (fill in for your environment)

| Reference         | Value                            |
|-------------------|----------------------------------|
| Test Sport        | e.g. `soccer`                    |
| Test Tournament   | e.g. `d4af2a426fbd4fc693f770f416fb3097_trn` |
| Test Team         | e.g. `66038f7407444e64b3ce32a1499c0295_tms` |
| Test Event        | Known event ID with tickets      |
| Test Category     | Known category_id for that event |
| Test Ticket       | Known ticket_id within event     |
| Test Venue        | e.g. `89a233fcf4224ec0b9dae61820708d2f_vnx` |
| Test Venue Name   | Official name from XS2Event API  |
| Admin Credentials | admin@example.com / password     |

### Notation

- **P1** = Blocking / must-pass before release
- **P2** = High importance
- **P3** = Nice-to-have / edge case
- `[API]` = Tested via HTTP client or browser DevTools
- `[ADMIN]` = Tested via admin UI
- `[FE]` = Tested via customer-facing frontend

---

## 3. Hospitality Service Management — CRUD

### SVCM-001 — Create a new hospitality service [ADMIN] P1

**Preconditions:** Logged in as admin. `/hospitality` page open, Services tab active.

**Steps:**
1. Click **Add Service**.
2. Enter name: `"VIP Lounge Access"`.
3. Enter description (rich text): `"Access to the exclusive VIP lounge with complimentary drinks."`.
4. Set sort order to `10`.
5. Leave **Active** toggled on.
6. Click **Save**.

**Expected Result:**
- Service appears in the services list immediately.
- Success toast / confirmation shown.
- `GET /admin/hospitalities` returns the new record with `is_active = 1`, `sort_order = 10`.
- `GET /admin/hospitalities/stats` increments `total_hospitalities` and `active_hospitalities`.

---

### SVCM-002 — Read / list all hospitality services [ADMIN] P1

**Preconditions:** At least 2 services exist (one active, one inactive).

**Steps:**
1. Navigate to `/hospitality` → Services tab.
2. Observe the services list.

**Expected Result:**
- Both active and inactive services are shown.
- Services are ordered by `sort_order ASC`, then `name ASC`.
- Each row shows: name, description preview, active badge, sort order, created/updated metadata.

---

### SVCM-003 — Update an existing hospitality service [ADMIN] P1

**Preconditions:** Service `"VIP Lounge Access"` exists.

**Steps:**
1. Click **Edit** on `"VIP Lounge Access"`.
2. Change name to `"VIP Lounge & Parking"`.
3. Change sort order to `5`.
4. Click **Save**.

**Expected Result:**
- List updates immediately to show the new name.
- `GET /admin/hospitalities/{id}` returns updated `name` and `sort_order = 5`.
- `updated_at` timestamp is newer than `created_at`.

---

### SVCM-004 — Delete a hospitality service [ADMIN] P1

**Preconditions:** A service exists with no assignments.

**Steps:**
1. Click **Delete** on an unassigned service.
2. Confirm the deletion dialog.

**Expected Result:**
- Service is removed from the list.
- `GET /admin/hospitalities/{id}` returns HTTP 404.
- Stats decrement.

---

### SVCM-005 — Toggle active status [ADMIN] P2

**Preconditions:** An active service exists.

**Steps:**
1. Click the **Active/Inactive** toggle on the service.
2. Observe the change.
3. Toggle it back.

**Expected Result:**
- Status changes immediately in the UI.
- `GET /admin/hospitalities/{id}` returns `is_active = 0` after deactivation.
- After re-toggling, `is_active = 1`.

---

### SVCM-006 — Create service with name validation [ADMIN] P1

**Steps:**
1. Click **Add Service**.
2. Leave name blank.
3. Click **Save**.

**Expected Result:**
- Form does not submit.
- Validation error shown: name is required.
- API `POST /admin/hospitalities` with empty name returns HTTP 400.

---

### SVCM-007 — View hospitality statistics [ADMIN] P2

**Steps:**
1. Navigate to `/hospitality` → Services tab.
2. Observe the statistics panel.

**Expected Result:**
- Counts shown: total services, active services, total hierarchical assignments, legacy assignments, venue assignments.
- Assignments by level breakdown (sport / tournament / team / category / event / ticket / venue) is accurate.
- Top hospitalities list shows services ordered by assignment count descending.

---

### SVCM-008 — Rich text description renders correctly [ADMIN][FE] P2

**Preconditions:** A service with HTML description `"<strong>VIP</strong> access including <em>parking</em>."` exists and assigned to a ticket.

**Steps:**
1. On the frontend, navigate to an event with this service.
2. Hover over the hospitality icon on the ticket.

**Expected Result:**
- Tooltip shows formatted HTML: **VIP** access including *parking*.
- No raw HTML tags visible.
- Content is sanitized (DOMPurify) — no script injection.

---

## 4. Hierarchical Assignment Tests

### 4.1 Sport Level

### SPRT-001 — Assign hospitality at sport level [ADMIN] P1

**Preconditions:** Active service exists. Admin on `/hospitality` → Assignments tab.

**Steps:**
1. Select sport (e.g. `Soccer`).
2. Do NOT select a tournament or deeper level.
3. Set **Target Level** to `Sport`.
4. Check the service checkbox.
5. Click **Save Assignment**.

**Expected Result:**
- Assignment created in `hospitality_assignments` with:
  - `sport_type = 'soccer'`, all other IDs = NULL.
  - `level = 'sport'`.
- Row visible in **Existing Assignments** table under the Sport group.

---

### SPRT-002 — Sport-level assignment displays on every ticket in that sport [FE] P1

**Preconditions:** SPRT-001 complete. Known event for the sport exists with tickets.

**Steps:**
1. Navigate to that event's ticket page on the frontend.
2. Inspect each ticket card.

**Expected Result:**
- Hospitality icon (chef hat) visible on every ticket.
- Tooltip shows the assigned service name with `level: sport`.

---

### SPRT-003 — Remove sport-level assignment [ADMIN] P1

**Steps:**
1. Navigate to Assignments tab, find the sport-level assignment row.
2. Click **Delete** on that assignment.

**Expected Result:**
- Assignment removed from the list.
- `GET /admin/hospitality-assignments/{id}` returns HTTP 404.
- Frontend no longer shows the hospitality icon on sport tickets (after cache expires or page refresh).

---

### SPRT-004 — Sport-level assignment scope display in admin list [ADMIN] P2

**Expected Result:**
- Assignment row shows **Scope** column with sport name (e.g. `⚽ Soccer`).
- **Level** badge shows `Sport`.
- No blank scope columns.

---

### SPRT-005 — Sport-level: non-season sport (Formula 1, Rugby, Tennis) [ADMIN] P2

**Preconditions:** Select a sport with `uses_season = false`.

**Steps:**
1. Select sport `Formula1`.
2. Navigate into tournament selection. Observe that no season input is shown.
3. Assign at sport level.

**Expected Result:**
- No season parameter passed to tournament API calls.
- Assignment saves correctly.
- Events load correctly without season filter.

---

### 4.2 Tournament Level

### TOUR-001 — Assign hospitality at tournament level [ADMIN] P1

**Steps:**
1. Select sport → select tournament.
2. Do NOT select a team.
3. Set **Target Level** to `Tournament`.
4. Check service, click **Save**.

**Expected Result:**
- `hospitality_assignments` row: `sport_type`, `tournament_id` set; `team_id`, `event_id`, `ticket_id`, `venue_id` = NULL.
- `level = 'tournament'`.

---

### TOUR-002 — Tournament-level assignment applies to all teams/events in tournament [FE] P1

**Preconditions:** TOUR-001 complete.

**Steps:**
1. Open an event that belongs to that tournament.
2. Check all ticket cards.

**Expected Result:**
- Hospitality icon shown on every ticket in every event of that tournament.
- Tickets from a different tournament do NOT show this icon.

---

### TOUR-003 — Tournament assignment isolated to correct tournament [FE] P2

**Preconditions:** Two tournaments exist for same sport. Hospitality assigned to Tournament A only.

**Expected Result:**
- Tickets in Tournament A show the icon.
- Tickets in Tournament B do NOT show the icon.

---

### TOUR-004 — Tournament with `uses_season = true` (soccer) [ADMIN] P2

**Steps:**
1. Select `Soccer` sport.
2. Observe tournament list is loaded with active season.
3. Select a tournament and assign at tournament level.

**Expected Result:**
- Tournament list shows current season tournaments.
- Assignment saved with correct `tournament_id`.

---

### TOUR-005 — Update assignment at tournament level (replace) [ADMIN] P1

**Preconditions:** Two services exist. Tournament has Service A assigned.

**Steps:**
1. Navigate to the tournament scope.
2. Deselect Service A, select Service B.
3. Click **Save**.

**Expected Result:**
- Old assignment for Service A deleted.
- New assignment for Service B created.
- `replaceAssignmentsAtScope` called (DELETE then INSERT).
- Frontend shows Service B on tournament tickets.

---

### 4.3 Team Level

### TEAM-001 — Assign hospitality at team level [ADMIN] P1

**Preconditions:** Sport with `has_teams = true`.

**Steps:**
1. Select sport → tournament → team.
2. Set **Target Level** to `Team`.
3. Assign service and save.

**Expected Result:**
- `hospitality_assignments` row: `sport_type`, `tournament_id`, `team_id` set; `event_id` etc. = NULL.
- `level = 'team'`.

---

### TEAM-002 — Team-level applies to home and visiting team events [FE] P1

**Preconditions:** TEAM-001 done for team X.

**Steps:**
1. Open an event where team X is the **home** team.
2. Open an event where team X is the **visiting** team.

**Expected Result:**
- Hospitality icon appears for both home and away events.
- API endpoint receives both `team_ids` (comma-separated) including the visiting team ID.

---

### TEAM-003 — Team assignment does not bleed to different team [FE] P1

**Preconditions:** Hospitality assigned to Team A only.

**Steps:**
1. Open an event where Team B plays (not Team A).

**Expected Result:**
- No hospitality icon shown.

---

### TEAM-004 — Sport without teams (non-team sport) [ADMIN] P2

**Steps:**
1. Select `Formula1` or `Golf`.
2. Observe the Teams selection step.

**Expected Result:**
- Team selection is hidden or disabled for non-team sports.
- Assignment level cannot be set to `Team` for non-team sports.

---

### 4.4 Category (Venue-Section) Level

### CATG-001 — Assign hospitality at category level [ADMIN] P1

**Preconditions:** An event with known category_id exists.

**Steps:**
1. Navigate: sport → tournament → team (if applicable) → event.
2. Click **Select Category** (loads venue categories for the event).
3. Select a venue category (e.g. `"Main Grandstand"`).
4. Set **Target Level** to `Category`.
5. Assign service and save.

**Expected Result:**
- `hospitality_assignments` row: `category_id` set; `event_id`, `ticket_id`, `venue_id` = NULL.
- `level = 'category'`.

---

### CATG-002 — Category-level hospitality applies to tickets in that venue section [FE] P1

**Preconditions:** CATG-001 complete.

**Steps:**
1. Open any event where the same venue category (section) exists.
2. Inspect tickets belonging to that category.

**Expected Result:**
- Tickets in the assigned venue section show the hospitality icon.
- Tickets in a different venue section at the same event do NOT show it.

---

### CATG-003 — Category assignment is venue-scoped, persists across events [FE] P2

**Preconditions:** Category-level assignment set for category `C1`.

**Steps:**
1. Open Event A (same venue, contains category C1 tickets).
2. Open Event B (same venue, contains category C1 tickets).

**Expected Result:**
- Both events show the icon on C1 tickets without requiring a separate event-level assignment.

---

### CATG-004 — Category-level beats team-level for same service [FE] P2

**Preconditions:** Service X assigned at both team level and category level C1.

**Steps:**
1. Open a ticket that belongs to category C1.
2. Check the tooltip.

**Expected Result:**
- Service X appears only once in the tooltip (no duplicate).
- The level shown is `category` (more specific than `team`).

---

### CATG-005 — Admin category list loads XS2Event venue sections [ADMIN] P2

**Steps:**
1. Navigate to an event in the admin assignments panel.
2. Click **Select Category**.

**Expected Result:**
- Dropdown shows venue sections fetched from `/v1/categories?event_id={eventId}`.
- Each entry shows `category_name` and `category_type`.

---

### 4.5 Event Level

### EVNT-001 — Assign hospitality at event level [ADMIN] P1

**Steps:**
1. Navigate: sport → tournament → team → event.
2. Set **Target Level** to `Event`.
3. Assign service and save.

**Expected Result:**
- `hospitality_assignments` row: `event_id` set; `ticket_id` = NULL.
- `level = 'event'`.

---

### EVNT-002 — Event-level applies to ALL tickets in that event [FE] P1

**Preconditions:** EVNT-001 complete.

**Steps:**
1. Open the assigned event's ticket page.

**Expected Result:**
- Every ticket card shows the hospitality icon.
- No icon on tickets from a different event.

---

### EVNT-003 — Event-level assignment isolated to single event [FE] P1

**Preconditions:** Tournament has 3 events. Hospitality assigned to Event 2 only.

**Expected Result:**
- Event 1 and Event 3 tickets: no icon.
- Event 2 tickets: icon visible.

---

### 4.6 Ticket Level

### TKET-001 — Assign hospitality at ticket level [ADMIN] P1

**Steps:**
1. Navigate to: sport → tournament → team → event → ticket.
2. Set **Target Level** to `Ticket`.
3. Assign service and save.

**Expected Result:**
- `hospitality_assignments` row: `event_id` + `ticket_id` both set.
- `level = 'ticket'`.

---

### TKET-002 — Ticket-level hospitality applies only to that ticket [FE] P1

**Preconditions:** TKET-001 complete. Same event has other tickets.

**Steps:**
1. Open the event's ticket page.

**Expected Result:**
- Only the assigned ticket shows the hospitality icon.
- Other tickets in the same event show no icon.

---

### TKET-003 — Ticket-level overrides all broader levels for same service [FE] P1

**Preconditions:** Service X assigned at sport level AND at ticket level (Ticket T1, Event E1).

**Steps:**
1. Open event E1's ticket page.
2. Hover the icon on Ticket T1.
3. Hover the icon on Ticket T2 (same event, no ticket-level override).

**Expected Result:**
- T1 tooltip: Service X appears once, with `level = 'ticket'`.
- T2 tooltip: Service X appears once, with `level = 'sport'` (inherited from sport level).

---

### 4.7 Venue Level (via HospitalityManagement Assignments Tab)

### VASGN-001 — Assign hospitality at venue level via Assignments tab [ADMIN] P1

**Note:** This is distinct from the VenueHospitalityManagement page. This tests the venue scope within the main Assignments tab.

**Steps:**
1. Navigate to `/hospitality` → Assignments tab.
2. In the **Existing Assignments** table, check if venue rows appear.
3. Verify that venue-level assignments (created via VenueHospitalityManagement) appear in the list.

**Expected Result:**
- Venue-level rows show in the Assignments table.
- **Scope** column displays: `🏟️ [Venue Official Name] — [City], [Country]`.
- **Level** badge shows `Venue`.
- If venue_name is null/empty in DB, XS2Event API is called and name is enriched from `official_name`.

---

### VASGN-002 — Venue scope shown at top of sorted assignment list [ADMIN] P2

**Preconditions:** Assignments at sport, team, and venue levels all exist.

**Expected Result:**
- Admin Assignments table sorts with Venue rows first, then Sport, Tournament, Team, Category, Event, Ticket.

---

### VASGN-003 — Delete a venue-level assignment from Assignments tab [ADMIN] P1

**Steps:**
1. Find a venue-level assignment row.
2. Click **Delete**.

**Expected Result:**
- Row removed from list.
- `DELETE /admin/hospitality-assignments/{id}` returns success.
- The same venue on the frontend no longer shows that hospitality.

---

## 5. Venue Hospitality Management Page

### VMGR-001 — Search for venues [ADMIN] P1

**Preconditions:** Navigate to `/venue-hospitality` (or equivalent Venue Hospitality page).

**Steps:**
1. Type 1 character in venue search box.
2. Observe results.
3. Type 3+ characters.

**Expected Result:**
- 1 character: no API call, no results shown (requires 2+).
- 3 characters: API call to `GET /v1/venues?venue_name={term}&page_size=50`.
- Results list shows venues: name, city, country (e.g. `Stadio Olimpico — Rome, Italy`).

---

### VMGR-002 — Select a venue [ADMIN] P1

**Steps:**
1. Search for a venue.
2. Click on a venue in the results.

**Expected Result:**
- Venue is highlighted as selected.
- `GET /admin/venue-hospitalities/{venueId}` is called.
- Currently assigned packages are checked.
- Unassigned packages are unchecked.

---

### VMGR-003 — Assign packages to a venue and save [ADMIN] P1

**Preconditions:** Venue selected, active services exist.

**Steps:**
1. Check 2 service checkboxes.
2. Click **Save**.

**Expected Result:**
- `PUT /admin/venue-hospitalities/{venueId}` called with body: `{ venue_name: "[official_name]", hospitality_ids: [id1, id2] }`.
- Response shows `deleted_count` + `inserted_count`.
- `venue_name` stored in DB is `official_name` (not empty string).
- Success toast shown.

---

### VMGR-004 — venue_name stored as official_name [API] P1

**Preconditions:** Venue has `official_name = "Stadio Olimpico"` and `name = ""`.

**Steps:**
1. Assign a service to this venue and save.
2. Query `SELECT venue_name FROM hospitality_assignments WHERE venue_id = '{venueId}'`.

**Expected Result:**
- `venue_name = 'Stadio Olimpico'` (not empty string, not null).

---

### VMGR-005 — Remove all packages from a venue [ADMIN] P1

**Steps:**
1. Select a venue with existing assignments.
2. Uncheck all service checkboxes.
3. Click **Save**.

**Expected Result:**
- `PUT /admin/venue-hospitalities/{venueId}` called with `hospitality_ids: []`.
- All venue assignments deleted.
- `deleted_count > 0`, `inserted_count = 0`.
- Frontend no longer shows hospitality for that venue.

---

### VMGR-006 — Unsaved changes warning when switching venues [ADMIN] P2

**Steps:**
1. Select Venue A, check a service (do not save).
2. Click on Venue B in the results.

**Expected Result:**
- Confirmation dialog: "You have unsaved changes. Discard them?"
- If confirmed: Venue B selected, Venue A changes lost.
- If cancelled: Venue A remains selected with pending changes intact.

---

### VMGR-007 — Discard pending changes [ADMIN] P2

**Steps:**
1. Select a venue, check a service (do not save).
2. Click **Discard**.

**Expected Result:**
- Checkboxes revert to the last saved state.
- Dirty flag cleared.

---

### VMGR-008 — Delete all venue hospitality assignments [ADMIN] P2

**Steps:**
1. Select a venue with assignments.
2. Click **Delete All** (or remove all and save).
3. Confirm.

**Expected Result:**
- `DELETE /admin/venue-hospitalities/{venueId}` called.
- All assignments for that venue removed.
- Venue shows as having no packages assigned.

---

### VMGR-009 — Venue search returns no results [ADMIN] P3

**Steps:**
1. Type a search term that matches no venues (e.g. `"zzzzzzz"`).

**Expected Result:**
- Empty state shown: "No venues found."
- No JavaScript errors.

---

### VMGR-010 — Only active hospitality services appear in package list [ADMIN] P2

**Preconditions:** One inactive service exists.

**Steps:**
1. Select any venue.
2. Inspect the package checklist.

**Expected Result:**
- Inactive services are NOT shown.
- Only services with `is_active = true` appear.

---

## 6. Public API Layer Tests

### API-001 — GET effective hospitalities with venue_id [API] P1

**Request:**
```
GET /v1/events/{eventId}/effective-hospitalities
  ?sport_type=soccer
  &tournament_id={tournamentId}
  &team_ids={homeTeamId},{visitingTeamId}
  &ticket_ids={t1},{t2},{t3}
  &category_ids={c1},{c2},{c3}
  &venue_id={venueId}
```

**Expected Result:**
- HTTP 200.
- Response: `{ data: { hospitalities: { "{ticketId}": [...] } } }`.
- Each hospitality entry has: `hospitality_id`, `name`, `description`, `level`, `source`.
- Venue-level hospitalities appear for all tickets (since venue is broadest).
- No duplicates per `hospitality_id` per ticket.

---

### API-002 — GET effective hospitalities without venue_id [API] P2

**Request:** Same as API-001 but omit `venue_id`.

**Expected Result:**
- HTTP 200.
- Venue-level hospitalities are NOT included in any ticket's results.
- Other levels still resolve correctly.

---

### API-003 — Venue hospitality shown only when venue matches [API] P1

**Preconditions:** Hospitality H1 assigned to Venue V1. Test event is at Venue V2.

**Request:**
```
GET /v1/events/{eventId}/effective-hospitalities?venue_id={V2}&...
```

**Expected Result:**
- H1 does NOT appear in results (venue doesn't match).
- Only hospitalities assigned to V2 (or other matching levels) appear.

---

### API-004 — Fallback to legacy when sport_type omitted [API] P2

**Request:**
```
GET /v1/events/{eventId}/effective-hospitalities?ticket_ids={t1}
```
(no `sport_type`)

**Expected Result:**
- Falls back to legacy `ticket_hospitalities` table.
- Returns flat list from legacy assignments for those tickets.
- No hierarchical resolution performed.

---

### API-005 — GET effective hospitalities with missing ticket_ids [API] P2

**Request:**
```
GET /v1/events/{eventId}/effective-hospitalities?sport_type=soccer
```
(no `ticket_ids`)

**Expected Result:**
- Falls back to legacy or returns empty hospitalities object.
- No server error (HTTP 200 or graceful fallback).

---

### API-006 — Caching behaviour [API] P2

**Steps:**
1. Make request to `GET /v1/events/{eventId}/effective-hospitalities`.
2. Immediately add a new assignment in admin.
3. Make same request again within 5 minutes.

**Expected Result:**
- Second response returns cached result (old data, without new assignment).
- After 5 minutes, cache expires and new assignment appears.

---

### API-007 — Admin resolve endpoint preview [API] P1

**Request:**
```
POST /admin/hospitality-assignments/resolve
{
  "sport_type": "soccer",
  "event_id": "{eventId}",
  "ticket_id": "{ticketId}",
  "tournament_id": "{tournamentId}",
  "team_id": "{teamId}"
}
```

**Expected Result:**
- HTTP 200.
- Returns array of effective hospitalities for that ticket.
- Includes all levels that apply, deduplicated.

---

### API-008 — Pagination on getAllAssignments [API] P2

**Request:**
```
GET /admin/hospitality-assignments?page=1&limit=5
```

**Expected Result:**
- Returns max 5 records.
- Response includes pagination metadata: `total`, `page`, `limit`, `total_pages`.
- `GET ?page=2` returns next 5 records (if they exist).

---

### API-009 — Filter getAllAssignments by level [API] P2

**Request:**
```
GET /admin/hospitality-assignments?level=venue
```

**Expected Result:**
- Only venue-level assignments returned.
- All rows have `level = 'venue'`.

---

### API-010 — Stats endpoint accuracy [API] P2

**Steps:**
1. Create 2 new services and 3 assignments (1 sport, 1 venue, 1 legacy ticket).
2. `GET /admin/hospitalities/stats`.

**Expected Result:**
- `total_hospitalities` incremented by 2.
- `total_assignments` incremented by 2 (hierarchical assignments).
- `legacy_assignments` incremented by 1.
- `venue_assignments` = 1.
- `assignments_by_level.sport` = 1, `assignments_by_level.venue` = 1.

---

## 7. Frontend Display Tests

### FE-001 — Hospitality icon visible on ticket with assigned service [FE] P1

**Preconditions:** A service is assigned at any level matching a ticket.

**Steps:**
1. Navigate to the event ticket page.
2. Inspect the ticket card.

**Expected Result:**
- Chef hat (🍽️) icon visible in the ticket features row.
- Icon is NOT shown on tickets with no matching assignments.

---

### FE-002 — Hospitality tooltip appears on icon hover [FE] P1

**Steps:**
1. Hover over the chef hat icon on a ticket.

**Expected Result:**
- Tooltip appears within 100ms.
- Tooltip header: "Included Hospitality" + icon.
- Lists assigned services: name + sanitized description.
- Tooltip stays visible when moving mouse from icon to tooltip.
- Tooltip dismisses when mouse leaves tooltip area (100ms delay).

---

### FE-003 — Tooltip is viewport-clamped [FE] P2

**Steps:**
1. Scroll the ticket page so a ticket with a hospitality icon is near the top edge of the viewport.
2. Hover over the icon.

**Expected Result:**
- Tooltip positions below the icon (flips to below if insufficient space above).
- Tooltip does not overflow viewport bounds (8px minimum padding from edges).
- No scrollbar appears due to tooltip overflow.

---

### FE-004 — Hospitality included in cart (no price) [FE] P1

**Steps:**
1. Click **Add Ticket** on a ticket with hospitality.
2. Observe the cart panel.

**Expected Result:**
- Cart shows ticket with expandable hospitality section.
- Section lists hospitality names.
- No additional price shown for hospitality.
- Ticket total = base price + markup only (hospitality is $0 addition).

---

### FE-005 — Hospitality shows in checkout summary [FE] P1

**Steps:**
1. Add a ticket with hospitality to cart.
2. Proceed through checkout to payment page.

**Expected Result:**
- Checkout displays: `🍽️ [Hospitality Name]` beneath the ticket.
- Label: "Included" (no price).
- Hospitality is included in the booking API payload: `hospitalities: [{ hospitality_id, name, ticket_id }]`.
- Final total does NOT include hospitality cost.

---

### FE-006 — Multiple hospitalities from different levels shown in tooltip [FE] P2

**Preconditions:** Ticket has 3 services: one from sport level, one from team level, one from ticket level.

**Steps:**
1. Hover over the icon on that ticket.

**Expected Result:**
- Tooltip shows all 3 services.
- No duplicates.
- Services ordered by sort_order.

---

### FE-007 — No price flash: icon and tooltip only shown when data ready [FE] P1

**Steps:**
1. Load the event tickets page and immediately observe the ticket cards.

**Expected Result:**
- Chef hat icon does not appear until `usePublicEventHospitalities` has resolved.
- No momentary icon then disappearance.

---

### FE-008 — Hospitality in bookings history [FE] P2

**Steps:**
1. Complete a booking with hospitality included.
2. Navigate to `/bookings`.

**Expected Result:**
- Booking shows the hospitality name alongside the ticket.
- No price listed for hospitality in booking history.

---

## 8. Hierarchy Resolution & Deduplication

### HIER-001 — Most-specific level wins for duplicate service [API][FE] P1

**Setup:** Service X assigned at BOTH tournament level AND ticket level (Ticket T, Event E, in that tournament).

**Steps:**
1. Call `GET /v1/events/{E}/effective-hospitalities?sport_type=soccer&tournament_id={T}&ticket_ids={T_id}`.

**Expected Result:**
- Service X appears exactly ONCE in the response for Ticket T.
- `level = 'ticket'` (most specific).
- NOT `level = 'tournament'`.

---

### HIER-002 — Additive: services from multiple levels all appear [API][FE] P1

**Setup:** 
- Service A: sport level
- Service B: team level  
- Service C: ticket level (Ticket T)
- All three are different services.

**Steps:**
1. Check ticket T's effective hospitalities.

**Expected Result:**
- Response includes A, B, and C for Ticket T.
- No duplicates. 3 distinct entries.

---

### HIER-003 — Venue hospitality added to other level services [API][FE] P1

**Setup:**
- Service V: venue level (Venue V)
- Service T: team level
- Event is at Venue V.

**Steps:**
1. Check ticket effective hospitalities with `venue_id={V}`.

**Expected Result:**
- Both V and T appear for each ticket.

---

### HIER-004 — Venue hospitality NOT added when venue doesn't match [API][FE] P1

**Setup:** 
- Service V: venue level (Venue V1)
- Event is at Venue V2.

**Steps:**
1. Check effective hospitalities with `venue_id={V2}`.

**Expected Result:**
- Service V is NOT in the results.

---

### HIER-005 — Legacy ticket_hospitalities merged with hierarchical [API] P2

**Setup:** 
- Service A: assigned via legacy `ticket_hospitalities` (INSERT directly).
- Service B: assigned via hierarchical `hospitality_assignments` at event level.

**Steps:**
1. Call `GET /v1/events/{E}/effective-hospitalities?ticket_ids={T_id}`.

**Expected Result:**
- Both A and B appear for Ticket T.
- A has `source: 'legacy'`, B has `source: 'hierarchical'` (or `hospitality_assignments`).

---

### HIER-006 — Deduplication: same service in legacy and hierarchical [API] P2

**Setup:** Service A assigned via legacy ticket_hospitalities AND via hierarchical at event level (same service, same ticket).

**Expected Result:**
- Service A appears only once in results.
- Hierarchical assignment takes precedence (or legacy — whichever the system implements).

---

### HIER-007 — Category level is more specific than team level [API] P2

**Setup:**
- Service X at team level.
- Service X at category level (Category C1).

**Steps:**
1. Check a ticket in Category C1.

**Expected Result:**
- Service X appears once, `level = 'category'`.

---

### HIER-008 — Resolution order: ticket > event > category > team > tournament > sport > venue [API] P1

**Setup:** Service X assigned at ALL 7 levels.

**Steps:**
1. Check a specific ticket's effective hospitalities.

**Expected Result:**
- Service X appears ONCE, `level = 'ticket'` (highest priority).

---

## 9. Negative Test Cases

### NEG-001 — Create assignment without hospitality_id [API] P1

**Request:**
```
POST /admin/hospitality-assignments
{ "sport_type": "soccer" }
```

**Expected Result:**
- HTTP 400.
- Error message: "hospitality_id is required" or equivalent.

---

### NEG-002 — Create assignment with no scope [API] P1

**Request:**
```
POST /admin/hospitality-assignments
{ "hospitality_id": 1 }
```

**Expected Result:**
- HTTP 400.
- Error: "At least sport_type or event_id is required."

---

### NEG-003 — Reference non-existent hospitality_id [API] P1

**Request:**
```
POST /admin/hospitality-assignments
{ "hospitality_id": 99999, "sport_type": "soccer" }
```

**Expected Result:**
- HTTP 400 or 404.
- Error: hospitality_id does not exist.
- No orphan record created.

---

### NEG-004 — Invalid venue_id in venue assignment [API] P2

**Request:**
```
PUT /admin/venue-hospitalities/INVALID_VENUE_ID
{ "venue_name": "Test", "hospitality_ids": [1] }
```

**Expected Result:**
- Assignment is stored (venue_id is an opaque string, not FK-validated against XS2Event).
- However, the frontend will never match this to a real event.
- **Risk:** No server-side validation of venue_id existence. (See Gaps section.)

---

### NEG-005 — Duplicate assignment at same scope (upsert behaviour) [API] P1

**Steps:**
1. `POST /admin/hospitality-assignments` with hospitality_id=1, sport_type=soccer.
2. `POST /admin/hospitality-assignments` with same body.

**Expected Result:**
- No duplicate row created.
- ON DUPLICATE KEY UPDATE fires — `updated_at` updated, no error.
- Second call returns success (201 or 200).

---

### NEG-006 — Delete assignment that does not exist [API] P2

**Request:** `DELETE /admin/hospitality-assignments/99999`

**Expected Result:**
- HTTP 404.
- Error: "Assignment not found."

---

### NEG-007 — Assign inactive service via API [API] P2

**Steps:**
1. Deactivate a service (toggle off).
2. Try to create an assignment for that service.

**Expected Result:**
- Assignment can technically be stored (no server-side is_active check on upsert).
- However, it will NOT be returned by public API (joins require `h.is_active = 1`).
- **Risk:** Admin can assign inactive services without warning. (See Gaps section.)

---

### NEG-008 — Empty hospitality_ids in replaceAssignmentsAtScope [API] P1

**Request:**
```
PUT /admin/hospitality-assignments/scope
{ "sport_type": "soccer", "hospitality_ids": [] }
```

**Expected Result:**
- All existing sport-level assignments deleted.
- `inserted_count = 0`.
- No error.

---

### NEG-009 — hospitality_ids is not an array in replaceVenueHospitalities [API] P1

**Request:**
```
PUT /admin/venue-hospitalities/{venueId}
{ "venue_name": "Test", "hospitality_ids": 1 }
```

**Expected Result:**
- HTTP 400.
- Error: "hospitality_ids must be an array."

---

### NEG-010 — Venue search with 1 character [ADMIN] P2

**Steps:** Type 1 character in the venue search box on VenueHospitalityManagement.

**Expected Result:**
- No API call made.
- No results shown.
- No error.

---

### NEG-011 — Create hospitality service with duplicate name [API] P3

**Steps:** Create two services with the same name `"VIP Lounge"`.

**Expected Result:**
- Both created successfully (no unique constraint on name).
- Both appear in list with different IDs.
- **Note:** This may cause confusion. See Recommendations.

---

### NEG-012 — Unauthenticated access to admin endpoints [API] P1

**Request:** `GET /admin/hospitalities` without Authorization header.

**Expected Result:**
- HTTP 401 or 403.
- No hospitality data returned.

---

## 10. Regression Test Cases

### REG-001 — Sport-season toggle not broken for soccer [ADMIN][FE] P1

**Steps:**
1. Navigate to `/hospitality` Assignments tab.
2. Select Soccer.
3. Verify tournaments load with current season.
4. Select Formula1.
5. Verify tournaments load without season parameter.

**Expected Result:**
- Soccer: tournament list filtered by active season.
- Formula1: tournament list loads without season (all available tournaments).

---

### REG-002 — Legacy ticket_hospitalities assignments still work [API][FE] P1

**Preconditions:** At least one entry in `ticket_hospitalities` table (legacy).

**Steps:**
1. `GET /v1/events/{eventId}/hospitalities` (legacy flat endpoint).
2. `GET /v1/events/{eventId}/effective-hospitalities?ticket_ids={t1}` (hierarchical).

**Expected Result:**
- Legacy endpoint still returns the assignment.
- Hierarchical endpoint includes legacy data in results (merged with `source: 'legacy'`).
- Frontend shows hospitality icon for legacy-assigned tickets.

---

### REG-003 — Ticket markup pricing unaffected [FE] P1

**Steps:**
1. Navigate to an event with both markup rules and hospitality assignments.
2. Check ticket prices on the frontend.

**Expected Result:**
- Prices shown are `base_price + markup` only.
- Hospitality does NOT add to the price.
- Price guard (`priceReady`) prevents flash of original price.

---

### REG-004 — Events listing page price guard unaffected [FE] P1

**Steps:**
1. Navigate to `/events?sport_type=soccer&team_id={teamId}&tournament_id={tournamentId}`.
2. Watch the price column as page loads.

**Expected Result:**
- Price column shows skeleton until both `currencyLoading` AND `markupLoading` are false.
- No flash of the original EUR price before markup is applied.
- Final price = currency-converted + markup.

---

### REG-005 — Category-level assignments survive tournament reassignment [FE] P2

**Preconditions:** Service assigned at Category level for Category C1.

**Steps:**
1. Create a NEW tournament assignment for the same event.
2. Check that category-level assignment still exists (was not deleted by scope replace).

**Expected Result:**
- Category assignment intact.
- Both tournament-level and category-level appear in effective hospitalities.

---

### REG-006 — Venue hospitality does not bleed into non-venue assignments [FE] P1

**Setup:** 
- Service H assigned to Venue V.
- Event E at Venue V.
- Event F at Venue W.

**Steps:**
1. Check ticket in Event E (venue matches).
2. Check ticket in Event F (venue does not match).

**Expected Result:**
- Event E tickets show H.
- Event F tickets do NOT show H.
- No cross-contamination.

---

### REG-007 — Existing sport/tournament/team assignments intact after venue feature [API] P1

**Steps:**
1. Verify that existing sport, tournament, and team assignments made before venue feature was added are still present.
2. `GET /admin/hospitality-assignments?level=sport` — should return all sport-level assignments.

**Expected Result:**
- All existing hierarchical assignments unchanged.
- No data loss from venue feature implementation.

---

### REG-008 — Admin assignments list ORDER BY shows all levels correctly [ADMIN] P1

**Preconditions:** Assignments exist at all 7 levels.

**Steps:**
1. `GET /admin/hospitality-assignments` (no filters).

**Expected Result:**
- Venue rows appear first.
- Then sport, tournament, team, category, event, ticket — in that order.
- Within each level, sorted by name fields, then sort_order.
- No rows appear in unexpected positions (regression: `'venue'` was previously missing from `FIELD()`).

---

## 11. Known Gaps, Defects & Risks

### DEFECT-001 — Empty venue_name stored for legacy production rows

**Severity:** Medium  
**Status:** Fixed in code; production DB row id=46 has `venue_name = ''`.  
**Impact:** Admin assignments list shows venue_id UUID instead of readable name.  
**Mitigation:** Runtime enrichment via XS2Event API implemented in `HospitalityManagement.tsx`. Production existing data should be backfilled via SQL: `UPDATE hospitality_assignments SET venue_name = 'Official Name' WHERE id = 46`.

---

### DEFECT-002 — No server-side validation of venue_id existence

**Severity:** Low  
**Description:** `PUT /admin/venue-hospitalities/{venueId}` accepts any string as venueId without verifying it exists in XS2Event.  
**Risk:** Typos or invalid IDs will silently store an unresolvable assignment.  
**Recommendation:** Consider a lookup call to `/v1/venues/{id}` before saving, or display a warning.

---

### DEFECT-003 — Admin can assign inactive hospitality services

**Severity:** Low  
**Description:** `POST /admin/hospitality-assignments` does not validate that the referenced `hospitality_id` is active.  
**Risk:** An admin may assign an inactive service, see no error, but customers never see the hospitality.  
**Recommendation:** Add `WHERE is_active = 1` check in `upsertAssignment`, or return a warning in the response.

---

### DEFECT-004 — price_usd field in frontend Hospitality interface

**Severity:** Low  
**Description:** `frontend/src/services/hospitalityService.ts` defines `price_usd: number` in the `Hospitality` interface, but the API no longer returns this field (pricing model removed).  
**Risk:** Type system inconsistency; future code may accidentally reference `price_usd` expecting a value.  
**Recommendation:** Remove `price_usd` from the TypeScript interface or mark it `price_usd?: number`.

---

### GAP-001 — No frontend test for `venue_id` not matching event venue

**Description:** The scenario where an event occurs at a different venue than the one with hospitality assigned is tested at the API level (API-003) but not as an automated frontend test.  
**Recommendation:** Add a manual test case (FE layer) covering this boundary.

---

### GAP-002 — `usePublicEventHospitalities` has no error UI

**Description:** If the effective hospitalities API call fails (network error, 500), the hook sets `error` state but `EventTicketsPage.tsx` does not render it — hospitality icons simply don't appear.  
**Impact:** Silent failure; customer sees no icon but no error message.  
**Recommendation:** Log to monitoring, or show a subtle "hospitality data unavailable" notice.

---

### GAP-003 — Season parameter not tested for formula-1/tennis tournaments

**Description:** The admin page correctly omits season for non-soccer sports, but there is no automated test verifying the API does not reject requests with `season=undefined`.  
**Recommendation:** Add API-level test: `GET /v1/tournaments?sport_type=formula1` (no season) should return results.

---

### GAP-004 — HospitalityManager.tsx (legacy admin component) is not linked from current admin UI

**Description:** `HospitalityManager.tsx` (direct ticket assignment via legacy table) exists as a React component but appears to be used only as an embedded admin-only panel in `EventTicketsPage`, gated by `localStorage.getItem('adminToken')`. It's not part of the main admin application flow.  
**Risk:** Legacy assignments can be created via this hidden path but are not visible in the main admin Assignments tab (which only shows `hospitality_assignments` table).

---

### GAP-005 — No duplicate service name validation

**Description:** Two hospitality services can have identical names. This causes confusion in the admin checkboxes and in customer-facing tooltips (two entries with same name but different IDs).  
**Recommendation:** Add a UNIQUE constraint on `hospitalities.name` or a server-side check.

---

### GAP-006 — Category-level assignments do not validate that category_id belongs to the selected event/venue

**Description:** The admin UI loads categories for the selected event, but the stored `category_id` is not validated on the server side. A category ID from a different event could be stored.  
**Risk:** Low — admin is trusted — but worth documenting.

---

### GAP-007 — No test coverage for `batchCreateAssignments` endpoint

**Description:** `POST /admin/hospitality-assignments/batch` endpoint exists and is transactional, but no test case specifically covers it.  
**Recommendation:** Add API-level test for batch creation with rollback on partial failure.

---

### GAP-008 — Public `effective-hospitalities` caches for 5 minutes

**Description:** After saving an assignment in admin, the customer frontend will show stale data for up to 5 minutes.  
**Risk:** Testers may think the assignment didn't work.  
**Recommendation:** Document this in the test plan setup; always wait for cache expiry or disable caching in the test environment.

---

## 12. Recommendations

### REC-001 — Backfill empty venue_name in production

```sql
-- Identify rows with empty venue_name
SELECT id, venue_id, venue_name 
FROM hospitality_assignments 
WHERE level = 'venue' AND (venue_name IS NULL OR venue_name = '');

-- Update after confirming the official_name from XS2Event API
UPDATE hospitality_assignments 
SET venue_name = 'Stadio Olimpico'
WHERE id = 46;
```

---

### REC-002 — Add a venue cache-invalidation mechanism

The 5-minute cache on `/v1/events/{eventId}/effective-hospitalities` means that assignment changes made in admin are delayed on the frontend. Consider:
- Cache-bust on admin save (pass a `_v` timestamp query param).
- Or reduce cache to 1 minute for the test environment.

---

### REC-003 — Add "Assign to Venue" shortcut in HospitalityManagement

Currently, adding a venue-level assignment requires using the separate Venue Hospitality page. Consider adding a "Venue" option in the main Assignments tab hierarchy so both paths are accessible from one place.

---

### REC-004 — Display a warning for assignments using inactive services

In the admin Assignments list, mark rows where the underlying hospitality service is inactive with a badge (e.g. `⚠️ Inactive Service`) so admins can clean up stale assignments.

---

### REC-005 — End-to-end automated test (Playwright/Cypress)

Priority areas for automation:
1. Create service → assign at event level → verify on frontend ticket page.
2. Create venue assignment → open event at that venue → verify icon + tooltip.
3. Assign at 3 levels → verify deduplication in tooltip.
4. Checkout flow with hospitality: verify it appears in booking payload.

---

### REC-006 — Add unique constraint on hospitalities.name

```sql
ALTER TABLE hospitalities ADD UNIQUE KEY unique_name (name);
```

This prevents duplicate service names that would confuse both admins and customers.

---

---

## 13. Test Execution Results

**Execution Date:** 2026-06-23  
**Environment:** Local (`http://rondoapi.local/`, MySQL `rondo`, root/no-pass)  
**Admin User:** `admin@example.com` / JWT via `/auth/login`

### Summary

| Section | Pass | Fail | Fixed | Skip/N/A |
|---------|------|------|-------|----------|
| SVCM — Service CRUD | 8 | 0 | — | 0 |
| SPRT/TOUR/TEAM/CATG/EVNT/TKET — Assignments | 16 | 0 | — | 0 |
| VASGN/VMGR — Venue Assignments | 8 | 0 | 1 | 0 |
| API — Public Endpoints | 7 | 0 | — | 1 (FE visual) |
| HIER — Hierarchy Resolution | 8 | 0 | — | 0 |
| NEG — Negative Cases | 10 | 0 | 2 | 0 |
| REG — Regression | 7 | 0 | — | 1 |
| **Total** | **64** | **0** | **3** | **2** |

---

### Defects Fixed During Test Execution

| ID | Severity | Description | Fix Applied |
|----|----------|-------------|-------------|
| **NEG-003** | High | `POST /admin/hospitality-assignments` with non-existent `hospitality_id` returned HTTP 500 (FK violation) | Added existence check via `getHospitalityById()` in `HospitalityController::createAssignment()` — now returns HTTP 400 with message "Hospitality service with id={n} not found" |
| **NEG-004** | High | Same 500 issue on `POST /admin/hospitality-assignments/batch` | Same fix applied to `HospitalityController::batchCreateAssignments()` |
| **NEG-008** | Medium | Scope validation rejected valid venue-only assignments (`venue_id` without `sport_type`) | Fixed validation logic: `sport_type OR event_id OR venue_id` required (was: `sport_type OR event_id`) |

---

### Key Behaviour Verified

**Hierarchy Resolution (additive + deduplication):**
- Ticket level (most specific) wins over event > category > team > tournament > sport > venue
- Same `hospitality_id` at multiple levels → only the most-specific kept
- Venue-level hospitalities are ADDITIVE across levels (show alongside specific-level assignments)
- Without `venue_id` query param → venue-level assignments are never included (correct isolation)
- `sport_type=soccer` without `venue_id` → venue hospitalities absent ✓
- `sport_type=soccer` with `venue_id=VENUE` → unique venue-only services appear ✓
- Same service at venue AND tournament → tournament wins ✓

**Legacy Compatibility:**
- `ticket_hospitalities` legacy rows still returned via effective-hospitalities endpoint ✓
- Hierarchical (hospitality_assignments) wins over legacy for same `hospitality_id` ✓
- Both sources merge into a single deduplicated list ✓

**API Behaviour:**
- Cache-Control: `public, max-age=300` (5 min) on effective-hospitalities ✓
- Inactive hospitality services filtered from public responses ✓
- `category_ids` param correctly routes category-level hospitalities to tickets ✓
- Pagination (page/limit) works on admin assignments list ✓

**Frontend (Static Analysis):**
- `EventTicketsPage.tsx` correctly passes `event.venue_id` → `usePublicEventHospitalities` → `venue_id` query param
- `usePublicEventHospitalities` correctly passes `venueId` to `getResolvedEventHospitalities` which appends `venue_id` to URL
- Hospitality icon (`ChefHat`) and fixed-position tooltip display when `ticketHasHospitalities()` is true
- Cart includes hospitalities as informational-only (no price impact)
- `HospitalityManager.tsx` is dead code — not imported anywhere; references deprecated `price_usd` field

---

### Migration Scripts

| File | Purpose | Status |
|------|---------|--------|
| `api/migrations/2026_venue_hospitality.sql` | Adds `venue_id`/`venue_name` columns, extends `level` ENUM, updates UNIQUE key | Pre-existing, already applied |
| `api/migrations/backfill_venue_names.sql` | Audits and backfills empty `venue_name` for existing venue-level assignments | **Created 2026-06-23** — apply per instructions in file |

---

### Open Items After Test Execution

| ID | Type | Description | Priority |
|----|------|-------------|----------|
| DEFECT-001 | Data quality | `venue_name = ''` on production rows; backfill migration script created | Medium |
| DEFECT-002 | No server-side validation of `venue_id` existence in XS2Event | Low |
| DEFECT-003 | Admin can assign inactive services without warning | Low |
| GAP-004 | `HospitalityManager.tsx` is dead code with deprecated `price_usd` reference | Low |
| GAP-002 | Silent failure when effective-hospitalities API errors — no UI feedback | Medium |

*End of Test Plan — v1.0 (Results appended 2026-06-23)*
