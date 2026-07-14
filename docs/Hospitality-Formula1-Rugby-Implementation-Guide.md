# Hospitality Assignment: Formula One & Rugby — Implementation Guide

**Date:** 2026-07-01  
**Scope:** How to assign Hospitality services to Formula One and Rugby events from the Admin application

---

## Executive Summary

- **Rugby** hospitality assignment is **fully functional** — no changes required.
- **Formula One** hospitality assignment is **broken at all hierarchy levels** except Venue, due to a single sport_type mismatch in the admin KNOWN_SPORTS list.
- The **backend API, database schema, and resolution logic** are complete and correct for both sports.
- **One code change** is required to unblock Formula One: add `formula1` to KNOWN_SPORTS in `HospitalityManagement.tsx`.

---

## 1. Sport Type Mapping

| Context | Formula One | Rugby |
|---|---|---|
| Frontend URL / menu | `sport_type=formula1` | `sport_type=rugby` |
| XS2Event event data | `sport_type: "formula1"` | `sport_type: "rugby"` |
| Admin KNOWN_SPORTS | `"motorsport"` ← **WRONG** | `"rugby"` ✓ |
| `has_teams` | `false` (no team selection) | `true` (team selection shown) |
| Season parameter | Omitted (not soccer) | Omitted (not soccer) |

**Key references:**
- `frontend/src/components/layout/Header.tsx:20,41` — FIXED_SPORTS list and display name mapping
- `admin/src/pages/HospitalityManagement.tsx:57-70` — KNOWN_SPORTS array (the bug location)
- `frontend/src/pages/EventsPage.tsx:24,36` — sport_type passed directly to XS2Event API

---

## 2. Admin Assignment Workflow

### Formula One (No-Team Sport)

```
Step 1: Select "Formula One" (sport_type='formula1')
          → fetchTournaments('formula1')
          → GET /v1/tournaments?sport_type=formula1&page_size=100  (no season param)

Step 2: Select Tournament (optional)
          → e.g., "Formula 1 — 2026"
          → has_teams = false → SKIP team step

Step 3: Select Venue (derived from events)
          → GET /v1/events?tournament_id={id}&page_size=100
          → Venues derived from event.venue_name / event.venue_id

Step 4: Select Ticket Category ⭐ Recommended
          → GET /v1/categories?event_id={reference_event_id}
          → e.g., "Paddock Club [hospitality]", "Main Grandstand [standard]"
          → category_id is stable across all events at this circuit

Advanced: Event / Ticket level (one-off assignments only)
          → Event picker filtered to selected venue
          → Ticket picker for selected event

Step 5: Check hospitality services to assign

Step 6: Choose target level → Save
          → PUT /admin/hospitality-assignments/scope
```

### Rugby (Team Sport)

```
Step 1: Select "Rugby" (sport_type='rugby')
          → fetchTournaments('rugby')
          → GET /v1/tournaments?sport_type=rugby&page_size=100  (no season param)

Step 2: Select Tournament (optional)
          → e.g., "Rugby World Championship - 2027"

Step 3: Select Team (optional — rugby has teams)
          → GET /v1/teams?sport_type=rugby&tournament_id={id}&page_size=100
          → e.g., "South Africa", "England"

Step 4: Select Venue (from team's events)
          → GET /v1/events?tournament_id={id}&team_id={id}&page_size=100
          → Venues derived from filtered events

Step 5: Select Ticket Category ⭐ Recommended
          → GET /v1/categories?event_id={reference_event_id}
          → e.g., "Hospitality Suite A", "VIP Tribune"

Advanced: Event / Ticket level (one-off only)

Step 6: Check hospitality services to assign

Step 7: Choose target level → Save
          → PUT /admin/hospitality-assignments/scope
```

---

## 3. Available Assignment Levels

| Level | Formula One | Rugby | Description |
|---|---|---|---|
| **Sport** | ✅ (after fix) | ✅ | All events of that sport, ever |
| **Tournament** | ✅ (after fix) | ✅ | e.g., F1 2026 season, RWC 2027 |
| **Team** | N/A (`has_teams=false`) | ✅ | All events for a specific team |
| **Category** | ✅ (after fix) | ✅ | ⭐ Best practice — venue section, stable across events |
| **Event** | ✅ (after fix) | ✅ | One specific race/match |
| **Ticket** | ✅ (after fix) | ✅ | Specific supplier ticket |
| **Venue** *(VenueHospitality module)* | ✅ Already works | ✅ Already works | All events at a venue, no sport filter |

---

## 4. Scope Payloads Sent to API

### Formula One — Category Level (recommended)
```json
{
  "sport_type": "formula1",
  "sport_name": "Formula One",
  "tournament_id": "xs2_tourny_id",
  "tournament_name": "Formula 1 — 2026",
  "category_id": "7df2fbc7f06e4985be92fb263b1f9c63_ctg",
  "category_name": "Paddock Club",
  "hospitality_ids": [1, 2, 3]
}
```
> `event_id` is deliberately omitted for category level — category_id is venue-scoped,
> so this applies automatically to ALL future F1 events at this circuit.

### Rugby — Team Level
```json
{
  "sport_type": "rugby",
  "sport_name": "Rugby",
  "tournament_id": "xs2_tourny_id",
  "tournament_name": "Six Nations 2026",
  "team_id": "england_xs2_id",
  "team_name": "England",
  "hospitality_ids": [1, 2, 3]
}
```

### Rugby — Category Level (scoped by team)
```json
{
  "sport_type": "rugby",
  "sport_name": "Rugby",
  "tournament_id": "xs2_tourny_id",
  "tournament_name": "Six Nations 2026",
  "team_id": "england_xs2_id",
  "team_name": "England",
  "category_id": "suite_a_catg_id",
  "category_name": "Hospitality Suite A",
  "hospitality_ids": [1, 2, 3]
}
```

---

## 5. Backend Resolution Logic

**File:** `api/src/Repository/HospitalityRepository.php:558-675`

### Priority Order (most-specific wins, additive model)

```
1. ticket      — event_id + ticket_id
2. event       — event_id only
3. category    — category_id (stable, venue-scoped)
4. team        — team_id only
5. tournament  — tournament_id only
6. sport       — sport_type only
7. venue       — venue_id only (no sport constraints)
```

**Additive:** Hospitalities are collected from ALL matching levels, then deduplicated by `hospitality_id` — the most-specific assignment per service wins.

### `determineLevel()` Logic (Repository:188-198)

```php
if (!empty($data['ticket_id']))     return 'ticket';
if (!empty($data['event_id']))      return 'event';
if (!empty($data['category_id']))   return 'category';
if (!empty($data['team_id']))       return 'team';
if (!empty($data['tournament_id'])) return 'tournament';
if (!empty($data['sport_type']))    return 'sport';
if (!empty($data['venue_id']))      return 'venue';
```

### `getAvailableLevels()` in Admin UI (HospitalityManagement.tsx:688-698)

```typescript
const levels: AssignmentLevel[] = [];
if (selectedSport)      levels.push('sport');
if (selectedTournament) levels.push('tournament');
if (selectedTeam)       levels.push('team');          // Rugby only
if (selectedCategory)   levels.push('category');
if (selectedEvent && !selectedCategory) levels.push('event');
if (selectedTicket && !selectedCategory) levels.push('ticket');
// Note: 'venue' is never added here — venue-level creation uses /venue-hospitality
```

---

## 6. Database Schema (hospitality_assignments)

All columns are in place — no schema changes needed.

| Column | Formula One | Rugby |
|---|---|---|
| `sport_type` | `'formula1'` | `'rugby'` |
| `tournament_id` | F1 season tournament ID | RWC / Premiership / etc. ID |
| `team_id` | Always NULL | Team XS2Event ID |
| `category_id` | Circuit section ID | Hospitality suite ID |
| `event_id` | Race event ID (event-level only) | Match event ID (event-level only) |
| `ticket_id` | Specific ticket (ticket-level only) | Specific ticket (ticket-level only) |
| `venue_id` | NULL (venue assigned separately) | NULL (venue assigned separately) |
| `level` | sport/tournament/category/event/ticket | sport/tournament/team/category/event/ticket |

**Unique constraint:** `(hospitality_id, sport_type, tournament_id, team_id, category_id, event_id, ticket_id, venue_id)` — all nulls included.

**Applied migrations:**
- `add_hospitality_assignments_table.sql` — base table
- `add_category_to_hospitality_assignments.sql` — adds `category_id`, `category_name`, 'category' level
- `2026_venue_hospitality.sql` — adds `venue_id`, `venue_name`, 'venue' level

---

## 7. The Gap: Formula One sport_type Mismatch

### Root Cause

`admin/src/pages/HospitalityManagement.tsx:57-70`:

```typescript
const KNOWN_SPORTS: Sport[] = [
  { sport_type: 'soccer',     name: 'Soccer',     has_teams: true  },
  { sport_type: 'motorsport', name: 'Motorsport', has_teams: false },  // ← 'formula1' missing
  { sport_type: 'tennis',     name: 'Tennis',     has_teams: false },
  { sport_type: 'rugby',      name: 'Rugby',      has_teams: true  },
  ...
];
```

`fetchSports()` filters XS2Event's API results to only sports in KNOWN_SPORTS:
```typescript
.filter((s) => s.sport_type && s.name &&
  KNOWN_SPORTS.some(k => k.sport_type === s.sport_type));
```

This strips out `formula1` from XS2Event results. The admin can only select `motorsport`.  
Assignments saved: `sport_type='motorsport'`.  
Events in XS2Event: `sport_type='formula1'`.  
Backend resolution query: `sport_type = 'formula1'` → **no rows match** → 0 hospitality services returned.

### Required Fix

**File:** `admin/src/pages/HospitalityManagement.tsx`  
**Location:** KNOWN_SPORTS array (~line 58)

Add `formula1` entry:

```typescript
const KNOWN_SPORTS: Sport[] = [
  { sport_type: 'soccer',     name: 'Soccer',         has_teams: true  },
  { sport_type: 'formula1',   name: 'Formula One',    has_teams: false }, // ← ADD THIS
  { sport_type: 'motorsport', name: 'Motorsport',     has_teams: false },
  { sport_type: 'tennis',     name: 'Tennis',         has_teams: false },
  { sport_type: 'rugby',      name: 'Rugby',          has_teams: true  },
  ...
];
```

**Effect of this single change:**
1. `formula1` no longer filtered from XS2Event sports list
2. Admin can select "Formula One" and fetch F1 tournaments correctly
3. Assignments saved with `sport_type='formula1'`
4. Backend resolution matches F1 events → hospitality services appear on ticket pages
5. No changes needed to API, database, or frontend

---

## 8. What Already Works (No Changes Needed)

| Component | Status |
|---|---|
| Backend resolution logic (all 7 levels) | ✅ Complete |
| Database schema (all columns, migrations applied) | ✅ Complete |
| API endpoints (CRUD, scope replace, resolve) | ✅ Complete |
| Rugby hospitality assignment (all levels) | ✅ Fully working |
| Venue-level hospitality for F1 (via `/venue-hospitality`) | ✅ Already working |
| Frontend display of resolved hospitality on ticket pages | ✅ Working |
| Season parameter correctly omitted for F1 and Rugby | ✅ Working |
| Category-level assignments (venue-scoped, stable across events) | ✅ Working |

---

## 9. Recommended Usage After Fix

### Formula One — Best Practice Assignment

For recurring circuit hospitality (e.g., Paddock Club at Silverstone every F1 race):
```
Sport: Formula One → Tournament: Formula 1 2026
→ Venue: Silverstone Circuit
→ Category: Paddock Club [hospitality] ⭐
→ Level: Venue Category Level
→ Save once — applies to British GP, and any future F1 race at Silverstone
```

For tournament-wide (all F1 2026 circuits):
```
Sport: Formula One → Tournament: Formula 1 2026
→ Level: Tournament Level
→ Applies to all races in that season
```

For broadest scope (all F1 events forever):
```
Sport: Formula One
→ Level: Sport Level
```

### Rugby — Best Practice Assignment

For a team's home ground hospitality:
```
Sport: Rugby → Tournament: Six Nations 2026 → Team: England
→ Venue: Twickenham → Category: East Stand Premium [hospitality]
→ Level: Venue Category Level
→ Applies to all England home matches at Twickenham
```

For a tournament-wide package:
```
Sport: Rugby → Tournament: Rugby World Championship 2027
→ Level: Tournament Level
→ Applies to all RWC 2027 matches
```

---

## 10. File Reference Summary

| File | Role | Key Lines |
|---|---|---|
| `admin/src/pages/HospitalityManagement.tsx` | Admin UI — **fix location** | 57-70 (KNOWN_SPORTS), 556-607 (handlers), 688-698 (getAvailableLevels) |
| `admin/src/services/hospitalityService.ts` | Admin API client | 15 (AssignmentLevel type), 407-426 (replaceAssignmentsAtScope) |
| `api/src/Controller/HospitalityController.php` | Backend controller | 349-387 (replaceAssignmentsAtScope) |
| `api/src/Repository/HospitalityRepository.php` | Backend logic | 188-198 (determineLevel), 558-675 (resolution), 291-322 (replace) |
| `frontend/src/components/layout/Header.tsx` | Menu sport_type values | 20-41 (formula1, rugby in FIXED_SPORTS) |
| `frontend/src/pages/EventsPage.tsx` | Events filtered by sport_type | 24, 36 |
| `frontend/src/hooks/useTicketEnhancements.ts` | Hospitality resolution context | 427, 451 |
| `docs/HOSPITALITY_TEST_PLAN.md` | Test coverage guide | — |
