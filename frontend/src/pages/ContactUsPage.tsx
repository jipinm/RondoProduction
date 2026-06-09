import React, { useState, useEffect } from 'react';
import { MdEmail, MdPhone } from 'react-icons/md';
import { FaWhatsapp, FaFacebook, FaInstagram, FaLinkedin, FaYoutube } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import contactPagePublicService, {
  type ContactPageSettings,
  DEFAULT_SETTINGS,
} from '../services/contactPageService';
import styles from './ContactUsPage.module.css';
import { useSEO } from '../hooks/useSEO';

const ContactUsPage: React.FC = () => {
  useSEO('contact-us');
  const [s, setS] = useState<ContactPageSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    contactPagePublicService.getSettings().then(setS);
  }, []);

  // Build the WhatsApp href - strip non-numeric chars except leading +
  const waHref = s.whatsapp_number
    ? `https://wa.me/${s.whatsapp_number.replace(/[^\d+]/g, '')}`
    : null;

  const socials = [
    { href: s.social_facebook,  Icon: FaFacebook,  label: 'Facebook' },
    { href: s.social_twitter,   Icon: FaXTwitter,  label: 'X' },
    { href: s.social_instagram, Icon: FaInstagram, label: 'Instagram' },
    { href: s.social_linkedin,  Icon: FaLinkedin,  label: 'LinkedIn' },
    { href: s.social_youtube,   Icon: FaYoutube,   label: 'YouTube' },
  ].filter(item => Boolean(item.href));

  return (
    <div className={styles.contactPage}>

      {/* Banner */}
      {s.banner_image_url && (
        <div className={styles.bannerWrapper}>
          <img
            src={s.banner_image_url}
            alt="Contact Us banner"
            className={styles.bannerImage}
          />
        </div>
      )}

      {/* Contact strip */}
      <section className={styles.contactStrip}>
        <div className={styles.container}>
          <div className={styles.contactGrid}>

            {/* Email Us */}
            {s.email_address && (
              <div className={styles.contactColumn}>
                <h3 className={styles.columnTitle}>Email Us</h3>
                <a
                  href={`mailto:${s.email_address}`}
                  className={styles.contactLink}
                >
                  <MdEmail className={styles.contactIcon} />
                  <span>{s.email_address}</span>
                </a>
              </div>
            )}

            {/* Call Us */}
            {s.phone_number && (
              <div className={styles.contactColumn}>
                <h3 className={styles.columnTitle}>Call Us</h3>
                <a
                  href={`tel:${s.phone_number.replace(/\s/g, '')}`}
                  className={styles.contactLink}
                >
                  <MdPhone className={styles.contactIcon} />
                  <span>{s.phone_number}</span>
                </a>
              </div>
            )}

            {/* Message Us (WhatsApp) */}
            {waHref && (
              <div className={styles.contactColumn}>
                <h3 className={styles.columnTitle}>Message Us</h3>
                <a
                  href={waHref}
                  className={styles.contactLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FaWhatsapp className={styles.contactIcon} />
                  <span>{s.whatsapp_number}</span>
                </a>
              </div>
            )}

            {/* Follow Us */}
            {socials.length > 0 && (
              <div className={styles.contactColumn}>
                <h3 className={styles.columnTitle}>Follow Us</h3>
                <div className={styles.socialRow}>
                  {socials.map(({ href, Icon, label }) => (
                    <a
                      key={label}
                      href={href}
                      className={styles.socialIcon}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                    >
                      <Icon />
                    </a>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </section>

    </div>
  );
};

export default ContactUsPage;
