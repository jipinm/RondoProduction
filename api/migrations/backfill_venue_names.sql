-- ============================================================
-- Migration: Backfill Empty Venue Names in hospitality_assignments
-- Date: 2026-06-23
-- Description:
--   Fills in venue_name for rows at level='venue' where
--   venue_name is NULL or empty string. These rows were created
--   before the venue_name population fix was deployed.
--
--   How to apply:
--   1. Review the audit query below to identify affected rows.
--   2. Add a WHEN clause for each known venue_id → venue_name mapping.
--   3. Execute the UPDATE statement.
--   4. Confirm by re-running the audit query — result should be 0.
--
--   Note: If the venue_name is still unknown, have an admin re-save
--   the venue's hospitality assignments through the admin UI.
--   The admin panel will automatically populate venue_name from
--   the XS2Event API (official_name || name).
-- ============================================================

-- Step 1: Audit — find venue assignments with missing venue_name
SELECT id, venue_id, venue_name, hospitality_id, created_at
FROM hospitality_assignments
WHERE level = 'venue'
  AND (venue_name IS NULL OR venue_name = '')
ORDER BY venue_id, created_at;

-- Step 2: Backfill known venue names.
-- Extend the CASE block with additional WHEN clauses for each
-- venue_id found in the audit above.
UPDATE hospitality_assignments
SET venue_name = CASE venue_id
    -- Format: WHEN '<xs2event_venue_id>' THEN '<official_venue_name>'
    -- Example (Stamford Bridge — Chelsea FC):
    WHEN '3a4cdeb10c5743c1b84a02cd424f14c2_vnx' THEN 'Stamford Bridge'
    -- Add more known venues here before running:
    -- WHEN '<venue_id_2>' THEN '<venue_name_2>'
    -- WHEN '<venue_id_3>' THEN '<venue_name_3>'
    ELSE venue_name  -- leave unknown venues unchanged
END
WHERE level = 'venue'
  AND (venue_name IS NULL OR venue_name = '');

-- Step 3: Verify — should return 0 rows for all handled venues
SELECT id, venue_id, venue_name
FROM hospitality_assignments
WHERE level = 'venue'
  AND venue_id IN ('3a4cdeb10c5743c1b84a02cd424f14c2_vnx')
  AND (venue_name IS NULL OR venue_name = '');
