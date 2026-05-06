import React from 'react';
import styles from './AboutPhotoCollage.module.css';

const photos = [
  {
    id: 1,
    src: 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=800&q=80',
    alt: 'Football stadium crowd',
  },
  {
    id: 2,
    src: 'https://images.unsplash.com/photo-1459865264687-595d652de67e?auto=format&fit=crop&w=1200&q=80',
    alt: 'Stadium match day atmosphere',
  },
  {
    id: 3,
    src: 'https://images.unsplash.com/photo-1518604666860-9ed391f76460?auto=format&fit=crop&w=700&q=80',
    alt: 'Tennis tournament',
  },
  {
    id: 4,
    src: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80',
    alt: 'Football match under the lights',
  },
  {
    id: 5,
    src: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?auto=format&fit=crop&w=1000&q=80',
    alt: 'American football stadium',
  },
  {
    id: 6,
    src: 'https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=900&q=80',
    alt: 'Fans celebrating at a match',
  },
  {
    id: 7,
    src: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?auto=format&fit=crop&w=700&q=80',
    alt: 'Golf tournament',
  },
  {
    id: 8,
    src: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=700&q=80',
    alt: 'Cricket stadium',
  },
];

const AboutPhotoCollage: React.FC = () => {
  return (
    <div className={styles.collageWrapper}>
      <div className={styles.collageGrid}>
        {photos.map((photo) => (
          <div key={photo.id} className={`${styles.photoCell} ${styles[`cell${photo.id}` as keyof typeof styles]}`}>
            <img src={photo.src} alt={photo.alt} className={styles.photo} loading="lazy" />
          </div>
        ))}

        <div className={styles.logoOverlay}>
          <img src="/logo-white-large.png" alt="Rondo Sports Travel" className={styles.logoImg} />
        </div>
      </div>
    </div>
  );
};

export default AboutPhotoCollage;
