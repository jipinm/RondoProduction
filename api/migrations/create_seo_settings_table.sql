-- ============================================================
-- SEO Settings Table Migration
-- Creates a centralized SEO metadata store for all frontend pages.
-- Each row represents one page/route with its associated SEO data.
-- ============================================================

CREATE TABLE IF NOT EXISTS `seo_settings` (
  `id`               INT NOT NULL AUTO_INCREMENT,
  `page_key`         VARCHAR(100) NOT NULL COMMENT 'Unique page identifier matching frontend route (e.g. home, about-us)',
  `page_name`        VARCHAR(255) NOT NULL COMMENT 'Human-readable display name shown in the Admin UI',
  `meta_title`       VARCHAR(255) DEFAULT NULL COMMENT 'HTML <title> / og:title value',
  `meta_description` TEXT         DEFAULT NULL COMMENT 'Meta description (max ~160 chars recommended)',
  `meta_keywords`    VARCHAR(500) DEFAULT NULL COMMENT 'Comma-separated keywords',
  `og_title`         VARCHAR(255) DEFAULT NULL COMMENT 'Open Graph title override (falls back to meta_title)',
  `og_description`   TEXT         DEFAULT NULL COMMENT 'Open Graph description override (falls back to meta_description)',
  `robots`           VARCHAR(100) DEFAULT 'index, follow' COMMENT 'Robots meta directive',
  `created_at`       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_seo_page_key` (`page_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Stores per-page SEO metadata for the Rondo Sports frontend';

-- ============================================================
-- Seed default SEO data for all known frontend pages
-- ============================================================

INSERT INTO `seo_settings`
  (`page_key`, `page_name`, `meta_title`, `meta_description`, `meta_keywords`, `og_title`, `og_description`, `robots`)
VALUES
  (
    'home',
    'Home Page',
    'Rondo Sports Tickets - Your Gateway to Live Sports',
    'Book premium sports tickets for football, Formula 1, rugby, tennis and more with Rondo Sports Tickets. Hospitality packages and exclusive seating available.',
    'sports tickets, football tickets, Formula 1 tickets, rugby tickets, tennis tickets, live sports, hospitality packages',
    'Rondo Sports Tickets - Your Gateway to Live Sports',
    'Book premium sports tickets for football, Formula 1, rugby, tennis and more with Rondo Sports Tickets.',
    'index, follow'
  ),
  (
    'about-us',
    'About Us',
    'About Rondo Sports Tickets - Who We Are',
    'Learn about Rondo Sports Tickets, our mission, values and commitment to delivering world-class live sports ticketing experiences.',
    'about rondo sports, sports ticketing company, who we are',
    'About Rondo Sports Tickets',
    'Learn about Rondo Sports Tickets, our mission and commitment to live sports experiences.',
    'index, follow'
  ),
  (
    'faq',
    'FAQ',
    'Frequently Asked Questions - Rondo Sports Tickets',
    'Find answers to common questions about booking sports tickets, payment methods, refund policy and hospitality packages at Rondo Sports Tickets.',
    'FAQ, sports tickets FAQ, booking questions, refund policy, help',
    'Frequently Asked Questions - Rondo Sports Tickets',
    'Get answers to your questions about booking, payments, refunds and hospitality at Rondo Sports Tickets.',
    'index, follow'
  ),
  (
    'contact-us',
    'Contact Us',
    'Contact Us - Rondo Sports Tickets',
    'Get in touch with the Rondo Sports Tickets team for booking support, partnership enquiries or general questions.',
    'contact rondo sports, sports ticket support, customer service',
    'Contact Rondo Sports Tickets',
    'Get in touch with Rondo Sports Tickets for support, partnerships or general enquiries.',
    'index, follow'
  ),
  (
    'privacy-policy',
    'Privacy Policy',
    'Privacy Policy - Rondo Sports Tickets',
    'Read the Rondo Sports Tickets privacy policy to understand how we collect, use and protect your personal data.',
    'privacy policy, data protection, GDPR, personal data',
    'Privacy Policy - Rondo Sports Tickets',
    'Read our privacy policy to understand how Rondo Sports Tickets handles your personal data.',
    'index, follow'
  ),
  (
    'terms-conditions',
    'Terms & Conditions',
    'Terms & Conditions - Rondo Sports Tickets',
    'Review the terms and conditions for purchasing sports tickets through Rondo Sports Tickets, including booking, cancellation and refund policies.',
    'terms and conditions, booking terms, cancellation policy, refund terms',
    'Terms & Conditions - Rondo Sports Tickets',
    'Review the terms and conditions for buying sports tickets through Rondo Sports Tickets.',
    'index, follow'
  ),
  (
    'sports',
    'All Sports',
    'All Sports - Browse Every Sport | Rondo Sports Tickets',
    'Explore all sports categories available at Rondo Sports Tickets. Find tickets for football, Formula 1, rugby, tennis, golf and many more.',
    'all sports, sports categories, football, Formula 1, rugby, tennis, golf, tickets',
    'All Sports - Rondo Sports Tickets',
    'Explore all sports categories and find tickets for your favourite sport at Rondo Sports Tickets.',
    'index, follow'
  ),
  (
    'teams',
    'Teams',
    'Sports Teams - Rondo Sports Tickets',
    'Browse sports teams and find upcoming events and ticket availability for your favourite team at Rondo Sports Tickets.',
    'sports teams, team tickets, football teams, rugby teams',
    'Sports Teams - Rondo Sports Tickets',
    'Browse sports teams and find event tickets for your favourite team.',
    'index, follow'
  ),
  (
    'events',
    'Events',
    'Upcoming Sports Events - Rondo Sports Tickets',
    'Browse all upcoming sports events and book your tickets online. Live sports experiences for football, Formula 1, rugby, tennis and more.',
    'sports events, upcoming events, live sports, event tickets',
    'Upcoming Sports Events - Rondo Sports Tickets',
    'Browse and book tickets for all upcoming sports events at Rondo Sports Tickets.',
    'index, follow'
  ),
  (
    'event-tickets',
    'Event Tickets (Default)',
    'Event Tickets - Rondo Sports Tickets',
    'Book your tickets for this live sports event. Premium seating, hospitality packages and exclusive access available through Rondo Sports Tickets.',
    'event tickets, sports tickets, live event, premium seating',
    'Event Tickets - Rondo Sports Tickets',
    'Book your tickets for this live sports event with Rondo Sports Tickets.',
    'index, follow'
  ),
  (
    'tournaments',
    'Tournaments (Default)',
    'Tournament Events - Rondo Sports Tickets',
    'Explore all events in this tournament and book your tickets through Rondo Sports Tickets.',
    'tournament tickets, sports tournament, events',
    'Tournament Events - Rondo Sports Tickets',
    'Explore and book tickets for all events in this tournament.',
    'index, follow'
  );
