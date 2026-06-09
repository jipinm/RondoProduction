import React, { useState, useEffect, useRef } from 'react';
import { Lock, Mail, User, Save, CheckCircle, Image, Trash2, Upload, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import authService from '../services/authService';
import siteBrandingService, { type SiteBrandingSettings, type BrandingAssetType } from '../services/siteBrandingService';
import styles from './Settings.module.css';

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ProfileForm {
  name: string;
  email: string;
  role: string;
}

const Settings: React.FC = () => {
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'branding'>('profile');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Branding state
  const [branding, setBranding] = useState<SiteBrandingSettings>({
    header_logo_url: null,
    footer_logo_url: null,
    favicon_url: null,
  });
  const [brandingLoading, setBrandingLoading] = useState(false);
  const [uploadingType, setUploadingType] = useState<BrandingAssetType | null>(null);
  const [deletingType, setDeletingType] = useState<BrandingAssetType | null>(null);
  const [brandingMessage, setBrandingMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const headerLogoRef = useRef<HTMLInputElement>(null);
  const footerLogoRef = useRef<HTMLInputElement>(null);
  const faviconRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeTab === 'branding') {
      loadBranding();
    }
  }, [activeTab]);

  const loadBranding = async () => {
    setBrandingLoading(true);
    const result = await siteBrandingService.getSettings();
    if (result.success && result.data) {
      setBranding(result.data);
    }
    setBrandingLoading(false);
  };

  const handleBrandingUpload = async (type: BrandingAssetType, file: File) => {
    setUploadingType(type);
    setBrandingMessage(null);
    const result = await siteBrandingService.uploadImage(type, file);
    if (result.success) {
      setBrandingMessage({ type: 'success', text: 'Image uploaded successfully.' });
      await loadBranding();
    } else {
      setBrandingMessage({ type: 'error', text: result.error || 'Upload failed.' });
    }
    setUploadingType(null);
  };

  const handleBrandingDelete = async (type: BrandingAssetType) => {
    setDeletingType(type);
    setBrandingMessage(null);
    const result = await siteBrandingService.deleteImage(type);
    if (result.success) {
      setBrandingMessage({ type: 'success', text: 'Asset removed. Default will be used.' });
      await loadBranding();
    } else {
      setBrandingMessage({ type: 'error', text: result.error || 'Failed to remove asset.' });
    }
    setDeletingType(null);
  };

  // Profile settings (read-only)
  const profileForm: ProfileForm = {
    name: user?.name || 'Admin User',
    email: user?.email || 'admin@example.com',
    role: user?.role || 'admin'
  };
  
  // Security settings
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Handle password form changes
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm({ ...passwordForm, [name]: value });
  };

  // Handle password change submission
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate passwords
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New passwords do not match');
      setLoading(false);
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    try {
      console.log('🔐 Attempting to change password...');
      
      const result = await authService.changePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to change password');
      }

      // Clear password form
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  // Render different form content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'branding':
        return (
          <div className={styles.formSection}>
            <h2 className={styles.sectionTitle}>Site Branding Assets</h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem', fontSize: '0.875rem' }}>
              Upload images to replace the default static header logo, footer logo, and favicon. Leave empty to use the default assets bundled with the frontend.
            </p>

            {brandingLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-muted)' }}>
                <Loader2 size={18} className={styles.spinner} /> Loading…
              </div>
            ) : (
              <div className={styles.brandingGrid}>
                {(
                  [
                    { type: 'header_logo' as BrandingAssetType, label: 'Header Logo', hint: 'Displayed in the navigation bar. Recommended: PNG with transparency, ~500×138px.', ref: headerLogoRef },
                    { type: 'footer_logo' as BrandingAssetType, label: 'Footer Logo', hint: 'Displayed in the site footer. Recommended: PNG with transparency, ~500×138px.', ref: footerLogoRef },
                    { type: 'favicon' as BrandingAssetType, label: 'Favicon', hint: 'Displayed in browser tabs. Recommended: PNG or ICO, 100×100px or 150×150px.', ref: faviconRef },
                  ] as const
                ).map(({ type, label, hint, ref }) => {
                  const currentUrl = branding[`${type}_url` as keyof SiteBrandingSettings];
                  const isUploading = uploadingType === type;
                  const isDeleting = deletingType === type;
                  const isBusy = isUploading || isDeleting;
                  return (
                    <div key={type} className={styles.brandingCard}>
                      <div className={styles.brandingCardHeader}>
                        <Image size={16} />
                        <span className={styles.brandingCardLabel}>{label}</span>
                      </div>
                      <div className={styles.brandingPreview}>
                        {currentUrl ? (
                          <img src={currentUrl} alt={label} className={styles.brandingPreviewImg} />
                        ) : (
                          <div className={styles.brandingPreviewEmpty}>
                            <Image size={32} style={{ opacity: 0.3 }} />
                            <span>Default asset in use</span>
                          </div>
                        )}
                      </div>
                      <p className={styles.brandingHint}>{hint}</p>
                      <div className={styles.brandingActions}>
                        <input
                          type="file"
                          ref={ref}
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleBrandingUpload(type, file);
                            e.target.value = '';
                          }}
                        />
                        <button
                          type="button"
                          className={styles.uploadButton}
                          onClick={() => ref.current?.click()}
                          disabled={isBusy}
                        >
                          {isUploading ? <Loader2 size={14} className={styles.spinner} /> : <Upload size={14} />}
                          {isUploading ? 'Uploading…' : 'Upload'}
                        </button>
                        {currentUrl && (
                          <button
                            type="button"
                            className={styles.removeButton}
                            onClick={() => handleBrandingDelete(type)}
                            disabled={isBusy}
                          >
                            {isDeleting ? <Loader2 size={14} className={styles.spinner} /> : <Trash2 size={14} />}
                            {isDeleting ? 'Removing…' : 'Remove'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {brandingMessage && (
              <div className={brandingMessage.type === 'success' ? styles.successMessage : styles.errorMessage} style={{ marginTop: '1.5rem' }}>
                {brandingMessage.type === 'success' ? <CheckCircle size={18} /> : null}
                <span>{brandingMessage.text}</span>
              </div>
            )}
          </div>
        );

      case 'profile':
        return (
          <div className={styles.formSection}>
            <h2 className={styles.sectionTitle}>Profile Information</h2>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label htmlFor="name">Full Name</label>
                <div className={styles.inputWithIcon}>
                  <User size={18} className={styles.inputIcon} />
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={profileForm.name}
                    readOnly
                    className={`${styles.formInput} ${styles.readOnly}`}
                  />
                </div>
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="email">Email Address</label>
                <div className={styles.inputWithIcon}>
                  <Mail size={18} className={styles.inputIcon} />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={profileForm.email}
                    readOnly
                    className={`${styles.formInput} ${styles.readOnly}`}
                  />
                </div>
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="role">Role</label>
                <input
                  type="text"
                  id="role"
                  name="role"
                  value={profileForm.role === 'super_admin' ? 'Super Admin' : profileForm.role.charAt(0).toUpperCase() + profileForm.role.slice(1)}
                  readOnly
                  className={`${styles.formInput} ${styles.readOnly}`}
                />
              </div>
            </div>
          </div>
        );
      
      case 'security':
        return (
          <div className={styles.formSection}>
            <h2 className={styles.sectionTitle}>Change Password</h2>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label htmlFor="currentPassword">Current Password</label>
                <div className={styles.inputWithIcon}>
                  <Lock size={18} className={styles.inputIcon} />
                  <input
                    type="password"
                    id="currentPassword"
                    name="currentPassword"
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordChange}
                    className={styles.formInput}
                  />
                </div>
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="newPassword">New Password</label>
                <div className={styles.inputWithIcon}>
                  <Lock size={18} className={styles.inputIcon} />
                  <input
                    type="password"
                    id="newPassword"
                    name="newPassword"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordChange}
                    className={styles.formInput}
                  />
                </div>
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <div className={styles.inputWithIcon}>
                  <Lock size={18} className={styles.inputIcon} />
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordChange}
                    className={styles.formInput}
                  />
                </div>
              </div>
            </div>
            
            <div className={styles.passwordRequirements}>
              <h3>Password Requirements:</h3>
              <ul>
                <li>Minimum 8 characters</li>
                <li>At least one uppercase letter</li>
                <li>At least one lowercase letter</li>
                <li>At least one number</li>
                <li>At least one special character</li>
              </ul>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className={styles.settingsContainer}>
      <h1 className={styles.pageTitle}>Admin Settings</h1>
      
      <div className={styles.settingsLayout}>
        <div className={styles.settingsSidebar}>
          <button
            className={`${styles.sidebarButton} ${activeTab === 'profile' ? styles.activeButton : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={20} />
            <span>Profile</span>
          </button>
          
          <button
            className={`${styles.sidebarButton} ${activeTab === 'security' ? styles.activeButton : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <Lock size={20} />
            <span>Change Password</span>
          </button>

          <button
            className={`${styles.sidebarButton} ${activeTab === 'branding' ? styles.activeButton : ''}`}
            onClick={() => setActiveTab('branding')}
          >
            <Image size={20} />
            <span>Site Branding</span>
          </button>
        </div>
        
        <div className={styles.settingsContent}>
          {activeTab === 'profile' ? (
            <div>
              {renderTabContent()}
            </div>
          ) : activeTab === 'branding' ? (
            <div>
              {renderTabContent()}
            </div>
          ) : (
            <form onSubmit={handlePasswordSubmit}>
              {renderTabContent()}
              
              {error && (
                <div className={styles.errorMessage}>
                  <span>{error}</span>
                </div>
              )}
              
              <div className={styles.formActions}>
                <button type="submit" className={styles.saveButton} disabled={loading}>
                  <Save size={18} /> {loading ? 'Saving...' : 'Save Changes'}
                </button>
                
                {saveSuccess && (
                  <div className={styles.successMessage}>
                    <CheckCircle size={18} />
                    <span>Settings saved successfully!</span>
                  </div>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
