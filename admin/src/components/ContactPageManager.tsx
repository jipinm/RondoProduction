import React, { useState, useEffect } from 'react';
import { Save, Loader, AlertCircle, CheckCircle, Upload } from 'lucide-react';
import contactPageService, { type ContactPageSettings } from '../services/contactPageService';
import { BannerImageUpload } from './banners/BannerImageUpload';
import styles from './ContactPageManager.module.css';

const DEFAULT_SETTINGS: ContactPageSettings = {
  banner_image_url: null,
  email_address: '',
  phone_number: '',
  whatsapp_number: '',
  social_facebook: '',
  social_twitter: '',
  social_instagram: '',
  social_linkedin: '',
  social_youtube: '',
};

const ContactPageManager: React.FC = () => {
  const [settings, setSettings] = useState<ContactPageSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await contactPageService.getSettings();
      if (result.success && result.data) {
        setSettings(result.data);
      } else {
        setError(result.error || 'Failed to load contact page settings');
      }
    } catch {
      setError('Failed to load contact page settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleBannerUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const result = await contactPageService.uploadBanner(file);
      if (result.success && result.data) {
        setSettings(prev => ({ ...prev, banner_image_url: result.data!.banner_image_url }));
        showSuccess('Banner uploaded successfully!');
      } else {
        setError(result.error || 'Failed to upload banner');
      }
    } catch {
      setError('Failed to upload banner');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      // Save all fields except banner_image_url (handled via upload endpoint)
      const { banner_image_url, id, created_at, updated_at, ...settingsToSave } = settings;
      const result = await contactPageService.updateSettings(settingsToSave);
      if (result.success && result.data) {
        setSettings(result.data);
        showSuccess('Settings saved successfully!');
      } else {
        setError(result.error || 'Failed to save settings');
      }
    } catch {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 4000);
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader size={24} className={styles.spinner} />
        <span>Loading contact page settings…</span>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h3>Contact Page Settings</h3>
          <p className={styles.subtitle}>Banner image and contact details shown on the Contact Us page.</p>
        </div>
        <button className={styles.saveButton} onClick={handleSave} disabled={saving || uploading}>
          {saving ? <><Loader size={16} className={styles.spinner} /> Saving…</> : <><Save size={16} /> Save Changes</>}
        </button>
      </div>

      {error && (
        <div className={styles.errorBanner}><AlertCircle size={16} /><span>{error}</span></div>
      )}
      {success && (
        <div className={styles.successBanner}><CheckCircle size={16} /><span>{success}</span></div>
      )}

      {/* Banner Image */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <Upload size={18} />
          <h4>Banner Image</h4>
        </div>

        <div className={styles.bannerArea}>
          {uploading && (
            <div className={styles.bannerOverlay} style={{ marginBottom: '1rem' }}>
              <Loader size={24} className={styles.spinner} />
              <span>Processing...</span>
            </div>
          )}
          <BannerImageUpload
            key={settings.banner_image_url || 'no-image'}
            currentImageUrl={settings.banner_image_url ?? undefined}
            onImageChange={async (file) => {
              if (file) {
                await handleBannerUpload(file);
              } else {
                setUploading(true);
                setError(null);
                try {
                  const result = await contactPageService.updateSettings({ banner_image_url: null });
                  if (result.success && result.data) {
                    setSettings(result.data);
                    showSuccess('Banner removed successfully!');
                  } else {
                    setError(result.error || 'Failed to remove banner');
                  }
                } catch {
                  setError('Failed to remove banner');
                } finally {
                  setUploading(false);
                }
              }
            }}
            maxSizeMessage="Maximum file size: 5MB."
            dimensionHint="1920×400px"
          />
        </div>
      </section>

      {/* Contact Details */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <Save size={18} />
          <h4>Contact Details</h4>
        </div>
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Email Address</label>
            <input type="email" name="email_address" value={settings.email_address} onChange={handleChange} className={styles.input} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Phone Number</label>
            <input type="text" name="phone_number" value={settings.phone_number} onChange={handleChange} className={styles.input} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>WhatsApp Number</label>
            <input type="text" name="whatsapp_number" value={settings.whatsapp_number} onChange={handleChange} className={styles.input} />
            <p className={styles.hint}>Include country code, e.g. +447911123456. Used for the wa.me link.</p>
          </div>
        </div>
      </section>

      {/* Social Media */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <Save size={18} />
          <h4>Social Media Links</h4>
        </div>
        <div className={styles.formGrid}>
          {(
            [
              { name: 'social_facebook',  label: 'Facebook URL' },
              { name: 'social_twitter',   label: 'Twitter / X URL' },
              { name: 'social_instagram', label: 'Instagram URL' },
              { name: 'social_linkedin',  label: 'LinkedIn URL' },
              { name: 'social_youtube',   label: 'YouTube URL' },
            ] as const
          ).map(({ name, label }) => (
            <div key={name} className={styles.formGroup}>
              <label className={styles.label}>{label}</label>
              <input type="url" name={name} value={(settings as any)[name]} onChange={handleChange} className={styles.input} />
            </div>
          ))}
        </div>
      </section>

      <div className={styles.bottomActions}>
        <button className={styles.saveButton} onClick={handleSave} disabled={saving || uploading}>
          {saving ? <><Loader size={16} className={styles.spinner} /> Saving…</> : <><Save size={16} /> Save Changes</>}
        </button>
      </div>
    </div>
  );
};

export default ContactPageManager;

