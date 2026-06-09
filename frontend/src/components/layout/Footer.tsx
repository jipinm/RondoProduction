import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './Footer.module.css';
import { FaFacebook, FaInstagram, FaLinkedin, FaYoutube } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { useSiteBranding } from '../../hooks/useSiteBranding';
import contactPagePublicService, { type ContactPageSettings, DEFAULT_SETTINGS } from '../../services/contactPageService';
import newsletterService from '../../services/newsletterService';

const Footer: React.FC = () => {
  const { footer_logo_url } = useSiteBranding();
  const [contact, setContact] = useState<ContactPageSettings>(DEFAULT_SETTINGS);

  // Newsletter state
  const [nlEmail, setNlEmail]     = useState('');
  const [nlStatus, setNlStatus]   = useState<'idle' | 'loading' | 'success' | 'already' | 'error'>('idle');
  const [nlMessage, setNlMessage] = useState('');

  useEffect(() => {
    contactPagePublicService.getSettings().then(setContact);
  }, []);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = nlEmail.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setNlStatus('error');
      setNlMessage('Please enter a valid email address.');
      return;
    }

    setNlStatus('loading');
    try {
      const res = await newsletterService.subscribe(trimmed);
      if (res.already) {
        setNlStatus('already');
        setNlMessage('You are already subscribed to our newsletter.');
      } else {
        setNlStatus('success');
        setNlMessage('Thank you for subscribing!');
        setNlEmail('');
      }
    } catch {
      setNlStatus('error');
      setNlMessage('Something went wrong. Please try again.');
    }
  };

  const socials = [
    { href: contact.social_facebook,  Icon: FaFacebook,  label: 'Facebook' },
    { href: contact.social_twitter,   Icon: FaXTwitter,  label: 'X' },
    { href: contact.social_instagram, Icon: FaInstagram, label: 'Instagram' },
    { href: contact.social_linkedin,  Icon: FaLinkedin,  label: 'LinkedIn' },
    { href: contact.social_youtube,   Icon: FaYoutube,   label: 'YouTube' },
  ].filter(item => Boolean(item.href));
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        
        <div className={styles.footerContent}>
          <div className={styles.footerSection}>
            <div className={styles.footerLogo}>
              <img src={footer_logo_url || '/logo-footer.png'} alt="RONDO Sports Tickets" className={styles.footerLogoImg} />
            </div>
            
            <div className={styles.socialIcons}>
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
          
          <div className={`${styles.footerSection} ${styles.footerLinksSection}`}>
            <div className={styles.linksGrid}>
              <div className={styles.linksColumn}>
                <Link to="/" className={styles.footerLink}>Home</Link>
                <Link to="/about-us" className={styles.footerLink}>About Us</Link>
                <Link to="/contact-us" className={styles.footerLink}>Contact Us</Link>
              </div>
              <div className={styles.linksColumn}>
                <Link to="/privacy-policy" className={styles.footerLink}>Privacy Policy</Link>
                <Link to="/terms-conditions" className={styles.footerLink}>Terms &amp; Conditions</Link>
                <Link to="/blog" className={styles.footerLink}>Blog</Link>
              </div>
            </div>
          </div>
          
          <div className={styles.footerSection}>
            <h4 className={styles.newsletterTitle}>Newsletter</h4>
            <p className={styles.newsletterText}>Get early access to tickets, match alerts, and special deals – straight to your inbox.</p>
            <form className={styles.newsletterForm} onSubmit={handleNewsletterSubmit} noValidate>
              <input
                type="email"
                placeholder="Your Email"
                className={styles.newsletterInput}
                value={nlEmail}
                onChange={e => { setNlEmail(e.target.value); setNlStatus('idle'); }}
                disabled={nlStatus === 'loading' || nlStatus === 'success'}
              />
              <button
                type="submit"
                className={styles.newsletterButton}
                disabled={nlStatus === 'loading' || nlStatus === 'success'}
              >
                {nlStatus === 'loading' ? 'Subscribing…' : 'Subscribe'}
              </button>
            </form>
            {nlStatus !== 'idle' && nlMessage && (
              <p className={`${styles.newsletterMsg} ${styles[`newsletterMsg__${nlStatus}`]}`}>
                {nlMessage}
              </p>
            )}
          </div>
          

        </div>
        
        <div className={styles.copyright}>
          <div className={styles.copyrightContent}>
            <span>© {new Date().getFullYear()} Rondo Sports Travel. All rights reserved.</span>
            <div className={styles.copyrightLine}></div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
