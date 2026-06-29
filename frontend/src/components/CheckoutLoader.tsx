import React from 'react';
import styles from './CheckoutLoader.module.css';

interface CheckoutLoaderProps {
  message?: string;
  subMessage?: string;
  /** 'page'    → fills the left checkout column (default)
   *  'section' → smaller, used inside a content block            */
  variant?: 'page' | 'section';
  /** Show an indeterminate progress bar below the text */
  showProgress?: boolean;
}

const CheckoutLoader: React.FC<CheckoutLoaderProps> = ({
  message = 'Loading...',
  subMessage,
  variant = 'page',
  showProgress = false,
}) => (
  <div className={styles[variant]}>
    <div className={styles.card}>
      <div className={styles.spinnerWrapper}>
        <div className={styles.spinnerTrack} />
        <div className={styles.spinnerArc} />
        <div className={styles.spinnerDot} />
      </div>

      <div className={styles.textBlock}>
        <p className={styles.message}>{message}</p>
        {subMessage && (
          <p className={styles.subMessage}>
            <span className={styles.dots}>{subMessage}</span>
          </p>
        )}
      </div>

      {showProgress && (
        <div className={styles.progressBar}>
          <div className={styles.progressFill} />
        </div>
      )}
    </div>
  </div>
);

export default CheckoutLoader;
