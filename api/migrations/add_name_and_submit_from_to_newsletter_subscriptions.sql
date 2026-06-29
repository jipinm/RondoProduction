-- Add name and submit_from fields to newsletter_subscriptions table
-- Migration: 2026-06-12-add-name-and-submit-from-fields

ALTER TABLE `newsletter_subscriptions`
ADD COLUMN `name` varchar(255) DEFAULT NULL COMMENT 'Subscriber name (optional)' AFTER `email`,
ADD COLUMN `submit_from` varchar(100) NOT NULL DEFAULT 'Newsletter subscription' COMMENT 'Source of subscription: "Newsletter subscription" or "Interest register"' AFTER `subscribed_at`;

-- Update existing records to have default submit_from value
UPDATE `newsletter_subscriptions` SET `submit_from` = 'Newsletter subscription' WHERE `submit_from` IS NULL;
