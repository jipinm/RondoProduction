-- ============================================================
-- Migration: add_display_settings.sql
-- Description: Adds frontend display control settings to
--              system_settings. Uses the existing table schema —
--              no structural changes needed.
--
-- Settings added:
--   football_visible_tournaments  — JSON array of tournament_ids
--                                   to show in Football menu.
--                                   Empty array [] = show all.
--   excluded_teams                — JSON object mapping
--                                   tournament_id -> [team_id, ...]
--                                   of teams to hide per tournament.
--                                   Empty object {} = hide none.
--   other_sports_visible          — JSON array of sport_ids
--                                   to show in Other Sports dropdown.
--                                   Empty array [] = show all.
--
-- Safe to run on production — INSERT IGNORE prevents duplicate
-- key errors if migration is run more than once.
-- ============================================================

INSERT IGNORE INTO `system_settings`
  (`setting_key`, `setting_value`, `setting_type`, `category`, `description`, `is_public`, `default_value`, `created_at`, `updated_at`)
VALUES
  (
    'football_visible_tournaments',
    '[]',
    'json',
    'display',
    'JSON array of football tournament IDs to display in the main navigation menu. An empty array means all tournaments with available events are shown (default behaviour).',
    1,
    '[]',
    NOW(),
    NOW()
  ),
  (
    'excluded_teams',
    '{}',
    'json',
    'display',
    'JSON object mapping tournament IDs to arrays of team IDs that should be hidden from that tournament listing. An empty object means no teams are excluded (default behaviour). Example: {"tournament_id_1": ["team_id_a", "team_id_b"]}',
    1,
    '{}',
    NOW(),
    NOW()
  ),
  (
    'other_sports_visible',
    '[]',
    'json',
    'display',
    'JSON array of sport IDs to display in the Other Sports dropdown menu. An empty array means all available sports (excluding fixed main-menu sports) are shown (default behaviour).',
    1,
    '[]',
    NOW(),
    NOW()
  );
