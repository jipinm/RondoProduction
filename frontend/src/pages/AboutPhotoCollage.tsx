import React from 'react';
import styles from './AboutPhotoCollage.module.css';

interface AboutPhotoCollageProps {
  imageUrl: string | null;
}

const AboutPhotoCollage: React.FC<AboutPhotoCollageProps> = ({ imageUrl }) => {
  if (!imageUrl) return null;

  return (
    <div className={styles.collageWrapper}>
      <div className={styles.singleImageContainer}>
        <img src={imageUrl} alt="About Us" className={styles.singleImage} loading="lazy" />
        <div className={styles.logoOverlay}>
          <img src="/logo-white-large.png" alt="Rondo Sports Travel" className={styles.logoImg} />
        </div>
      </div>
    </div>
  );
};

export default AboutPhotoCollage;

