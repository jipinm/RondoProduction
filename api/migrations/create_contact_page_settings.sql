-- Migration: Create contact_page_settings table
-- This table stores all editable content for the Contact Us page.

CREATE TABLE IF NOT EXISTS contact_page_settings (
    id                     INT AUTO_INCREMENT PRIMARY KEY,

    -- Hero section
    hero_title             VARCHAR(255) NOT NULL DEFAULT 'Get In Touch',
    hero_description       TEXT,

    -- Phone contact card
    phone_number           VARCHAR(100) DEFAULT '+44 800 000 0000',
    phone_hours            VARCHAR(150) DEFAULT 'Mon-Fri, 9AM-6PM GMT',

    -- Email contact card
    email_address          VARCHAR(255) DEFAULT 'info@rondosports.com',
    email_response_time    VARCHAR(150) DEFAULT 'Response within 24 hours',

    -- Office / location card
    office_address         VARCHAR(255) DEFAULT '123 Sports Avenue',
    office_city            VARCHAR(150) DEFAULT 'London, UK SW1A 1AA',

    -- Contact form labels
    form_title             VARCHAR(255) DEFAULT 'Send us a Message',
    form_description       TEXT,

    -- Office visit section
    office_full_address    VARCHAR(500) DEFAULT '123 Sports Avenue, London, UK SW1A 1AA',
    office_hours_weekday   VARCHAR(150) DEFAULT 'Monday - Friday: 9:00 AM - 6:00 PM',
    office_hours_weekend   VARCHAR(150) DEFAULT 'Weekend: 10:00 AM - 4:00 PM',

    -- Google Maps embed URL
    map_embed_url          TEXT,

    -- Social media links
    social_facebook        VARCHAR(500) DEFAULT '',
    social_twitter         VARCHAR(500) DEFAULT '',
    social_instagram       VARCHAR(500) DEFAULT '',
    social_linkedin        VARCHAR(500) DEFAULT '',
    social_youtube         VARCHAR(500) DEFAULT '',

    -- Timestamps
    created_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default record (single-row settings pattern)
INSERT INTO contact_page_settings (
    hero_title,
    hero_description,
    phone_number,
    phone_hours,
    email_address,
    email_response_time,
    office_address,
    office_city,
    form_title,
    form_description,
    office_full_address,
    office_hours_weekday,
    office_hours_weekend,
    map_embed_url,
    social_facebook,
    social_twitter,
    social_instagram,
    social_linkedin,
    social_youtube
) VALUES (
    'Get In Touch',
    'Have questions about our services or need assistance with your booking? We''re here to help you create unforgettable sports experiences.',
    '+44 800 000 0000',
    'Mon-Fri, 9AM-6PM GMT',
    'info@rondosports.com',
    'Response within 24 hours',
    '123 Sports Avenue',
    'London, UK SW1A 1AA',
    'Send us a Message',
    'Fill out the form below and we''ll get back to you as soon as possible.',
    '123 Sports Avenue, London, UK SW1A 1AA',
    'Monday - Friday: 9:00 AM - 6:00 PM',
    'Weekend: 10:00 AM - 4:00 PM',
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2483.540799031448!2d-0.12776908422963236!3d51.50330577963595!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x487604b900d26973%3A0x4291f3172409ea92!2sLondon%20SW1A%201AA%2C%20UK!5e0!3m2!1sen!2sus!4v1640995200000!5m2!1sen!2sus',
    '',
    '',
    '',
    '',
    ''
);
