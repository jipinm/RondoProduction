-- ============================================================
-- Newsletter Subscriptions Migration
-- Creates the newsletter_subscriptions table.
-- ============================================================

CREATE TABLE IF NOT EXISTS `newsletter_subscriptions` (
  `id`           INT          NOT NULL AUTO_INCREMENT,
  `email`        VARCHAR(255) NOT NULL,
  `subscribed_at` TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_newsletter_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
