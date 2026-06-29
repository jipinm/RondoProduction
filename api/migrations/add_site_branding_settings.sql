-- ============================================================
-- Migration: add_site_branding_settings.sql
-- Description: Adds site branding asset URLs (header logo,
--              footer logo, favicon) to system_settings.
--              These values are managed via the admin /settings
--              page and consumed by the frontend at runtime.
--
-- Settings added:
--   site_header_logo_url  — URL to header logo image
--   site_footer_logo_url  — URL to footer logo image
--   site_favicon_url      — URL to favicon image
--
-- Safe to run on production — INSERT IGNORE prevents duplicate
-- key errors if migration is run more than once.
-- ============================================================

INSERT IGNORE INTO `system_settings`
  (`setting_key`, `setting_value`, `setting_type`, `category`, `description`, `is_public`, `default_value`, `created_at`, `updated_at`)
VALUES
  (
    'site_header_logo_url',
    '',
    'string',
    'branding',
    'URL to the header logo image displayed in the site navigation bar. Leave empty to use the default static asset.',
    1,
    '',
    NOW(),
    NOW()
  ),
  (
    'site_footer_logo_url',
    '',
    'string',
    'branding',
    'URL to the footer logo image displayed in the site footer. Leave empty to use the default static asset.',
    1,
    '',
    NOW(),
    NOW()
  ),
  (
    'site_favicon_url',
    '',
    'string',
    'branding',
    'URL to the favicon image used in browser tabs. Leave empty to use the default static asset.',
    1,
    '',
    NOW(),
    NOW()
  );
