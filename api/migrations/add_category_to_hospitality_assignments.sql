-- Migration: Add category_id support to hospitality_assignments
-- Date: 2026-03-25
-- Description: Adds category_id (XS2Event Category ID, venue-scoped) as a new
--              assignment level in the hospitality hierarchy, sitting between
--              team level and event level.
--
--              Hierarchy order (most-specific to least-specific):
--                ticket > event > category > team > tournament > sport
--
--              category_id is stable and venue-scoped (the same section ID
--              appears across all events held at the same venue), unlike
--              ticket_id which is event+supplier-specific.
--
-- Safe to run multiple times (uses IF NOT EXISTS / ALTER TABLE guards).

-- Step 1: Add category_id column (after team_id)
ALTER TABLE `hospitality_assignments`
  ADD COLUMN IF NOT EXISTS `category_id` varchar(100) DEFAULT NULL
    COMMENT 'XS2Event category ID — venue-scoped section identifier (e.g. "7df2fbc7f06e4985be92fb263b1f9c63_ctg")'
    AFTER `team_id`;

-- Step 2: Add category_name display column (after team_name)
ALTER TABLE `hospitality_assignments`
  ADD COLUMN IF NOT EXISTS `category_name` varchar(255) DEFAULT NULL
    COMMENT 'Display name for the XS2Event category (e.g. "VIP Tribune"), stored for admin display'
    AFTER `team_name`;

-- Step 3: Expand the level enum to include 'category'
-- Must list ALL existing values plus the new one
ALTER TABLE `hospitality_assignments`
  MODIFY COLUMN `level` enum('sport','tournament','team','category','event','ticket') NOT NULL
    COMMENT 'The hierarchy level this assignment targets';

-- Step 4: Add index for category_id lookups
ALTER TABLE `hospitality_assignments`
  ADD KEY IF NOT EXISTS `idx_ha_category_id` (`category_id`);

-- Step 5: Drop the old unique scope key and recreate it to include category_id
-- (MariaDB does not support DROP INDEX IF EXISTS in all versions, so we use a procedure)
DROP PROCEDURE IF EXISTS add_category_unique_key;
DELIMITER //
CREATE PROCEDURE add_category_unique_key()
BEGIN
  -- Only drop & recreate if the old key still excludes category_id
  IF EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'hospitality_assignments'
      AND INDEX_NAME = 'unique_hospitality_scope'
  ) THEN
    ALTER TABLE `hospitality_assignments`
      DROP INDEX `unique_hospitality_scope`;
  END IF;

  ALTER TABLE `hospitality_assignments`
    ADD UNIQUE KEY `unique_hospitality_scope`
      (`hospitality_id`, `sport_type`, `tournament_id`, `team_id`, `category_id`, `event_id`, `ticket_id`);
END //
DELIMITER ;

CALL add_category_unique_key();
DROP PROCEDURE IF EXISTS add_category_unique_key;
