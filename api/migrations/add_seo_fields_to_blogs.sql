-- ============================================================
-- Blog Module Enhancement: SEO Fields + Blog images directory
-- Adds SEO metadata columns to the blogs table.
-- ============================================================

ALTER TABLE `blogs`
  ADD COLUMN `seo_title`        VARCHAR(255)  DEFAULT NULL AFTER `status`,
  ADD COLUMN `meta_description` TEXT          DEFAULT NULL AFTER `seo_title`,
  ADD COLUMN `meta_keywords`    VARCHAR(500)  DEFAULT NULL AFTER `meta_description`,
  ADD COLUMN `og_title`         VARCHAR(255)  DEFAULT NULL AFTER `meta_keywords`,
  ADD COLUMN `og_description`   TEXT          DEFAULT NULL AFTER `og_title`,
  ADD COLUMN `og_image`         VARCHAR(1000) DEFAULT NULL AFTER `og_description`;

ALTER TABLE `banners`
  MODIFY `location` enum('homepage_hero','homepage_secondary','category_page','event_page','login_page')
  NOT NULL DEFAULT 'homepage_hero';