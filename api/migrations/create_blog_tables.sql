-- ============================================================
-- Blog Module Migration
-- Creates blog_categories, blog_tags, blogs, blog_tag_map tables
-- with seed data for immediate testing.
-- Includes SEO metadata fields (merged from add_seo_fields_to_blogs.sql).
-- ============================================================

-- Blog Categories
CREATE TABLE IF NOT EXISTS `blog_categories` (
  `id`         INT NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(255) NOT NULL,
  `slug`       VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_blog_category_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Blog Tags
CREATE TABLE IF NOT EXISTS `blog_tags` (
  `id`         INT NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(255) NOT NULL,
  `slug`       VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_blog_tag_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Blogs (includes SEO metadata columns)
CREATE TABLE IF NOT EXISTS `blogs` (
  `id`               INT NOT NULL AUTO_INCREMENT,
  `title`            VARCHAR(500) NOT NULL,
  `slug`             VARCHAR(500) NOT NULL,
  `featured_image`   VARCHAR(1000) DEFAULT NULL,
  `excerpt`          TEXT DEFAULT NULL,
  `content`          LONGTEXT DEFAULT NULL,
  `category_id`      INT DEFAULT NULL,
  `publish_date`     DATETIME DEFAULT NULL,
  `status`           ENUM('draft','published') NOT NULL DEFAULT 'draft',
  `seo_title`        VARCHAR(255) DEFAULT NULL,
  `meta_description` TEXT DEFAULT NULL,
  `meta_keywords`    VARCHAR(500) DEFAULT NULL,
  `og_title`         VARCHAR(255) DEFAULT NULL,
  `og_description`   TEXT DEFAULT NULL,
  `og_image`         VARCHAR(1000) DEFAULT NULL,
  `created_at`       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_blog_slug` (`slug`),
  KEY `idx_blog_status_publish_date` (`status`, `publish_date`),
  KEY `idx_blog_category_id` (`category_id`),
  CONSTRAINT `fk_blog_category` FOREIGN KEY (`category_id`) REFERENCES `blog_categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Blog-Tag Many-to-Many Map
CREATE TABLE IF NOT EXISTS `blog_tag_map` (
  `blog_id` INT NOT NULL,
  `tag_id`  INT NOT NULL,
  PRIMARY KEY (`blog_id`, `tag_id`),
  CONSTRAINT `fk_btm_blog` FOREIGN KEY (`blog_id`) REFERENCES `blogs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_btm_tag`  FOREIGN KEY (`tag_id`)  REFERENCES `blog_tags` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Seed Data: Categories
-- ============================================================
INSERT INTO `blog_categories` (`name`, `slug`) VALUES
  ('Sports News',      'sports-news'),
  ('Travel Tips',      'travel-tips'),
  ('Match Previews',   'match-previews'),
  ('Ticket Guides',    'ticket-guides'),
  ('Hospitality',      'hospitality');

-- ============================================================
-- Seed Data: Tags
-- ============================================================
INSERT INTO `blog_tags` (`name`, `slug`) VALUES
  ('Football',         'football'),
  ('Formula 1',        'formula-1'),
  ('Tennis',           'tennis'),
  ('Rugby',            'rugby'),
  ('Champions League', 'champions-league'),
  ('Travel',           'travel'),
  ('VIP',              'vip'),
  ('Hospitality',      'hospitality'),
  ('Tickets',          'tickets'),
  ('Guide',            'guide');

-- ============================================================
-- Seed Data: Blogs (10 posts for full pagination + filter testing)
-- featured_image and og_image left NULL — upload via admin panel.
-- ============================================================
INSERT INTO `blogs` (
  `title`, `slug`, `featured_image`, `excerpt`, `content`,
  `category_id`, `publish_date`, `status`,
  `seo_title`, `meta_description`, `meta_keywords`,
  `og_title`, `og_description`, `og_image`
) VALUES

(
  'How to Book Premium Football Tickets for the Champions League Final',
  'how-to-book-premium-football-tickets-champions-league-final',
  NULL,
  'Securing tickets to the UEFA Champions League Final is a dream for every football fan. In this guide we walk you through the entire process from initial registration to seat selection.',
  '<h2>Why the Champions League Final is Different</h2><p>The UEFA Champions League Final is the most-watched club football match on the planet. Demand for tickets far exceeds supply, which means a clear strategy is essential.</p><h2>Step 1 – Register Early</h2><p>UEFA opens a fan ballot months before the final. Register on the official site as soon as the host city is announced.</p><h2>Step 2 – Choose Hospitality</h2><p>Hospitality packages bypass the public ballot and offer guaranteed seats alongside premium dining experiences. Browse our <a href="/hospitality">hospitality options</a> for this season\'s final.</p><h2>Step 3 – Book Through Rondo Sports</h2><p>We offer a curated selection of official tickets and hospitality bundles. All purchases are 100% secure and backed by our money-back guarantee.</p><p>Start your journey today and experience the pinnacle of club football from the best seat in the house.</p>',
  1,
  DATE_SUB(NOW(), INTERVAL 1 DAY),
  'published',
  'How to Book Premium Champions League Final Tickets | Rondo Sports',
  'Step-by-step guide to booking premium UEFA Champions League Final tickets. From the public ballot to VIP hospitality packages — all explained.',
  'Champions League Final tickets, UEFA tickets, football hospitality, buy Champions League tickets',
  'How to Book Premium Football Tickets for the Champions League Final',
  'Securing tickets to the UEFA Champions League Final is a dream for every football fan. Discover how with our complete guide.',
  NULL
),

(
  'Top 5 Formula 1 Circuits Every Fan Must Visit',
  'top-5-formula-1-circuits-every-fan-must-visit',
  NULL,
  'From the glamour of Monaco to the speed of Monza, these are the five Formula 1 venues that every motorsport fan needs to experience at least once in their lifetime.',
  '<h2>1. Circuit de Monaco – Monte Carlo</h2><p>There is no other race quite like Monaco. The narrow streets, the harbour views and the sheer audacity of racing through a city make this the ultimate bucket-list Grand Prix.</p><h2>2. Autodromo Nazionale Monza – Italy</h2><p>Known as the Temple of Speed, Monza produces the fastest lap times on the calendar. The Tifosi – Ferrari\'s passionate fanbase – create an atmosphere unlike anything else in sport.</p><h2>3. Silverstone – Great Britain</h2><p>The birthplace of Formula 1, Silverstone offers a unique blend of high-speed corners and technical infield sections. The British crowd is famously loud and knowledgeable.</p><h2>4. Suzuka – Japan</h2><p>Suzuka\'s figure-of-eight layout produces spectacular racing. The 130R corner at full speed is one of the most breathtaking sights in motorsport.</p><h2>5. Circuit of the Americas – USA</h2><p>The COTA delivers a packed festival atmosphere with live music and entertainment making it a full weekend experience beyond just the racing.</p>',
  1,
  DATE_SUB(NOW(), INTERVAL 3 DAY),
  'published',
  'Top 5 Formula 1 Circuits Every Fan Must Visit | Rondo Sports',
  'From Monaco to Monza, discover the five must-visit Formula 1 circuits that every motorsport fan should experience at least once.',
  'Formula 1 circuits, F1 Grand Prix tickets, Monaco Grand Prix, Monza Grand Prix, best F1 venues',
  'Top 5 Formula 1 Circuits Every Fan Must Visit',
  'From the glamour of Monaco to the speed of Monza, these are the five F1 venues every motorsport fan needs to experience.',
  NULL
),

(
  'Your Complete Travel Guide to Wimbledon 2026',
  'complete-travel-guide-wimbledon-2026',
  NULL,
  'Planning a trip to Wimbledon? Our comprehensive travel guide covers everything from how to get there to what to eat, where to stay and how to make the most of the world\'s oldest tennis Grand Slam.',
  '<h2>Getting to Wimbledon</h2><p>The All England Club is located in south-west London. The most convenient route is the District Line to Southfields station followed by a short walk or the free shuttle bus to the grounds.</p><h2>Queue vs. Ballot Tickets</h2><p>Wimbledon famously runs its own public ballot. Applications open in the autumn of the preceding year. Alternatively, the famous Queue offers same-day Centre Court and Court 1 tickets – join early to avoid disappointment.</p><h2>What to Eat and Drink</h2><p>No trip to Wimbledon is complete without strawberries and cream. The grounds offer a wide range of dining options from informal picnics on Henman Hill to formal restaurant experiences.</p><h2>Where to Stay</h2><p>Boutique hotels in Wimbledon village fill up quickly. Book at least six months in advance or consider staying in central London and commuting daily.</p><h2>Book with Rondo Sports</h2><p>We offer premium Wimbledon packages that combine guaranteed tickets with hotel accommodation and travel. Enquire today for the best availability.</p>',
  2,
  DATE_SUB(NOW(), INTERVAL 5 DAY),
  'published',
  'Complete Travel Guide to Wimbledon 2026 | Rondo Sports',
  'Your complete travel guide to Wimbledon 2026. Transport, tickets, dining, accommodation and everything you need to plan the perfect trip.',
  'Wimbledon 2026 travel guide, Wimbledon tickets, All England Club, how to get to Wimbledon',
  'Your Complete Travel Guide to Wimbledon 2026',
  'Everything you need to know about visiting Wimbledon 2026 — from tickets to travel, dining and accommodation.',
  NULL
),

(
  'Six Nations 2026 – Match Preview and What to Expect',
  'six-nations-2026-match-preview',
  NULL,
  'The Six Nations is back and promises another gripping championship battle. We preview the key fixtures, form guide and what each nation needs to do to lift the title.',
  '<h2>Championship Contenders</h2><p>England, Ireland and France go into the tournament as the strongest contenders based on recent form. However the Six Nations has a long history of upsets and no lead is ever safe.</p><h2>Key Fixtures</h2><p>The Ireland vs France clash at the Stade de France promises to be the defining match of the championship. England host Scotland in the Calcutta Cup – always one of the most passionate fixtures in world rugby.</p><h2>Players to Watch</h2><p>Keep an eye on the young talent emerging through the ranks. Several new caps look set to make an immediate impact on the tournament.</p><h2>Ticket Availability</h2><p>Six Nations tickets are among the most sought-after in rugby. Rondo Sports holds an allocation for several fixtures – check our listings for current availability.</p>',
  3,
  DATE_SUB(NOW(), INTERVAL 7 DAY),
  'published',
  'Six Nations 2026 Match Preview & Key Fixtures | Rondo Sports',
  'Six Nations 2026 preview: key fixtures, form guide and what each nation needs to lift the championship title. Tickets available through Rondo Sports.',
  'Six Nations 2026, Six Nations tickets, rugby match preview, Six Nations fixtures 2026',
  'Six Nations 2026 – Match Preview and What to Expect',
  'The Six Nations is back with another gripping championship. Preview the key fixtures, form guide and how to get tickets.',
  NULL
),

(
  'Understanding Ticket Categories: A Buyer\'s Guide',
  'understanding-ticket-categories-buyers-guide',
  NULL,
  'Confused by ticket categories, zones and hospitality tiers? This guide breaks down exactly what each ticket type offers so you can make the best choice for your budget and experience preferences.',
  '<h2>Category 1 – Premium</h2><p>Category 1 seats are typically located on the main stand with the best central views. Prices are highest but the matchday experience is unmatched.</p><h2>Category 2 – Mid-Range</h2><p>These seats offer excellent value. You may be slightly further from the centre but the views remain strong and prices are significantly lower than Category 1.</p><h2>Category 3 – Budget</h2><p>Category 3 provides access to the stadium at the most affordable price point. Perfect for fans who simply want to be there.</p><h2>Hospitality Packages</h2><p>Beyond standard categories, hospitality packages offer a premium experience including a dedicated lounge, gourmet catering and the best seats in the ground. See our <a href="/hospitality">hospitality section</a> for current packages.</p><h2>Which Category is Right for You?</h2><p>Consider your budget, the importance of the match to you and whether you want a full hospitality experience. Our team is always happy to advise – contact us for personalised recommendations.</p>',
  4,
  DATE_SUB(NOW(), INTERVAL 10 DAY),
  'published',
  'Understanding Sports Ticket Categories: A Complete Buyer\'s Guide | Rondo Sports',
  'Not sure which ticket category to choose? Our buyer\'s guide explains Category 1, 2, 3 and hospitality options to help you pick the right seats.',
  'sports ticket categories, Category 1 tickets, sports hospitality packages, buy sports tickets guide',
  'Understanding Ticket Categories: A Buyer\'s Guide',
  'Confused by ticket zones and hospitality tiers? This guide breaks down every category so you can choose the right option for your budget.',
  NULL
),

(
  'The Rondo Sports VIP Hospitality Experience Explained',
  'rondo-sports-vip-hospitality-experience-explained',
  NULL,
  'What exactly is included in a Rondo Sports VIP hospitality package? We lift the curtain on what makes our packages special and why thousands of clients choose us every season.',
  '<h2>What is Sports Hospitality?</h2><p>Sports hospitality packages combine premium match tickets with an enhanced event experience. This typically includes access to a private lounge, gourmet dining, open bar and additional benefits depending on the event.</p><h2>What Rondo Sports Includes</h2><ul><li>Guaranteed Category 1 or Premium seats</li><li>Pre-match three-course dining</li><li>Open bar throughout the event</li><li>Dedicated event host</li><li>Official event programme</li></ul><h2>Ideal For</h2><p>VIP hospitality is popular for corporate entertainment, milestone celebrations and as a premium gift. It is also the most reliable way to guarantee the best seats for high-demand events.</p><h2>How to Book</h2><p>Browse our current hospitality packages through the website or contact our team directly for bespoke requirements and group bookings.</p>',
  5,
  DATE_SUB(NOW(), INTERVAL 12 DAY),
  'published',
  'Rondo Sports VIP Hospitality Packages Explained | Rondo Sports',
  'Discover what\'s included in a Rondo Sports VIP hospitality package — premium seats, gourmet dining, open bar and a dedicated event host.',
  'VIP sports hospitality, sports hospitality packages, corporate sports entertainment, premium event tickets',
  'The Rondo Sports VIP Hospitality Experience Explained',
  'What\'s really included in a VIP hospitality package? We reveal everything that makes Rondo Sports the choice for premium event experiences.',
  NULL
),

(
  'Travelling to Paris for the French Open? Here is What You Need to Know',
  'travelling-to-paris-french-open-guide',
  NULL,
  'Roland Garros and Paris make for a perfect combination. From clay court tennis to world-class cuisine, here is your essential travel guide for the French Open.',
  '<h2>Roland Garros – The Venue</h2><p>The Stade Roland Garros is located in the 16th arrondissement of Paris, just a short walk from Bois de Boulogne. The venue has recently been expanded with a stunning new Court Simonne-Mathieu.</p><h2>Getting There</h2><p>Take the Metro Line 9 to Exelmans or Line 10 to Porte d\'Auteuil. Both stations are within a 10-minute walk of the venue.</p><h2>Best Time to Visit</h2><p>The French Open runs for two weeks in late May to early June. The first week typically sees the most competitive first-round action while the second week delivers the marquee quarter-finals and semis.</p><h2>Paris Beyond Tennis</h2><p>Make the most of your Paris trip with visits to the Louvre, Musée d\'Orsay, Notre-Dame (now reopened) and a river cruise along the Seine.</p>',
  2,
  DATE_SUB(NOW(), INTERVAL 14 DAY),
  'published',
  'Travelling to Paris for the French Open? Complete Guide | Rondo Sports',
  'Planning a trip to the French Open at Roland Garros? Our guide covers transport, best match days to attend and what to explore in Paris.',
  'French Open travel guide, Roland Garros tickets, Paris tennis, French Open 2026',
  'Travelling to Paris for the French Open? Here is What You Need to Know',
  'Roland Garros and Paris make for a perfect combination. Here is your essential travel guide for the French Open.',
  NULL
),

(
  'How Early Should You Book Sports Travel?',
  'how-early-should-you-book-sports-travel',
  NULL,
  'Timing is everything when it comes to sports travel. Book too late and your preferred tickets are gone; book too early and plans can change. Find the sweet spot with our expert advice.',
  '<h2>Major Finals and Showpiece Events</h2><p>For events like the Champions League Final, Grand Slam finals and Olympic events, book as soon as tickets and travel are available. Demand consistently exceeds supply and prices only go up.</p><h2>Regular Season Fixtures</h2><p>Most top-flight football and rugby matches can be booked 3–6 months ahead comfortably. The most popular fixtures (derbies, title run-ins) should be booked earlier.</p><h2>Travel and Accommodation</h2><p>Flights and hotels should be booked at the same time as tickets. Hotel prices surge when a major event is announced in a city.</p><h2>Flexibility</h2><p>If you can be flexible on specific match dates or accept mid-tier seats, you will find better availability and pricing even at shorter notice.</p>',
  2,
  DATE_SUB(NOW(), INTERVAL 16 DAY),
  'published',
  'How Early Should You Book Sports Travel? Expert Advice | Rondo Sports',
  'Find out the optimal time to book sports travel, tickets and accommodation for major events — from Champions League Finals to regular season fixtures.',
  'when to book sports tickets, sports travel booking tips, book tickets early, sports travel advice',
  'How Early Should You Book Sports Travel?',
  'Timing is everything in sports travel. Our expert guide helps you find the perfect booking window for every type of event.',
  NULL
),

(
  'Rondo Sports Partners with Leading Hospitality Providers for 2026',
  'rondo-sports-partners-leading-hospitality-providers-2026',
  NULL,
  'We are delighted to announce expanded hospitality partnerships for the 2026 season, giving our clients access to an even wider range of premium experiences across football, tennis, rugby and motorsport.',
  '<h2>New Partnerships</h2><p>Rondo Sports has secured new agreements with official hospitality providers at several premier venues for the 2026 season. This expands our portfolio significantly.</p><h2>What This Means for Clients</h2><p>More choice, more availability and more competitive pricing on hospitality packages across the major sporting calendar. Whether you are looking for a Champions League hospitality suite or a Wimbledon Centre Court lunch package, we now have more options than ever before.</p><h2>Exclusive Packages</h2><p>Some of our new partnerships offer exclusive packages not available elsewhere. Contact our team to find out what is on offer before these limited allocations are taken.</p>',
  5,
  DATE_SUB(NOW(), INTERVAL 20 DAY),
  'published',
  'Rondo Sports Expands Hospitality Partnerships for 2026 | Rondo Sports',
  'Rondo Sports announces expanded hospitality partnerships for 2026, offering clients wider access to premium experiences across football, tennis, rugby and motorsport.',
  'sports hospitality 2026, Rondo Sports partners, premium sports packages, hospitality providers',
  'Rondo Sports Partners with Leading Hospitality Providers for 2026',
  'Expanded hospitality partnerships mean more choice, more availability and better pricing across the major 2026 sporting calendar.',
  NULL
),

(
  'A Beginner\'s Guide to Formula 1 Grand Prix Weekends',
  'beginners-guide-formula-1-grand-prix-weekends',
  NULL,
  'Never been to a Formula 1 Grand Prix before? Our beginner\'s guide tells you everything you need to know about race weekend structure, what to bring, where to sit and how to make the most of your first experience.',
  '<h2>The Race Weekend Structure</h2><p>A Formula 1 Grand Prix weekend spans three days. Thursday or Friday is practice, Saturday is qualifying and Sunday is the race. Sprint weekends also feature a shorter race on Saturday.</p><h2>Choosing Your Grandstand</h2><p>Different grandstands offer different experiences. Some offer great views of a specific corner, others provide a longer sightline of the start-finish straight. Check the circuit map when booking.</p><h2>What to Bring</h2><ul><li>Ear protection – F1 cars are very loud</li><li>Sunscreen and a hat – most circuits offer little shade</li><li>Comfortable walking shoes – circuits are large</li><li>A portable phone charger – you will be taking a lot of photos</li></ul><h2>Getting the Most from Your Day</h2><p>Arrive early to explore the paddock area, merchandise village and fan zone. The atmosphere builds throughout the day and peaks at the start of the race.</p>',
  4,
  DATE_SUB(NOW(), INTERVAL 22 DAY),
  'published',
  'Beginner\'s Guide to Formula 1 Grand Prix Weekends | Rondo Sports',
  'Never been to a Formula 1 Grand Prix? Our beginner\'s guide covers the race weekend structure, what to bring, best grandstands and how to enjoy your first race.',
  'Formula 1 Grand Prix guide, first F1 race tips, F1 grandstand guide, F1 race weekend what to expect',
  'A Beginner\'s Guide to Formula 1 Grand Prix Weekends',
  'Everything first-time F1 fans need to know — from race weekend structure to what to bring and how to choose your grandstand.',
  NULL
);

-- ============================================================
-- Seed Data: Blog-Tag Relationships
-- ============================================================
-- Blog 1 (Champions League): Football, Champions League, Tickets, Hospitality
INSERT INTO `blog_tag_map` (`blog_id`, `tag_id`) VALUES
  (1, 1), (1, 5), (1, 9), (1, 8);

-- Blog 2 (F1 Circuits): Formula 1, Travel
INSERT INTO `blog_tag_map` (`blog_id`, `tag_id`) VALUES
  (2, 2), (2, 6);

-- Blog 3 (Wimbledon): Tennis, Travel, Guide
INSERT INTO `blog_tag_map` (`blog_id`, `tag_id`) VALUES
  (3, 3), (3, 6), (3, 10);

-- Blog 4 (Six Nations): Rugby, Tickets
INSERT INTO `blog_tag_map` (`blog_id`, `tag_id`) VALUES
  (4, 4), (4, 9);

-- Blog 5 (Ticket Categories): Tickets, Guide
INSERT INTO `blog_tag_map` (`blog_id`, `tag_id`) VALUES
  (5, 9), (5, 10);

-- Blog 6 (VIP Hospitality): VIP, Hospitality
INSERT INTO `blog_tag_map` (`blog_id`, `tag_id`) VALUES
  (6, 7), (6, 8);

-- Blog 7 (Paris French Open): Tennis, Travel
INSERT INTO `blog_tag_map` (`blog_id`, `tag_id`) VALUES
  (7, 3), (7, 6);

-- Blog 8 (Book Early): Travel, Guide
INSERT INTO `blog_tag_map` (`blog_id`, `tag_id`) VALUES
  (8, 6), (8, 10);

-- Blog 9 (Hospitality Partners): Hospitality, VIP
INSERT INTO `blog_tag_map` (`blog_id`, `tag_id`) VALUES
  (9, 8), (9, 7);

-- Blog 10 (F1 Beginners Guide): Formula 1, Guide
INSERT INTO `blog_tag_map` (`blog_id`, `tag_id`) VALUES
  (10, 2), (10, 10);
