-- ============================================================
-- Migration: add_active_season_setting.sql
-- Description: Adds active_season setting to system_settings
--              to allow admin control over which season is displayed
--              in navigation menus, overriding the date-based calculation.
--
-- Setting added:
--   active_season  — String value (e.g., "26/27") representing the
--                    currently active season for tournament display.
--                    Empty string "" = use calculated season (default).
--
-- Safe to run on production — INSERT IGNORE prevents duplicate
-- key errors if migration is run more than once.
-- ============================================================

INSERT IGNORE INTO `system_settings`
  (`setting_key`, `setting_value`, `setting_type`, `category`, `description`, `is_public`, `default_value`, `created_at`, `updated_at`)
VALUES
  (
    'active_season',
    '',
    'string',
    'display',
    'The active season to display in navigation menus (e.g., "26/27"). If empty, the system will calculate the season based on the current date. This allows early publication of upcoming seasons before the traditional season start date.',
    1,
    '',
    NOW(),
    NOW()
  );
