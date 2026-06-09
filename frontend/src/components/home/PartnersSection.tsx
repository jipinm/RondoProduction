import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/apiRoutes';
import styles from './PartnersSection.module.css';

interface Partner {
  id: number;
  name: string;
  logo_url: string;
  link_url?: string;
  link_target: '_self' | '_blank';
  position_order: number;
}

const getLogosPerSlide = (width: number): number => {
  if (width <= 768) return 4;
  if (width <= 1024) return 5;
  return 7;
};

const PartnersSection: React.FC = () => {
  const [hoveredLogo, setHoveredLogo] = useState<number | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const fetchPartners = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get<{ success: boolean; data: Partner[] }>(
          '/api/v1/partners?limit=100'
        );
        if (response.data.success && response.data.data) {
          setPartners(response.data.data);
        }
      } catch (err) {
        console.error('Error fetching partners:', err);
        setError('Failed to load partners');
      } finally {
        setLoading(false);
      }
    };
    fetchPartners();
  }, []);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const logosPerSlide = getLogosPerSlide(windowWidth);
  const totalSlides = Math.ceil(partners.length / logosPerSlide);

  // Reset slide index when the per-slide count changes (window resize)
  useEffect(() => {
    setCurrentSlide(0);
  }, [logosPerSlide]);

  // Auto-advance slides
  useEffect(() => {
    if (totalSlides <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % totalSlides);
    }, 3000);
    return () => clearInterval(interval);
  }, [totalSlides]);

  const visiblePartners = partners.slice(
    currentSlide * logosPerSlide,
    (currentSlide + 1) * logosPerSlide
  );

  const handlePartnerClick = (partner: Partner) => {
    if (partner.link_url) {
      window.open(partner.link_url, partner.link_target);
    }
  };

  if (loading) {
    return (
      <section className={styles.partnersSection}>
        <div className={styles.container}>
          <div className={styles.partnersContent}>
            <h3 className={styles.partnersTitle}>
              <img src="/logo-blue-medium.png" alt="Rondo Sports" className={styles.partnersTitleLogo} />
              IS PROUD TO WORK WITH
            </h3>
            <div className={styles.partnersLogos}>
              <p>Loading partners...</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error || partners.length === 0) {
    return null;
  }

  return (
    <section className={styles.partnersSection}>
      <div className={styles.container}>
        <div className={styles.partnersContent}>
          <h3 className={styles.partnersTitle}>
            <img src="/logo-blue-medium.png" alt="Rondo Sports" className={styles.partnersTitleLogo} />
            IS PROUD TO WORK WITH
          </h3>
          <div className={styles.partnersLogos}>
            {visiblePartners.map((partner, index) => {
              const globalIndex = currentSlide * logosPerSlide + index;
              return (
                <div
                  key={`${partner.id}-${globalIndex}`}
                  className={styles.logoWrapper}
                  onMouseEnter={() => setHoveredLogo(globalIndex)}
                  onMouseLeave={() => setHoveredLogo(null)}
                  onClick={() => handlePartnerClick(partner)}
                  style={{ cursor: partner.link_url ? 'pointer' : 'default' }}
                >
                  <img
                    src={partner.logo_url}
                    alt={partner.name}
                    className={`${styles.partnerLogo} ${hoveredLogo === globalIndex ? styles.logoHovered : ''}`}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder-partner.png';
                    }}
                  />
                </div>
              );
            })}
          </div>
          {totalSlides > 1 && (
            <div className={styles.sliderDots}>
              {Array.from({ length: totalSlides }).map((_, index) => (
                <button
                  key={index}
                  className={`${styles.sliderDot} ${index === currentSlide ? styles.sliderDotActive : ''}`}
                  onClick={() => setCurrentSlide(index)}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default PartnersSection;
