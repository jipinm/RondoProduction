import { useEffect, useState } from 'react';
import whyRondoPublicService, { type WhyRondoItem } from '../../services/whyRondoService';
import styles from './WhyRondoSports.module.css';

const WhyRondoSports: React.FC = () => {
  const [features, setFeatures] = useState<WhyRondoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatures = async () => {
      try {
        const data = await whyRondoPublicService.getWhyRondoItems();
        if (data && data.length > 0) {
          setFeatures(data);
        } else {
          // Fallback to static data if API fails or returns empty
          setFeatures([
            {
              id: 1,
              title: 'Where Live Lives',
              description: 'Get immediate access to tickets for the most anticipated sports events worldwide.',
              icon_url: '/images/icons/why-rondo-1.png',
              position_order: 1
            },
            {
              id: 2,
              title: 'Experience the Atmosphere',
              description: 'Secure your seat for a spectacular view and an unforgettable experience.',
              icon_url: '/images/icons/why-rondo-2.png',
              position_order: 2
            },
            {
              id: 3,
              title: 'Official Reseller',
              description: 'We work closely with official venues to ensure authentic experiences.',
              icon_url: '/images/icons/why-rondo-3.png',
              position_order: 3
            }
          ]);
        }
      } catch (error) {
        console.error('Failed to load Why Rondo features:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeatures();
  }, []);

  if (loading && features.length === 0) {
    return null; // Or a skeleton loader
  }

  return (
    <section className={styles.whyRondoSports}>
      <div className={styles.container}>
        <h2 className={styles.sectionTitle}>Why Rondo Sports?</h2>
        
        <div className={styles.featuresGrid}>
          {features.map((feature) => (
            <div key={feature.id} className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <img src={feature.icon_url} alt={feature.title} className={styles.iconImage} />
              </div>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.featureDescription}>{feature.description}</p>
            </div>
          ))}

        </div>
      </div>
    </section>
  );
};

export default WhyRondoSports;
