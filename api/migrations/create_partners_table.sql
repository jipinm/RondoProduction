-- ============================================================
-- Migration: create_partners_table.sql
-- Description: Creates partners table for managing website partner logos
--              and links displayed in the frontend Partners section.
-- ============================================================

CREATE TABLE IF NOT EXISTS `partners` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL COMMENT 'Partner name for admin reference',
  `logo_url` varchar(500) NOT NULL COMMENT 'Partner logo image URL',
  `link_url` varchar(500) DEFAULT NULL COMMENT 'Partner website URL (optional)',
  `link_target` enum('_self','_blank') NOT NULL DEFAULT '_blank' COMMENT 'Link target behavior',
  `status` enum('active','inactive') NOT NULL DEFAULT 'active' COMMENT 'Partner visibility status',
  `position_order` int(10) UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Display order (lower = first)',
  `created_by` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'Admin who created this partner',
  `updated_by` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'Admin who last updated this partner',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_position_order` (`position_order`),
  KEY `fk_partner_created_by` (`created_by`),
  KEY `fk_partner_updated_by` (`updated_by`),
  CONSTRAINT `fk_partner_created_by` FOREIGN KEY (`created_by`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_partner_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Partner logos and links management';
