-- =============================================================================
-- Migration: sync_production_schema.sql
-- Purpose  : Bring production schema in line with local development schema.
--
-- Identified by diffing db_rondo.sql (local) vs production-database-rondo.sql
-- (production) on 2026-06-25.
--
-- Two structural gaps found:
--   1. bookings.hospitality_total column missing from production
--   2. why_rondo_sports.created_at / updated_at allow NULL in production
--      but are NOT NULL in local
--
-- All other apparent diff output was formatting noise: the production dump
-- keeps PK, index, and FK definitions in separate ALTER TABLE blocks at the
-- end of the file rather than inline in CREATE TABLE bodies — the actual
-- constraints ARE present on production.
--
-- Safe to run multiple times (IF NOT EXISTS / MODIFY with idempotent defaults).
-- =============================================================================

SET NAMES utf8mb4;
SET foreign_key_checks = 0;

-- ---------------------------------------------------------------------------
-- 1. bookings — add hospitality_total after total_amount
-- ---------------------------------------------------------------------------
-- Column tracks hospitality package charges attached to a booking (USD).
-- Default 0.00 means existing rows are unaffected; no data migration needed.

ALTER TABLE `bookings`
  ADD COLUMN IF NOT EXISTS `hospitality_total`
    decimal(10,2) NOT NULL DEFAULT 0.00
    COMMENT 'Total hospitality charges (USD)'
    AFTER `total_amount`;

-- ---------------------------------------------------------------------------
-- 2. why_rondo_sports — tighten timestamp nullability to match local schema
-- ---------------------------------------------------------------------------
-- Production allowed NULL for both audit timestamps; local defines them as
-- NOT NULL with a DEFAULT so they are always populated automatically.

ALTER TABLE `why_rondo_sports`
  MODIFY COLUMN `created_at`
    timestamp NOT NULL DEFAULT current_timestamp(),
  MODIFY COLUMN `updated_at`
    timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp();

SET foreign_key_checks = 1;
