import React, { useState, useEffect, useRef } from 'react';
import styles from './Hero.module.css';
import { MdArrowRight } from 'react-icons/md';
import { bannersService } from '../../services/bannersService';
import type { Banner } from '../../types/banners';
import { formatEventDate } from '../../utils/dateUtils';

const Hero: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // URLs that have successfully loaded (or timed out after 1.5 s fallback).
  const [loadedUrls, setLoadedUrls] = useState<Set<string>>(new Set());
  // URLs that fired onError — tracked separately so we never confuse
  // "still loading" with "definitely broken".
  const [brokenUrls, setBrokenUrls] = useState<Set<string>>(new Set());

  // The last URL that was successfully revealed — rendered as a base layer so
  // the previous slide stays visible while the incoming image loads.
  const [displayedUrl, setDisplayedUrl] = useState<string>('');

  // True once the very first image has been shown. Gates the auto-slide timer
  // so slides never advance while slide 1 is still invisible.
  const [firstReady, setFirstReady] = useState(false);

  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  });

  const getImageUrl = (b: Banner | undefined): string => {
    if (!b) return '';
    return isMobile && b.mobile_image_url ? b.mobile_image_url : (b.image_url ?? '');
  };

  const imageUrl = banners.length > 0 ? getImageUrl(banners[currentSlide]) : '';
  const isImageReady = loadedUrls.has(imageUrl);
  const isImageBroken = brokenUrls.has(imageUrl);

  // Fetch banners on mount
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        setLoading(true);
        const data = await bannersService.getHomepageHeroBanners();
        if (data.length === 0) {
          setError('No banners available at this time');
        } else {
          setBanners(data);
        }
      } catch (err: any) {
        console.error('Failed to fetch banners:', err);
        setError('Failed to load banners');
      } finally {
        setLoading(false);
      }
    };
    fetchBanners();
  }, []);

  // Handle window resize for responsive images
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // P1: Fallback timer — 800 ms.
  // If the image hasn't fired onLoad within 800 ms, force-reveal it so the
  // slide is never permanently invisible on a stalled connection.
  useEffect(() => {
    if (!imageUrl || loadedUrls.has(imageUrl) || brokenUrls.has(imageUrl)) return;
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    fadeTimerRef.current = setTimeout(() => {
      setLoadedUrls((prev) => new Set(prev).add(imageUrl));
    }, 800);
    return () => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, [imageUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync displayedUrl and firstReady whenever isImageReady becomes true.
  // This handles both the normal onLoad path and the P2 preload path (where
  // the image is already in the browser cache before the slide renders).
  useEffect(() => {
    if (isImageReady && !isImageBroken && imageUrl && imageUrl !== displayedUrl) {
      setDisplayedUrl(imageUrl);
      if (!firstReady) setFirstReady(true);
    }
  }, [isImageReady, imageUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // P2: Preload the next slide's image as soon as the current slide becomes
  // visible so the browser has it cached before the auto-advance fires.
  useEffect(() => {
    if (banners.length <= 1) return;
    const nextIndex = (currentSlide + 1) % banners.length;
    const nextUrl = getImageUrl(banners[nextIndex]);
    if (!nextUrl) return;
    const img = new Image();
    img.src = nextUrl;
    img.onload = () => setLoadedUrls((prev) => new Set(prev).add(nextUrl));
  }, [currentSlide, banners, isMobile]); // eslint-disable-line react-hooks/exhaustive-deps

  // P1: Auto-slide only starts after the first image is fully visible.
  // This prevents the slider advancing while slide 1 is still invisible.
  useEffect(() => {
    if (banners.length <= 1 || !firstReady) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length, firstReady]);

  const handleIndicatorClick = (index: number) => {
    setCurrentSlide(index);
  };

  const handleImageLoad = () => {
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    setLoadedUrls((prev) => new Set(prev).add(imageUrl));
    // displayedUrl and firstReady are updated by the sync effect above.
  };

  // P8: Track broken images separately so they are distinguishable from
  // slow-loading images. Don't block auto-slide on a broken first image.
  const handleImageError = () => {
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    setBrokenUrls((prev) => new Set(prev).add(imageUrl));
    if (!firstReady) setFirstReady(true);
  };

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <section className={styles.hero}>
        <div className={styles.wrapper}>
          <div className={styles.skeletonImage}></div>
          <div className={styles.heroContentContainer}>
            <div className={styles.heroContentWrapper}>
              <div className={styles.heroContent}>
                <div className={styles.skeletonTag}></div>
                <div className={styles.skeletonTitle}></div>
                <div className={styles.skeletonDescription}></div>
                <div className={styles.skeletonButton}></div>
              </div>
            </div>
          </div>
          <div className={styles.pagination}>
            <div className={styles.skeletonPagination}></div>
          </div>
          <div className={styles.carouselIndicators}>
            <div className={styles.skeletonIndicator}></div>
            <div className={styles.skeletonIndicator}></div>
            <div className={styles.skeletonIndicator}></div>
          </div>
        </div>
      </section>
    );
  }

  // ── Error / empty fallback ──────────────────────────────────────────────────
  if (error || banners.length === 0) {
    return (
      <section className={styles.hero}>
        <div className={styles.wrapper}>
          <div className={styles.heroContentContainer}>
            <div className={styles.heroContentWrapper}>
              <div className={styles.heroContent}>
                <div className={styles.trendingTag}>TRENDING #1</div>
                <h1 className={styles.heroTitle}>Exciting Sports Events</h1>
                <p className={styles.heroDescription}>
                  Discover amazing sports events and book your tickets now
                </p>
                <a href="#events" className={styles.heroButton}>
                  <span>Explore Events</span>
                  <MdArrowRight />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const currentBanner = banners[currentSlide];
  const formattedDate = formatEventDate(currentBanner.event_date);

  return (
    <section className={styles.hero}>
      <div className={styles.wrapper}>
        {/*
         * P3: Two-layer cross-fade.
         *
         * Base layer  (z-index 0) — the last successfully displayed URL.
         * Stays fully visible during transitions so the user always sees the
         * previous slide rather than the dark background while the new image
         * loads. Unmounts once the incoming image has been revealed
         * (displayedUrl catches up to imageUrl).
         *
         * Active layer (z-index 1) — the current slide's image.
         * Starts at opacity 0, fades to 1 when the browser finishes loading
         * it (or after the 1.5 s fallback). Without key={imageUrl} the DOM
         * element is reused across slides, avoiding the remount-induced flash.
         */}
        {displayedUrl && displayedUrl !== imageUrl && (
          <img
            src={displayedUrl}
            aria-hidden="true"
            alt=""
            className={styles.heroImageBase}
          />
        )}

        {/* P3 / P4 */}
        <img
          src={imageUrl}
          alt={currentBanner.title}
          className={styles.heroImage}
          fetchPriority="high"
          loading="eager"
          onLoad={handleImageLoad}
          onError={handleImageError}
          style={{
            opacity: isImageReady && !isImageBroken ? 1 : 0,
            transition: 'opacity 0.6s ease',
          }}
        />

        <div className={styles.heroContentContainer}>
          <div className={styles.heroContentWrapper}>
            <div className={styles.heroContent}>
              <div className={styles.trendingTag}>TRENDING #{currentSlide + 1}</div>
              <h1 className={styles.heroTitle}>{currentBanner.title}</h1>
              <p className={styles.heroDescription}>
                {currentBanner.description}
              </p>
              {formattedDate && (
                <p className={styles.eventDate}>
                  {formattedDate}
                </p>
              )}
              {currentBanner.link_url && currentBanner.link_target && (
                <a
                  href={currentBanner.link_url}
                  className={styles.heroButton}
                  target={currentBanner.link_target}
                  rel={currentBanner.link_target === '_blank' ? 'noopener noreferrer' : undefined}
                >
                  <span>Buy Tickets Now</span>
                  <MdArrowRight />
                </a>
              )}
            </div>
          </div>
        </div>

        <div className={styles.pagination}>
          <div className={styles.paginationNumber}>
            {String(currentSlide + 1).padStart(2, '0')}
          </div>
          <div className={styles.paginationTotal}>
            {String(banners.length).padStart(2, '0')}
          </div>
        </div>

        {banners.length > 1 && (
          <div className={styles.carouselIndicators}>
            {banners.map((_, index) => (
              <button
                key={index}
                className={`${styles.indicator} ${index === currentSlide ? styles.active : ''}`}
                onClick={() => handleIndicatorClick(index)}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Hero;
