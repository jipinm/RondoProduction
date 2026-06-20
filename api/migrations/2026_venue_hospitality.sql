-- ============================================================
-- Migration: Venue-Based Hospitality Assignments
-- Date: 2026-06-19
-- Description:
--   Extends hospitality_assignments to support a 'venue' level,
--   allowing hospitality packages to be assigned to a specific
--   XS2Event venue_id so they apply to every event at that venue.
--
--   Backward-compatible: all existing rows are unaffected.
--   The unique key is extended to include venue_id.
-- ============================================================

-- 1. Add venue_id column (nullable VARCHAR to match other XS2Event IDs)
ALTER TABLE `hospitality_assignments`
  ADD COLUMN `venue_id` VARCHAR(100) DEFAULT NULL
    COMMENT 'XS2Event venue ID — when set, hospitality applies to all events at this venue'
    AFTER `ticket_id`,
  ADD COLUMN `venue_name` VARCHAR(255) DEFAULT NULL
    COMMENT 'Display name for the venue (cached for admin display)'
    AFTER `venue_id`;

-- 2. Extend the level enum to include 'venue'
--    ORDER in FIELD(): ticket > event > category > team > tournament > sport > venue
--    (venue is the broadest scope — below sport is intentional: venue cuts across sports)
ALTER TABLE `hospitality_assignments`
  MODIFY COLUMN `level`
    ENUM('sport','tournament','team','category','event','ticket','venue')
    NOT NULL
    COMMENT 'The hierarchy level this assignment targets';

-- 3. Drop old unique key and recreate with venue_id included
ALTER TABLE `hospitality_assignments`
  DROP INDEX `unique_hospitality_scope`;

ALTER TABLE `hospitality_assignments`
  ADD UNIQUE KEY `unique_hospitality_scope`
    (`hospitality_id`,`sport_type`,`tournament_id`,`team_id`,`category_id`,`event_id`,`ticket_id`,`venue_id`);

-- 4. Add an index on venue_id for fast lookups during resolution
ALTER TABLE `hospitality_assignments`
  ADD KEY `idx_ha_venue_id` (`venue_id`);
