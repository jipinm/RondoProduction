-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Mar 02, 2026 at 07:53 AM
-- Server version: 8.0.45
-- PHP Version: 8.4.17

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `rbaws2030_db_rondo`
--

-- --------------------------------------------------------

--
-- Table structure for table `admin_activity_logs`
--

CREATE TABLE `admin_activity_logs` (
  `id` bigint UNSIGNED NOT NULL,
  `admin_user_id` bigint UNSIGNED NOT NULL COMMENT 'Admin who performed the action',
  `action` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Action performed (create, update, delete, etc.)',
  `entity_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Type of entity affected',
  `entity_id` bigint UNSIGNED DEFAULT NULL COMMENT 'ID of affected entity',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Human-readable description of action',
  `ip_address` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'IP address of admin',
  `user_agent` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Browser/client user agent',
  `request_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'URL of the request',
  `request_method` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'HTTP method',
  `old_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin COMMENT 'Previous values before change',
  `new_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin COMMENT 'New values after change',
  `severity` enum('low','medium','high','critical') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'low' COMMENT 'Action severity level',
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin COMMENT 'Additional tags for categorization',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `admin_users`
--

CREATE TABLE `admin_users` (
  `id` bigint UNSIGNED NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Full name of the admin user',
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Login email address',
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Bcrypt password hash',
  `role_id` bigint UNSIGNED NOT NULL COMMENT 'Foreign key reference to roles table',
  `role` enum('super_admin','admin','manager','staff','viewer','content_manager','support_agent') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'staff' COMMENT 'User role for access control',
  `status` enum('active','inactive','suspended') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active' COMMENT 'Account status',
  `permissions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin COMMENT 'Additional granular permissions',
  `last_login_at` timestamp NULL DEFAULT NULL COMMENT 'Last successful login time',
  `password_changed_at` timestamp NULL DEFAULT NULL COMMENT 'Last password change',
  `email_verified_at` timestamp NULL DEFAULT NULL COMMENT 'Email verification timestamp',
  `two_fa_enabled` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Two-factor authentication status',
  `two_fa_secret` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'TOTP secret for 2FA',
  `failed_login_attempts` int UNSIGNED NOT NULL DEFAULT '0' COMMENT 'Failed login counter',
  `locked_until` timestamp NULL DEFAULT NULL COMMENT 'Account lock expiration',
  `created_by` bigint UNSIGNED DEFAULT NULL COMMENT 'Admin who created this user',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `admin_users`
--

INSERT INTO `admin_users` (`id`, `name`, `email`, `password_hash`, `role_id`, `role`, `status`, `permissions`, `last_login_at`, `password_changed_at`, `email_verified_at`, `two_fa_enabled`, `two_fa_secret`, `failed_login_attempts`, `locked_until`, `created_by`, `created_at`, `updated_at`) VALUES
(3, 'Administrator', 'admin@rondosportstickets.com', '$2y$10$nrSSAKGq92Tu2JKtKiCvMeRnGkgP/dVzIBGNlAZfQ7Lg7Lvw9IDHS', 1, 'super_admin', 'active', NULL, NULL, NULL, NULL, 0, NULL, 0, NULL, NULL, '2026-03-02 00:00:00', '2026-03-02 00:00:00');

-- --------------------------------------------------------

--
-- Table structure for table `banners`
--

CREATE TABLE `banners` (
  `id` bigint UNSIGNED NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Banner title/name',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT 'Banner description',
  `image_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Banner image URL',
  `mobile_image_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Mobile-optimized image URL',
  `link_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Click destination URL',
  `link_target` enum('_self','_blank') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '_self' COMMENT 'Link target behavior',
  `position_order` int UNSIGNED NOT NULL DEFAULT '0' COMMENT 'Display order (lower = first)',
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active' COMMENT 'Banner status',
  `location` enum('homepage_hero','homepage_secondary','category_page','event_page') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'homepage_hero' COMMENT 'Banner location',
  `event_date` date DEFAULT NULL COMMENT 'Event date for display purposes',
  `click_count` bigint UNSIGNED NOT NULL DEFAULT '0' COMMENT 'Total clicks on banner',
  `impression_count` bigint UNSIGNED NOT NULL DEFAULT '0' COMMENT 'Total impressions',
  `created_by` bigint UNSIGNED DEFAULT NULL COMMENT 'Admin who created banner',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `price_tag` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Banner and promotional content management';

--
-- Dumping data for table `banners`
--

INSERT INTO `banners` (`id`, `title`, `description`, `image_url`, `mobile_image_url`, `link_url`, `link_target`, `position_order`, `status`, `location`, `event_date`, `click_count`, `impression_count`, `created_by`, `created_at`, `updated_at`, `price_tag`) VALUES
(7, 'Wimbledon 2026', 'Live from the All England Club', 'https://api.rondosportstickets.com/images/banners/WIMBLEDON_LOGO_693cf29d5f7e4_1765601949.jpeg', 'https://api.rondosportstickets.com/images/banners/WIMBLEDON_LOGO_693cf29d5f7e4_1765601949.jpeg', 'https://rondosportstickets.com/events?sport_type=tennis', '_self', 2, 'active', 'homepage_secondary', NULL, 0, 0, 3, '2025-10-21 07:39:29', '2025-12-13 09:32:44', NULL),
(8, 'Arsenal vs Liverpool', 'Top of the table clash in North London', 'https://api.rondosportstickets.com/images/banners/Emirates_Day_693cf2e73fde6_1765602023.jpg', 'https://api.rondosportstickets.com/images/banners/Emirates_Day_693cf2e73fde6_1765602023.jpg', 'https://rondosportstickets.com/events/b3c684e67d6a405b9e9ab3a60191111d_gnr/tickets', '_blank', 4, 'active', 'homepage_secondary', '2026-01-01', 0, 0, 3, '2025-10-21 07:40:39', '2025-12-21 11:06:38', NULL),
(9, 'Premier League', 'Top-Tier English Football Action', 'https://api.rondosportstickets.com/images/banners/PREMIERSHIP_691daace63876_1763551950_main.jpg', 'https://api.rondosportstickets.com/images/banners/PREMIERSHIP_691daace63876_1763551950_mobile.jpg', 'https://rondosportstickets.com/teams?tournament_id=f306f395644a42e09821253d13637d70_trn&sport_type=soccer&page=1&page_size=50', '_self', 0, 'active', 'homepage_hero', '2025-12-18', 0, 0, 3, '2025-11-19 11:32:21', '2025-12-21 11:06:38', NULL),
(10, 'La Liga', 'Elite Football, Spanish Style', 'https://api.rondosportstickets.com/images/banners/Barcelona_Stadium_Day_693d58150b20b_1765627925.jpg', 'https://api.rondosportstickets.com/images/banners/Barcelona_Stadium_Day_693d58150b20b_1765627925.jpg', 'https://rondosportstickets.com/teams?tournament_id=42407e31113847d3ba90dbae62e7fa65_trn&sport_type=soccer&page=1&page_size=50', '_self', 1, 'active', 'homepage_hero', '2026-02-19', 0, 0, 3, '2025-11-19 11:33:55', '2025-12-21 11:06:38', NULL),
(11, 'Bundesliga', 'Germany’s Premier Football Action', 'https://api.rondosportstickets.com/images/banners/BUNDESLIGA_691dab927c987_1763552146_main.jpg', 'https://api.rondosportstickets.com/images/banners/BUNDESLIGA_691dab927c987_1763552146_mobile.jpg', 'https://rondosportstickets.com/teams?tournament_id=7a1ab967321244759f91645f40e4249d_trn&sport_type=soccer&page=1&page_size=50', '_self', 2, 'active', 'homepage_hero', NULL, 0, 0, 3, '2025-11-19 11:35:38', '2025-12-12 07:27:54', NULL),
(12, 'Grand Slam Tennis', 'Unmissable Tennis Moments Here', 'https://api.rondosportstickets.com/images/banners/GRAND_SLAM_TENNIS_691dac1ab5cc0_1763552282_main.jpg', 'https://api.rondosportstickets.com/images/banners/GRAND_SLAM_TENNIS_691dac1ab5cc0_1763552282_mobile.jpg', 'https://rondosportstickets.com/events?sport_type=tennis', '_self', 3, 'active', 'homepage_hero', NULL, 0, 0, 3, '2025-11-19 11:37:54', '2025-12-12 07:27:54', NULL),
(13, 'Rugby', 'Watch the world\'s best go head to head', 'https://api.rondosportstickets.com/images/banners/RUGBY_691dac6a5a6ef_1763552362_main.jpg', 'https://api.rondosportstickets.com/images/banners/RUGBY_691dac6a5a6ef_1763552362_mobile.jpg', 'https://rondosportstickets.com/events?sport_type=rugby', '_blank', 4, 'active', 'homepage_hero', NULL, 0, 0, 3, '2025-11-19 11:39:20', '2025-12-14 12:12:52', NULL),
(14, 'Cheltenham Festival 2026', 'World Class Horse Racing at the Cheltenham Festival', 'https://api.rondosportstickets.com/images/banners/Cheltenham_693cf1ea28667_1765601770.jpg', 'https://api.rondosportstickets.com/images/banners/Cheltenham_693cf1ea28667_1765601770.jpg', 'https://rondosportstickets.com/events?sport_type=horseracing', '_self', 3, 'active', 'homepage_secondary', NULL, 0, 0, 3, '2025-12-11 12:06:49', '2025-12-13 04:56:10', NULL),
(15, 'El Clasico - Barcelona vs Real Madrid', 'Watch one of Europe\'s fiercest rivalries live from Barcelona\'s Camp Nou', 'https://api.rondosportstickets.com/images/banners/Barcelona_Stadium_693d57e978780_1765627881.jpg', 'https://api.rondosportstickets.com/images/banners/Barcelona_Stadium_693d57e978780_1765627881.jpg', 'https://rondosportstickets.com/events/c6cd8fa7138745c991b11121a729d61f_gnr/tickets', '_self', 0, 'active', 'homepage_secondary', '2025-12-24', 0, 0, 3, '2025-12-11 12:14:45', '2025-12-21 11:06:38', 'From £80'),
(16, 'The Australian Grand Prix', 'Watch the 2026 season get underway in Melbourne', 'https://api.rondosportstickets.com/images/banners/Autralian_GP_693d572d81f8f_1765627693.jpg', 'https://api.rondosportstickets.com/images/banners/Autralian_GP_693d572d81f8f_1765627693.jpg', 'https://rondosportstickets.com/events/68241bedeb8247e689ac140ab100f5d1_spp/tickets', '_self', 1, 'active', 'homepage_secondary', '2025-12-18', 0, 0, 3, '2025-12-12 03:45:40', '2025-12-21 11:06:38', NULL),
(17, 'Six Nations Rugby', 'The Northern Hemisphere\'s finest go head-to-head', 'https://api.rondosportstickets.com/images/banners/Stade_de_France_Stadium_693d57b2c9a5f_1765627826.jpg', 'https://api.rondosportstickets.com/images/banners/Stade_de_France_Stadium_693d57b2c9a5f_1765627826.jpg', 'https://rondosportstickets.com/events?sport_type=rugby', '_self', 5, 'active', 'homepage_secondary', NULL, 0, 0, 3, '2025-12-12 07:32:43', '2025-12-13 12:10:26', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `bookings`
--

CREATE TABLE `bookings` (
  `id` bigint UNSIGNED NOT NULL,
  `booking_reference` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Human-readable booking reference',
  `api_booking_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'XS2Event API booking ID - links local booking to XS2Event system',
  `api_reservation_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'External API reservation ID',
  `customer_user_id` bigint UNSIGNED NOT NULL COMMENT 'Reference to customer',
  `event_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Name of the event',
  `event_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'External API event ID',
  `event_date` datetime NOT NULL COMMENT 'Date and time of the event',
  `venue_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Venue name',
  `venue_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'External API venue ID',
  `sport_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Type of sport',
  `tournament_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Tournament name if applicable',
  `total_amount` decimal(12,2) UNSIGNED NOT NULL COMMENT 'Total booking amount',
  `currency` varchar(3) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USD' COMMENT 'Currency code',
  `payment_method` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Payment method used',
  `payment_reference` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Payment system reference',
  `stripe_session_id` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_intent_id` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `commission_amount` decimal(10,2) UNSIGNED NOT NULL DEFAULT '0.00' COMMENT 'Commission earned',
  `status` enum('pending','confirmed','cancelled','refunded','expired') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending' COMMENT 'Booking status',
  `cancellation_status` enum('none','requested','approved','declined','cancelled') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'none' COMMENT 'Cancellation status of the booking',
  `cancellation_date` datetime DEFAULT NULL COMMENT 'Date when the booking was cancelled',
  `payment_status` enum('pending','completed','failed','refunded','partially_refunded') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending' COMMENT 'Payment status',
  `ticket_count` int UNSIGNED NOT NULL COMMENT 'Number of tickets in booking',
  `seat_info` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin COMMENT 'Seat numbers and section information',
  `ticket_info` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin COMMENT 'Detailed ticket information from API',
  `category_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Ticket category',
  `booking_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'When booking was created',
  `confirmed_at` timestamp NULL DEFAULT NULL COMMENT 'When booking was confirmed',
  `cancelled_at` timestamp NULL DEFAULT NULL COMMENT 'When booking was cancelled',
  `event_start_time` timestamp NULL DEFAULT NULL COMMENT 'Event start time for filtering',
  `api_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin COMMENT 'Full API response data for reference',
  `customer_notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Customer-provided notes',
  `admin_notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Internal admin notes',
  `source` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'website' COMMENT 'Booking source (website, mobile, api)',
  `last_sync_at` timestamp NULL DEFAULT NULL COMMENT 'Last API synchronization',
  `modified_by` bigint UNSIGNED DEFAULT NULL COMMENT 'Last admin to modify',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `xs2event_booking_status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'XS2Event booking status (e.g., confirmed, cancelled, pending)',
  `xs2event_logistic_status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'XS2Event logistic status (e.g., allocated, printed, sent)',
  `xs2event_distribution_channel` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Distribution channel from XS2Event (e.g., eticket, box_office)',
  `xs2event_booking_code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'XS2Event booking code for reference',
  `xs2event_response_data` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Full JSON response from XS2Event API for debugging',
  `xs2event_synced_at` datetime DEFAULT NULL COMMENT 'Last successful sync with XS2Event',
  `xs2event_sync_attempts` int DEFAULT '0' COMMENT 'Number of sync attempts made',
  `xs2event_last_error` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Last error message from XS2Event sync',
  `eticket_status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending' COMMENT 'E-ticket status: pending, processing, available, failed, expired',
  `eticket_available_date` datetime DEFAULT NULL COMMENT 'Date when e-tickets became available for download',
  `eticket_urls` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'JSON array of individual e-ticket download URLs from XS2Event',
  `zip_download_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'URL for downloading all tickets as ZIP file',
  `ticket_sha_checksums` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'JSON array of SHA checksums for ticket verification',
  `last_download_attempt` datetime DEFAULT NULL COMMENT 'Last time customer attempted to download tickets',
  `download_count` int DEFAULT '0' COMMENT 'Number of times tickets have been downloaded',
  `first_downloaded_at` datetime DEFAULT NULL COMMENT 'Timestamp of first successful ticket download',
  `ticket_expiry_date` datetime DEFAULT NULL COMMENT 'Expiry date for e-ticket downloads (if applicable)',
  `download_error_message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Last error message during ticket download attempt',
  `stripe_payment_method_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Stripe payment method ID (pm_xxx)',
  `stripe_customer_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Stripe customer ID (cus_xxx)',
  `stripe_charge_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Stripe charge ID (ch_xxx)',
  `payment_gateway_response` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Full JSON response from Stripe for debugging',
  `payment_gateway_fee` decimal(10,2) DEFAULT NULL COMMENT 'Payment gateway processing fee',
  `payment_completed_at` datetime DEFAULT NULL COMMENT 'Exact timestamp when payment was completed',
  `refund_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Stripe refund ID if refunded (re_xxx)',
  `refund_amount` decimal(10,2) DEFAULT NULL COMMENT 'Amount refunded',
  `refund_reason` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Reason for refund',
  `refunded_at` datetime DEFAULT NULL COMMENT 'Timestamp of refund'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `bookings`
--



-- --------------------------------------------------------

--
-- Table structure for table `booking_cancellation_requests`
--

CREATE TABLE `booking_cancellation_requests` (
  `id` bigint UNSIGNED NOT NULL COMMENT 'Unique identifier for the cancellation request',
  `booking_id` bigint UNSIGNED NOT NULL COMMENT 'Reference to the booking being cancelled',
  `customer_user_id` bigint UNSIGNED NOT NULL COMMENT 'Reference to the customer who requested cancellation',
  `request_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'When the cancellation was requested',
  `cancellation_reason` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Reason for cancellation (required)',
  `customer_notes` text COLLATE utf8mb4_unicode_ci COMMENT 'Additional notes from customer (optional)',
  `status` enum('pending','approved','declined','completed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending' COMMENT 'Current status of the cancellation request',
  `admin_user_id` bigint UNSIGNED DEFAULT NULL COMMENT 'Admin who reviewed/processed the request',
  `admin_notes` text COLLATE utf8mb4_unicode_ci COMMENT 'Notes from admin regarding the decision',
  `reviewed_date` datetime DEFAULT NULL COMMENT 'When the request was reviewed by admin',
  `completed_date` datetime DEFAULT NULL COMMENT 'When the cancellation was fully completed',
  `refund_amount` decimal(10,2) DEFAULT NULL COMMENT 'Amount to be refunded to customer',
  `refund_status` enum('not_applicable','pending','processed','failed') COLLATE utf8mb4_unicode_ci DEFAULT 'not_applicable' COMMENT 'Status of the refund process',
  `refund_reference` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Reference number for the refund transaction',
  `refund_date` datetime DEFAULT NULL COMMENT 'When the refund was processed',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Record last update timestamp'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Stores customer cancellation requests for bookings';

--
-- Dumping data for table `booking_cancellation_requests`
--



-- --------------------------------------------------------

--
-- Table structure for table `booking_hospitalities`
--

CREATE TABLE `booking_hospitalities` (
  `id` bigint UNSIGNED NOT NULL,
  `booking_id` bigint UNSIGNED NOT NULL COMMENT 'Reference to the booking',
  `hospitality_id` bigint UNSIGNED DEFAULT NULL COMMENT 'Reference to the hospitality service',
  `hospitality_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Name of hospitality (cached for history)',
  `price_usd` decimal(10,2) NOT NULL COMMENT 'Price at time of booking (USD)',
  `quantity` int NOT NULL DEFAULT '1' COMMENT 'Quantity (usually matches ticket quantity)',
  `total_usd` decimal(10,2) NOT NULL COMMENT 'Total price (price_usd * quantity)',
  `ticket_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'XS2Event ticket ID this hospitality was for',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Hospitality services booked with tickets';

-- --------------------------------------------------------

--
-- Table structure for table `cms_pages`
--

CREATE TABLE `cms_pages` (
  `id` bigint UNSIGNED NOT NULL,
  `page_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Unique identifier for the page',
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Page title',
  `slug` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'URL-friendly page identifier',
  `content` longtext COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Page content (HTML/Markdown)',
  `excerpt` text COLLATE utf8mb4_unicode_ci COMMENT 'Short description/summary',
  `status` enum('draft','published','archived') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft' COMMENT 'Publication status',
  `meta_title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'SEO meta title',
  `meta_description` text COLLATE utf8mb4_unicode_ci COMMENT 'SEO meta description',
  `meta_keywords` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'SEO keywords',
  `content_type` enum('html','markdown','rich_text') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'rich_text' COMMENT 'Content format type',
  `template` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'default' COMMENT 'Page template to use',
  `featured_image` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Featured image URL',
  `published_at` timestamp NULL DEFAULT NULL COMMENT 'Publication date',
  `scheduled_publish_at` timestamp NULL DEFAULT NULL COMMENT 'Scheduled publication time',
  `last_edited_by` bigint UNSIGNED DEFAULT NULL COMMENT 'Last admin to edit',
  `view_count` bigint UNSIGNED NOT NULL DEFAULT '0' COMMENT 'Page view counter',
  `last_viewed_at` timestamp NULL DEFAULT NULL COMMENT 'Last time page was viewed',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Content management system for website pages';

--
-- Dumping data for table `cms_pages`
--

INSERT INTO `cms_pages` (`id`, `page_key`, `title`, `slug`, `content`, `excerpt`, `status`, `meta_title`, `meta_description`, `meta_keywords`, `content_type`, `template`, `featured_image`, `published_at`, `scheduled_publish_at`, `last_edited_by`, `view_count`, `last_viewed_at`, `created_at`, `updated_at`) VALUES
(1, 'terms', 'Terms and Conditions', 'terms-conditions', '<h1>Terms &amp; Conditions</h1>\n<p class=\"effective-date\">Last Updated: October 21, 2025</p>\n<p>Welcome to Rondo Sports! These Terms and Conditions govern your use of our sports ticket booking platform. By accessing or using Rondo Sports, you agree to be bound by these terms. Please read them carefully before making any bookings.</p>\n<h2>1. General Terms</h2>\n<h3>1.1 About Rondo Sports</h3>\n<p>Rondo Sports is a comprehensive sports event management and ticketing platform that allows you to discover, book, and manage tickets for various sporting events including football, basketball, cricket, tennis, and other sporting competitions worldwide.</p>\n<h3>1.2 Acceptance of Terms</h3>\n<p>By creating an account, browsing events, or purchasing tickets through Rondo Sports, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions, as well as our Privacy Policy. If you do not agree with any part of these terms, you must not use our platform.</p>\n<h3>1.3 Eligibility</h3>\n<p>You must be at least 18 years old to create an account and purchase tickets on Rondo Sports. By using our platform, you represent and warrant that you meet this age requirement and have the legal capacity to enter into binding contracts.</p>\n<h2>2. Account Registration</h2>\n<h3>2.1 Account Creation</h3>\n<p>To purchase tickets, you must create a Rondo Sports account by providing accurate, complete, and current information. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</p>\n<h3>2.2 Account Security</h3>\n<p>You agree to immediately notify Rondo Sports of any unauthorized use of your account or any other breach of security. We will not be liable for any losses caused by unauthorized use of your account.</p>\n<h3>2.3 Account Termination</h3>\n<p>We reserve the right to suspend or terminate your account at any time if we believe you have violated these Terms and Conditions or engaged in fraudulent or illegal activity.</p>\n<h2>3. Ticket Booking &amp; Purchase</h2>\n<h3>3.1 Ticket Availability</h3>\n<p>All tickets are subject to availability. Rondo Sports acts as an intermediary between event organizers and customers. We do not guarantee that tickets will be available for any particular event, even if they are displayed on our platform.</p>\n<h3>3.2 Pricing</h3>\n<p>All ticket prices are displayed in the local currency and include applicable taxes unless otherwise stated. Additional booking fees, processing charges, or delivery fees may apply and will be clearly shown before you complete your purchase.</p>\n<h3>3.3 Payment</h3>\n<p>Payment must be made in full at the time of booking using one of our accepted payment methods. We accept credit cards, debit cards, net banking, UPI, and digital wallets. All payments are processed securely through our third-party payment providers.</p>\n<h3>3.4 Booking Confirmation</h3>\n<p>Once your payment is successfully processed, you will receive a booking confirmation via email and SMS. This confirmation serves as proof of your purchase. Please check all details carefully and contact us immediately if any information is incorrect.</p>\n<div class=\"highlight\"><strong>Important:</strong> Your ticket confirmation email contains important information about entry requirements, venue details, and event timing. Please read it carefully and keep it safe.</div>\n<h2>4. Ticket Delivery</h2>\n<h3>4.1 E-Tickets</h3>\n<p>Most tickets are delivered electronically as e-tickets via email and are also available in your Rondo Sports account. E-tickets contain a unique QR code or barcode for entry to the event.</p>\n<h3>4.2 Physical Tickets</h3>\n<p>For select events, physical tickets may be available for delivery to your registered address. Additional delivery charges will apply. Please allow sufficient time for delivery before the event date.</p>\n<h3>4.3 Mobile Tickets</h3>\n<p>Some events may offer mobile tickets accessible through the Rondo Sports mobile app. These tickets cannot be printed and must be displayed on your mobile device for entry.</p>\n<h2>5. Cancellation &amp; Refund Policy</h2>\n<h3>5.1 General Cancellation Policy</h3>\n<p>All ticket sales are generally final. However, refunds may be issued under the following circumstances:</p>\n<ul>\n<li>The event is cancelled by the organizer</li>\n<li>The event is postponed to a date when you cannot attend (subject to organizer approval)</li>\n<li>There is a significant change to the event details (venue, time, participating teams, etc.)</li>\n<li>As required by applicable law</li>\n</ul>\n<h3>5.2 Customer-Initiated Cancellations</h3>\n<p>If you wish to cancel your booking due to personal reasons, refunds will only be provided if the event organizer\'s policy permits it. Any applicable cancellation fees and processing charges will be deducted from the refund amount.</p>\n<h3>5.3 Refund Processing Time</h3>\n<p>Approved refunds will be processed within 7-14 business days and credited back to the original payment method. The actual time for the refund to reflect in your account may vary depending on your bank or payment provider.</p>\n<h3>5.4 No-Show Policy</h3>\n<p>No refunds will be issued if you fail to attend the event for any reason, including but not limited to personal emergencies, travel delays, or forgetting to bring your ticket.</p>\n<h2>6. Event Entry &amp; Venue Rules</h2>\n<h3>6.1 Entry Requirements</h3>\n<p>You must present a valid ticket (e-ticket, physical ticket, or mobile ticket) along with a government-issued photo ID at the venue entrance. Entry may be denied if you cannot produce these documents.</p>\n<h3>6.2 Age Restrictions</h3>\n<p>Some events may have age restrictions. It is your responsibility to ensure that you meet the age requirements for the event you are booking. Proof of age may be required at the venue.</p>\n<h3>6.3 Venue Conduct</h3>\n<p>You agree to comply with all venue rules and regulations, including security checks, prohibited items lists, and behavioral guidelines. The venue management reserves the right to refuse entry or remove anyone who violates these rules.</p>\n<h3>6.4 Prohibited Items</h3>\n<p>Common prohibited items include weapons, illegal substances, outside food and beverages, professional cameras, laser pointers, and any items deemed dangerous by venue security. Please check the specific event details for a complete list.</p>\n<h2>7. Ticket Transfer &amp; Resale</h2>\n<h3>7.1 Ticket Transfers</h3>\n<p>Some tickets may be transferable to another person through the Rondo Sports platform. Check your specific ticket details to see if this option is available. Unofficial transfers outside our platform are not permitted.</p>\n<h3>7.2 Resale Prohibition</h3>\n<p>You may not resell, transfer for profit, or otherwise commercialize tickets purchased through Rondo Sports without our express written permission. Tickets found to be resold through unauthorized channels will be cancelled without refund.</p>\n<h3>7.3 Ticket Fraud</h3>\n<p>Attempting to use fraudulent, duplicated, or unauthorized tickets will result in denial of entry and potential legal action. We employ various security measures to detect and prevent ticket fraud.</p>\n<h2>8. Event Changes &amp; Cancellations</h2>\n<h3>8.1 Event Modifications</h3>\n<p>Event organizers reserve the right to change event details including date, time, venue, participating teams/players, or format. Rondo Sports will notify you of any significant changes as soon as we are informed.</p>\n<h3>8.2 Event Cancellation</h3>\n<p>If an event is cancelled, you will be entitled to a full refund including all booking fees. Rondo Sports is not responsible for any additional costs you may have incurred such as travel or accommodation expenses.</p>\n<h3>8.3 Force Majeure</h3>\n<p>Neither Rondo Sports nor event organizers shall be liable for any failure to perform obligations due to circumstances beyond reasonable control, including natural disasters, pandemics, government regulations, wars, or other force majeure events.</p>\n<h2>9. Liability &amp; Disclaimers</h2>\n<h3>9.1 Platform Service</h3>\n<p>Rondo Sports acts solely as an intermediary between customers and event organizers. We do not organize, host, or control sporting events. Our liability is limited to the booking and ticketing services we provide.</p>\n<h3>9.2 Event Quality</h3>\n<p>We make no guarantees regarding the quality, safety, or enjoyment of any sporting event. Event organizers and venue operators are solely responsible for the event experience, facilities, and safety measures.</p>\n<h3>9.3 Personal Injury</h3>\n<p>Rondo Sports is not liable for any injury, loss, or damage you may suffer while attending an event. By purchasing a ticket, you acknowledge that sporting events may carry inherent risks and you attend at your own risk.</p>\n<h3>9.4 Limitation of Liability</h3>\n<p>To the maximum extent permitted by law, Rondo Sports\' total liability for any claim arising from your use of our platform shall not exceed the amount you paid for the tickets in question.</p>\n<h2>10. Intellectual Property</h2>\n<h3>10.1 Platform Content</h3>\n<p>All content on the Rondo Sports platform, including text, graphics, logos, images, software, and design elements, is the property of Rondo Sports or its licensors and is protected by copyright and trademark laws.</p>\n<h3>10.2 User License</h3>\n<p>We grant you a limited, non-exclusive, non-transferable license to access and use the Rondo Sports platform for personal, non-commercial purposes only. You may not reproduce, distribute, modify, or create derivative works from our content without permission.</p>\n<h2>11. Privacy &amp; Data Protection</h2>\n<h3>11.1 Personal Information</h3>\n<p>We collect and process your personal information in accordance with our Privacy Policy. By using Rondo Sports, you consent to such collection and processing. Please review our Privacy Policy for detailed information about how we handle your data.</p>\n<h3>11.2 Marketing Communications</h3>\n<p>By creating an account, you agree to receive promotional emails, SMS, and notifications about upcoming events, special offers, and platform updates. You can opt out of marketing communications at any time through your account settings.</p>\n<h2>12. Dispute Resolution</h2>\n<h3>12.1 Customer Support</h3>\n<p>If you have any issues, complaints, or disputes, please contact our customer support team first. We are committed to resolving issues fairly and promptly.</p>\n<h3>12.2 Governing Law</h3>\n<p>These Terms and Conditions are governed by the laws of India. Any disputes arising from these terms or your use of Rondo Sports shall be subject to the exclusive jurisdiction of courts in Bangalore, Karnataka.</p>\n<h3>12.3 Arbitration</h3>\n<p>Any unresolved disputes may be referred to binding arbitration in accordance with the Arbitration and Conciliation Act, 1996. The arbitration shall be conducted in English in Bangalore, Karnataka.</p>\n<h2>13. General Provisions</h2>\n<h3>13.1 Changes to Terms</h3>\n<p>We reserve the right to modify these Terms and Conditions at any time. We will notify you of significant changes via email or platform notifications. Your continued use of Rondo Sports after such changes constitutes acceptance of the updated terms.</p>\n<h3>13.2 Severability</h3>\n<p>If any provision of these Terms and Conditions is found to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.</p>\n<h3>13.3 Entire Agreement</h3>\n<p>These Terms and Conditions, together with our Privacy Policy and any other legal notices published on our platform, constitute the entire agreement between you and Rondo Sports.</p>\n<h3>13.4 Contact Information</h3>\n<p>For questions about these Terms and Conditions, please contact us at:</p>\n<ul>\n<li><strong>Email:</strong> support@rondosports.com</li>\n<li><strong>Phone:</strong> +91-80-1234-5678</li>\n<li><strong>Address:</strong> Rondo Sports Pvt. Ltd., 123 Sports Avenue, Koramangala, Bangalore - 560034, Karnataka, India</li>\n</ul>\n<div class=\"highlight\"><strong>Demo Notice:</strong> This is a sample Terms &amp; Conditions document created for demonstration purposes for the Rondo Sports platform. Actual terms may vary and should be reviewed with legal counsel before implementation.</div>', NULL, 'published', 'Terms & Conditions | Rondo Sports', 'Read our terms and conditions to understand your rights and obligations when using our platform.', NULL, 'rich_text', 'default', NULL, '2025-10-01 16:39:22', NULL, 3, 0, NULL, '2025-10-01 16:39:22', '2026-01-30 08:22:18'),
(2, 'privacy', 'Privacy Policy', 'privacy-policy', '<h1>Privacy Policy</h1>\n        <p class=\"effective-date\">Last Updated: October 21, 2025</p>\n        \n        <p>At Rondo Sports, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your data when you use our sports ticket booking platform. Please read this policy carefully to understand our practices regarding your personal information.</p>\n\n        <div class=\"highlight\">\n            <strong>Your Privacy Matters:</strong> We believe in transparency and giving you control over your personal information. This policy outlines your rights and how we handle your data in compliance with applicable privacy laws including the Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023.\n        </div>\n\n        <h2>1. Information We Collect</h2>\n        \n        <h3>1.1 Information You Provide to Us</h3>\n        <p>We collect personal information that you voluntarily provide when using our platform:</p>\n        \n        <h4>Account Information:</h4>\n        <ul>\n            <li>Full name</li>\n            <li>Email address</li>\n            <li>Phone number</li>\n            <li>Date of birth</li>\n            <li>Password (encrypted)</li>\n            <li>Profile picture (optional)</li>\n        </ul>\n\n        <h4>Booking Information:</h4>\n        <ul>\n            <li>Billing and shipping addresses</li>\n            <li>Payment card details (processed securely by our payment partners)</li>\n            <li>Ticket preferences and selections</li>\n            <li>Emergency contact information (for certain events)</li>\n        </ul>\n\n        <h4>Identity Verification:</h4>\n        <ul>\n            <li>Government-issued ID documents (when required for specific events)</li>\n            <li>Age verification documents</li>\n        </ul>\n\n        <h4>Communication Data:</h4>\n        <ul>\n            <li>Messages you send to our customer support team</li>\n            <li>Feedback, reviews, and survey responses</li>\n            <li>Social media interactions with our official accounts</li>\n        </ul>\n\n        <h3>1.2 Information We Collect Automatically</h3>\n        <p>When you use Rondo Sports, we automatically collect certain information about your device and usage:</p>\n\n        <h4>Technical Information:</h4>\n        <ul>\n            <li>IP address and geographic location</li>\n            <li>Browser type and version</li>\n            <li>Operating system and device type</li>\n            <li>Screen resolution and device identifiers</li>\n            <li>Time zone settings</li>\n        </ul>\n\n        <h4>Usage Data:</h4>\n        <ul>\n            <li>Pages visited and features used</li>\n            <li>Search queries and browsing behavior</li>\n            <li>Events viewed and bookings made</li>\n            <li>Time spent on pages</li>\n            <li>Click-through patterns and navigation paths</li>\n            <li>Referring URLs and exit pages</li>\n        </ul>\n\n        <h4>Cookies and Similar Technologies:</h4>\n        <ul>\n            <li>Session cookies for authentication</li>\n            <li>Preference cookies for user settings</li>\n            <li>Analytics cookies for platform improvement</li>\n            <li>Marketing cookies for personalized advertising</li>\n        </ul>\n\n        <h3>1.3 Information from Third Parties</h3>\n        <p>We may receive information about you from third-party sources:</p>\n        <ul>\n            <li>Social media platforms (when you connect your accounts)</li>\n            <li>Payment processors and financial institutions</li>\n            <li>Event organizers and venue partners</li>\n            <li>Marketing and analytics partners</li>\n            <li>Fraud prevention and security services</li>\n        </ul>\n\n        <h2>2. How We Use Your Information</h2>\n        \n        <p>We use your personal information for the following purposes:</p>\n\n        <h3>2.1 Service Provision</h3>\n        <ul>\n            <li>Creating and managing your account</li>\n            <li>Processing ticket bookings and payments</li>\n            <li>Delivering tickets via email, SMS, or mobile app</li>\n            <li>Providing customer support and responding to inquiries</li>\n            <li>Sending booking confirmations and event reminders</li>\n            <li>Facilitating ticket transfers and cancellations</li>\n        </ul>\n\n        <h3>2.2 Platform Improvement</h3>\n        <ul>\n            <li>Analyzing user behavior to enhance user experience</li>\n            <li>Conducting research and development</li>\n            <li>Testing new features and functionalities</li>\n            <li>Identifying and fixing technical issues</li>\n            <li>Optimizing platform performance and speed</li>\n        </ul>\n\n        <h3>2.3 Personalization</h3>\n        <ul>\n            <li>Recommending events based on your interests</li>\n            <li>Customizing content and advertisements</li>\n            <li>Remembering your preferences and settings</li>\n            <li>Creating a tailored user experience</li>\n        </ul>\n\n        <h3>2.4 Communication</h3>\n        <ul>\n            <li>Sending transactional emails and notifications</li>\n            <li>Providing event updates and important announcements</li>\n            <li>Marketing upcoming events and special offers</li>\n            <li>Conducting surveys and requesting feedback</li>\n            <li>Sending newsletters (with your consent)</li>\n        </ul>\n\n        <h3>2.5 Security and Fraud Prevention</h3>\n        <ul>\n            <li>Verifying your identity and preventing unauthorized access</li>\n            <li>Detecting and preventing fraudulent transactions</li>\n            <li>Protecting against security threats and abuse</li>\n            <li>Enforcing our Terms and Conditions</li>\n            <li>Investigating suspicious activities</li>\n        </ul>\n\n        <h3>2.6 Legal Compliance</h3>\n        <ul>\n            <li>Complying with legal obligations and regulations</li>\n            <li>Responding to legal requests from authorities</li>\n            <li>Resolving disputes and enforcing agreements</li>\n            <li>Maintaining records for tax and accounting purposes</li>\n        </ul>\n\n        <h2>3. Legal Basis for Processing</h2>\n        \n        <p>We process your personal information based on the following legal grounds:</p>\n\n        <table>\n            <tr>\n                <th>Legal Basis</th>\n                <th>Purpose</th>\n            </tr>\n            <tr>\n                <td><strong>Contractual Necessity</strong></td>\n                <td>Processing necessary to fulfill our contract with you (ticket booking and delivery)</td>\n            </tr>\n            <tr>\n                <td><strong>Consent</strong></td>\n                <td>Marketing communications, optional features, cookies (where required)</td>\n            </tr>\n            <tr>\n                <td><strong>Legitimate Interest</strong></td>\n                <td>Platform improvement, fraud prevention, personalization, analytics</td>\n            </tr>\n            <tr>\n                <td><strong>Legal Obligation</strong></td>\n                <td>Compliance with laws, tax regulations, and legal requests</td>\n            </tr>\n        </table>\n\n        <h2>4. How We Share Your Information</h2>\n        \n        <p>We may share your personal information with third parties in the following circumstances:</p>\n\n        <h3>4.1 Service Providers</h3>\n        <p>We share information with trusted third-party service providers who assist us in operating our platform:</p>\n        <ul>\n            <li><strong>Payment Processors:</strong> To process transactions securely (e.g., Razorpay, PayU, Stripe)</li>\n            <li><strong>Cloud Hosting Services:</strong> To store data and host our platform (e.g., AWS, Google Cloud)</li>\n            <li><strong>Email and SMS Services:</strong> To send communications and ticket confirmations</li>\n            <li><strong>Analytics Providers:</strong> To understand user behavior (e.g., Google Analytics)</li>\n            <li><strong>Customer Support Tools:</strong> To provide efficient customer service</li>\n            <li><strong>Security Services:</strong> To detect fraud and protect our platform</li>\n        </ul>\n\n        <h3>4.2 Event Organizers and Venues</h3>\n        <p>We share necessary information with event organizers and venue operators to:</p>\n        <ul>\n            <li>Facilitate event entry and attendance tracking</li>\n            <li>Comply with venue security requirements</li>\n            <li>Manage age-restricted events</li>\n            <li>Handle special accommodation requests</li>\n        </ul>\n\n        <h3>4.3 Business Partners</h3>\n        <p>We may share anonymized or aggregated data with:</p>\n        <ul>\n            <li>Sports leagues and teams for analytics purposes</li>\n            <li>Marketing partners for co-branded promotions</li>\n            <li>Research organizations for industry insights</li>\n        </ul>\n\n        <h3>4.4 Legal Requirements</h3>\n        <p>We may disclose your information when required by law or to:</p>\n        <ul>\n            <li>Comply with legal processes, court orders, or government requests</li>\n            <li>Enforce our Terms and Conditions and other agreements</li>\n            <li>Protect the rights, property, or safety of Rondo Sports, our users, or the public</li>\n            <li>Investigate fraud, security issues, or technical problems</li>\n        </ul>\n\n        <h3>4.5 Business Transfers</h3>\n        <p>If Rondo Sports is involved in a merger, acquisition, or sale of assets, your personal information may be transferred to the new entity. We will notify you before your information becomes subject to a different privacy policy.</p>\n\n        <div class=\"warning\">\n            <strong>Important:</strong> We never sell your personal information to third parties for their marketing purposes. All third parties we work with are contractually obligated to protect your data and use it only for specified purposes.\n        </div>\n\n        <h2>5. Data Security</h2>\n        \n        <h3>5.1 Security Measures</h3>\n        <p>We implement robust security measures to protect your personal information:</p>\n        <ul>\n            <li><strong>Encryption:</strong> All sensitive data is encrypted in transit (SSL/TLS) and at rest</li>\n            <li><strong>Access Controls:</strong> Strict role-based access to personal information</li>\n            <li><strong>Secure Servers:</strong> Data stored on secure, monitored servers with firewalls</li>\n            <li><strong>Regular Audits:</strong> Periodic security assessments and vulnerability testing</li>\n            <li><strong>Employee Training:</strong> Staff trained on data protection and privacy practices</li>\n            <li><strong>Two-Factor Authentication:</strong> Available for account security</li>\n            <li><strong>Payment Security:</strong> PCI-DSS compliant payment processing</li>\n        </ul>\n\n        <h3>5.2 Data Breach Response</h3>\n        <p>In the unlikely event of a data breach that affects your personal information, we will:</p>\n        <ul>\n            <li>Notify you within 72 hours of discovering the breach</li>\n            <li>Inform relevant regulatory authorities as required by law</li>\n            <li>Provide details about the nature and extent of the breach</li>\n            <li>Take immediate action to contain and remediate the breach</li>\n            <li>Offer guidance on steps you can take to protect yourself</li>\n        </ul>\n\n        <h2>6. Data Retention</h2>\n        \n        <p>We retain your personal information for different periods depending on the purpose:</p>\n\n        <div class=\"info-box\">\n            <h4>Retention Periods:</h4>\n            <ul>\n                <li><strong>Account Information:</strong> Retained while your account is active, plus 3 years after account closure</li>\n                <li><strong>Transaction Records:</strong> Retained for 7 years for tax and accounting purposes</li>\n                <li><strong>Support Communications:</strong> Retained for 2 years after the last interaction</li>\n                <li><strong>Marketing Data:</strong> Retained until you opt out or withdraw consent</li>\n                <li><strong>Analytics Data:</strong> Anonymized data may be retained indefinitely</li>\n                <li><strong>Legal Records:</strong> Retained as long as required by applicable laws</li>\n            </ul>\n        </div>\n\n        <p>After the retention period expires, we securely delete or anonymize your personal information. You can request earlier deletion by contacting us, subject to legal and contractual obligations.</p>\n\n        <h2>7. Your Privacy Rights</h2>\n        \n        <p>You have the following rights regarding your personal information:</p>\n\n        <h3>7.1 Right to Access</h3>\n        <p>You can request a copy of the personal information we hold about you. We will provide this information in a commonly used electronic format within 30 days.</p>\n\n        <h3>7.2 Right to Correction</h3>\n        <p>You can update or correct inaccurate personal information through your account settings or by contacting us.</p>\n\n        <h3>7.3 Right to Deletion</h3>\n        <p>You can request deletion of your personal information, subject to certain legal exceptions such as:</p>\n        <ul>\n            <li>Completing ongoing transactions</li>\n            <li>Complying with legal obligations</li>\n            <li>Exercising legal claims or defenses</li>\n            <li>Detecting and preventing fraud</li>\n        </ul>\n\n        <h3>7.4 Right to Data Portability</h3>\n        <p>You can request your personal information in a structured, machine-readable format to transfer to another service provider.</p>\n\n        <h3>7.5 Right to Withdraw Consent</h3>\n        <p>You can withdraw consent for marketing communications, optional features, or data processing at any time through:</p>\n        <ul>\n            <li>Account settings</li>\n            <li>Unsubscribe links in emails</li>\n            <li>Contacting customer support</li>\n        </ul>\n\n        <h3>7.6 Right to Object</h3>\n        <p>You can object to processing based on legitimate interests or for direct marketing purposes.</p>\n\n        <h3>7.7 Right to Restrict Processing</h3>\n        <p>You can request temporary restriction of data processing in certain circumstances.</p>\n\n        <h3>7.8 Right to Lodge a Complaint</h3>\n        <p>If you believe we have violated your privacy rights, you can file a complaint with us or with the relevant data protection authority.</p>\n\n        <div class=\"highlight\">\n            <strong>Exercising Your Rights:</strong> To exercise any of these rights, please contact us at privacy@rondosports.com or through your account settings. We will respond to your request within 30 days and may require verification of your identity.\n        </div>\n\n        <h2>8. Cookies and Tracking Technologies</h2>\n        \n        <h3>8.1 Types of Cookies We Use</h3>\n        \n        <h4>Essential Cookies:</h4>\n        <p>Required for the platform to function properly (e.g., authentication, security). These cannot be disabled.</p>\n\n        <h4>Functional Cookies:</h4>\n        <p>Remember your preferences and settings (e.g., language, location, past searches).</p>\n\n        <h4>Analytics Cookies:</h4>\n        <p>Help us understand how users interact with our platform to improve user experience.</p>\n\n        <h4>Marketing Cookies:</h4>\n        <p>Used to deliver relevant advertisements and track campaign effectiveness.</p>\n\n        <h3>8.2 Managing Cookies</h3>\n        <p>You can control cookies through:</p>\n        <ul>\n            <li>Cookie consent banner when first visiting our platform</li>\n            <li>Account settings to manage cookie preferences</li>\n            <li>Browser settings to block or delete cookies</li>\n        </ul>\n\n        <p>Note that disabling certain cookies may limit your ability to use some features of our platform.</p>\n\n        <h3>8.3 Third-Party Cookies</h3>\n        <p>We use third-party services that may set their own cookies:</p>\n        <ul>\n            <li>Google Analytics for usage statistics</li>\n            <li>Facebook Pixel for advertising campaigns</li>\n            <li>Payment gateway cookies for secure transactions</li>\n        </ul>\n\n        <h2>9. Children\'s Privacy</h2>\n        \n        <p>Rondo Sports is not intended for children under the age of 18. We do not knowingly collect personal information from minors. If you are under 18, please do not use our platform or provide any personal information without parental consent.</p>\n\n        <p>If we discover that we have collected personal information from a child without proper consent, we will delete that information immediately. Parents or guardians who believe we have collected information from their child should contact us at privacy@rondosports.com.</p>\n\n        <h2>10. International Data Transfers</h2>\n        \n        <p>Your personal information may be transferred to and processed in countries other than your country of residence. These countries may have different data protection laws.</p>\n\n        <p>When we transfer data internationally, we ensure appropriate safeguards are in place:</p>\n        <ul>\n            <li>Standard contractual clauses approved by regulatory authorities</li>\n            <li>Adequacy decisions confirming comparable protection levels</li>\n            <li>Certification schemes such as Privacy Shield (where applicable)</li>\n            <li>Explicit consent for specific transfers</li>\n        </ul>\n\n        <h2>11. Third-Party Links</h2>\n        \n        <p>Our platform may contain links to third-party websites, social media platforms, or applications. We are not responsible for the privacy practices of these external sites. We encourage you to review their privacy policies before providing any personal information.</p>\n\n        <p>This Privacy Policy applies only to information collected by Rondo Sports.</p>\n\n        <h2>12. Marketing Communications</h2>\n        \n        <h3>12.1 Types of Communications</h3>\n        <p>With your consent, we may send you:</p>\n        <ul>\n            <li>Event recommendations and promotions</li>\n            <li>Exclusive offers and discounts</li>\n            <li>Newsletters with sports news and updates</li>\n            <li>Surveys and feedback requests</li>\n            <li>Special announcements about new features</li>\n        </ul>\n\n        <h3>12.2 Opting Out</h3>\n        <p>You can opt out of marketing communications at any time by:</p>\n        <ul>\n            <li>Clicking the unsubscribe link in any marketing email</li>\n            <li>Adjusting notification preferences in your account settings</li>\n            <li>Replying STOP to SMS marketing messages</li>\n            <li>Contacting customer support</li>\n        </ul>\n\n        <p>Note that you will still receive transactional emails related to your bookings and account.</p>\n\n        <h2>13. Changes to This Privacy Policy</h2>\n        \n        <p>We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. When we make significant changes, we will:</p>\n        <ul>\n            <li>Update the \"Last Updated\" date at the top of this policy</li>\n            <li>Notify you via email or platform notification</li>\n            <li>Request your consent where required by law</li>\n            <li>Provide a summary of key changes</li>\n        </ul>\n\n        <p>We encourage you to review this Privacy Policy periodically to stay informed about how we protect your information. Your continued use of Rondo Sports after changes are posted constitutes acceptance of the updated policy.</p>\n\n        <h2>14. Contact Us</h2>\n        \n        <p>If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:</p>\n\n        <div class=\"info-box\">\n            <h4>Data Protection Officer:</h4>\n            <p><strong>Email:</strong> privacy@rondosports.com<br>\n            <strong>Phone:</strong> +91-80-1234-5678<br>\n            <strong>Address:</strong> Rondo Sports Pvt. Ltd.<br>\n            Data Protection Office<br>\n            123 Sports Avenue, Koramangala<br>\n            Bangalore - 560034<br>\n            Karnataka, India</p>\n\n            <h4>Customer Support:</h4>\n            <p><strong>Email:</strong> support@rondosports.com<br>\n            <strong>Phone:</strong> +91-80-1234-5678 (Mon-Sun, 9 AM - 9 PM IST)<br>\n            <strong>Live Chat:</strong> Available on our platform</p>\n        </div>\n\n        <h2>15. Grievance Redressal</h2>\n        \n        <p>In accordance with the Information Technology Act, 2000 and Digital Personal Data Protection Act, 2023, we have appointed a Grievance Officer to address privacy concerns:</p>\n\n        <div class=\"info-box\">\n            <p><strong>Grievance Officer:</strong> Rajesh Kumar<br>\n            <strong>Email:</strong> grievance@rondosports.com<br>\n            <strong>Response Time:</strong> Within 30 days of receiving complaint</p>\n        </div>\n\n        <div class=\"warning\">\n            <strong>Demo Notice:</strong> This is a sample Privacy Policy document created for demonstration purposes for the Rondo Sports platform. Actual privacy policies should be reviewed and customized by legal professionals to ensure compliance with applicable laws and regulations in your jurisdiction.\n        </div>', NULL, 'published', 'Privacy Policy | Rondo Sports', 'Learn how we collect, use, and protect your personal information in our comprehensive privacy policy.', NULL, 'rich_text', 'default', NULL, '2025-10-01 16:39:22', NULL, NULL, 0, NULL, '2025-10-01 16:39:22', '2025-10-21 11:31:53'),
(3, 'about', 'About Rondo Sports', 'about-us', '<div class=\"about-page\">\r\n    <p class=\"intro-quote\"><em>From the MCG to Madison Square Garden, from Twickenham to Turnberry and from Newlands to the North Bank. Trips to watch live sports with family, friends or colleagues, have given me some of the best moments of my life and created memories that I will keep forever.</em></p>\r\n\r\n    <p>At Rondo, we want to create an offering that will bring as wide a variety of sporting experiences to as many people as possible. Whether its just the ticket to access the stadium or the complete, bespoke package of ticket, travel and accommodation; we aim to make your bucket list sporting experience a reality.</p>\r\n\r\n    <h2>Our Core Principles</h2>\r\n\r\n    <ul class=\"principles-list\">\r\n        <li><strong>Authentic &amp; Official Tickets:</strong> All tickets supplied are official and guaranteed to be authentic and valid. Rondo only sells tickets sourced from the official suppliers of events.</li>\r\n        <li><strong>Exceptional Customer Service:</strong> Providing the highest level of customer service to all our clients whether your sporting experience is purchased seamlessly through our website of via a bespoke package from our Rondo Platinum offering. No two trips are the same and all of them are once-in-a-lifetime experiences. We understand this.</li>\r\n        <li><strong>Real-Time Availability:</strong> Ticket availability is shown real time on our website enabling you to secure your place at events instantaneously.</li>\r\n    </ul>\r\n\r\n    <div class=\"signature-section\">\r\n        <img src=\"https://api.rondosportstickets.com/images/signature-will-shaw.png\" alt=\"Will Shaw Signature\" class=\"signature-image\" />\r\n        <p class=\"founder-name\"><strong>Will Shaw</strong></p>\r\n        <p class=\"founder-title\">Founder of Rondo Sports</p>\r\n    </div>\r\n\r\n    <div class=\"venue-gallery\">\r\n        <div class=\"venue-item\">\r\n            <img src=\"https://api.rondosportstickets.com/images/Twickenham.jpg\" alt=\"Twickenham Stadium\" class=\"venue-image\" />\r\n        </div>\r\n        <div class=\"venue-item\">\r\n            <img src=\"https://api.rondosportstickets.com/images/Newlands.jpg\" alt=\"Newlands Stadium\" class=\"venue-image\" />\r\n        </div>\r\n        <div class=\"venue-item\">\r\n            <img src=\"https://api.rondosportstickets.com/images/Emirates.jpg\" alt=\"Emirates Stadium\" class=\"venue-image\" />\r\n        </div>\r\n    </div>\r\n</div>', NULL, 'published', 'About Us | Rondo Sports - Your Premium Sports Ticket Experience', 'Learn about Rondo Sports - your trusted partner for authentic sports tickets, exceptional customer service, and unforgettable sporting experiences worldwide.', NULL, 'rich_text', 'default', NULL, '2025-10-01 16:39:22', NULL, NULL, 0, NULL, '2025-10-01 16:39:22', '2026-01-28 12:32:54'),
(4, 'faq', 'FAQ - Frequently Asked Questions', 'faq', '<h1>Frequently Asked Questions</h1>\n<h2>General Questions</h2>\n<h3>1. What is this platform?</h3>\n<p>This is a comprehensive sports event management and ticketing platform that allows you to discover, book, and manage tickets for various sporting events.</p>\n<h3>2. How do I create an account?</h3>\n<p>You can create an account by clicking the \"Sign Up\" button on our homepage and following the registration process. You\'ll need to provide a valid email address and create a secure password.</p>\n<h3>3. Is my personal information secure?</h3>\n<p>Yes, we take data security seriously. All personal information is encrypted and stored securely according to industry standards. We never share your personal information with third parties without your consent.</p>\n<h2>Booking &amp; Tickets</h2>\n<h3>4. How do I book tickets?</h3>\n<p>Browse our events, select the event you\'re interested in, choose your preferred seats or ticket type, and proceed to checkout. You\'ll receive your e-tickets via email after successful payment.</p>\n<h3>5. Can I cancel or refund my tickets?</h3>\n<p>Refund policies vary by event. Most events allow cancellations up to 24-48 hours before the event start time. Please check the specific event\'s terms and conditions during booking.</p>\n<h3>6. What payment methods do you accept?</h3>\n<p>We accept all major credit cards (Visa, MasterCard, American Express), debit cards, and digital payment methods like PayPal and Apple Pay.</p>\n<h2>Technical Support</h2>\n<h3>7. I\'m having trouble accessing my account</h3>\n<p>If you\'re having login issues, try using the \"Forgot Password\" feature. If problems persist, please contact our support team at support@rondosportstickets.com.</p>\n<h3>8. The website isn\'t working properly</h3>\n<p>Try clearing your browser cache and cookies, or try using a different browser. If the issue continues, please report it to our technical team.</p>\n<h2>Contact Us</h2>\n<h3>9. How can I contact customer support?</h3>\n<p>You can reach our customer support team:</p>\n<ul>\n<li>Email: support@rondosportstickets.com</li>\n<li>Phone: +44 (0) 20 1234 5678</li>\n<li>Live Chat: Available 9 AM - 6 PM (Mon-Fri)</li>\n</ul>\n<h3>10. Didn\'t find your answer here?</h3>\n<p>If you have a question that\'s not covered in this FAQ, please don\'t hesitate to contact our support team. We\'re here to help!</p>', NULL, 'published', 'FAQ - Frequently Asked Questions | Rondo Sports', 'Find answers to the most frequently asked questions about our platform, booking process, account management, and more.', NULL, 'rich_text', 'default', NULL, '2026-01-28 12:28:27', NULL, 3, 0, NULL, '2025-10-21 00:41:56', '2026-01-28 11:53:34');

-- --------------------------------------------------------

--
-- Table structure for table `countries`
--

CREATE TABLE `countries` (
  `id` int NOT NULL,
  `country_code` varchar(3) COLLATE utf8mb4_unicode_ci NOT NULL,
  `country_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `country_status` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `countries`
--

INSERT INTO `countries` (`id`, `country_code`, `country_name`, `country_status`) VALUES
(1, 'AFG', 'Afghanistan', 1),
(2, 'ALB', 'Albania', 1),
(3, 'DZA', 'Algeria', 1),
(4, 'ASM', 'American Samoa', 1),
(5, 'AND', 'Andorra', 1),
(6, 'AGO', 'Angola', 1),
(7, 'AIA', 'Anguilla', 1),
(8, 'ATA', 'Antarctica', 1),
(9, 'ATG', 'Antigua and Barbuda', 1),
(10, 'ARG', 'Argentina', 1),
(11, 'ARM', 'Armenia', 1),
(12, 'ABW', 'Aruba', 1),
(13, 'AUS', 'Australia', 1),
(14, 'AUT', 'Austria', 1),
(15, 'AZE', 'Azerbaijan', 1),
(16, 'BHS', 'Bahamas', 1),
(17, 'BHR', 'Bahrain', 1),
(18, 'BGD', 'Bangladesh', 1),
(19, 'BRB', 'Barbados', 1),
(20, 'BLR', 'Belarus', 1),
(21, 'BEL', 'Belgium', 1),
(22, 'BLZ', 'Belize', 1),
(23, 'BEN', 'Benin', 1),
(24, 'BMU', 'Bermuda', 1),
(25, 'BTN', 'Bhutan', 1),
(26, 'BOL', 'Bolivia', 1),
(27, 'BIH', 'Bosnia and Herzegovina', 1),
(28, 'BWA', 'Botswana', 1),
(29, 'BVT', 'Bouvet Island', 1),
(30, 'BRA', 'Brazil', 1),
(31, 'IOT', 'British Indian Ocean Territory', 1),
(32, 'BRN', 'Brunei Darussalam', 1),
(33, 'BGR', 'Bulgaria', 1),
(34, 'BFA', 'Burkina Faso', 1),
(35, 'BDI', 'Burundi', 1),
(36, 'KHM', 'Cambodia', 1),
(37, 'CMR', 'Cameroon', 1),
(38, 'CAN', 'Canada', 1),
(39, 'CPV', 'Cape Verde', 1),
(40, 'CYM', 'Cayman Islands', 1),
(41, 'CAF', 'Central African Republic', 1),
(42, 'TCD', 'Chad', 1),
(43, 'CHL', 'Chile', 1),
(44, 'CHN', 'China', 1),
(45, 'CXR', 'Christmas Island', 1),
(46, 'CCK', 'Cocos (Keeling) Islands', 1),
(47, 'COL', 'Colombia', 1),
(48, 'COM', 'Comoros', 1),
(49, 'COG', 'Congo', 1),
(50, 'COD', 'Congo, Democratic Republic', 1),
(51, 'COK', 'Cook Islands', 1),
(52, 'CRI', 'Costa Rica', 1),
(53, 'CIV', 'Cote D\'Ivoire', 1),
(54, 'HRV', 'Croatia', 1),
(55, 'CUB', 'Cuba', 1),
(56, 'CYP', 'Cyprus', 1),
(57, 'CZE', 'Czech Republic', 1),
(58, 'DNK', 'Denmark', 1),
(59, 'DJI', 'Djibouti', 1),
(60, 'DMA', 'Dominica', 1),
(61, 'DOM', 'Dominican Republic', 1),
(62, 'ECU', 'Ecuador', 1),
(63, 'EGY', 'Egypt', 1),
(64, 'SLV', 'El Salvador', 1),
(65, 'GNQ', 'Equatorial Guinea', 1),
(66, 'ERI', 'Eritrea', 1),
(67, 'EST', 'Estonia', 1),
(68, 'ETH', 'Ethiopia', 1),
(69, 'FLK', 'Falkland Islands (Malvinas)', 1),
(70, 'FRO', 'Faroe Islands', 1),
(71, 'FJI', 'Fiji', 1),
(72, 'FIN', 'Finland', 1),
(73, 'FRA', 'France', 1),
(74, 'GUF', 'French Guiana', 1),
(75, 'PYF', 'French Polynesia', 1),
(76, 'ATF', 'French Southern Territories', 1),
(77, 'GAB', 'Gabon', 1),
(78, 'GMB', 'Gambia', 1),
(79, 'GEO', 'Georgia', 1),
(80, 'DEU', 'Germany', 1),
(81, 'GHA', 'Ghana', 1),
(82, 'GIB', 'Gibraltar', 1),
(83, 'GRC', 'Greece', 1),
(84, 'GRL', 'Greenland', 1),
(85, 'GRD', 'Grenada', 1),
(86, 'GLP', 'Guadeloupe', 1),
(87, 'GUM', 'Guam', 1),
(88, 'GTM', 'Guatemala', 1),
(89, 'GGY', 'Guernsey', 1),
(90, 'GIN', 'Guinea', 1),
(91, 'GNB', 'Guinea-Bissau', 1),
(92, 'GUY', 'Guyana', 1),
(93, 'HTI', 'Haiti', 1),
(94, 'HMD', 'Heard Island and Mcdonald Islands', 1),
(95, 'VAT', 'Holy See (Vatican City State)', 1),
(96, 'HND', 'Honduras', 1),
(97, 'HKG', 'Hong Kong', 1),
(98, 'HUN', 'Hungary', 1),
(99, 'ISL', 'Iceland', 1),
(100, 'IND', 'India', 1),
(101, 'IDN', 'Indonesia', 1),
(102, 'IRN', 'Iran', 1),
(103, 'IRQ', 'Iraq', 1),
(104, 'IRL', 'Ireland', 1),
(105, 'IMN', 'Isle of Man', 1),
(106, 'ISR', 'Israel', 1),
(107, 'ITA', 'Italy', 1),
(108, 'JAM', 'Jamaica', 1),
(109, 'JPN', 'Japan', 1),
(110, 'JEY', 'Jersey', 1),
(111, 'JOR', 'Jordan', 1),
(112, 'KAZ', 'Kazakhstan', 1),
(113, 'KEN', 'Kenya', 1),
(114, 'KIR', 'Kiribati', 1),
(115, 'PRK', 'Korea, North', 1),
(116, 'KOR', 'Korea, South', 1),
(117, 'KWT', 'Kuwait', 1),
(118, 'KGZ', 'Kyrgyzstan', 1),
(119, 'LAO', 'Laos', 1),
(120, 'LVA', 'Latvia', 1),
(121, 'LBN', 'Lebanon', 1),
(122, 'LSO', 'Lesotho', 1),
(123, 'LBR', 'Liberia', 1),
(124, 'LBY', 'Libya', 1),
(125, 'LIE', 'Liechtenstein', 1),
(126, 'LTU', 'Lithuania', 1),
(127, 'LUX', 'Luxembourg', 1),
(128, 'MAC', 'Macao', 1),
(129, 'MKD', 'North Macedonia', 1),
(130, 'MDG', 'Madagascar', 1),
(131, 'MWI', 'Malawi', 1),
(132, 'MYS', 'Malaysia', 1),
(133, 'MDV', 'Maldives', 1),
(134, 'MLI', 'Mali', 1),
(135, 'MLT', 'Malta', 1),
(136, 'MHL', 'Marshall Islands', 1),
(137, 'MTQ', 'Martinique', 1),
(138, 'MRT', 'Mauritania', 1),
(139, 'MUS', 'Mauritius', 1),
(140, 'MYT', 'Mayotte', 1),
(141, 'MEX', 'Mexico', 1),
(142, 'FSM', 'Micronesia', 1),
(143, 'MDA', 'Moldova', 1),
(144, 'MCO', 'Monaco', 1),
(145, 'MNG', 'Mongolia', 1),
(146, 'MNE', 'Montenegro', 1),
(147, 'MSR', 'Montserrat', 1),
(148, 'MAR', 'Morocco', 1),
(149, 'MOZ', 'Mozambique', 1),
(150, 'MMR', 'Myanmar', 1),
(151, 'NAM', 'Namibia', 1),
(152, 'NRU', 'Nauru', 1),
(153, 'NPL', 'Nepal', 1),
(154, 'NLD', 'Netherlands', 1),
(155, 'NCL', 'New Caledonia', 1),
(156, 'NZL', 'New Zealand', 1),
(157, 'NIC', 'Nicaragua', 1),
(158, 'NER', 'Niger', 1),
(159, 'NGA', 'Nigeria', 1),
(160, 'NIU', 'Niue', 1),
(161, 'NFK', 'Norfolk Island', 1),
(162, 'MNP', 'Northern Mariana Islands', 1),
(163, 'NOR', 'Norway', 1),
(164, 'OMN', 'Oman', 1),
(165, 'PAK', 'Pakistan', 1),
(166, 'PLW', 'Palau', 1),
(167, 'PSE', 'Palestine', 1),
(168, 'PAN', 'Panama', 1),
(169, 'PNG', 'Papua New Guinea', 1),
(170, 'PRY', 'Paraguay', 1),
(171, 'PER', 'Peru', 1),
(172, 'PHL', 'Philippines', 1),
(173, 'PCN', 'Pitcairn', 1),
(174, 'POL', 'Poland', 1),
(175, 'PRT', 'Portugal', 1),
(176, 'PRI', 'Puerto Rico', 1),
(177, 'QAT', 'Qatar', 1),
(178, 'REU', 'Reunion', 1),
(179, 'ROU', 'Romania', 1),
(180, 'RUS', 'Russia', 1),
(181, 'RWA', 'Rwanda', 1),
(182, 'SHN', 'Saint Helena', 1),
(183, 'KNA', 'Saint Kitts and Nevis', 1),
(184, 'LCA', 'Saint Lucia', 1),
(185, 'SPM', 'Saint Pierre and Miquelon', 1),
(186, 'VCT', 'Saint Vincent and the Grenadines', 1),
(187, 'WSM', 'Samoa', 1),
(188, 'SMR', 'San Marino', 1),
(189, 'STP', 'Sao Tome and Principe', 1),
(190, 'SAU', 'Saudi Arabia', 1),
(191, 'SEN', 'Senegal', 1),
(192, 'SRB', 'Serbia', 1),
(193, 'SYC', 'Seychelles', 1),
(194, 'SLE', 'Sierra Leone', 1),
(195, 'SGP', 'Singapore', 1),
(196, 'SVK', 'Slovakia', 1),
(197, 'SVN', 'Slovenia', 1),
(198, 'SLB', 'Solomon Islands', 1),
(199, 'SOM', 'Somalia', 1),
(200, 'ZAF', 'South Africa', 1),
(201, 'SGS', 'South Georgia and the South Sandwich Islands', 1),
(202, 'SSD', 'South Sudan', 1),
(203, 'ESP', 'Spain', 1),
(204, 'LKA', 'Sri Lanka', 1),
(205, 'SDN', 'Sudan', 1),
(206, 'SUR', 'Suriname', 1),
(207, 'SJM', 'Svalbard and Jan Mayen', 1),
(208, 'SWZ', 'Eswatini', 1),
(209, 'SWE', 'Sweden', 1),
(210, 'CHE', 'Switzerland', 1),
(211, 'SYR', 'Syria', 1),
(212, 'TWN', 'Taiwan', 1),
(213, 'TJK', 'Tajikistan', 1),
(214, 'TZA', 'Tanzania', 1),
(215, 'THA', 'Thailand', 1),
(216, 'TLS', 'Timor-Leste', 1),
(217, 'TGO', 'Togo', 1),
(218, 'TKL', 'Tokelau', 1),
(219, 'TON', 'Tonga', 1),
(220, 'TTO', 'Trinidad and Tobago', 1),
(221, 'TUN', 'Tunisia', 1),
(222, 'TUR', 'Turkey', 1),
(223, 'TKM', 'Turkmenistan', 1),
(224, 'TCA', 'Turks and Caicos Islands', 1),
(225, 'TUV', 'Tuvalu', 1),
(226, 'UGA', 'Uganda', 1),
(227, 'UKR', 'Ukraine', 1),
(228, 'ARE', 'United Arab Emirates', 1),
(229, 'GBR', 'United Kingdom', 1),
(230, 'USA', 'United States', 1),
(231, 'UMI', 'United States Minor Outlying Islands', 1),
(232, 'URY', 'Uruguay', 1),
(233, 'UZB', 'Uzbekistan', 1),
(234, 'VUT', 'Vanuatu', 1),
(235, 'VEN', 'Venezuela', 1),
(236, 'VNM', 'Vietnam', 1),
(237, 'VGB', 'Virgin Islands, British', 1),
(238, 'VIR', 'Virgin Islands, U.S.', 1),
(239, 'WLF', 'Wallis and Futuna', 1),
(240, 'ESH', 'Western Sahara', 1),
(241, 'YEM', 'Yemen', 1),
(242, 'ZMB', 'Zambia', 1),
(243, 'ZWE', 'Zimbabwe', 1);

-- --------------------------------------------------------

--
-- Table structure for table `currencies`
--

CREATE TABLE `currencies` (
  `id` int UNSIGNED NOT NULL,
  `code` varchar(3) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'ISO 4217 currency code (e.g., USD, EUR)',
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Full currency name',
  `symbol` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Currency symbol (e.g., $, €, £)',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Whether currency is available for selection',
  `is_default` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Whether this is the default currency',
  `sort_order` int UNSIGNED NOT NULL DEFAULT '0' COMMENT 'Display order',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` int UNSIGNED DEFAULT NULL COMMENT 'Admin who created this currency',
  `updated_by` int UNSIGNED DEFAULT NULL COMMENT 'Admin who last updated this currency'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Currency management for the platform';

--
-- Dumping data for table `currencies`
--

INSERT INTO `currencies` (`id`, `code`, `name`, `symbol`, `is_active`, `is_default`, `sort_order`, `created_at`, `updated_at`, `created_by`, `updated_by`) VALUES
(1, 'USD', 'US Dollar', '$', 1, 1, 1, '2026-02-11 17:23:47', '2026-02-11 17:23:47', NULL, NULL),
(2, 'EUR', 'Euro', '€', 1, 0, 2, '2026-02-11 17:23:47', '2026-02-11 17:23:47', NULL, NULL),
(3, 'GBP', 'British Pound', '£', 1, 0, 3, '2026-02-11 17:23:47', '2026-02-11 17:23:47', NULL, NULL),
(5, 'INR', 'Indian Rupee', '₹', 1, 0, 5, '2026-02-11 17:23:47', '2026-02-13 05:48:47', NULL, NULL),
(8, 'AUD', 'Australian Dollar', 'A$', 1, 0, 8, '2026-02-11 17:23:47', '2026-02-13 08:39:50', NULL, NULL),
(9, 'CAD', 'Canadian Dollar', 'C$', 0, 0, 9, '2026-02-11 17:23:47', '2026-02-12 04:27:45', NULL, NULL),
(10, 'JPY', 'Japanese Yen', '¥', 1, 0, 10, '2026-02-11 17:23:47', '2026-02-13 08:39:54', NULL, NULL),
(12, 'BRL', 'Brazilian Real', 'BR$', 0, 0, 6, '2026-02-12 04:41:31', '2026-02-13 08:39:36', 3, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `customer_activity_logs`
--

CREATE TABLE `customer_activity_logs` (
  `id` bigint NOT NULL,
  `customer_id` bigint UNSIGNED NOT NULL,
  `admin_user_id` bigint UNSIGNED DEFAULT NULL COMMENT 'Admin who performed the action (if applicable)',
  `action` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Action performed (login, profile_update, status_change, etc.)',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Detailed description of the action',
  `ip_address` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'IP address where action originated',
  `user_agent` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Browser/device information',
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin COMMENT 'Additional action metadata',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `customer_sessions`
--

CREATE TABLE `customer_sessions` (
  `id` int NOT NULL,
  `customer_id` bigint UNSIGNED NOT NULL,
  `token_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'JWT token hash for security',
  `refresh_token_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Refresh token hash',
  `device_info` text COLLATE utf8mb4_unicode_ci COMMENT 'Device/browser information',
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'IP address of the session',
  `expires_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Token expiry timestamp',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Customer JWT session management';

--
-- Dumping data for table `customer_sessions`
--



-- --------------------------------------------------------

--
-- Table structure for table `customer_users`
--

CREATE TABLE `customer_users` (
  `id` bigint UNSIGNED NOT NULL,
  `customer_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Generated unique customer identifier',
  `first_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Customer first name',
  `last_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Customer last name',
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Customer email address',
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Customer phone number',
  `status` enum('active','inactive','blocked','deleted','pending_verification') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending_verification' COMMENT 'Customer account status including email verification',
  `total_bookings` int UNSIGNED NOT NULL DEFAULT '0' COMMENT 'Total number of bookings made',
  `total_spent` decimal(12,2) UNSIGNED NOT NULL DEFAULT '0.00' COMMENT 'Total amount spent',
  `average_booking_value` decimal(10,2) UNSIGNED NOT NULL DEFAULT '0.00' COMMENT 'Average booking value',
  `last_booking_at` timestamp NULL DEFAULT NULL COMMENT 'Date of most recent booking',
  `first_booking_at` timestamp NULL DEFAULT NULL COMMENT 'Date of first booking',
  `preferred_sports` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin COMMENT 'Sports preferences based on booking history',
  `marketing_consent` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Marketing communication consent',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Admin notes about customer',
  `blocked_reason` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Reason for blocking if status is blocked',
  `blocked_by` bigint UNSIGNED DEFAULT NULL COMMENT 'Admin who blocked the customer',
  `blocked_at` timestamp NULL DEFAULT NULL COMMENT 'When customer was blocked',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Customer password hash for authentication',
  `email_verified` tinyint(1) DEFAULT '0' COMMENT 'Email verification status',
  `email_verification_token` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Email verification token',
  `password_reset_token` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Password reset token',
  `password_reset_expires` timestamp NULL DEFAULT NULL COMMENT 'Password reset token expiry',
  `last_login` timestamp NULL DEFAULT NULL COMMENT 'Last successful login timestamp',
  `street` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Street name',
  `house_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Customer last name',
  `zipcode` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Zip code',
  `city` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'City name',
  `country_code` varchar(5) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Country code for phone number',
  `failed_login_attempts` int DEFAULT '0' COMMENT 'Count of failed login attempts',
  `locked_until` timestamp NULL DEFAULT NULL COMMENT 'Account lock expiry time',
  `two_factor_enabled` tinyint(1) DEFAULT '0' COMMENT 'Two-factor authentication status',
  `two_factor_secret` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Two-factor authentication secret',
  `date_of_birth` date DEFAULT NULL COMMENT 'Customer date of birth',
  `gender` enum('male','female','other','prefer_not_to_say') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Customer gender'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `customer_users`
--



-- --------------------------------------------------------

--
-- Table structure for table `email_logs`
--

CREATE TABLE `email_logs` (
  `id` bigint UNSIGNED NOT NULL,
  `recipient_email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Email recipient',
  `recipient_type` enum('customer','admin','system') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Type of recipient',
  `subject` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Email subject line',
  `template_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Email template used',
  `status` enum('pending','sent','failed','bounced') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending' COMMENT 'Email delivery status',
  `provider_message_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Email provider message ID',
  `error_message` text COLLATE utf8mb4_unicode_ci COMMENT 'Error details if failed',
  `sent_at` timestamp NULL DEFAULT NULL COMMENT 'When email was sent',
  `opened_at` timestamp NULL DEFAULT NULL COMMENT 'When email was opened (if tracked)',
  `clicked_at` timestamp NULL DEFAULT NULL COMMENT 'When email links were clicked',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Email delivery tracking and audit';

-- --------------------------------------------------------

--
-- Table structure for table `hospitalities`
--

CREATE TABLE `hospitalities` (
  `id` bigint UNSIGNED NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Name of the hospitality service',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT 'Description of what the service includes',
  `price_usd` decimal(10,2) DEFAULT NULL COMMENT 'Legacy price field - no longer used for new services',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Whether the service is currently available',
  `sort_order` int NOT NULL DEFAULT '0' COMMENT 'Display order for the service',
  `created_by` bigint UNSIGNED DEFAULT NULL COMMENT 'Admin user who created the service',
  `updated_by` bigint UNSIGNED DEFAULT NULL COMMENT 'Admin user who last updated the service',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Hospitality services management';

--
-- Dumping data for table `hospitalities`
--

INSERT INTO `hospitalities` (`id`, `name`, `description`, `price_usd`, `is_active`, `sort_order`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES
(4, '100 Club', '<ul><li><p>Description </p></li><li><p>The 100 Club </p></li><li><p>Ticket includes:</p></li><li><p>Luxury Padded Seats North West Quadrant NW3435/3436 </p></li><li><p>Access to lounge 3 Hours </p></li><li><p>Pre/1 Hour </p></li><li><p>Post Match Complimentary </p></li><li><p>Hot Food Station </p></li><li><p>Complimentary Match </p></li><li><p>Programme Half-Time Tea and Coffee</p></li></ul><p></p>', NULL, 1, 0, 3, 3, '2026-02-13 10:18:21', '2026-02-18 08:11:22');

-- --------------------------------------------------------

--
-- Table structure for table `hospitality_assignments`
--

CREATE TABLE `hospitality_assignments` (
  `id` bigint UNSIGNED NOT NULL,
  `hospitality_id` bigint UNSIGNED NOT NULL COMMENT 'FK to hospitalities table',
  `sport_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'XS2Event sport type slug (e.g., soccer, motorsport, tennis)',
  `tournament_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'XS2Event tournament ID',
  `team_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'XS2Event team ID (only for team-based sports)',
  `event_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'XS2Event event ID',
  `ticket_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'XS2Event ticket ID (most specific level)',
  `sport_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Display name for the sport',
  `tournament_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Display name for the tournament',
  `team_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Display name for the team',
  `event_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Display name for the event',
  `ticket_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Display name for the ticket category',
  `level` enum('sport','tournament','team','event','ticket') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'The hierarchy level this assignment targets',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Whether this assignment is currently active',
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `updated_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Hierarchical hospitality service assignments (sport > tournament > team > event > ticket)';

--
-- Dumping data for table `hospitality_assignments`
--

INSERT INTO `hospitality_assignments` (`id`, `hospitality_id`, `sport_type`, `tournament_id`, `team_id`, `event_id`, `ticket_id`, `sport_name`, `tournament_name`, `team_name`, `event_name`, `ticket_name`, `level`, `is_active`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES
(41, 4, 'soccer', NULL, NULL, NULL, NULL, 'Soccer', NULL, NULL, NULL, NULL, 'sport', 1, 3, 3, '2026-02-18 07:59:08', '2026-02-18 07:59:08');

-- --------------------------------------------------------

--
-- Table structure for table `markup_rules`
--

CREATE TABLE `markup_rules` (
  `id` bigint UNSIGNED NOT NULL,
  `sport_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'XS2Event sport type slug (e.g., soccer, motorsport, tennis)',
  `tournament_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'XS2Event tournament ID',
  `team_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'XS2Event team ID (only for team-based sports)',
  `event_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'XS2Event event ID',
  `ticket_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'XS2Event ticket ID (most specific level)',
  `markup_type` enum('fixed','percentage') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'fixed' COMMENT 'Type of markup: fixed USD amount or percentage of base price',
  `markup_amount` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'Fixed amount in USD or percentage value depending on markup_type',
  `sport_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Display name for the sport',
  `tournament_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Display name for the tournament',
  `team_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Display name for the team',
  `event_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Display name for the event',
  `ticket_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Display name for the ticket category',
  `level` enum('sport','tournament','team','event','ticket') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'The hierarchy level this rule applies to',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Whether this rule is currently active',
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `updated_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Hierarchical markup pricing rules (sport > tournament > team > event > ticket)';

--
-- Dumping data for table `markup_rules`
--

INSERT INTO `markup_rules` (`id`, `sport_type`, `tournament_id`, `team_id`, `event_id`, `ticket_id`, `markup_type`, `markup_amount`, `sport_name`, `tournament_name`, `team_name`, `event_name`, `ticket_name`, `level`, `is_active`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES
(1, 'soccer', 'f306f395644a42e09821253d13637d70_trn', '6aa902ed038b4e64b3905372a943c614_tms', '9b0856d9aa964f259999212d121ff006_gnr', '742952afd8104a92b857c13132066ee2_spp', 'fixed', 10.00, 'Soccer', 'Premier League', 'Manchester United', 'Manchester United vs Nottingham Forest', 'Executive Lounge', 'ticket', 1, 3, 3, '2026-02-12 10:08:47', '2026-02-12 10:08:47'),
(2, 'soccer', 'f306f395644a42e09821253d13637d70_trn', '6aa902ed038b4e64b3905372a943c614_tms', '9b0856d9aa964f259999212d121ff006_gnr', NULL, 'percentage', 15.00, 'Soccer', 'Premier League', 'Manchester United', 'Manchester United vs Nottingham Forest', NULL, 'event', 1, 3, 3, '2026-02-12 10:09:03', '2026-02-13 08:43:18'),
(3, 'soccer', 'f306f395644a42e09821253d13637d70_trn', '6aa902ed038b4e64b3905372a943c614_tms', NULL, NULL, 'percentage', 12.00, 'Soccer', 'Premier League', 'Manchester United', NULL, NULL, 'team', 1, 3, 3, '2026-02-12 10:09:14', '2026-02-13 08:43:21'),
(4, 'soccer', 'f306f395644a42e09821253d13637d70_trn', NULL, NULL, NULL, 'percentage', 10.00, 'Soccer', 'Premier League', NULL, NULL, NULL, 'tournament', 1, 3, 3, '2026-02-12 10:09:21', '2026-02-13 08:42:50'),
(5, 'soccer', NULL, NULL, NULL, NULL, 'percentage', 8.00, 'Soccer', NULL, NULL, NULL, NULL, 'sport', 1, 3, 3, '2026-02-12 10:09:27', '2026-02-13 08:42:35'),
(6, 'soccer', 'f306f395644a42e09821253d13637d70_trn', '6aa902ed038b4e64b3905372a943c614_tms', '764dd883de654f60aadf5fe872cadd4a_gnr', 'c4d8eba21b964f06bc5b80da69e3b8dc_spp', 'percentage', 25.00, 'Soccer', 'Premier League', 'Manchester United', 'Manchester United vs Liverpool FC', 'Ticket Plus', 'ticket', 1, 3, 3, '2026-02-12 10:10:52', '2026-02-12 10:10:52'),
(7, 'cricket', NULL, NULL, NULL, NULL, 'percentage', 10.00, 'Cricket', NULL, NULL, NULL, NULL, 'sport', 1, 3, 3, '2026-02-13 05:45:38', '2026-02-13 08:42:21'),
(8, 'tennis', NULL, NULL, NULL, NULL, 'fixed', 50000.00, 'Tennis', NULL, NULL, NULL, NULL, 'sport', 1, 3, 3, '2026-02-13 09:43:41', '2026-02-13 09:43:41'),
(9, 'motorsport', NULL, NULL, NULL, NULL, 'fixed', 50000.00, 'Motorsport', NULL, NULL, NULL, NULL, 'sport', 1, 3, 3, '2026-02-13 09:46:13', '2026-02-13 09:46:13');

-- --------------------------------------------------------

--
-- Table structure for table `permissions`
--

CREATE TABLE `permissions` (
  `id` bigint NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `category` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_system` tinyint(1) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `permissions`
--

INSERT INTO `permissions` (`id`, `name`, `display_name`, `description`, `category`, `is_system`, `created_at`, `updated_at`) VALUES
(1, 'users.view', 'View Users', 'View user list and details', 'User Management', 1, '2025-10-02 04:59:43', '2025-10-02 04:59:43'),
(2, 'users.create', 'Create Users', 'Create new users', 'User Management', 1, '2025-10-02 04:59:43', '2025-10-02 04:59:43'),
(3, 'users.edit', 'Edit Users', 'Edit existing users', 'User Management', 1, '2025-10-02 04:59:43', '2025-10-02 04:59:43'),
(4, 'users.delete', 'Delete Users', 'Delete users', 'User Management', 1, '2025-10-02 04:59:43', '2025-10-02 04:59:43'),
(5, 'users.manage_roles', 'Manage User Roles', 'Assign and change user roles', 'User Management', 1, '2025-10-02 04:59:43', '2025-10-02 04:59:43'),
(6, 'roles.view', 'View Roles', 'View role list and details', 'Role Management', 1, '2025-10-02 04:59:43', '2025-10-02 04:59:43'),
(7, 'roles.create', 'Create Roles', 'Create new roles', 'Role Management', 1, '2025-10-02 04:59:43', '2025-10-02 04:59:43'),
(8, 'roles.edit', 'Edit Roles', 'Edit existing roles', 'Role Management', 1, '2025-10-02 04:59:43', '2025-10-02 04:59:43'),
(9, 'roles.delete', 'Delete Roles', 'Delete roles', 'Role Management', 1, '2025-10-02 04:59:43', '2025-10-02 04:59:43'),
(10, 'roles.manage_permissions', 'Manage Role Permissions', 'Assign permissions to roles', 'Role Management', 1, '2025-10-02 04:59:43', '2025-10-02 04:59:43'),
(11, 'bookings.view', 'View Bookings', 'View booking list and details', 'Booking Management', 1, '2025-10-02 04:59:43', '2025-10-02 04:59:43'),
(12, 'bookings.create', 'Create Bookings', 'Create new bookings', 'Booking Management', 1, '2025-10-02 04:59:43', '2025-10-02 04:59:43'),
(13, 'bookings.edit', 'Edit Bookings', 'Edit existing bookings', 'Booking Management', 1, '2025-10-02 04:59:43', '2025-10-02 04:59:43'),
(14, 'bookings.delete', 'Delete Bookings', 'Delete bookings', 'Booking Management', 1, '2025-10-02 04:59:43', '2025-10-02 04:59:43'),
(15, 'bookings.approve', 'Approve Bookings', 'Approve or reject bookings', 'Booking Management', 1, '2025-10-02 04:59:43', '2025-10-02 04:59:43'),
(16, 'refunds.view', 'View Refunds', 'View refund requests', 'Refund Management', 1, '2025-10-02 04:59:43', '2025-10-02 04:59:43'),
(17, 'refunds.process', 'Process Refunds', 'Process refund requests', 'Refund Management', 1, '2025-10-02 04:59:43', '2025-10-02 04:59:43'),
(18, 'refunds.approve', 'Approve Refunds', 'Approve or reject refunds', 'Refund Management', 1, '2025-10-02 04:59:43', '2025-10-02 04:59:43'),
(19, 'content.view', 'View Content', 'View content items', 'Content Management', 1, '2025-10-02 04:59:43', '2025-10-02 04:59:43'),
(20, 'content.create', 'Create Content', 'Create new content', 'Content Management', 1, '2025-10-02 04:59:43', '2025-10-02 04:59:43'),
(21, 'content.edit', 'Edit Content', 'Edit existing content', 'Content Management', 1, '2025-10-02 04:59:43', '2025-10-02 04:59:43'),
(22, 'content.delete', 'Delete Content', 'Delete content', 'Content Management', 1, '2025-10-02 04:59:43', '2025-10-02 04:59:43'),
(23, 'content.publish', 'Publish Content', 'Publish or unpublish content', 'Content Management', 1, '2025-10-02 04:59:43', '2025-10-02 04:59:43'),
(24, 'reports.view', 'View Reports', 'View reports and analytics', 'Reports & Analytics', 1, '2025-10-02 04:59:43', '2025-10-02 04:59:43'),
(25, 'reports.export', 'Export Reports', 'Export reports to various formats', 'Reports & Analytics', 1, '2025-10-02 04:59:43', '2025-10-02 04:59:43'),
(26, 'analytics.view', 'View Analytics', 'View analytics dashboards', 'Reports & Analytics', 1, '2025-10-02 04:59:43', '2025-10-02 04:59:43'),
(27, 'system.settings', 'System Settings', 'Manage system settings', 'System Administration', 1, '2025-10-02 04:59:43', '2025-10-02 04:59:43'),
(28, 'system.logs', 'View System Logs', 'View system and activity logs', 'System Administration', 1, '2025-10-02 04:59:43', '2025-10-02 04:59:43'),
(29, 'system.backup', 'System Backup', 'Manage system backups', 'System Administration', 1, '2025-10-02 04:59:43', '2025-10-02 04:59:43'),
(30, 'customers.view', '', 'View customer list and details', 'Customer Management', 0, '2025-10-13 05:08:34', '2025-10-13 05:08:34'),
(31, 'customers.manage', '', 'Enable/disable customer accounts and manage status', 'Customer Management', 0, '2025-10-13 05:08:34', '2025-10-13 05:08:34'),
(32, 'customers.export', '', 'Export customer data and reports', 'Customer Management', 0, '2025-10-13 05:08:34', '2025-10-13 05:08:34'),
(33, 'customers.notes', '', 'Add and edit customer notes', 'Customer Management', 0, '2025-10-13 05:08:34', '2025-10-13 05:08:34');

-- --------------------------------------------------------

--
-- Table structure for table `refund_requests`
--

CREATE TABLE `refund_requests` (
  `id` bigint UNSIGNED NOT NULL,
  `refund_reference` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Human-readable refund reference',
  `booking_id` bigint UNSIGNED NOT NULL COMMENT 'Reference to original booking',
  `customer_user_id` bigint UNSIGNED NOT NULL COMMENT 'Customer requesting refund',
  `requested_amount` decimal(12,2) UNSIGNED NOT NULL COMMENT 'Amount requested for refund',
  `approved_amount` decimal(12,2) UNSIGNED NOT NULL DEFAULT '0.00' COMMENT 'Approved refund amount',
  `processing_fee` decimal(8,2) UNSIGNED NOT NULL DEFAULT '0.00' COMMENT 'Deducted processing fee',
  `net_refund_amount` decimal(12,2) UNSIGNED NOT NULL DEFAULT '0.00' COMMENT 'Final refund amount',
  `refund_reason` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Customer reason for refund request',
  `refund_type` enum('full','partial','processing_fee_only') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'full' COMMENT 'Type of refund',
  `customer_bank_details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin COMMENT 'Customer banking information for refund',
  `status` enum('pending','under_review','approved','rejected','processed','failed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending' COMMENT 'Refund status',
  `priority` enum('low','normal','high','urgent') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'normal' COMMENT 'Processing priority',
  `reviewed_by` bigint UNSIGNED DEFAULT NULL COMMENT 'Admin who reviewed the request',
  `processed_by` bigint UNSIGNED DEFAULT NULL COMMENT 'Admin who processed the refund',
  `admin_notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Internal processing notes',
  `rejection_reason` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Reason for rejection if applicable',
  `payment_system_reference` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Payment gateway refund reference',
  `external_status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Status from payment processor',
  `requested_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'When refund was requested',
  `reviewed_at` timestamp NULL DEFAULT NULL COMMENT 'When request was reviewed',
  `approved_at` timestamp NULL DEFAULT NULL COMMENT 'When request was approved',
  `processed_at` timestamp NULL DEFAULT NULL COMMENT 'When refund was processed',
  `completed_at` timestamp NULL DEFAULT NULL COMMENT 'When customer received refund',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `refund_requests`
--



-- --------------------------------------------------------

--
-- Table structure for table `revenue_analytics`
--

CREATE TABLE `revenue_analytics` (
  `id` bigint UNSIGNED NOT NULL,
  `analytics_date` date NOT NULL COMMENT 'Date for this analytics record',
  `period_type` enum('daily','weekly','monthly') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'daily' COMMENT 'Analytics period type',
  `total_bookings` int UNSIGNED NOT NULL DEFAULT '0' COMMENT 'Total bookings for period',
  `confirmed_bookings` int UNSIGNED NOT NULL DEFAULT '0' COMMENT 'Confirmed bookings',
  `cancelled_bookings` int UNSIGNED NOT NULL DEFAULT '0' COMMENT 'Cancelled bookings',
  `pending_bookings` int UNSIGNED NOT NULL DEFAULT '0' COMMENT 'Pending bookings',
  `total_revenue` decimal(15,2) UNSIGNED NOT NULL DEFAULT '0.00' COMMENT 'Total revenue',
  `confirmed_revenue` decimal(15,2) UNSIGNED NOT NULL DEFAULT '0.00' COMMENT 'Revenue from confirmed bookings',
  `pending_revenue` decimal(15,2) UNSIGNED NOT NULL DEFAULT '0.00' COMMENT 'Revenue from pending bookings',
  `refunded_amount` decimal(15,2) UNSIGNED NOT NULL DEFAULT '0.00' COMMENT 'Total refunds',
  `net_revenue` decimal(15,2) NOT NULL DEFAULT '0.00' COMMENT 'Net revenue after refunds',
  `commission_earned` decimal(12,2) UNSIGNED NOT NULL DEFAULT '0.00' COMMENT 'Total commission',
  `unique_customers` int UNSIGNED NOT NULL DEFAULT '0' COMMENT 'Unique customers who booked',
  `new_customers` int UNSIGNED NOT NULL DEFAULT '0' COMMENT 'First-time customers',
  `returning_customers` int UNSIGNED NOT NULL DEFAULT '0' COMMENT 'Returning customers',
  `average_booking_value` decimal(10,2) UNSIGNED NOT NULL DEFAULT '0.00' COMMENT 'Average booking value',
  `top_sport_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Most popular sport',
  `top_venue` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Most popular venue',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Pre-aggregated analytics data for fast reporting';

--
-- Dumping data for table `revenue_analytics`
--



-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id` bigint NOT NULL,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `level` int NOT NULL DEFAULT '0',
  `is_system` tinyint(1) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`id`, `name`, `display_name`, `description`, `level`, `is_system`, `created_at`, `updated_at`) VALUES
(1, 'super_admin', 'Super Administrator', 'Full system access with all permissions', 100, 1, '2025-10-02 04:59:43', '2025-10-02 04:59:43'),
(2, 'admin', 'Administrator', 'Administrative access with most permissions', 90, 1, '2025-10-02 04:59:43', '2025-10-02 04:59:43'),
(3, 'manager', 'Manager', 'Management access with limited permissions', 75, 1, '2025-10-02 04:59:43', '2025-10-02 04:59:43'),
(4, 'staff', 'Staff', 'Operational access with basic permissions', 50, 0, '2025-10-02 04:59:43', '2025-10-12 20:41:10');

-- --------------------------------------------------------

--
-- Table structure for table `role_permissions`
--

CREATE TABLE `role_permissions` (
  `id` bigint NOT NULL,
  `role_id` bigint NOT NULL,
  `permission_id` bigint NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `role_permissions`
--

INSERT INTO `role_permissions` (`id`, `role_id`, `permission_id`, `created_at`) VALUES
(1, 1, 11, '2025-10-02 04:59:43'),
(2, 1, 12, '2025-10-02 04:59:43'),
(3, 1, 13, '2025-10-02 04:59:43'),
(4, 1, 14, '2025-10-02 04:59:43'),
(5, 1, 15, '2025-10-02 04:59:43'),
(6, 1, 19, '2025-10-02 04:59:43'),
(7, 1, 20, '2025-10-02 04:59:43'),
(8, 1, 21, '2025-10-02 04:59:43'),
(9, 1, 22, '2025-10-02 04:59:43'),
(10, 1, 23, '2025-10-02 04:59:43'),
(11, 1, 16, '2025-10-02 04:59:43'),
(12, 1, 17, '2025-10-02 04:59:43'),
(13, 1, 18, '2025-10-02 04:59:43'),
(14, 1, 24, '2025-10-02 04:59:43'),
(15, 1, 25, '2025-10-02 04:59:43'),
(16, 1, 26, '2025-10-02 04:59:43'),
(17, 1, 6, '2025-10-02 04:59:43'),
(18, 1, 7, '2025-10-02 04:59:43'),
(19, 1, 8, '2025-10-02 04:59:43'),
(20, 1, 9, '2025-10-02 04:59:43'),
(21, 1, 10, '2025-10-02 04:59:43'),
(22, 1, 27, '2025-10-02 04:59:43'),
(23, 1, 28, '2025-10-02 04:59:43'),
(24, 1, 29, '2025-10-02 04:59:43'),
(25, 1, 1, '2025-10-02 04:59:43'),
(26, 1, 2, '2025-10-02 04:59:43'),
(27, 1, 3, '2025-10-02 04:59:43'),
(28, 1, 4, '2025-10-02 04:59:43'),
(29, 1, 5, '2025-10-02 04:59:43'),
(32, 2, 26, '2025-10-02 04:59:43'),
(33, 2, 15, '2025-10-02 04:59:43'),
(34, 2, 12, '2025-10-02 04:59:43'),
(35, 2, 14, '2025-10-02 04:59:43'),
(36, 2, 13, '2025-10-02 04:59:43'),
(37, 2, 11, '2025-10-02 04:59:43'),
(38, 2, 20, '2025-10-02 04:59:43'),
(39, 2, 22, '2025-10-02 04:59:43'),
(40, 2, 21, '2025-10-02 04:59:43'),
(41, 2, 23, '2025-10-02 04:59:43'),
(42, 2, 19, '2025-10-02 04:59:43'),
(43, 2, 18, '2025-10-02 04:59:43'),
(44, 2, 17, '2025-10-02 04:59:43'),
(45, 2, 16, '2025-10-02 04:59:43'),
(46, 2, 25, '2025-10-02 04:59:43'),
(47, 2, 24, '2025-10-02 04:59:43'),
(48, 2, 7, '2025-10-02 04:59:43'),
(49, 2, 8, '2025-10-02 04:59:43'),
(50, 2, 10, '2025-10-02 04:59:43'),
(51, 2, 6, '2025-10-02 04:59:43'),
(52, 2, 28, '2025-10-02 04:59:43'),
(53, 2, 27, '2025-10-02 04:59:43'),
(54, 2, 2, '2025-10-02 04:59:43'),
(55, 2, 4, '2025-10-02 04:59:43'),
(56, 2, 3, '2025-10-02 04:59:43'),
(57, 2, 5, '2025-10-02 04:59:43'),
(58, 2, 1, '2025-10-02 04:59:43'),
(63, 3, 11, '2025-10-02 04:59:43'),
(64, 3, 12, '2025-10-02 04:59:43'),
(65, 3, 13, '2025-10-02 04:59:43'),
(66, 3, 15, '2025-10-02 04:59:43'),
(67, 3, 16, '2025-10-02 04:59:43'),
(68, 3, 17, '2025-10-02 04:59:43'),
(69, 3, 18, '2025-10-02 04:59:43'),
(70, 3, 19, '2025-10-02 04:59:43'),
(71, 3, 20, '2025-10-02 04:59:43'),
(72, 3, 21, '2025-10-02 04:59:43'),
(73, 3, 23, '2025-10-02 04:59:43'),
(74, 3, 24, '2025-10-02 04:59:43'),
(75, 3, 25, '2025-10-02 04:59:43'),
(76, 3, 26, '2025-10-02 04:59:43'),
(110, 4, 15, '2025-10-12 20:41:10'),
(111, 4, 14, '2025-10-12 20:41:10'),
(112, 4, 13, '2025-10-12 20:41:10'),
(113, 4, 11, '2025-10-12 20:41:10'),
(114, 4, 20, '2025-10-12 20:41:10'),
(115, 4, 22, '2025-10-12 20:41:10'),
(116, 4, 21, '2025-10-12 20:41:10'),
(117, 4, 23, '2025-10-12 20:41:10'),
(118, 4, 19, '2025-10-12 20:41:10'),
(119, 4, 24, '2025-10-12 20:41:10');

-- --------------------------------------------------------

--
-- Table structure for table `system_settings`
--

CREATE TABLE `system_settings` (
  `id` bigint UNSIGNED NOT NULL,
  `setting_key` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Unique setting identifier',
  `setting_value` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Setting value (JSON for complex data)',
  `setting_type` enum('string','number','boolean','json','encrypted') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'string' COMMENT 'Data type of setting',
  `category` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'general' COMMENT 'Setting category for organization',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Human-readable description',
  `is_public` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Whether setting can be accessed by frontend',
  `validation_rules` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin COMMENT 'Validation rules for the setting',
  `default_value` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Default value for the setting',
  `updated_by` bigint UNSIGNED DEFAULT NULL COMMENT 'Admin who last updated',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `system_settings`
--

INSERT INTO `system_settings` (`id`, `setting_key`, `setting_value`, `setting_type`, `category`, `description`, `is_public`, `validation_rules`, `default_value`, `updated_by`, `created_at`, `updated_at`) VALUES
(1, 'site_name', 'Rondo Sports Admin', 'string', 'general', 'Application name displayed in admin panel', 1, NULL, NULL, NULL, '2025-10-01 12:39:22', '2025-10-01 12:39:22'),
(2, 'site_url', 'https://admin.rondosportstickets.com', 'string', 'general', 'Admin panel URL for email links and notifications', 1, NULL, NULL, NULL, '2025-10-01 12:39:22', '2025-10-01 12:39:22'),
(3, 'timezone', 'UTC', 'string', 'general', 'Default system timezone for all timestamps', 1, NULL, NULL, NULL, '2025-10-01 12:39:22', '2025-10-01 12:39:22'),
(4, 'date_format', 'Y-m-d H:i:s', 'string', 'general', 'Default date format for display', 1, NULL, NULL, NULL, '2025-10-01 12:39:22', '2025-10-01 12:39:22'),
(5, 'currency', 'USD', 'string', 'financial', 'Default currency for all monetary values', 1, NULL, NULL, NULL, '2025-10-01 12:39:22', '2025-10-01 12:39:22'),
(6, 'currency_symbol', '$', 'string', 'financial', 'Currency symbol for display', 1, NULL, NULL, NULL, '2025-10-01 12:39:22', '2025-10-01 12:39:22'),
(7, 'max_refund_days', '30', 'number', 'financial', 'Maximum days after booking for refund requests', 0, NULL, NULL, NULL, '2025-10-01 12:39:22', '2025-10-01 12:39:22'),
(8, 'auto_approve_refunds_under', '100.00', 'number', 'financial', 'Auto-approve refunds under this amount in USD', 0, NULL, NULL, NULL, '2025-10-01 12:39:22', '2025-10-01 12:39:22'),
(9, 'processing_fee_percentage', '5.0', 'number', 'financial', 'Processing fee percentage for refunds', 0, NULL, NULL, NULL, '2025-10-01 12:39:22', '2025-10-01 12:39:22'),
(10, 'email_notifications_enabled', 'true', 'boolean', 'notifications', 'Enable email notifications system-wide', 0, NULL, NULL, NULL, '2025-10-01 12:39:22', '2025-10-01 12:39:22'),
(11, 'sms_notifications_enabled', 'false', 'boolean', 'notifications', 'Enable SMS notifications (requires provider setup)', 0, NULL, NULL, NULL, '2025-10-01 12:39:22', '2025-10-01 12:39:22'),
(12, 'maintenance_mode', 'false', 'boolean', 'system', 'Enable maintenance mode for system updates', 0, NULL, NULL, NULL, '2025-10-01 12:39:22', '2025-10-01 12:39:22'),
(13, 'session_timeout_minutes', '480', 'number', 'security', 'Admin session timeout in minutes (8 hours)', 0, NULL, NULL, NULL, '2025-10-01 12:39:22', '2025-10-01 12:39:22'),
(14, 'max_login_attempts', '5', 'number', 'security', 'Maximum failed login attempts before account lock', 0, NULL, NULL, NULL, '2025-10-01 12:39:22', '2025-10-01 12:39:22'),
(15, 'account_lockout_minutes', '30', 'number', 'security', 'Account lockout duration in minutes', 0, NULL, NULL, NULL, '2025-10-01 12:39:22', '2025-10-01 12:39:22'),
(16, 'password_min_length', '8', 'number', 'security', 'Minimum password length for admin accounts', 0, NULL, NULL, NULL, '2025-10-01 12:39:22', '2025-10-01 12:39:22'),
(17, 'require_password_change_days', '90', 'number', 'security', 'Require password change every N days (0 to disable)', 0, NULL, NULL, NULL, '2025-10-01 12:39:22', '2025-10-01 12:39:22'),
(18, 'backup_retention_days', '30', 'number', 'system', 'Database backup retention period in days', 0, NULL, NULL, NULL, '2025-10-01 12:39:22', '2025-10-01 12:39:22'),
(19, 'log_retention_days', '365', 'number', 'system', 'Activity log retention period in days', 0, NULL, NULL, NULL, '2025-10-01 12:39:22', '2025-10-01 12:39:22'),
(20, 'items_per_page', '25', 'number', 'ui', 'Default items per page in admin lists', 1, NULL, NULL, NULL, '2025-10-01 12:39:22', '2025-10-01 12:39:22');

-- --------------------------------------------------------

--
-- Table structure for table `team_credentials`
--

CREATE TABLE `team_credentials` (
  `id` bigint UNSIGNED NOT NULL,
  `sport_type` enum('soccer') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'soccer' COMMENT 'Sport type - currently only soccer',
  `tournament_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'External API tournament identifier',
  `team_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'External API team identifier',
  `team_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Team name from API for reference',
  `tournament_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Tournament name from API for reference',
  `short_description` text COLLATE utf8mb4_unicode_ci COMMENT 'Admin-provided team description',
  `logo_filename` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Team logo filename',
  `banner_filename` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Team banner filename',
  `logo_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Full URL to logo image',
  `banner_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Full URL to banner image',
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active' COMMENT 'Record status',
  `is_featured` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Featured team flag (0=not featured, 1=featured)',
  `created_by` bigint UNSIGNED DEFAULT NULL COMMENT 'Admin who created this record',
  `updated_by` bigint UNSIGNED DEFAULT NULL COMMENT 'Admin who last updated this record',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Team credentials and media assets';

--
-- Dumping data for table `team_credentials`
--

INSERT INTO `team_credentials` (`id`, `sport_type`, `tournament_id`, `team_id`, `team_name`, `tournament_name`, `short_description`, `logo_filename`, `banner_filename`, `logo_url`, `banner_url`, `status`, `is_featured`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES
(16, 'soccer', 'f306f395644a42e09821253d13637d70_trn', '7841dbb553b74476b9236a92f56f27e9_tms', 'Liverpool FC', 'Premier League', 'Liverpool Football Club is a professional football club based in Liverpool, England. The club competes in the Premier League, the top tier of English football. Founded in 1892, the club joined the Football League the following year and has played its home games at Anfield since its formation.', 'f306f395644a42e09821253d13637d70_trn_7841dbb553b74476b9236a92f56f27e9_tms_logo.png', 'f306f395644a42e09821253d13637d70_trn_7841dbb553b74476b9236a92f56f27e9_tms_banner.jpg', '/images/team/logo/f306f395644a42e09821253d13637d70_trn_7841dbb553b74476b9236a92f56f27e9_tms_logo.png', '/images/team/banner/f306f395644a42e09821253d13637d70_trn_7841dbb553b74476b9236a92f56f27e9_tms_banner.jpg', 'active', 1, 3, 3, '2025-10-15 19:07:29', '2025-11-19 09:11:27'),
(17, 'soccer', 'f306f395644a42e09821253d13637d70_trn', 'dfb44529188449dcb4261cd7de773d6c_tms', 'West Ham United', 'Premier League', 'West Ham United Football Club is a professional football club based in Stratford, East London, England. The club competes in the Premier League, the top tier of English football. The club plays at the London Stadium, having moved from their former home, the Boleyn Ground, in 2016.', 'f306f395644a42e09821253d13637d70_trn_dfb44529188449dcb4261cd7de773d6c_tms_logo.png', 'f306f395644a42e09821253d13637d70_trn_dfb44529188449dcb4261cd7de773d6c_tms_banner.png', '/images/team/logo/f306f395644a42e09821253d13637d70_trn_dfb44529188449dcb4261cd7de773d6c_tms_logo.png', '/images/team/banner/f306f395644a42e09821253d13637d70_trn_dfb44529188449dcb4261cd7de773d6c_tms_banner.png', 'active', 0, 3, 3, '2025-10-21 07:05:00', '2025-11-19 09:42:29'),
(18, 'soccer', 'f306f395644a42e09821253d13637d70_trn', '6aa902ed038b4e64b3905372a943c614_tms', 'Manchester United', 'Premier League', 'Manchester United Football Club, commonly referred to as Man United or simply United, is a professional football club based in Old Trafford, Greater Manchester, England. They compete in the Premier League, the top tier of English', 'f306f395644a42e09821253d13637d70_trn_6aa902ed038b4e64b3905372a943c614_tms_logo.png', 'f306f395644a42e09821253d13637d70_trn_6aa902ed038b4e64b3905372a943c614_tms_banner.png', '/images/team/logo/f306f395644a42e09821253d13637d70_trn_6aa902ed038b4e64b3905372a943c614_tms_logo.png', '/images/team/banner/f306f395644a42e09821253d13637d70_trn_6aa902ed038b4e64b3905372a943c614_tms_banner.png', 'active', 0, 3, 3, '2025-10-21 07:06:00', '2025-12-18 10:57:38'),
(19, 'soccer', 'f306f395644a42e09821253d13637d70_trn', '3eae14a18975444a8af9d35f4e978f0e_tms', 'Arsenal FC', 'Premier League', 'The Arsenal Football Club is a professional football club based in Islington, North London, England. They compete in the Premier League, the top tier of English football. In domestic football, Arsenal have won 13 league titles (including one unbeaten title), a record 14 FA Cups, 2 League Cups, 17 FA Community Shields and a Football League Centenary Trophy.', 'f306f395644a42e09821253d13637d70_trn_3eae14a18975444a8af9d35f4e978f0e_tms_logo.png', 'f306f395644a42e09821253d13637d70_trn_3eae14a18975444a8af9d35f4e978f0e_tms_banner.jpg', '/images/team/logo/f306f395644a42e09821253d13637d70_trn_3eae14a18975444a8af9d35f4e978f0e_tms_logo.png', '/images/team/banner/f306f395644a42e09821253d13637d70_trn_3eae14a18975444a8af9d35f4e978f0e_tms_banner.jpg', 'active', 1, 3, 3, '2025-11-19 09:22:53', '2025-11-19 09:42:15'),
(20, 'soccer', '7a1ab967321244759f91645f40e4249d_trn', '020d76ffbffe41e19e95be8bdc8e599c_tms', 'Bayern München', 'Bundesliga', 'FC Bayern Munich is Germany’s most successful football club, known for its dominant performances in the Bundesliga and strong presence in European competitions. Based in Munich, the club has a rich history, world-class talent, and a culture built on excellence, discipline, and winning mentality.', '7a1ab967321244759f91645f40e4249d_trn_020d76ffbffe41e19e95be8bdc8e599c_tms_logo.png', '7a1ab967321244759f91645f40e4249d_trn_020d76ffbffe41e19e95be8bdc8e599c_tms_banner.jpg', '/images/team/logo/7a1ab967321244759f91645f40e4249d_trn_020d76ffbffe41e19e95be8bdc8e599c_tms_logo.png', '/images/team/banner/7a1ab967321244759f91645f40e4249d_trn_020d76ffbffe41e19e95be8bdc8e599c_tms_banner.jpg', 'active', 1, 3, 3, '2025-11-19 09:26:11', '2025-11-19 09:42:17'),
(21, 'soccer', 'f306f395644a42e09821253d13637d70_trn', '4e73121fb55e4fe482f3a0580568e763_tms', 'Tottenham Hotspur', 'Premier League', 'Tottenham Hotspur is a Premier League club based in North London, known for its attacking style, passionate fan base, and iconic home ground, the Tottenham Hotspur Stadium. The club has a strong history, competitive spirit, and a reputation for developing exciting talent.', 'f306f395644a42e09821253d13637d70_trn_4e73121fb55e4fe482f3a0580568e763_tms_logo.png', 'f306f395644a42e09821253d13637d70_trn_4e73121fb55e4fe482f3a0580568e763_tms_banner.jpg', '/images/team/logo/f306f395644a42e09821253d13637d70_trn_4e73121fb55e4fe482f3a0580568e763_tms_logo.png', '/images/team/banner/f306f395644a42e09821253d13637d70_trn_4e73121fb55e4fe482f3a0580568e763_tms_banner.jpg', 'active', 0, 3, 3, '2025-11-19 09:28:45', '2025-11-19 09:44:03'),
(22, 'soccer', 'f306f395644a42e09821253d13637d70_trn', 'dc35d8bfcf8e4fccbc649a2cb6a934a5_tms', 'Chelsea FC', 'Premier League', 'Chelsea FC - Founded in 1905 and based in Fulham, London, Chelsea (nicknamed The Blues) play their home games at Stamford Bridge. They have won 6 English top-flight titles, 8 FA Cups, 5 League Cups, and 4 Community Shields. In Europe, they’ve won the UEFA Champions League twice (2012, 2021), Europa League twice (2013, 2019), Cup Winners’ Cup twice, Super Cup twice, and in 2025 became the first club to win all four major UEFA men’s competitions by winning the Conference League.', 'f306f395644a42e09821253d13637d70_trn_dc35d8bfcf8e4fccbc649a2cb6a934a5_tms_logo.png', 'f306f395644a42e09821253d13637d70_trn_dc35d8bfcf8e4fccbc649a2cb6a934a5_tms_banner.jpg', '/images/team/logo/f306f395644a42e09821253d13637d70_trn_dc35d8bfcf8e4fccbc649a2cb6a934a5_tms_logo.png', '/images/team/banner/f306f395644a42e09821253d13637d70_trn_dc35d8bfcf8e4fccbc649a2cb6a934a5_tms_banner.jpg', 'active', 1, 3, 3, '2025-11-19 09:32:34', '2025-11-19 09:42:21'),
(23, 'soccer', '70aeb1d765344b198c8d65ab0957aa99_trn', 'bcc4503a040649c8819ffb580972dff7_tms', 'Napoli', 'Serie A', 'SSC Napoli — Based in Naples, Italy, Napoli was founded in 1926. They play at the Stadio Diego Armando Maradona. Napoli has won 4 Serie A titles, 6 Coppa Italia, 2 Supercoppa Italiana, and 1 UEFA Cup. They are the 2024–25 Serie A champions, under coach Antonio Conte.', '70aeb1d765344b198c8d65ab0957aa99_trn_bcc4503a040649c8819ffb580972dff7_tms_logo.png', '70aeb1d765344b198c8d65ab0957aa99_trn_bcc4503a040649c8819ffb580972dff7_tms_banner.jpg', '/images/team/logo/70aeb1d765344b198c8d65ab0957aa99_trn_bcc4503a040649c8819ffb580972dff7_tms_logo.png', '/images/team/banner/70aeb1d765344b198c8d65ab0957aa99_trn_bcc4503a040649c8819ffb580972dff7_tms_banner.jpg', 'active', 0, 3, 3, '2025-11-19 09:34:32', '2025-11-19 09:44:00'),
(24, 'soccer', '42407e31113847d3ba90dbae62e7fa65_trn', '03feddd0824543998013b5e464473bbc_tms', 'FC Barcelona', 'La Liga', 'FC Barcelona — Founded in 1899 by Joan Gamper, Barça is a Catalan club known for its attractive, possession‑based football. It plays at the historic Camp Nou. Barcelona has won 28 La Liga titles, multiple Copa del Reys, and five UEFA Champions League trophies. The club embodies Catalan identity and carries the motto “Més que un club” (More than a club).', '42407e31113847d3ba90dbae62e7fa65_trn_03feddd0824543998013b5e464473bbc_tms_logo.png', '42407e31113847d3ba90dbae62e7fa65_trn_03feddd0824543998013b5e464473bbc_tms_banner.jpg', '/images/team/logo/42407e31113847d3ba90dbae62e7fa65_trn_03feddd0824543998013b5e464473bbc_tms_logo.png', '/images/team/banner/42407e31113847d3ba90dbae62e7fa65_trn_03feddd0824543998013b5e464473bbc_tms_banner.jpg', 'active', 1, 3, 3, '2025-11-19 09:36:12', '2025-11-19 09:42:25'),
(25, 'soccer', '42407e31113847d3ba90dbae62e7fa65_trn', 'e9ff0821449445c7a55b06ffadeaed12_tms', 'Real Madrid', 'La Liga', 'Real Madrid CF - Founded in 1902 and based in Madrid, Spain, Real Madrid is one of the most successful clubs in world football. They’ve won a record 36 La Liga titles and 15 UEFA Champions League trophies. Known as “Los Blancos” for their iconic white kit, the club has a rich history with legends like Di Stéfano, Puskás, and Zidane.', '42407e31113847d3ba90dbae62e7fa65_trn_e9ff0821449445c7a55b06ffadeaed12_tms_logo.png', '42407e31113847d3ba90dbae62e7fa65_trn_e9ff0821449445c7a55b06ffadeaed12_tms_banner.jpg', '/images/team/logo/42407e31113847d3ba90dbae62e7fa65_trn_e9ff0821449445c7a55b06ffadeaed12_tms_logo.png', '/images/team/banner/42407e31113847d3ba90dbae62e7fa65_trn_e9ff0821449445c7a55b06ffadeaed12_tms_banner.jpg', 'active', 1, 3, 3, '2025-11-19 09:37:43', '2025-11-19 09:42:38'),
(26, 'soccer', '70aeb1d765344b198c8d65ab0957aa99_trn', 'a68f47efed3840bfa7b75b3d4fc085a4_tms', 'Internazionale', 'Serie A', 'Inter Milan (FC Internazionale Milano) - Founded in 1908, Inter is a major Italian club based in Milan. They’ve won 20 Serie A titles, 9 Coppa Italia, 8 Supercoppa Italiana, 3 UEFA Champions Leagues (including a 2010 treble), 3 UEFA Cups, 2 Intercontinental Cups, and a FIFA Club World Cup. They play home games at the legendary San Siro, shared with AC Milan.', '70aeb1d765344b198c8d65ab0957aa99_trn_a68f47efed3840bfa7b75b3d4fc085a4_tms_logo.png', '70aeb1d765344b198c8d65ab0957aa99_trn_a68f47efed3840bfa7b75b3d4fc085a4_tms_banner.jpg', '/images/team/logo/70aeb1d765344b198c8d65ab0957aa99_trn_a68f47efed3840bfa7b75b3d4fc085a4_tms_logo.png', '/images/team/banner/70aeb1d765344b198c8d65ab0957aa99_trn_a68f47efed3840bfa7b75b3d4fc085a4_tms_banner.jpg', 'active', 0, 3, 3, '2025-11-19 09:41:56', '2025-11-19 09:44:01'),
(27, 'soccer', 'f306f395644a42e09821253d13637d70_trn', 'e7909bcf4a53463685719bdd4f6e8d28_tms', 'Fulham', 'Premier League', NULL, 'f306f395644a42e09821253d13637d70_trn_e7909bcf4a53463685719bdd4f6e8d28_tms_logo.png', NULL, '/images/team/logo/f306f395644a42e09821253d13637d70_trn_e7909bcf4a53463685719bdd4f6e8d28_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-03 14:22:01', '2025-12-03 14:22:01'),
(28, 'soccer', 'f306f395644a42e09821253d13637d70_trn', '08a14e774b1545788e162b86db6f1e21_tms', 'Manchester City', 'Premier League', NULL, 'f306f395644a42e09821253d13637d70_trn_08a14e774b1545788e162b86db6f1e21_tms_logo.png', 'f306f395644a42e09821253d13637d70_trn_08a14e774b1545788e162b86db6f1e21_tms_banner.png', '/images/team/logo/f306f395644a42e09821253d13637d70_trn_08a14e774b1545788e162b86db6f1e21_tms_logo.png', '/images/team/banner/f306f395644a42e09821253d13637d70_trn_08a14e774b1545788e162b86db6f1e21_tms_banner.png', 'active', 0, 3, 3, '2025-12-03 14:31:20', '2025-12-14 09:10:01'),
(29, 'soccer', 'f306f395644a42e09821253d13637d70_trn', '63fc769246484161bd6d11cf86e4cf1b_tms', 'Crystal Palace', 'Premier League', NULL, 'f306f395644a42e09821253d13637d70_trn_63fc769246484161bd6d11cf86e4cf1b_tms_logo.png', NULL, '/images/team/logo/f306f395644a42e09821253d13637d70_trn_63fc769246484161bd6d11cf86e4cf1b_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-03 14:33:12', '2025-12-03 14:33:12'),
(30, 'soccer', 'f306f395644a42e09821253d13637d70_trn', '3425d6a489f747fc886627e569b437ec_tms', 'Newcastle United', 'Premier League', NULL, 'f306f395644a42e09821253d13637d70_trn_3425d6a489f747fc886627e569b437ec_tms_logo.png', 'f306f395644a42e09821253d13637d70_trn_3425d6a489f747fc886627e569b437ec_tms_banner.png', '/images/team/logo/f306f395644a42e09821253d13637d70_trn_3425d6a489f747fc886627e569b437ec_tms_logo.png', '/images/team/banner/f306f395644a42e09821253d13637d70_trn_3425d6a489f747fc886627e569b437ec_tms_banner.png', 'active', 0, 3, 3, '2025-12-03 14:33:50', '2025-12-14 10:15:54'),
(31, 'soccer', 'f306f395644a42e09821253d13637d70_trn', '134badfc382d40bf8fe9aad5dd08e132_tms', 'Everton FC', 'Premier League', NULL, 'f306f395644a42e09821253d13637d70_trn_134badfc382d40bf8fe9aad5dd08e132_tms_logo.png', NULL, '/images/team/logo/f306f395644a42e09821253d13637d70_trn_134badfc382d40bf8fe9aad5dd08e132_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-03 14:34:15', '2025-12-03 14:34:15'),
(32, 'soccer', 'f306f395644a42e09821253d13637d70_trn', '75ffe5d34dbb4a7291dec0e98b262423_tms', 'Aston Villa', 'Premier League', NULL, 'f306f395644a42e09821253d13637d70_trn_75ffe5d34dbb4a7291dec0e98b262423_tms_logo.png', NULL, '/images/team/logo/f306f395644a42e09821253d13637d70_trn_75ffe5d34dbb4a7291dec0e98b262423_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-03 14:37:13', '2025-12-03 14:37:13'),
(33, 'soccer', 'f306f395644a42e09821253d13637d70_trn', 'c97704551a824d6d94c0c3e8c8878684_tms', 'Brighton & Hove Albion', 'Premier League', NULL, 'f306f395644a42e09821253d13637d70_trn_c97704551a824d6d94c0c3e8c8878684_tms_logo.png', NULL, '/images/team/logo/f306f395644a42e09821253d13637d70_trn_c97704551a824d6d94c0c3e8c8878684_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-03 14:43:26', '2025-12-03 14:43:26'),
(34, 'soccer', 'f306f395644a42e09821253d13637d70_trn', 'da9ad447d5fa4c5fb2215541b731796e_tms', 'Burnley FC', 'Premier League', NULL, 'f306f395644a42e09821253d13637d70_trn_da9ad447d5fa4c5fb2215541b731796e_tms_logo.png', NULL, '/images/team/logo/f306f395644a42e09821253d13637d70_trn_da9ad447d5fa4c5fb2215541b731796e_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-03 14:43:59', '2025-12-18 10:56:20'),
(35, 'soccer', 'f306f395644a42e09821253d13637d70_trn', '2543e4be6d7642b9a4d8336d78d68336_tms', 'AFC Bournemouth', 'Premier League', NULL, 'f306f395644a42e09821253d13637d70_trn_2543e4be6d7642b9a4d8336d78d68336_tms_logo.png', NULL, '/images/team/logo/f306f395644a42e09821253d13637d70_trn_2543e4be6d7642b9a4d8336d78d68336_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-03 14:44:15', '2025-12-03 14:44:15'),
(37, 'soccer', 'f306f395644a42e09821253d13637d70_trn', 'beeb67e5b38e4453b4a7ad133f607cc8_tms', 'Sunderland', 'Premier League', NULL, 'f306f395644a42e09821253d13637d70_trn_beeb67e5b38e4453b4a7ad133f607cc8_tms_logo.png', NULL, '/images/team/logo/f306f395644a42e09821253d13637d70_trn_beeb67e5b38e4453b4a7ad133f607cc8_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-03 14:51:23', '2025-12-03 14:51:23'),
(38, 'soccer', 'f306f395644a42e09821253d13637d70_trn', '66585ef9ec9049cca0dbf5676a58c572_tms', 'Nottingham Forest', 'Premier League', NULL, 'f306f395644a42e09821253d13637d70_trn_66585ef9ec9049cca0dbf5676a58c572_tms_logo.png', NULL, '/images/team/logo/f306f395644a42e09821253d13637d70_trn_66585ef9ec9049cca0dbf5676a58c572_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-03 14:51:46', '2025-12-03 14:51:46'),
(39, 'soccer', 'f306f395644a42e09821253d13637d70_trn', 'fdcc26185eff4b439b008fc42243c605_tms', 'Brentford', 'Premier League', NULL, 'f306f395644a42e09821253d13637d70_trn_fdcc26185eff4b439b008fc42243c605_tms_logo.png', NULL, '/images/team/logo/f306f395644a42e09821253d13637d70_trn_fdcc26185eff4b439b008fc42243c605_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-03 14:52:09', '2025-12-03 14:52:09'),
(40, 'soccer', 'f306f395644a42e09821253d13637d70_trn', '0b9849de27c84ad0bd1f388a3691e2d3_tms', 'Leeds United', 'Premier League', NULL, 'f306f395644a42e09821253d13637d70_trn_0b9849de27c84ad0bd1f388a3691e2d3_tms_logo.png', NULL, '/images/team/logo/f306f395644a42e09821253d13637d70_trn_0b9849de27c84ad0bd1f388a3691e2d3_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-03 15:43:21', '2025-12-18 10:50:03'),
(41, 'soccer', '70aeb1d765344b198c8d65ab0957aa99_trn', 'a2d988e4ddb74c3ca523c9981b04931b_tms', 'Juventus FC', 'Serie A', NULL, '70aeb1d765344b198c8d65ab0957aa99_trn_a2d988e4ddb74c3ca523c9981b04931b_tms_logo.png', NULL, '/images/team/logo/70aeb1d765344b198c8d65ab0957aa99_trn_a2d988e4ddb74c3ca523c9981b04931b_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-03 15:47:41', '2025-12-03 15:47:41'),
(42, 'soccer', '70aeb1d765344b198c8d65ab0957aa99_trn', 'd4950bae396e42dd86db42d6dc6d3c2c_tms', 'Lazio Roma', 'Serie A', NULL, '70aeb1d765344b198c8d65ab0957aa99_trn_d4950bae396e42dd86db42d6dc6d3c2c_tms_logo.png', NULL, '/images/team/logo/70aeb1d765344b198c8d65ab0957aa99_trn_d4950bae396e42dd86db42d6dc6d3c2c_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-03 15:52:11', '2025-12-03 15:52:11'),
(43, 'soccer', '70aeb1d765344b198c8d65ab0957aa99_trn', '66038f7407444e64b3ce32a1499c0295_tms', 'AS Roma', 'Serie A', NULL, '70aeb1d765344b198c8d65ab0957aa99_trn_66038f7407444e64b3ce32a1499c0295_tms_logo.png', NULL, '/images/team/logo/70aeb1d765344b198c8d65ab0957aa99_trn_66038f7407444e64b3ce32a1499c0295_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-03 15:52:41', '2025-12-03 15:52:41'),
(44, 'soccer', '70aeb1d765344b198c8d65ab0957aa99_trn', '0a6d01abdc9a41a0b602f2dccff192a1_tms', 'Fiorentina', 'Serie A', NULL, '70aeb1d765344b198c8d65ab0957aa99_trn_0a6d01abdc9a41a0b602f2dccff192a1_tms_logo.png', NULL, '/images/team/logo/70aeb1d765344b198c8d65ab0957aa99_trn_0a6d01abdc9a41a0b602f2dccff192a1_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-03 15:53:10', '2025-12-03 15:53:10'),
(45, 'soccer', '70aeb1d765344b198c8d65ab0957aa99_trn', '08f657fc5f9c441481442467d9cff2a3_tms', 'AC Milan', 'Serie A', NULL, '70aeb1d765344b198c8d65ab0957aa99_trn_08f657fc5f9c441481442467d9cff2a3_tms_logo.png', NULL, '/images/team/logo/70aeb1d765344b198c8d65ab0957aa99_trn_08f657fc5f9c441481442467d9cff2a3_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-03 15:53:41', '2025-12-14 08:45:10'),
(46, 'soccer', '70aeb1d765344b198c8d65ab0957aa99_trn', '7c272899901942f2bf73a38fcacb80d9_tms', 'Atalanta', 'Serie A', NULL, '70aeb1d765344b198c8d65ab0957aa99_trn_7c272899901942f2bf73a38fcacb80d9_tms_logo.png', NULL, '/images/team/logo/70aeb1d765344b198c8d65ab0957aa99_trn_7c272899901942f2bf73a38fcacb80d9_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-03 15:56:29', '2025-12-03 15:56:29'),
(47, 'soccer', '70aeb1d765344b198c8d65ab0957aa99_trn', 'df06e68047a04f87b77b176010b87da4_tms', 'Genoa', 'Serie A', NULL, '70aeb1d765344b198c8d65ab0957aa99_trn_df06e68047a04f87b77b176010b87da4_tms_logo.png', NULL, '/images/team/logo/70aeb1d765344b198c8d65ab0957aa99_trn_df06e68047a04f87b77b176010b87da4_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-03 15:56:55', '2025-12-03 15:56:55'),
(48, 'soccer', '70aeb1d765344b198c8d65ab0957aa99_trn', '22f6ccb4332d4b29b3f93ac7d674faf4_tms', 'Bologna', 'Serie A', NULL, '70aeb1d765344b198c8d65ab0957aa99_trn_22f6ccb4332d4b29b3f93ac7d674faf4_tms_logo.png', NULL, '/images/team/logo/70aeb1d765344b198c8d65ab0957aa99_trn_22f6ccb4332d4b29b3f93ac7d674faf4_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-03 15:57:11', '2025-12-14 08:49:28'),
(49, 'soccer', '70aeb1d765344b198c8d65ab0957aa99_trn', '5278572635e649e28782df0fa61a27cf_tms', 'Torino', 'Serie A', NULL, '70aeb1d765344b198c8d65ab0957aa99_trn_5278572635e649e28782df0fa61a27cf_tms_logo.png', NULL, '/images/team/logo/70aeb1d765344b198c8d65ab0957aa99_trn_5278572635e649e28782df0fa61a27cf_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-03 15:57:34', '2025-12-03 15:57:34'),
(50, 'soccer', '70aeb1d765344b198c8d65ab0957aa99_trn', 'e0fdbd28abb24a3382ae55fec660d8be_tms', 'Parma', 'Serie A', NULL, '70aeb1d765344b198c8d65ab0957aa99_trn_e0fdbd28abb24a3382ae55fec660d8be_tms_logo.png', NULL, '/images/team/logo/70aeb1d765344b198c8d65ab0957aa99_trn_e0fdbd28abb24a3382ae55fec660d8be_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-03 15:57:55', '2025-12-03 16:00:26'),
(51, 'soccer', '70aeb1d765344b198c8d65ab0957aa99_trn', 'c3ff79914a2947719ae586f65374736e_tms', 'Pisa', 'Serie A', NULL, '70aeb1d765344b198c8d65ab0957aa99_trn_c3ff79914a2947719ae586f65374736e_tms_logo.png', NULL, '/images/team/logo/70aeb1d765344b198c8d65ab0957aa99_trn_c3ff79914a2947719ae586f65374736e_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-03 16:05:29', '2025-12-03 16:05:29'),
(52, 'soccer', '70aeb1d765344b198c8d65ab0957aa99_trn', '3962b01e050c46728897eb68dffc631c_tms', 'Lecce', 'Serie A', NULL, '70aeb1d765344b198c8d65ab0957aa99_trn_3962b01e050c46728897eb68dffc631c_tms_logo.png', NULL, '/images/team/logo/70aeb1d765344b198c8d65ab0957aa99_trn_3962b01e050c46728897eb68dffc631c_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-03 16:05:48', '2025-12-14 08:48:19'),
(53, 'soccer', '81f8ed0b51fc4730b857aa06082013ca_trn', '9f9f0466c48a43b48cd3ddd5fa38405b_tms', 'FC Volendam', 'Eredivisie', NULL, '81f8ed0b51fc4730b857aa06082013ca_trn_9f9f0466c48a43b48cd3ddd5fa38405b_tms_logo.png', NULL, '/images/team/logo/81f8ed0b51fc4730b857aa06082013ca_trn_9f9f0466c48a43b48cd3ddd5fa38405b_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-11 12:24:05', '2025-12-14 08:54:51'),
(54, 'soccer', '81f8ed0b51fc4730b857aa06082013ca_trn', 'ae6f1c727d114dea9aad758d268fc049_tms', 'Ajax', 'Eredivisie', NULL, '81f8ed0b51fc4730b857aa06082013ca_trn_ae6f1c727d114dea9aad758d268fc049_tms_logo.png', NULL, '/images/team/logo/81f8ed0b51fc4730b857aa06082013ca_trn_ae6f1c727d114dea9aad758d268fc049_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-11 12:26:39', '2025-12-14 08:54:20'),
(55, 'soccer', '81f8ed0b51fc4730b857aa06082013ca_trn', '42ad0e6bdea544c3bae386ba38b6e5ca_tms', 'PSV Eindhoven', 'Eredivisie', NULL, '81f8ed0b51fc4730b857aa06082013ca_trn_42ad0e6bdea544c3bae386ba38b6e5ca_tms_logo.png', '81f8ed0b51fc4730b857aa06082013ca_trn_42ad0e6bdea544c3bae386ba38b6e5ca_tms_banner.png', '/images/team/logo/81f8ed0b51fc4730b857aa06082013ca_trn_42ad0e6bdea544c3bae386ba38b6e5ca_tms_logo.png', '/images/team/banner/81f8ed0b51fc4730b857aa06082013ca_trn_42ad0e6bdea544c3bae386ba38b6e5ca_tms_banner.png', 'active', 0, 3, 3, '2025-12-11 12:27:27', '2025-12-14 10:18:04'),
(56, 'soccer', '81f8ed0b51fc4730b857aa06082013ca_trn', '56c96f16091d4ad193bb322902740209_tms', 'FC Utrecht', 'Eredivisie', NULL, '81f8ed0b51fc4730b857aa06082013ca_trn_56c96f16091d4ad193bb322902740209_tms_logo.png', NULL, '/images/team/logo/81f8ed0b51fc4730b857aa06082013ca_trn_56c96f16091d4ad193bb322902740209_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-11 12:28:47', '2025-12-14 08:54:04'),
(57, 'soccer', '7a1ab967321244759f91645f40e4249d_trn', 'f5e0f233e91e499fa31a4014fd4f57c4_tms', 'Werder Bremen', 'Bundesliga', NULL, '7a1ab967321244759f91645f40e4249d_trn_f5e0f233e91e499fa31a4014fd4f57c4_tms_logo.png', NULL, '/images/team/logo/7a1ab967321244759f91645f40e4249d_trn_f5e0f233e91e499fa31a4014fd4f57c4_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-11 12:40:07', '2025-12-11 12:40:07'),
(58, 'soccer', '42407e31113847d3ba90dbae62e7fa65_trn', '8866a6efbf39477082cc5dc01b94b76e_tms', 'Real Betis', 'La Liga', NULL, '42407e31113847d3ba90dbae62e7fa65_trn_8866a6efbf39477082cc5dc01b94b76e_tms_logo.png', NULL, '/images/team/logo/42407e31113847d3ba90dbae62e7fa65_trn_8866a6efbf39477082cc5dc01b94b76e_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-11 12:43:31', '2025-12-11 12:43:31'),
(59, 'soccer', '42407e31113847d3ba90dbae62e7fa65_trn', '7c1adff47e4c4f87ad8dd0d9cb10857c_tms', 'Sevilla FC', 'La Liga', NULL, '42407e31113847d3ba90dbae62e7fa65_trn_7c1adff47e4c4f87ad8dd0d9cb10857c_tms_logo.png', NULL, '/images/team/logo/42407e31113847d3ba90dbae62e7fa65_trn_7c1adff47e4c4f87ad8dd0d9cb10857c_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-11 12:44:51', '2025-12-11 12:44:51'),
(60, 'soccer', '42407e31113847d3ba90dbae62e7fa65_trn', 'ef8f8efefd4a48828b16653917ccb58a_tms', 'Real Sociedad', 'La Liga', NULL, '42407e31113847d3ba90dbae62e7fa65_trn_ef8f8efefd4a48828b16653917ccb58a_tms_logo.png', NULL, '/images/team/logo/42407e31113847d3ba90dbae62e7fa65_trn_ef8f8efefd4a48828b16653917ccb58a_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-11 12:45:14', '2025-12-11 12:45:14'),
(61, 'soccer', '42407e31113847d3ba90dbae62e7fa65_trn', 'f7c136fc263945aeb51952cc2f0078bb_tms', 'Girona', 'La Liga', NULL, '42407e31113847d3ba90dbae62e7fa65_trn_f7c136fc263945aeb51952cc2f0078bb_tms_logo.png', NULL, '/images/team/logo/42407e31113847d3ba90dbae62e7fa65_trn_f7c136fc263945aeb51952cc2f0078bb_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-11 12:48:45', '2025-12-11 12:48:45'),
(62, 'soccer', '42407e31113847d3ba90dbae62e7fa65_trn', '246f374efc9f4de4bfcaad4e4d04dd26_tms', 'Atlético Madrid', 'La Liga', NULL, '42407e31113847d3ba90dbae62e7fa65_trn_246f374efc9f4de4bfcaad4e4d04dd26_tms_logo.png', NULL, '/images/team/logo/42407e31113847d3ba90dbae62e7fa65_trn_246f374efc9f4de4bfcaad4e4d04dd26_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-11 12:49:05', '2025-12-11 12:49:05'),
(63, 'soccer', '42407e31113847d3ba90dbae62e7fa65_trn', '1dc1535e689d44088d2a765cd9b41ca1_tms', 'Villarreal CF', 'La Liga', NULL, '42407e31113847d3ba90dbae62e7fa65_trn_1dc1535e689d44088d2a765cd9b41ca1_tms_logo.png', NULL, '/images/team/logo/42407e31113847d3ba90dbae62e7fa65_trn_1dc1535e689d44088d2a765cd9b41ca1_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-11 12:51:07', '2025-12-11 12:51:07'),
(64, 'soccer', '42407e31113847d3ba90dbae62e7fa65_trn', '158faa1353434ea5b3529a88723e0d5b_tms', 'Valencia CF', 'La Liga', NULL, '42407e31113847d3ba90dbae62e7fa65_trn_158faa1353434ea5b3529a88723e0d5b_tms_logo.png', NULL, '/images/team/logo/42407e31113847d3ba90dbae62e7fa65_trn_158faa1353434ea5b3529a88723e0d5b_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-11 12:51:22', '2025-12-11 12:51:22'),
(65, 'soccer', '42407e31113847d3ba90dbae62e7fa65_trn', '44a01acb6e224bfea756b9c1723c5736_tms', 'Celta de Vigo', 'La Liga', NULL, '42407e31113847d3ba90dbae62e7fa65_trn_44a01acb6e224bfea756b9c1723c5736_tms_logo.png', NULL, '/images/team/logo/42407e31113847d3ba90dbae62e7fa65_trn_44a01acb6e224bfea756b9c1723c5736_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-11 12:53:21', '2025-12-11 12:53:21'),
(66, 'soccer', '42407e31113847d3ba90dbae62e7fa65_trn', '834f22a948f64dbc908c78cf544cc579_tms', 'Osasuna', 'La Liga', NULL, '42407e31113847d3ba90dbae62e7fa65_trn_834f22a948f64dbc908c78cf544cc579_tms_logo.png', NULL, '/images/team/logo/42407e31113847d3ba90dbae62e7fa65_trn_834f22a948f64dbc908c78cf544cc579_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-11 12:54:00', '2025-12-11 12:54:00'),
(67, 'soccer', '42407e31113847d3ba90dbae62e7fa65_trn', '75e4c340d19242038de25cb7cdc36397_tms', 'Oviedo', 'La Liga', NULL, '42407e31113847d3ba90dbae62e7fa65_trn_75e4c340d19242038de25cb7cdc36397_tms_logo.png', NULL, '/images/team/logo/42407e31113847d3ba90dbae62e7fa65_trn_75e4c340d19242038de25cb7cdc36397_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-11 12:54:21', '2025-12-11 12:54:21'),
(68, 'soccer', '42407e31113847d3ba90dbae62e7fa65_trn', 'dcad761952f74d49b73f2a50983b608c_tms', 'Getafe CF', 'La Liga', NULL, '42407e31113847d3ba90dbae62e7fa65_trn_dcad761952f74d49b73f2a50983b608c_tms_logo.png', NULL, '/images/team/logo/42407e31113847d3ba90dbae62e7fa65_trn_dcad761952f74d49b73f2a50983b608c_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-11 12:55:14', '2025-12-11 12:55:14'),
(69, 'soccer', '42407e31113847d3ba90dbae62e7fa65_trn', '4352c2e7f19b47d9abd4c069a836d2dc_tms', 'Mallorca', 'La Liga', NULL, '42407e31113847d3ba90dbae62e7fa65_trn_4352c2e7f19b47d9abd4c069a836d2dc_tms_logo.png', NULL, '/images/team/logo/42407e31113847d3ba90dbae62e7fa65_trn_4352c2e7f19b47d9abd4c069a836d2dc_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-11 12:55:37', '2025-12-11 12:55:37'),
(70, 'soccer', '5f374ac416594690af75d80225e9b766_trn', '35f74db6cac442458d07e4e2e3c69591_tms', 'Olympique Lyonnais', 'Ligue 1', NULL, '5f374ac416594690af75d80225e9b766_trn_35f74db6cac442458d07e4e2e3c69591_tms_logo.png', NULL, '/images/team/logo/5f374ac416594690af75d80225e9b766_trn_35f74db6cac442458d07e4e2e3c69591_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-11 13:00:33', '2025-12-11 13:00:33'),
(71, 'soccer', '5f374ac416594690af75d80225e9b766_trn', 'e97c9ec8f9844cdfbec822c2dbc7746d_tms', 'Paris Saint-Germain', 'Ligue 1', NULL, '5f374ac416594690af75d80225e9b766_trn_e97c9ec8f9844cdfbec822c2dbc7746d_tms_logo.png', '5f374ac416594690af75d80225e9b766_trn_e97c9ec8f9844cdfbec822c2dbc7746d_tms_banner.png', '/images/team/logo/5f374ac416594690af75d80225e9b766_trn_e97c9ec8f9844cdfbec822c2dbc7746d_tms_logo.png', '/images/team/banner/5f374ac416594690af75d80225e9b766_trn_e97c9ec8f9844cdfbec822c2dbc7746d_tms_banner.png', 'active', 0, 3, 3, '2025-12-11 13:00:56', '2025-12-14 09:08:16'),
(72, 'soccer', '5f374ac416594690af75d80225e9b766_trn', '1d694e1daeda43419a30325086695492_tms', 'Olympique de Marseille', 'Ligue 1', NULL, '5f374ac416594690af75d80225e9b766_trn_1d694e1daeda43419a30325086695492_tms_logo.png', NULL, '/images/team/logo/5f374ac416594690af75d80225e9b766_trn_1d694e1daeda43419a30325086695492_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-11 13:01:11', '2025-12-11 13:01:11'),
(73, 'soccer', '5f374ac416594690af75d80225e9b766_trn', 'a4f086ec1d0849e2a584b7428f02f79a_tms', 'OGC Nice', 'Ligue 1', NULL, '5f374ac416594690af75d80225e9b766_trn_a4f086ec1d0849e2a584b7428f02f79a_tms_logo.png', NULL, '/images/team/logo/5f374ac416594690af75d80225e9b766_trn_a4f086ec1d0849e2a584b7428f02f79a_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-11 13:01:26', '2025-12-11 13:01:26'),
(74, 'soccer', '5ff59a93395543bbadc3a91c1559e2e4_trn', 'ae82fd0561ca437db4a56994a9553a56_tms', 'Aberdeen', 'Scottish Premiership', NULL, '5ff59a93395543bbadc3a91c1559e2e4_trn_ae82fd0561ca437db4a56994a9553a56_tms_logo.png', NULL, '/images/team/logo/5ff59a93395543bbadc3a91c1559e2e4_trn_ae82fd0561ca437db4a56994a9553a56_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-11 14:26:40', '2025-12-11 14:26:40'),
(75, 'soccer', '5ff59a93395543bbadc3a91c1559e2e4_trn', 'f97fd626f4f14900a5cd38441b4e1569_tms', 'Celtic', 'Scottish Premiership', NULL, '5ff59a93395543bbadc3a91c1559e2e4_trn_f97fd626f4f14900a5cd38441b4e1569_tms_logo.png', NULL, '/images/team/logo/5ff59a93395543bbadc3a91c1559e2e4_trn_f97fd626f4f14900a5cd38441b4e1569_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-11 14:26:55', '2025-12-11 14:26:55'),
(76, 'soccer', '5ff59a93395543bbadc3a91c1559e2e4_trn', '5379b404a4ac41e6ad056f57d4b6f509_tms', 'Heart of Midlothian FC', 'Scottish Premiership', NULL, '5ff59a93395543bbadc3a91c1559e2e4_trn_5379b404a4ac41e6ad056f57d4b6f509_tms_logo.png', NULL, '/images/team/logo/5ff59a93395543bbadc3a91c1559e2e4_trn_5379b404a4ac41e6ad056f57d4b6f509_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-11 14:27:09', '2025-12-11 14:27:09'),
(77, 'soccer', '5ff59a93395543bbadc3a91c1559e2e4_trn', '7a914b90f3a14fa2a90bf73f99386abb_tms', 'Hibernian FC', 'Scottish Premiership', NULL, '5ff59a93395543bbadc3a91c1559e2e4_trn_7a914b90f3a14fa2a90bf73f99386abb_tms_logo.png', NULL, '/images/team/logo/5ff59a93395543bbadc3a91c1559e2e4_trn_7a914b90f3a14fa2a90bf73f99386abb_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-11 14:27:50', '2025-12-11 14:27:50'),
(78, 'soccer', '7a1ab967321244759f91645f40e4249d_trn', '99c96f16091d4ad193bb322902740209_tms', 'Union Berlin', 'Bundesliga', NULL, '7a1ab967321244759f91645f40e4249d_trn_99c96f16091d4ad193bb322902740209_tms_logo.png', NULL, '/images/team/logo/7a1ab967321244759f91645f40e4249d_trn_99c96f16091d4ad193bb322902740209_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-11 14:31:22', '2025-12-11 14:31:22'),
(79, 'soccer', '7a1ab967321244759f91645f40e4249d_trn', '37e84a597cab4a819e1ab4a906553087_tms', 'FC St. Pauli', 'Bundesliga', NULL, '7a1ab967321244759f91645f40e4249d_trn_37e84a597cab4a819e1ab4a906553087_tms_logo.png', NULL, '/images/team/logo/7a1ab967321244759f91645f40e4249d_trn_37e84a597cab4a819e1ab4a906553087_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-11 14:32:01', '2025-12-11 14:32:01'),
(80, 'soccer', '7a1ab967321244759f91645f40e4249d_trn', '02dea97445dc4d178970725f2a8b55e6_tms', '1899 Hoffenheim', 'Bundesliga', NULL, '7a1ab967321244759f91645f40e4249d_trn_02dea97445dc4d178970725f2a8b55e6_tms_logo.png', NULL, '/images/team/logo/7a1ab967321244759f91645f40e4249d_trn_02dea97445dc4d178970725f2a8b55e6_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-11 14:32:16', '2025-12-11 14:32:16'),
(81, 'soccer', '3fd40c739d1440cdb1530eed99a6792e_trn', '5bc80fcdde424583b968b328ae687408_tms', 'Rapid Vienna', 'Bundesliga AT', NULL, '3fd40c739d1440cdb1530eed99a6792e_trn_5bc80fcdde424583b968b328ae687408_tms_logo.png', NULL, '/images/team/logo/3fd40c739d1440cdb1530eed99a6792e_trn_5bc80fcdde424583b968b328ae687408_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-11 14:33:40', '2025-12-11 14:33:40'),
(82, 'soccer', '5786fc712b6f4be5b30fe60573943b2c_trn', '1712642370054be48030bdac139fed10_tms', 'Sporting CP', 'Primeira Liga', NULL, '5786fc712b6f4be5b30fe60573943b2c_trn_1712642370054be48030bdac139fed10_tms_logo.png', NULL, '/images/team/logo/5786fc712b6f4be5b30fe60573943b2c_trn_1712642370054be48030bdac139fed10_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-11 14:37:27', '2025-12-11 14:37:27'),
(83, 'soccer', '5786fc712b6f4be5b30fe60573943b2c_trn', '36a7a373d566450ba84d23163dd1791e_tms', 'FC Porto', 'Primeira Liga', NULL, '5786fc712b6f4be5b30fe60573943b2c_trn_36a7a373d566450ba84d23163dd1791e_tms_logo.png', NULL, '/images/team/logo/5786fc712b6f4be5b30fe60573943b2c_trn_36a7a373d566450ba84d23163dd1791e_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-11 14:37:41', '2025-12-11 14:37:41'),
(84, 'soccer', '5786fc712b6f4be5b30fe60573943b2c_trn', '1676f0baad3a458a9b4fe29dc964e482_tms', 'Benfica', 'Primeira Liga', NULL, '5786fc712b6f4be5b30fe60573943b2c_trn_1676f0baad3a458a9b4fe29dc964e482_tms_logo.png', NULL, '/images/team/logo/5786fc712b6f4be5b30fe60573943b2c_trn_1676f0baad3a458a9b4fe29dc964e482_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-11 14:37:55', '2025-12-11 14:37:55'),
(85, 'soccer', '1d2044770565495fa6c5459b8dcd94b0_trn', '545fc33b2c884bd3a54b165a4feb1855_tms', 'FC Copenhagen', 'Superligaen', NULL, '1d2044770565495fa6c5459b8dcd94b0_trn_545fc33b2c884bd3a54b165a4feb1855_tms_logo.png', NULL, '/images/team/logo/1d2044770565495fa6c5459b8dcd94b0_trn_545fc33b2c884bd3a54b165a4feb1855_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-11 14:39:47', '2025-12-11 14:40:08'),
(86, 'soccer', '42407e31113847d3ba90dbae62e7fa65_trn', 'd4495bb275974074b944dc48cc43e113_tms', 'Athletic Bilbao', 'La Liga', NULL, '42407e31113847d3ba90dbae62e7fa65_trn_d4495bb275974074b944dc48cc43e113_tms_logo.png', NULL, '/images/team/logo/42407e31113847d3ba90dbae62e7fa65_trn_d4495bb275974074b944dc48cc43e113_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-11 16:06:54', '2025-12-11 16:06:54'),
(87, 'soccer', '42407e31113847d3ba90dbae62e7fa65_trn', '2af57b35eba94e8fa75d1cdb6e6a1e0f_tms', 'RCD Espanyol', 'La Liga', NULL, '42407e31113847d3ba90dbae62e7fa65_trn_2af57b35eba94e8fa75d1cdb6e6a1e0f_tms_logo.png', NULL, '/images/team/logo/42407e31113847d3ba90dbae62e7fa65_trn_2af57b35eba94e8fa75d1cdb6e6a1e0f_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-11 16:07:28', '2025-12-11 16:07:28'),
(88, 'soccer', '42407e31113847d3ba90dbae62e7fa65_trn', '6972d435d0cd4086aa8a20a3195560ce_tms', 'Rayo Vallecano', 'La Liga', NULL, '42407e31113847d3ba90dbae62e7fa65_trn_6972d435d0cd4086aa8a20a3195560ce_tms_logo.png', NULL, '/images/team/logo/42407e31113847d3ba90dbae62e7fa65_trn_6972d435d0cd4086aa8a20a3195560ce_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-11 16:08:27', '2025-12-11 16:08:27'),
(89, 'soccer', '70aeb1d765344b198c8d65ab0957aa99_trn', '11cfe1382b3345689e62afbfc7f0423a_tms', 'Como 1907', 'Serie A', NULL, '70aeb1d765344b198c8d65ab0957aa99_trn_11cfe1382b3345689e62afbfc7f0423a_tms_logo.png', NULL, '/images/team/logo/70aeb1d765344b198c8d65ab0957aa99_trn_11cfe1382b3345689e62afbfc7f0423a_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-11 16:11:10', '2025-12-11 16:11:10'),
(90, 'soccer', '8f67b171abde42f283dbfbed6b98514f_trn', 'af5bd99ea2f44f8688e4071898bac50b_tms', 'Gent', 'Pro League', NULL, '8f67b171abde42f283dbfbed6b98514f_trn_af5bd99ea2f44f8688e4071898bac50b_tms_logo.png', NULL, '/images/team/logo/8f67b171abde42f283dbfbed6b98514f_trn_af5bd99ea2f44f8688e4071898bac50b_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-11 16:17:04', '2025-12-11 16:17:04'),
(91, 'soccer', '8f67b171abde42f283dbfbed6b98514f_trn', 'b7afa38451ae4c09a8c2bc5e151dd647_tms', 'Antwerp', 'Pro League', NULL, '8f67b171abde42f283dbfbed6b98514f_trn_b7afa38451ae4c09a8c2bc5e151dd647_tms_logo.png', NULL, '/images/team/logo/8f67b171abde42f283dbfbed6b98514f_trn_b7afa38451ae4c09a8c2bc5e151dd647_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-11 16:17:21', '2025-12-11 16:17:21'),
(92, 'soccer', '8f67b171abde42f283dbfbed6b98514f_trn', 'a5d6fda40f6c4bb2a1a54b047ed42d89_tms', 'Club Brugge KV', 'Pro League', NULL, '8f67b171abde42f283dbfbed6b98514f_trn_a5d6fda40f6c4bb2a1a54b047ed42d89_tms_logo.png', NULL, '/images/team/logo/8f67b171abde42f283dbfbed6b98514f_trn_a5d6fda40f6c4bb2a1a54b047ed42d89_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-11 16:17:36', '2025-12-11 16:17:36'),
(93, 'soccer', '5f374ac416594690af75d80225e9b766_trn', '7e011deebd134a70982b576df87ee5ee_tms', 'AS Monaco', 'Ligue 1', NULL, '5f374ac416594690af75d80225e9b766_trn_7e011deebd134a70982b576df87ee5ee_tms_logo.png', NULL, '/images/team/logo/5f374ac416594690af75d80225e9b766_trn_7e011deebd134a70982b576df87ee5ee_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-11 16:17:56', '2025-12-11 16:17:56'),
(94, 'soccer', '8663a21ea6914f029cf59cbc257aba75_trn', '822dc1845ce04cdf8227b1e7509867a4_tms', 'FC Schalke 04', 'Bundesliga 2', NULL, '8663a21ea6914f029cf59cbc257aba75_trn_822dc1845ce04cdf8227b1e7509867a4_tms_logo.png', NULL, '/images/team/logo/8663a21ea6914f029cf59cbc257aba75_trn_822dc1845ce04cdf8227b1e7509867a4_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-11 16:20:58', '2025-12-11 16:20:58'),
(95, 'soccer', '8663a21ea6914f029cf59cbc257aba75_trn', '5fe9a4b0c4e3456da1e39a8ac3f0cf27_tms', 'Hertha BSC Berlin', 'Bundesliga 2', NULL, '8663a21ea6914f029cf59cbc257aba75_trn_5fe9a4b0c4e3456da1e39a8ac3f0cf27_tms_logo.png', NULL, '/images/team/logo/8663a21ea6914f029cf59cbc257aba75_trn_5fe9a4b0c4e3456da1e39a8ac3f0cf27_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-11 16:21:10', '2025-12-11 16:21:10'),
(96, 'soccer', '64923b0d1e6a4dfc8fbb98f02a18349d_trn', '42ad0e6bdea544c3bae386ba38b6e5ca_tms', 'PSV Eindhoven', 'Champions League', NULL, '64923b0d1e6a4dfc8fbb98f02a18349d_trn_42ad0e6bdea544c3bae386ba38b6e5ca_tms_logo.png', NULL, '/images/team/logo/64923b0d1e6a4dfc8fbb98f02a18349d_trn_42ad0e6bdea544c3bae386ba38b6e5ca_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-11 16:30:11', '2025-12-14 08:53:15'),
(97, 'soccer', '64923b0d1e6a4dfc8fbb98f02a18349d_trn', 'd4495bb275974074b944dc48cc43e113_tms', 'Athletic Bilbao', 'Champions League', NULL, '64923b0d1e6a4dfc8fbb98f02a18349d_trn_d4495bb275974074b944dc48cc43e113_tms_logo.png', NULL, '/images/team/logo/64923b0d1e6a4dfc8fbb98f02a18349d_trn_d4495bb275974074b944dc48cc43e113_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-11 16:30:34', '2025-12-11 16:30:34'),
(98, 'soccer', '64923b0d1e6a4dfc8fbb98f02a18349d_trn', '1712642370054be48030bdac139fed10_tms', 'Sporting CP', 'Champions League', NULL, '64923b0d1e6a4dfc8fbb98f02a18349d_trn_1712642370054be48030bdac139fed10_tms_logo.png', NULL, '/images/team/logo/64923b0d1e6a4dfc8fbb98f02a18349d_trn_1712642370054be48030bdac139fed10_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-11 16:31:20', '2025-12-11 16:31:20'),
(99, 'soccer', '64923b0d1e6a4dfc8fbb98f02a18349d_trn', '246f374efc9f4de4bfcaad4e4d04dd26_tms', 'Atlético Madrid', 'Champions League', NULL, '64923b0d1e6a4dfc8fbb98f02a18349d_trn_246f374efc9f4de4bfcaad4e4d04dd26_tms_logo.png', NULL, '/images/team/logo/64923b0d1e6a4dfc8fbb98f02a18349d_trn_246f374efc9f4de4bfcaad4e4d04dd26_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-11 16:31:47', '2025-12-11 16:31:47'),
(100, 'soccer', '64923b0d1e6a4dfc8fbb98f02a18349d_trn', 'a2d988e4ddb74c3ca523c9981b04931b_tms', 'Juventus FC', 'Champions League', NULL, '64923b0d1e6a4dfc8fbb98f02a18349d_trn_a2d988e4ddb74c3ca523c9981b04931b_tms_logo.png', NULL, '/images/team/logo/64923b0d1e6a4dfc8fbb98f02a18349d_trn_a2d988e4ddb74c3ca523c9981b04931b_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-11 16:32:18', '2025-12-11 16:32:18'),
(101, 'soccer', 'ea862b4811dc4c9ca9df8797c4fc610c_trn', '66038f7407444e64b3ce32a1499c0295_tms', 'AS Roma', 'Europa League', NULL, 'ea862b4811dc4c9ca9df8797c4fc610c_trn_66038f7407444e64b3ce32a1499c0295_tms_logo.png', NULL, '/images/team/logo/ea862b4811dc4c9ca9df8797c4fc610c_trn_66038f7407444e64b3ce32a1499c0295_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-11 16:33:04', '2025-12-11 16:33:04'),
(102, 'soccer', 'ea862b4811dc4c9ca9df8797c4fc610c_trn', 'f97fd626f4f14900a5cd38441b4e1569_tms', 'Celtic', 'Europa League', NULL, 'ea862b4811dc4c9ca9df8797c4fc610c_trn_f97fd626f4f14900a5cd38441b4e1569_tms_logo.png', NULL, '/images/team/logo/ea862b4811dc4c9ca9df8797c4fc610c_trn_f97fd626f4f14900a5cd38441b4e1569_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-11 16:33:22', '2025-12-11 16:33:22'),
(103, 'soccer', 'ea862b4811dc4c9ca9df8797c4fc610c_trn', '22f6ccb4332d4b29b3f93ac7d674faf4_tms', 'Bologna', 'Europa League', NULL, 'ea862b4811dc4c9ca9df8797c4fc610c_trn_22f6ccb4332d4b29b3f93ac7d674faf4_tms_logo.png', NULL, '/images/team/logo/ea862b4811dc4c9ca9df8797c4fc610c_trn_22f6ccb4332d4b29b3f93ac7d674faf4_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-11 16:33:48', '2025-12-14 08:50:04'),
(104, 'soccer', 'ea862b4811dc4c9ca9df8797c4fc610c_trn', '66585ef9ec9049cca0dbf5676a58c572_tms', 'Nottingham Forest', 'Europa League', NULL, 'ea862b4811dc4c9ca9df8797c4fc610c_trn_66585ef9ec9049cca0dbf5676a58c572_tms_logo.png', NULL, '/images/team/logo/ea862b4811dc4c9ca9df8797c4fc610c_trn_66585ef9ec9049cca0dbf5676a58c572_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-11 16:34:07', '2025-12-11 16:34:07'),
(105, 'soccer', 'ea862b4811dc4c9ca9df8797c4fc610c_trn', '8866a6efbf39477082cc5dc01b94b76e_tms', 'Real Betis', 'Europa League', NULL, 'ea862b4811dc4c9ca9df8797c4fc610c_trn_8866a6efbf39477082cc5dc01b94b76e_tms_logo.png', NULL, '/images/team/logo/ea862b4811dc4c9ca9df8797c4fc610c_trn_8866a6efbf39477082cc5dc01b94b76e_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-11 16:34:26', '2025-12-11 16:34:26'),
(106, 'soccer', 'ea862b4811dc4c9ca9df8797c4fc610c_trn', '75ffe5d34dbb4a7291dec0e98b262423_tms', 'Aston Villa', 'Europa League', NULL, 'ea862b4811dc4c9ca9df8797c4fc610c_trn_75ffe5d34dbb4a7291dec0e98b262423_tms_logo.png', NULL, '/images/team/logo/ea862b4811dc4c9ca9df8797c4fc610c_trn_75ffe5d34dbb4a7291dec0e98b262423_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-11 16:34:40', '2025-12-11 16:34:40'),
(107, 'soccer', '440ca574861446cc97b9556ab9d00f49_trn', '9c6c5ff96323471e9899c68c58957360_tms', 'Southampton FC', 'Championship', NULL, '440ca574861446cc97b9556ab9d00f49_trn_9c6c5ff96323471e9899c68c58957360_tms_logo.png', NULL, '/images/team/logo/440ca574861446cc97b9556ab9d00f49_trn_9c6c5ff96323471e9899c68c58957360_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-13 16:16:58', '2025-12-13 16:16:58'),
(108, 'soccer', '440ca574861446cc97b9556ab9d00f49_trn', '4525ab38a9e241d7b6d46aaf94056ba6_tms', 'Swansea City', 'Championship', NULL, '440ca574861446cc97b9556ab9d00f49_trn_4525ab38a9e241d7b6d46aaf94056ba6_tms_logo.png', NULL, '/images/team/logo/440ca574861446cc97b9556ab9d00f49_trn_4525ab38a9e241d7b6d46aaf94056ba6_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-13 16:22:40', '2025-12-13 16:22:40'),
(109, 'soccer', '440ca574861446cc97b9556ab9d00f49_trn', 'f312a0c71d994a0db353a438294ff0e8_tms', 'Charlton Athletic', 'Championship', NULL, '440ca574861446cc97b9556ab9d00f49_trn_f312a0c71d994a0db353a438294ff0e8_tms_logo.png', NULL, '/images/team/logo/440ca574861446cc97b9556ab9d00f49_trn_f312a0c71d994a0db353a438294ff0e8_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-13 16:30:16', '2025-12-13 16:30:16'),
(110, 'soccer', '440ca574861446cc97b9556ab9d00f49_trn', 'e9e44d5917d2458bb7c6715216b19dfd_tms', 'Queens Park Rangers', 'Championship', NULL, '440ca574861446cc97b9556ab9d00f49_trn_e9e44d5917d2458bb7c6715216b19dfd_tms_logo.png', NULL, '/images/team/logo/440ca574861446cc97b9556ab9d00f49_trn_e9e44d5917d2458bb7c6715216b19dfd_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-13 16:31:33', '2025-12-13 16:31:33'),
(111, 'soccer', '440ca574861446cc97b9556ab9d00f49_trn', 'fe329fcfca2243d78241b166f516d8bf_tms', 'Watford FC', 'Championship', NULL, '440ca574861446cc97b9556ab9d00f49_trn_fe329fcfca2243d78241b166f516d8bf_tms_logo.png', NULL, '/images/team/logo/440ca574861446cc97b9556ab9d00f49_trn_fe329fcfca2243d78241b166f516d8bf_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-13 16:32:39', '2025-12-13 16:32:39'),
(112, 'soccer', '440ca574861446cc97b9556ab9d00f49_trn', '23f9b8fead0d47d4bcdc57b19e3b8e36_tms', 'Millwall', 'Championship', NULL, '440ca574861446cc97b9556ab9d00f49_trn_23f9b8fead0d47d4bcdc57b19e3b8e36_tms_logo.png', NULL, '/images/team/logo/440ca574861446cc97b9556ab9d00f49_trn_23f9b8fead0d47d4bcdc57b19e3b8e36_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-13 16:33:21', '2025-12-13 16:33:21'),
(113, 'soccer', '440ca574861446cc97b9556ab9d00f49_trn', '7fbe9b4aba3942868f5d66b3e0102733_tms', 'Leicester City', 'Championship', NULL, '440ca574861446cc97b9556ab9d00f49_trn_7fbe9b4aba3942868f5d66b3e0102733_tms_logo.png', NULL, '/images/team/logo/440ca574861446cc97b9556ab9d00f49_trn_7fbe9b4aba3942868f5d66b3e0102733_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-13 16:34:16', '2025-12-13 16:34:16'),
(114, 'soccer', '440ca574861446cc97b9556ab9d00f49_trn', '58b92365505f448899b531eb2cd06991_tms', 'Oxford United', 'Championship', NULL, '440ca574861446cc97b9556ab9d00f49_trn_58b92365505f448899b531eb2cd06991_tms_logo.png', NULL, '/images/team/logo/440ca574861446cc97b9556ab9d00f49_trn_58b92365505f448899b531eb2cd06991_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-13 16:35:34', '2025-12-13 16:35:34'),
(115, 'soccer', 'f33f946d203446b693496546a19a9300_trn', '80932b14e5d34fc3badff3c0834381b5_tms', 'Leganés', 'Segunda División', NULL, 'f33f946d203446b693496546a19a9300_trn_80932b14e5d34fc3badff3c0834381b5_tms_logo.png', NULL, '/images/team/logo/f33f946d203446b693496546a19a9300_trn_80932b14e5d34fc3badff3c0834381b5_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-13 16:47:47', '2025-12-13 16:47:47'),
(116, 'soccer', 'f33f946d203446b693496546a19a9300_trn', 'c9093807ff174fde8888735c07f9d310_tms', 'Malaga', 'Segunda División', NULL, 'f33f946d203446b693496546a19a9300_trn_c9093807ff174fde8888735c07f9d310_tms_logo.png', NULL, '/images/team/logo/f33f946d203446b693496546a19a9300_trn_c9093807ff174fde8888735c07f9d310_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-13 16:48:28', '2025-12-13 16:48:28'),
(117, 'soccer', 'f33f946d203446b693496546a19a9300_trn', '125598e9a2cc4e13a571b622c50dd817_tms', 'Almeria', 'Segunda División', NULL, 'f33f946d203446b693496546a19a9300_trn_125598e9a2cc4e13a571b622c50dd817_tms_logo.png', NULL, '/images/team/logo/f33f946d203446b693496546a19a9300_trn_125598e9a2cc4e13a571b622c50dd817_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-13 16:48:59', '2025-12-13 16:48:59'),
(118, 'soccer', 'f33f946d203446b693496546a19a9300_trn', '7c4ac99823414dd8b81976e93f48b22b_tms', 'Burgos', 'Segunda División', NULL, 'f33f946d203446b693496546a19a9300_trn_7c4ac99823414dd8b81976e93f48b22b_tms_logo.png', NULL, '/images/team/logo/f33f946d203446b693496546a19a9300_trn_7c4ac99823414dd8b81976e93f48b22b_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-13 16:49:54', '2025-12-13 16:49:54'),
(119, 'soccer', 'f33f946d203446b693496546a19a9300_trn', 'd036fb69a42649c28f94c3356391b876_tms', 'Las Palmas', 'Segunda División', NULL, 'f33f946d203446b693496546a19a9300_trn_d036fb69a42649c28f94c3356391b876_tms_logo.png', NULL, '/images/team/logo/f33f946d203446b693496546a19a9300_trn_d036fb69a42649c28f94c3356391b876_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-13 16:50:49', '2025-12-13 16:50:49'),
(120, 'soccer', 'f33f946d203446b693496546a19a9300_trn', 'f7bd005480c44f0083460124fdbac447_tms', 'Eibar', 'Segunda División', NULL, 'f33f946d203446b693496546a19a9300_trn_f7bd005480c44f0083460124fdbac447_tms_logo.png', NULL, '/images/team/logo/f33f946d203446b693496546a19a9300_trn_f7bd005480c44f0083460124fdbac447_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-13 16:51:19', '2025-12-13 16:51:19'),
(121, 'soccer', 'f33f946d203446b693496546a19a9300_trn', 'a87942a7f35545d59d84f24ffc1d7aba_tms', 'Albacete', 'Segunda División', NULL, 'f33f946d203446b693496546a19a9300_trn_a87942a7f35545d59d84f24ffc1d7aba_tms_logo.png', NULL, '/images/team/logo/f33f946d203446b693496546a19a9300_trn_a87942a7f35545d59d84f24ffc1d7aba_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-13 16:53:48', '2025-12-13 16:53:48'),
(122, 'soccer', 'f33f946d203446b693496546a19a9300_trn', 'cd5bca8142364c6f8fbc9a7a98163f3d_tms', 'Cordoba', 'Segunda División', NULL, 'f33f946d203446b693496546a19a9300_trn_cd5bca8142364c6f8fbc9a7a98163f3d_tms_logo.png', NULL, '/images/team/logo/f33f946d203446b693496546a19a9300_trn_cd5bca8142364c6f8fbc9a7a98163f3d_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-13 16:54:15', '2025-12-13 16:54:15'),
(123, 'soccer', 'f33f946d203446b693496546a19a9300_trn', '3581dfe2e1fb44c2875ffa8ef46bf7c5_tms', 'Sporting Gijon', 'Segunda División', NULL, 'f33f946d203446b693496546a19a9300_trn_3581dfe2e1fb44c2875ffa8ef46bf7c5_tms_logo.png', NULL, '/images/team/logo/f33f946d203446b693496546a19a9300_trn_3581dfe2e1fb44c2875ffa8ef46bf7c5_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-13 16:55:04', '2025-12-13 16:55:04'),
(124, 'soccer', '64923b0d1e6a4dfc8fbb98f02a18349d_trn', '3eae14a18975444a8af9d35f4e978f0e_tms', 'Arsenal FC', 'Champions League', NULL, '64923b0d1e6a4dfc8fbb98f02a18349d_trn_3eae14a18975444a8af9d35f4e978f0e_tms_logo.png', NULL, '/images/team/logo/64923b0d1e6a4dfc8fbb98f02a18349d_trn_3eae14a18975444a8af9d35f4e978f0e_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-13 17:08:50', '2025-12-13 17:08:50'),
(125, 'soccer', '64923b0d1e6a4dfc8fbb98f02a18349d_trn', 'dc35d8bfcf8e4fccbc649a2cb6a934a5_tms', 'Chelsea FC', 'Champions League', NULL, '64923b0d1e6a4dfc8fbb98f02a18349d_trn_dc35d8bfcf8e4fccbc649a2cb6a934a5_tms_logo.png', NULL, '/images/team/logo/64923b0d1e6a4dfc8fbb98f02a18349d_trn_dc35d8bfcf8e4fccbc649a2cb6a934a5_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-13 17:09:37', '2025-12-13 17:09:37');
INSERT INTO `team_credentials` (`id`, `sport_type`, `tournament_id`, `team_id`, `team_name`, `tournament_name`, `short_description`, `logo_filename`, `banner_filename`, `logo_url`, `banner_url`, `status`, `is_featured`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES
(126, 'soccer', '64923b0d1e6a4dfc8fbb98f02a18349d_trn', '7841dbb553b74476b9236a92f56f27e9_tms', 'Liverpool FC', 'Champions League', NULL, '64923b0d1e6a4dfc8fbb98f02a18349d_trn_7841dbb553b74476b9236a92f56f27e9_tms_logo.png', NULL, '/images/team/logo/64923b0d1e6a4dfc8fbb98f02a18349d_trn_7841dbb553b74476b9236a92f56f27e9_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-13 17:10:07', '2025-12-13 17:10:07'),
(127, 'soccer', '64923b0d1e6a4dfc8fbb98f02a18349d_trn', '08a14e774b1545788e162b86db6f1e21_tms', 'Manchester City', 'Champions League', NULL, '64923b0d1e6a4dfc8fbb98f02a18349d_trn_08a14e774b1545788e162b86db6f1e21_tms_logo.png', NULL, '/images/team/logo/64923b0d1e6a4dfc8fbb98f02a18349d_trn_08a14e774b1545788e162b86db6f1e21_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-13 17:10:26', '2025-12-13 17:11:22'),
(128, 'soccer', '64923b0d1e6a4dfc8fbb98f02a18349d_trn', '4e73121fb55e4fe482f3a0580568e763_tms', 'Tottenham Hotspur', 'Champions League', NULL, '64923b0d1e6a4dfc8fbb98f02a18349d_trn_4e73121fb55e4fe482f3a0580568e763_tms_logo.png', NULL, '/images/team/logo/64923b0d1e6a4dfc8fbb98f02a18349d_trn_4e73121fb55e4fe482f3a0580568e763_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-13 17:12:22', '2025-12-13 17:12:22'),
(129, 'soccer', '64923b0d1e6a4dfc8fbb98f02a18349d_trn', '03feddd0824543998013b5e464473bbc_tms', 'FC Barcelona', 'Champions League', NULL, '64923b0d1e6a4dfc8fbb98f02a18349d_trn_03feddd0824543998013b5e464473bbc_tms_logo.png', NULL, '/images/team/logo/64923b0d1e6a4dfc8fbb98f02a18349d_trn_03feddd0824543998013b5e464473bbc_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-13 17:13:31', '2025-12-13 17:13:31'),
(130, 'soccer', '64923b0d1e6a4dfc8fbb98f02a18349d_trn', 'e9ff0821449445c7a55b06ffadeaed12_tms', 'Real Madrid', 'Champions League', NULL, '64923b0d1e6a4dfc8fbb98f02a18349d_trn_e9ff0821449445c7a55b06ffadeaed12_tms_logo.png', NULL, '/images/team/logo/64923b0d1e6a4dfc8fbb98f02a18349d_trn_e9ff0821449445c7a55b06ffadeaed12_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-13 17:15:06', '2025-12-13 17:15:06'),
(131, 'soccer', '64923b0d1e6a4dfc8fbb98f02a18349d_trn', 'a68f47efed3840bfa7b75b3d4fc085a4_tms', 'Internazionale', 'Champions League', NULL, '64923b0d1e6a4dfc8fbb98f02a18349d_trn_a68f47efed3840bfa7b75b3d4fc085a4_tms_logo.png', NULL, '/images/team/logo/64923b0d1e6a4dfc8fbb98f02a18349d_trn_a68f47efed3840bfa7b75b3d4fc085a4_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-13 17:17:04', '2025-12-13 17:17:04'),
(132, 'soccer', '64923b0d1e6a4dfc8fbb98f02a18349d_trn', 'bcc4503a040649c8819ffb580972dff7_tms', 'Napoli', 'Champions League', NULL, '64923b0d1e6a4dfc8fbb98f02a18349d_trn_bcc4503a040649c8819ffb580972dff7_tms_logo.png', '64923b0d1e6a4dfc8fbb98f02a18349d_trn_bcc4503a040649c8819ffb580972dff7_tms_banner.png', '/images/team/logo/64923b0d1e6a4dfc8fbb98f02a18349d_trn_bcc4503a040649c8819ffb580972dff7_tms_logo.png', '/images/team/banner/64923b0d1e6a4dfc8fbb98f02a18349d_trn_bcc4503a040649c8819ffb580972dff7_tms_banner.png', 'active', 0, 3, 3, '2025-12-13 17:17:27', '2025-12-14 10:14:02'),
(133, 'soccer', '39933bfa7f4544eda06c99fc5d7d6cc3_trn', '4dda44363da64555899c802eac774b7c_tms', 'Tenerife', 'Primera Federación', NULL, '39933bfa7f4544eda06c99fc5d7d6cc3_trn_4dda44363da64555899c802eac774b7c_tms_logo.png', NULL, '/images/team/logo/39933bfa7f4544eda06c99fc5d7d6cc3_trn_4dda44363da64555899c802eac774b7c_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-13 17:21:58', '2025-12-13 17:21:58'),
(134, 'soccer', 'f306f395644a42e09821253d13637d70_trn', 'f2190243edc34e4f969a0d1c46891a4d_tms', 'Wolverhampton Wanderers', 'Premier League', NULL, 'f306f395644a42e09821253d13637d70_trn_f2190243edc34e4f969a0d1c46891a4d_tms_logo.png', NULL, '/images/team/logo/f306f395644a42e09821253d13637d70_trn_f2190243edc34e4f969a0d1c46891a4d_tms_logo.png', NULL, 'active', 0, 3, 3, '2025-12-18 10:52:13', '2025-12-18 10:52:13');

-- --------------------------------------------------------

--
-- Table structure for table `ticket_hospitalities`
--

CREATE TABLE `ticket_hospitalities` (
  `id` bigint UNSIGNED NOT NULL,
  `event_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'XS2Event event ID',
  `ticket_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'XS2Event ticket ID',
  `hospitality_id` bigint UNSIGNED NOT NULL COMMENT 'Reference to hospitality service',
  `custom_price_usd` decimal(10,2) DEFAULT NULL COMMENT 'Optional custom price override for this ticket',
  `created_by` bigint UNSIGNED DEFAULT NULL COMMENT 'Admin user who created the assignment',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Ticket to hospitality service mappings';

-- --------------------------------------------------------

--
-- Table structure for table `ticket_markups`
--

CREATE TABLE `ticket_markups` (
  `id` bigint UNSIGNED NOT NULL,
  `event_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'XS2Event event ID',
  `ticket_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'XS2Event ticket ID',
  `markup_price_usd` decimal(10,2) NOT NULL COMMENT 'Calculated markup amount in USD (either fixed or calculated from percentage)',
  `markup_type` enum('fixed','percentage') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'fixed' COMMENT 'Type of markup: fixed (USD amount) or percentage (% of base price)',
  `markup_percentage` decimal(5,2) DEFAULT NULL COMMENT 'Markup percentage (0-100%) when markup_type is percentage',
  `base_price_usd` decimal(10,2) NOT NULL COMMENT 'Original ticket price in USD (for reference)',
  `final_price_usd` decimal(10,2) NOT NULL COMMENT 'Base + Markup in USD',
  `created_by` bigint UNSIGNED DEFAULT NULL COMMENT 'Admin user who created markup',
  `updated_by` bigint UNSIGNED DEFAULT NULL COMMENT 'Admin user who last updated markup',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Event ticket markup pricing management';

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admin_activity_logs`
--
ALTER TABLE `admin_activity_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_admin_user` (`admin_user_id`),
  ADD KEY `idx_action` (`action`),
  ADD KEY `idx_entity` (`entity_type`,`entity_id`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_severity` (`severity`),
  ADD KEY `idx_admin_action_date` (`admin_user_id`,`action`,`created_at`);

--
-- Indexes for table `admin_users`
--
ALTER TABLE `admin_users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_email` (`email`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_role_status` (`role`,`status`),
  ADD KEY `idx_last_login` (`last_login_at`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `fk_admin_created_by` (`created_by`),
  ADD KEY `idx_role_id` (`role_id`);

--
-- Indexes for table `banners`
--
ALTER TABLE `banners`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_status_order` (`status`,`position_order`),
  ADD KEY `idx_location_status` (`location`,`status`),
  ADD KEY `fk_banner_created_by` (`created_by`),
  ADD KEY `idx_event_date` (`event_date`);

--
-- Indexes for table `bookings`
--
ALTER TABLE `bookings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_booking_reference` (`booking_reference`),
  ADD UNIQUE KEY `unique_api_booking_id` (`api_booking_id`),
  ADD KEY `idx_customer` (`customer_user_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_payment_status` (`payment_status`),
  ADD KEY `idx_event_date` (`event_date`),
  ADD KEY `idx_booking_date` (`booking_date`),
  ADD KEY `idx_venue` (`venue_name`),
  ADD KEY `idx_sport_type` (`sport_type`),
  ADD KEY `idx_total_amount` (`total_amount`),
  ADD KEY `idx_customer_status` (`customer_user_id`,`status`),
  ADD KEY `idx_event_customer` (`event_id`,`customer_user_id`),
  ADD KEY `fk_booking_modified_by` (`modified_by`),
  ADD KEY `idx_bookings_stripe_session` (`stripe_session_id`),
  ADD KEY `idx_bookings_payment_intent` (`payment_intent_id`),
  ADD KEY `idx_bookings_xs2event_status` (`xs2event_booking_status`),
  ADD KEY `idx_bookings_xs2event_synced` (`xs2event_synced_at`),
  ADD KEY `idx_bookings_eticket_status` (`eticket_status`),
  ADD KEY `idx_bookings_eticket_available` (`eticket_available_date`),
  ADD KEY `idx_bookings_download_count` (`download_count`),
  ADD KEY `idx_bookings_stripe_payment_method` (`stripe_payment_method_id`),
  ADD KEY `idx_bookings_stripe_customer` (`stripe_customer_id`),
  ADD KEY `idx_bookings_stripe_charge` (`stripe_charge_id`),
  ADD KEY `idx_bookings_payment_completed` (`payment_completed_at`),
  ADD KEY `idx_bookings_refund_id` (`refund_id`),
  ADD KEY `idx_cancellation_status` (`cancellation_status`),
  ADD KEY `idx_status_cancellation` (`status`,`cancellation_status`);
ALTER TABLE `bookings` ADD FULLTEXT KEY `ft_event_venue` (`event_name`,`venue_name`);

--
-- Indexes for table `booking_cancellation_requests`
--
ALTER TABLE `booking_cancellation_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_booking_id` (`booking_id`) COMMENT 'Fast lookup by booking',
  ADD KEY `idx_customer_user_id` (`customer_user_id`) COMMENT 'Fast lookup by customer',
  ADD KEY `idx_status` (`status`) COMMENT 'Fast filtering by status',
  ADD KEY `idx_request_date` (`request_date`) COMMENT 'Fast sorting/filtering by date',
  ADD KEY `idx_admin_user_id` (`admin_user_id`) COMMENT 'Fast lookup by admin',
  ADD KEY `idx_refund_status` (`refund_status`) COMMENT 'Fast filtering by refund status',
  ADD KEY `idx_created_at` (`created_at`) COMMENT 'Fast sorting by creation date',
  ADD KEY `idx_booking_status` (`booking_id`,`status`) COMMENT 'Fast lookup of booking cancellation status',
  ADD KEY `idx_status_request_date` (`status`,`request_date`) COMMENT 'Fast filtering and sorting';

--
-- Indexes for table `booking_hospitalities`
--
ALTER TABLE `booking_hospitalities`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_booking_id` (`booking_id`),
  ADD KEY `idx_hospitality_id` (`hospitality_id`),
  ADD KEY `idx_ticket_id` (`ticket_id`);

--
-- Indexes for table `cms_pages`
--
ALTER TABLE `cms_pages`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_page_key` (`page_key`),
  ADD UNIQUE KEY `unique_slug` (`slug`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_published_at` (`published_at`),
  ADD KEY `fk_cms_last_edited_by` (`last_edited_by`);
ALTER TABLE `cms_pages` ADD FULLTEXT KEY `ft_content_search` (`title`,`content`,`meta_description`);

--
-- Indexes for table `countries`
--
ALTER TABLE `countries`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `country_code` (`country_code`);

--
-- Indexes for table `currencies`
--
ALTER TABLE `currencies`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`),
  ADD KEY `idx_is_active` (`is_active`),
  ADD KEY `idx_is_default` (`is_default`),
  ADD KEY `idx_sort_order` (`sort_order`),
  ADD KEY `idx_code` (`code`);

--
-- Indexes for table `customer_activity_logs`
--
ALTER TABLE `customer_activity_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_customer_id` (`customer_id`),
  ADD KEY `idx_admin_user_id` (`admin_user_id`),
  ADD KEY `idx_action` (`action`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `customer_sessions`
--
ALTER TABLE `customer_sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_customer_id` (`customer_id`),
  ADD KEY `idx_expires_at` (`expires_at`),
  ADD KEY `idx_token_hash` (`token_hash`);

--
-- Indexes for table `customer_users`
--
ALTER TABLE `customer_users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_email` (`email`),
  ADD UNIQUE KEY `customer_id` (`customer_id`),
  ADD UNIQUE KEY `unique_customer_id` (`customer_id`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_total_spent` (`total_spent`),
  ADD KEY `idx_last_booking` (`last_booking_at`),
  ADD KEY `idx_total_bookings` (`total_bookings`),
  ADD KEY `fk_customer_blocked_by` (`blocked_by`),
  ADD KEY `idx_customer_id` (`customer_id`),
  ADD KEY `idx_email_verified` (`email_verified`),
  ADD KEY `idx_last_login` (`last_login`),
  ADD KEY `idx_failed_login_attempts` (`failed_login_attempts`),
  ADD KEY `idx_city` (`city`),
  ADD KEY `idx_date_of_birth` (`date_of_birth`),
  ADD KEY `idx_gender` (`gender`);
ALTER TABLE `customer_users` ADD FULLTEXT KEY `ft_name_email` (`email`);

--
-- Indexes for table `email_logs`
--
ALTER TABLE `email_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_recipient` (`recipient_email`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_sent_at` (`sent_at`),
  ADD KEY `idx_template` (`template_name`);

--
-- Indexes for table `hospitalities`
--
ALTER TABLE `hospitalities`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_is_active` (`is_active`),
  ADD KEY `idx_sort_order` (`sort_order`),
  ADD KEY `idx_created_by` (`created_by`),
  ADD KEY `idx_updated_by` (`updated_by`);

--
-- Indexes for table `hospitality_assignments`
--
ALTER TABLE `hospitality_assignments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_hospitality_scope` (`hospitality_id`,`sport_type`,`tournament_id`,`team_id`,`event_id`,`ticket_id`),
  ADD KEY `idx_hospitality_id` (`hospitality_id`),
  ADD KEY `idx_ha_sport_type` (`sport_type`),
  ADD KEY `idx_ha_tournament_id` (`tournament_id`),
  ADD KEY `idx_ha_team_id` (`team_id`),
  ADD KEY `idx_ha_event_id` (`event_id`),
  ADD KEY `idx_ha_ticket_id` (`ticket_id`),
  ADD KEY `idx_ha_level` (`level`),
  ADD KEY `idx_ha_is_active` (`is_active`),
  ADD KEY `idx_ha_created_by` (`created_by`),
  ADD KEY `idx_ha_updated_by` (`updated_by`);

--
-- Indexes for table `markup_rules`
--
ALTER TABLE `markup_rules`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_markup_scope` (`sport_type`,`tournament_id`,`team_id`,`event_id`,`ticket_id`),
  ADD KEY `idx_sport_type` (`sport_type`),
  ADD KEY `idx_tournament_id` (`tournament_id`),
  ADD KEY `idx_team_id` (`team_id`),
  ADD KEY `idx_event_id` (`event_id`),
  ADD KEY `idx_ticket_id` (`ticket_id`),
  ADD KEY `idx_level` (`level`),
  ADD KEY `idx_is_active` (`is_active`),
  ADD KEY `idx_created_by` (`created_by`),
  ADD KEY `idx_updated_by` (`updated_by`);

--
-- Indexes for table `permissions`
--
ALTER TABLE `permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`),
  ADD KEY `idx_name` (`name`),
  ADD KEY `idx_category` (`category`);

--
-- Indexes for table `refund_requests`
--
ALTER TABLE `refund_requests`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_refund_reference` (`refund_reference`),
  ADD KEY `idx_booking` (`booking_id`),
  ADD KEY `idx_customer` (`customer_user_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_priority` (`priority`),
  ADD KEY `idx_requested_at` (`requested_at`),
  ADD KEY `idx_status_priority` (`status`,`priority`),
  ADD KEY `fk_refund_reviewed_by` (`reviewed_by`),
  ADD KEY `fk_refund_processed_by` (`processed_by`);

--
-- Indexes for table `revenue_analytics`
--
ALTER TABLE `revenue_analytics`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_date_period` (`analytics_date`,`period_type`),
  ADD KEY `idx_date` (`analytics_date`),
  ADD KEY `idx_period_type` (`period_type`),
  ADD KEY `idx_total_revenue` (`total_revenue`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`),
  ADD KEY `idx_name` (`name`),
  ADD KEY `idx_level` (`level`);

--
-- Indexes for table `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_role_permission` (`role_id`,`permission_id`),
  ADD KEY `idx_role_id` (`role_id`),
  ADD KEY `idx_permission_id` (`permission_id`);

--
-- Indexes for table `system_settings`
--
ALTER TABLE `system_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_setting_key` (`setting_key`),
  ADD KEY `idx_category` (`category`),
  ADD KEY `idx_is_public` (`is_public`),
  ADD KEY `fk_setting_updated_by` (`updated_by`);

--
-- Indexes for table `team_credentials`
--
ALTER TABLE `team_credentials`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_team_tournament` (`sport_type`,`tournament_id`,`team_id`),
  ADD KEY `idx_team_id` (`team_id`),
  ADD KEY `idx_tournament_id` (`tournament_id`),
  ADD KEY `idx_sport_type` (`sport_type`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `fk_created_by` (`created_by`),
  ADD KEY `fk_updated_by` (`updated_by`),
  ADD KEY `idx_is_featured` (`is_featured`),
  ADD KEY `idx_status_featured` (`status`,`is_featured`),
  ADD KEY `idx_sport_featured` (`sport_type`,`is_featured`);

--
-- Indexes for table `ticket_hospitalities`
--
ALTER TABLE `ticket_hospitalities`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_ticket_hospitality` (`event_id`,`ticket_id`,`hospitality_id`),
  ADD KEY `idx_event_id` (`event_id`),
  ADD KEY `idx_ticket_id` (`ticket_id`),
  ADD KEY `idx_hospitality_id` (`hospitality_id`),
  ADD KEY `idx_created_by` (`created_by`),
  ADD KEY `idx_event_ticket` (`event_id`,`ticket_id`);

--
-- Indexes for table `ticket_markups`
--
ALTER TABLE `ticket_markups`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_event_ticket` (`event_id`,`ticket_id`),
  ADD KEY `idx_event_id` (`event_id`),
  ADD KEY `idx_ticket_id` (`ticket_id`),
  ADD KEY `idx_created_by` (`created_by`),
  ADD KEY `idx_updated_by` (`updated_by`),
  ADD KEY `idx_event_created` (`event_id`,`created_at`),
  ADD KEY `idx_updated_at` (`updated_at`),
  ADD KEY `idx_markup_type` (`markup_type`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admin_activity_logs`
--
ALTER TABLE `admin_activity_logs`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `admin_users`
--
ALTER TABLE `admin_users`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `banners`
--
ALTER TABLE `banners`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `bookings`
--
ALTER TABLE `bookings`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;

--
-- AUTO_INCREMENT for table `booking_cancellation_requests`
--
ALTER TABLE `booking_cancellation_requests`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Unique identifier for the cancellation request', AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `booking_hospitalities`
--
ALTER TABLE `booking_hospitalities`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `cms_pages`
--
ALTER TABLE `cms_pages`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `countries`
--
ALTER TABLE `countries`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=244;

--
-- AUTO_INCREMENT for table `currencies`
--
ALTER TABLE `currencies`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `customer_activity_logs`
--
ALTER TABLE `customer_activity_logs`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `customer_sessions`
--
ALTER TABLE `customer_sessions`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=63;

--
-- AUTO_INCREMENT for table `customer_users`
--
ALTER TABLE `customer_users`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `email_logs`
--
ALTER TABLE `email_logs`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `hospitalities`
--
ALTER TABLE `hospitalities`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `hospitality_assignments`
--
ALTER TABLE `hospitality_assignments`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=42;

--
-- AUTO_INCREMENT for table `markup_rules`
--
ALTER TABLE `markup_rules`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `permissions`
--
ALTER TABLE `permissions`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=34;

--
-- AUTO_INCREMENT for table `refund_requests`
--
ALTER TABLE `refund_requests`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `revenue_analytics`
--
ALTER TABLE `revenue_analytics`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `role_permissions`
--
ALTER TABLE `role_permissions`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=166;

--
-- AUTO_INCREMENT for table `system_settings`
--
ALTER TABLE `system_settings`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `team_credentials`
--
ALTER TABLE `team_credentials`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=135;

--
-- AUTO_INCREMENT for table `ticket_hospitalities`
--
ALTER TABLE `ticket_hospitalities`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=48;

--
-- AUTO_INCREMENT for table `ticket_markups`
--
ALTER TABLE `ticket_markups`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=41;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `admin_activity_logs`
--
ALTER TABLE `admin_activity_logs`
  ADD CONSTRAINT `fk_log_admin_user` FOREIGN KEY (`admin_user_id`) REFERENCES `admin_users` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `admin_users`
--
ALTER TABLE `admin_users`
  ADD CONSTRAINT `fk_admin_created_by` FOREIGN KEY (`created_by`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `banners`
--
ALTER TABLE `banners`
  ADD CONSTRAINT `fk_banner_created_by` FOREIGN KEY (`created_by`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `bookings`
--
ALTER TABLE `bookings`
  ADD CONSTRAINT `fk_booking_customer` FOREIGN KEY (`customer_user_id`) REFERENCES `customer_users` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_booking_modified_by` FOREIGN KEY (`modified_by`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `booking_cancellation_requests`
--
ALTER TABLE `booking_cancellation_requests`
  ADD CONSTRAINT `fk_cancellation_admin` FOREIGN KEY (`admin_user_id`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_cancellation_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_cancellation_customer` FOREIGN KEY (`customer_user_id`) REFERENCES `customer_users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `booking_hospitalities`
--
ALTER TABLE `booking_hospitalities`
  ADD CONSTRAINT `fk_booking_hospitality_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_booking_hospitality_hospitality` FOREIGN KEY (`hospitality_id`) REFERENCES `hospitalities` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `cms_pages`
--
ALTER TABLE `cms_pages`
  ADD CONSTRAINT `fk_cms_last_edited_by` FOREIGN KEY (`last_edited_by`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `customer_activity_logs`
--
ALTER TABLE `customer_activity_logs`
  ADD CONSTRAINT `customer_activity_logs_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customer_users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `customer_activity_logs_ibfk_2` FOREIGN KEY (`admin_user_id`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `customer_sessions`
--
ALTER TABLE `customer_sessions`
  ADD CONSTRAINT `customer_sessions_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customer_users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `customer_users`
--
ALTER TABLE `customer_users`
  ADD CONSTRAINT `fk_customer_blocked_by` FOREIGN KEY (`blocked_by`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `hospitalities`
--
ALTER TABLE `hospitalities`
  ADD CONSTRAINT `fk_hospitality_created_by` FOREIGN KEY (`created_by`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_hospitality_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `hospitality_assignments`
--
ALTER TABLE `hospitality_assignments`
  ADD CONSTRAINT `fk_ha_created_by` FOREIGN KEY (`created_by`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ha_hospitality` FOREIGN KEY (`hospitality_id`) REFERENCES `hospitalities` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ha_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `markup_rules`
--
ALTER TABLE `markup_rules`
  ADD CONSTRAINT `fk_markup_rule_created_by` FOREIGN KEY (`created_by`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_markup_rule_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `refund_requests`
--
ALTER TABLE `refund_requests`
  ADD CONSTRAINT `fk_refund_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_refund_customer` FOREIGN KEY (`customer_user_id`) REFERENCES `customer_users` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_refund_processed_by` FOREIGN KEY (`processed_by`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_refund_reviewed_by` FOREIGN KEY (`reviewed_by`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD CONSTRAINT `role_permissions_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `role_permissions_ibfk_2` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `system_settings`
--
ALTER TABLE `system_settings`
  ADD CONSTRAINT `fk_setting_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `team_credentials`
--
ALTER TABLE `team_credentials`
  ADD CONSTRAINT `fk_team_cred_created_by` FOREIGN KEY (`created_by`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_team_cred_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `ticket_hospitalities`
--
ALTER TABLE `ticket_hospitalities`
  ADD CONSTRAINT `fk_ticket_hospitality_created_by` FOREIGN KEY (`created_by`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ticket_hospitality_hospitality` FOREIGN KEY (`hospitality_id`) REFERENCES `hospitalities` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `ticket_markups`
--
ALTER TABLE `ticket_markups`
  ADD CONSTRAINT `fk_markup_created_by` FOREIGN KEY (`created_by`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_markup_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
