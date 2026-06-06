-- Migration: Add image_url column to cms_pages table
-- Used for the About Us page single image upload

ALTER TABLE cms_pages ADD COLUMN IF NOT EXISTS image_url VARCHAR(500) DEFAULT NULL;
