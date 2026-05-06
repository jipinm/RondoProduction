import React, { useState, useEffect, useRef } from 'react';
import { Save, Loader, AlertCircle, CheckCircle, Upload, ImageOff } from 'lucide-react';
import contactPageService, { type ContactPageSettings } from '../services/contactPageService';
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
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        setBannerPreview(result.data.banner_image_url ?? null);
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

  const handleBannerSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setBannerPreview(preview);
    handleBannerUpload(file);
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
        setBannerPreview(settings.banner_image_url ?? null);
      }
    } catch {
      setError('Failed to upload banner');
      setBannerPreview(settings.banner_image_url ?? null);
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
          <div
            className={styles.bannerPreviewBox}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
          >
            {uploading ? (
              <div className={styles.bannerOverlay}>
                <Loader size={32} className={styles.spinner} />
                <span>Uploading…</span>
              </div>
            ) : bannerPreview ? (
              <img src={bannerPreview} alt="Banner preview" className={styles.bannerImg} />
            ) : (
              <div className={styles.bannerPlaceholder}>
                <ImageOff size={40} />
                <span>Click to upload banner image</span>
                <span className={styles.hint}>JPEG, PNG, WebP or AVIF · max 5 MB</span>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className={styles.hiddenInput}
            onChange={handleBannerSelect}
          />

          <button
            className={styles.uploadButton}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload size={16} /> {bannerPreview ? 'Replace Banner' : 'Upload Banner'}
          </button>
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
            <input type="email" name="email_address" value={settings.email_address} onChange={handleChange} className={styles.input} placeholder="info@rondosports.com" />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Phone Number</label>
            <input type="text" name="phone_number" value={settings.phone_number} onChange={handleChange} className={styles.input} placeholder="+44 800 000 0000" />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>WhatsApp Number</label>
            <input type="text" name="whatsapp_number" value={settings.whatsapp_number} onChange={handleChange} className={styles.input} placeholder="+44 800 000 0000" />
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
              { name: 'social_facebook',  label: 'Facebook URL',   placeholder: 'https://facebook.com/yourpage' },
              { name: 'social_twitter',   label: 'Twitter / X URL', placeholder: 'https://twitter.com/yourhandle' },
              { name: 'social_instagram', label: 'Instagram URL',  placeholder: 'https://instagram.com/yourhandle' },
              { name: 'social_linkedin',  label: 'LinkedIn URL',   placeholder: 'https://linkedin.com/company/yourcompany' },
              { name: 'social_youtube',   label: 'YouTube URL',    placeholder: 'https://youtube.com/@yourchannel' },
            ] as const
          ).map(({ name, label, placeholder }) => (
            <div key={name} className={styles.formGroup}>
              <label className={styles.label}>{label}</label>
              <input type="url" name={name} value={(settings as any)[name]} onChange={handleChange} className={styles.input} placeholder={placeholder} />
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

