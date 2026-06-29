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
  // Track which image URLs have already finished loading so cached images
  // are never stuck at opacity:0 when revisiting a slide.
  const [loadedUrls, setLoadedUrls] = useState<Set<string>>(new Set());
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Use a function initializer so it only runs once and is safe before layout
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  });

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
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    // Re-check on mount in case initial value was wrong (mobile browser quirk)
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // When imageUrl changes, start a timeout fallback: if the image hasn't fired
  // onLoad within 4 seconds (e.g. very large file on slow connection), force-show
  // it anyway so the slide is never permanently invisible.
  const imageUrl = (() => {
    if (banners.length === 0) return '';
    const b = banners[currentSlide];
    return isMobile && b?.mobile_image_url ? b.mobile_image_url : (b?.image_url ?? '');
  })();

  useEffect(() => {
    if (!imageUrl || loadedUrls.has(imageUrl)) return;
    // Clear any previous timer
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    // Fallback: reveal after 4 s regardless of load state (handles very large files)
    fadeTimerRef.current = setTimeout(() => {
      setLoadedUrls((prev) => new Set(prev).add(imageUrl));
    }, 4000);
    return () => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, [imageUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-slide functionality
  useEffect(() => {
    if (banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, [banners.length]);

  // Handle indicator click
  const handleIndicatorClick = (index: number) => {
    setCurrentSlide(index);
  };

  // Loading state
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

  // Error or empty state - show fallback content (CSS background only — no img
  // element so a missing static file never produces a broken-image placeholder)
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
  const isImageReady = loadedUrls.has(imageUrl);

  const handleImageLoad = () => {
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    setLoadedUrls((prev) => new Set(prev).add(imageUrl));
  };

  const handleImageError = () => {
    // On error, still reveal the slot (shows the dark background; content remains readable)
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    setLoadedUrls((prev) => new Set(prev).add(imageUrl));
  };

  return (
    <section className={styles.hero}>
      <div className={styles.wrapper}>
        <img
          key={imageUrl}
          src={imageUrl}
          alt={currentBanner.title}
          className={styles.heroImage}
          onLoad={handleImageLoad}
          onError={handleImageError}
          style={{ opacity: isImageReady ? 1 : 0, transition: 'opacity 0.4s ease' }}
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
              ></button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Hero;
