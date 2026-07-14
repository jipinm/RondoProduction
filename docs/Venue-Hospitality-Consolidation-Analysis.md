# Venue Hospitality Consolidation Analysis

**Date:** 2026-07-01  
**Scope:** Admin `/venue-hospitality` route vs updated `HospitalityManagement` module

---

## Summary

The updated `HospitalityManagement` module (`/hospitality`) does **not** replace the `VenueHospitalityManagement` module (`/venue-hospitality`). They serve different scopes and use different API endpoints. The Venue Hospitality menu item should be retained until a venue-level assignment path is added to the main Hospitality Management module.

---

## Module Comparison

### VenueHospitalityManagement (`/venue-hospitality`)

- **File:** `admin/src/pages/VenueHospitalityManagement.tsx`
- **Assignment level:** `level = 'venue'`
- **API endpoint:** `PUT /admin/venue-hospitalities/{venueId}`
- **Workflow:** Free-text search across all venues → select venue → toggle packages → save
- **Scope:** Packages apply to **ALL events at that venue**, globally — no sport, tournament, or team constraints
- **Venue discovery:** Direct XS2Event venue search (`/v1/venues?venue_name=...`)

### HospitalityManagement (`/hospitality`) — updated today

- **File:** `admin/src/pages/HospitalityManagement.tsx`
- **API endpoint:** `PUT /admin/hospitality-assignments/scope`
- **Workflow:** Sport → Tournament → Team → Venue (navigation step) → Category → assign
- **Supported levels:** `sport`, `tournament`, `team`, `category`, `event`, `ticket`
- **Venue role:** Used as a UI navigation aid to discover ticket categories — the `venue_id` is **never written** to the assignment scope payload (see `handleSaveAssignment`, lines 886–914)
- **Venue discovery:** Derived from events returned by the Sport → Tournament → Team selection — cannot search all venues freely

---

## Key Functional Differences

| Capability | VenueHospitalityManagement | HospitalityManagement |
|---|---|---|
| Create `level='venue'` assignments (all events at venue, no constraints) | ✅ Yes | ❌ No — cannot create |
| View existing `level='venue'` assignments | ❌ No | ✅ Yes (Assignments tab table) |
| Scope by sport / tournament / team | ❌ No | ✅ Yes |
| Assign at category level (venue section, scoped by sport+tournament+team) | ❌ No | ✅ Yes |
| Assign at event level | ❌ No | ✅ Yes |
| Assign at ticket level | ❌ No | ✅ Yes |
| Free-text venue search across all venues | ✅ Yes | ❌ No |

---

## Why HospitalityManagement Cannot Replace VenueHospitalityManagement

1. **`getAvailableLevels()` never returns `'venue'`** — the function only yields `sport`, `tournament`, `team`, `category`, `event`, `ticket`. Even though `'venue'` is defined in `LEVEL_LABELS` and `LEVEL_DESCRIPTIONS`, there is no UI path in the module to select it as a target level.

2. **Venue ID is never stored in assignments** — when a venue is selected inside HospitalityManagement, it is used only to fetch categories. The `selectedVenue.venue_id` is not included in the `scopeData` object sent to the API on save.

3. **Different API endpoints** — `VenueHospitalityManagement` calls `/admin/venue-hospitalities/{venueId}` (venue-specific endpoint), while `HospitalityManagement` calls `/admin/hospitality-assignments/scope` (hierarchical endpoint).

4. **Different venue discovery** — `VenueHospitalityManagement` searches all venues directly. `HospitalityManagement` discovers venues only from events that exist under a selected sport + tournament + team combination.

---

## What HospitalityManagement Can Do That VenueHospitalityManagement Cannot

- Create fine-grained assignments at category, event, or ticket levels
- Scope hospitality to a specific sport, tournament, or team
- View all existing assignments across all levels in one table
- Show assignment priority rules and deduplication logic

---

## Recommendation

**Do not remove the Venue Hospitality menu item.** The two modules are complementary, not duplicates.

To safely consolidate everything into `HospitalityManagement` and retire the separate module, the following work is needed:

1. Add a venue-level assignment path to `HospitalityManagement` — allow selecting a venue directly (without requiring sport/tournament/team context) and saving at `level='venue'` via the `/admin/venue-hospitalities/{venueId}` endpoint.
2. Once that path exists, verify that all existing `level='venue'` assignments created by `VenueHospitalityManagement` are visible and editable from the consolidated module.
3. Remove the `/venue-hospitality` route from `App.tsx`, the import of `VenueHospitalityManagement`, and the sidebar nav link from `DashboardLayout.tsx`.
4. Optionally delete `VenueHospitalityManagement.tsx` and `VenueHospitalityManagement.module.css`.

---

## Affected Files (if consolidation proceeds)

| File | Change |
|---|---|
| `admin/src/App.tsx` | Remove `/venue-hospitality` route and `VenueHospitalityManagement` import |
| `admin/src/layouts/DashboardLayout.tsx` | Remove "Venue Hospitality" `NavLink` (lines 108–113) |
| `admin/src/pages/VenueHospitalityManagement.tsx` | Delete |
| `admin/src/pages/VenueHospitalityManagement.module.css` | Delete |
| `admin/src/pages/HospitalityManagement.tsx` | Add venue-level assignment flow before removal |
