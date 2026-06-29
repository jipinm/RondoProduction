-- Migration: Remove tournament_id dependency from team_credentials
-- Date: 2026-06-17
-- Description:
--   Team IDs are unique and stable across seasons, but tournament IDs change
--   each season. This migration:
--     1. Deduplicate records so each team has at most one credential row
--     2. Renames logo/banner files to use {team_id}_{type}.ext (drops tournament prefix)
--     3. Updates logo_url and banner_url fields to match new filenames
--     4. Makes tournament_id nullable (kept as a reference field only)
--     5. Replaces the unique key (sport_type, tournament_id, team_id)
--        with (sport_type, team_id)
--
-- IMPORTANT: After running this SQL migration, also run:
--   php api/bin/team-credentials-rename-files.php
-- to rename the physical image files on disk to match the new naming convention.

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1: Remove duplicate rows
--   For each (sport_type, team_id) group keep the row that has the most
--   content: short_description (4pts) > logo (2pts) > banner (1pt), then
--   break ties by most-recently updated, then lowest id.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TEMPORARY TABLE _tc_keep AS
SELECT
    CAST(
        SUBSTRING_INDEX(
            GROUP_CONCAT(
                id
                ORDER BY
                    (CASE WHEN short_description IS NOT NULL AND short_description <> '' THEN 4 ELSE 0 END +
                     CASE WHEN logo_filename IS NOT NULL THEN 2 ELSE 0 END +
                     CASE WHEN banner_filename IS NOT NULL THEN 1 ELSE 0 END) DESC,
                    updated_at DESC,
                    id ASC
                SEPARATOR ','
            ),
            ',', 1
        ) AS UNSIGNED
    ) AS keep_id
FROM team_credentials
GROUP BY sport_type, team_id;

DELETE FROM team_credentials
WHERE id NOT IN (SELECT keep_id FROM _tc_keep);

DROP TEMPORARY TABLE _tc_keep;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2: Update logo_filename and logo_url
--   Old pattern : {tournament_id}_{team_id}_logo.{ext}
--   New pattern : {team_id}_logo.{ext}
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE team_credentials
SET
    logo_url = IF(
        logo_filename LIKE CONCAT(tournament_id, '_', team_id, '_%'),
        CONCAT('/images/team/logo/', team_id, '_',
               SUBSTRING(logo_filename, LENGTH(tournament_id) + LENGTH(team_id) + 3)),
        logo_url
    ),
    logo_filename = IF(
        logo_filename LIKE CONCAT(tournament_id, '_', team_id, '_%'),
        CONCAT(team_id, '_',
               SUBSTRING(logo_filename, LENGTH(tournament_id) + LENGTH(team_id) + 3)),
        logo_filename
    )
WHERE logo_filename IS NOT NULL
  AND tournament_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3: Update banner_filename and banner_url
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE team_credentials
SET
    banner_url = IF(
        banner_filename LIKE CONCAT(tournament_id, '_', team_id, '_%'),
        CONCAT('/images/team/banner/', team_id, '_',
               SUBSTRING(banner_filename, LENGTH(tournament_id) + LENGTH(team_id) + 3)),
        banner_url
    ),
    banner_filename = IF(
        banner_filename LIKE CONCAT(tournament_id, '_', team_id, '_%'),
        CONCAT(team_id, '_',
               SUBSTRING(banner_filename, LENGTH(tournament_id) + LENGTH(team_id) + 3)),
        banner_filename
    )
WHERE banner_filename IS NOT NULL
  AND tournament_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 4: Make tournament_id nullable
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE team_credentials
    MODIFY COLUMN `tournament_id` VARCHAR(100) DEFAULT NULL
        COMMENT 'External API tournament identifier (reference only, not used for uniqueness)';

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 5: Replace unique constraint
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE team_credentials DROP INDEX `unique_team_tournament`;

ALTER TABLE team_credentials
    ADD UNIQUE KEY `unique_team` (`sport_type`, `team_id`);
