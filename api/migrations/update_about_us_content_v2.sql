-- Update About Us page content
-- Source: About-content.txt (May 2026)
-- Updates the cms_pages 'about' entry with the revised content

UPDATE cms_pages
SET content = '<div class="about-page">
    <p class="intro-quote"><em>There\'s a difference between watching sport and being there live.</em></p>

    <p>The noise of the crowd as the stadium fills, the first glimpse of the players as they walk through the tunnel.</p>

    <p>From the MCG to Madison Square Garden, from Twickenham to Turnberry and from Newlands to the North Bank. Trips to watch live sports with family, friends and colleagues, have given us some of the best moments of our lives and created memories that we will keep forever.</p>

    <p>At Rondo, we want to create a platform that will bring as wide a variety of sporting experiences to as many people as possible.</p>

    <p>Whether its just the ticket to access the stadium or the complete, bespoke package of ticket, travel and accommodation; we aim to make your bucket list sporting experience a reality.</p>

    <h2>Our Core Principles</h2>

    <ul class="principles-list">
        <li><strong>Authentic &amp; Official Tickets:</strong> All tickets supplied are official and guaranteed to be authentic and valid. Rondo only sells tickets sourced from the official suppliers of events.</li>
        <li><strong>Bespoke Customer Service:</strong> No two trips are the same. We understand this. Whatever the event and whatever the ticket requirement, we are confident we can help create an occasion specifically tailored to you. Try us.</li>
        <li><strong>Real-Time Availability:</strong> Ticket availability is shown real time on our website enabling you to secure your place at events instantaneously.</li>
    </ul>
</div>',
    title = 'About Rondo Sports',
    meta_title = 'About Us | Rondo Sports - Your Premium Sports Ticket Experience',
    meta_description = 'Learn about Rondo Sports - your trusted partner for authentic sports tickets, exceptional customer service, and unforgettable sporting experiences worldwide.',
    updated_at = NOW()
WHERE page_key = 'about';

-- Verify the update
SELECT id, page_key, title, LEFT(content, 300) AS content_preview
FROM cms_pages
WHERE page_key = 'about';
