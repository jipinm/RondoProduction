import React, { useState, useEffect } from 'react';
import { Search, Save, Loader2, CheckCircle, AlertCircle, FileSearch } from 'lucide-react';
import Button from '../components/Button';
import { seoSettingsService, type SeoSetting, type UpdateSeoData } from '../services/seoSettingsService';
import styles from './SeoManagement.module.css';

// Character count guidelines
const TITLE_WARN = 60;
const TITLE_MAX = 70;
const DESC_WARN = 150;
const DESC_MAX = 165;

const CharCount: React.FC<{ value: string; warn: number; max: number }> = ({ value, warn, max }) => {
  const len = value?.length ?? 0;
  let cls = styles.charCount;
  if (len > max) cls = `${styles.charCount} ${styles.charCountError}`;
  else if (len > warn) cls = `${styles.charCount} ${styles.charCountWarn}`;
  return <span className={cls}>{len} / {max}</span>;
};

const SeoManagement: React.FC = () => {
  const [pages, setPages] = useState<SeoSetting[]>([]);
  const [filteredPages, setFilteredPages] = useState<SeoSetting[]>([]);
  const [selectedPage, setSelectedPage] = useState<SeoSetting | null>(null);
  const [formData, setFormData] = useState<UpdateSeoData>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load all pages on mount
  useEffect(() => {
    loadPages();
  }, []);

  // Filter pages by search
  useEffect(() => {
    if (!search.trim()) {
      setFilteredPages(pages);
    } else {
      const q = search.toLowerCase();
      setFilteredPages(pages.filter(p =>
        p.page_name.toLowerCase().includes(q) || p.page_key.toLowerCase().includes(q)
      ));
    }
  }, [search, pages]);

  const loadPages = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await seoSettingsService.getAll();
      if (result.success && Array.isArray(result.data)) {
        setPages(result.data);
        setFilteredPages(result.data);
        if (result.data.length > 0) {
          selectPage(result.data[0]);
        }
      } else {
        setError(result.error || 'Failed to load SEO settings');
      }
    } catch {
      setError('Failed to connect to the API');
    } finally {
      setLoading(false);
    }
  };

  const selectPage = (page: SeoSetting) => {
    setSelectedPage(page);
    setFormData({
      meta_title: page.meta_title ?? '',
      meta_description: page.meta_description ?? '',
      meta_keywords: page.meta_keywords ?? '',
      og_title: page.og_title ?? '',
      og_description: page.og_description ?? '',
      robots: page.robots ?? 'index, follow',
    });
    setSuccess(null);
    setError(null);
  };

  const handleChange = (field: keyof UpdateSeoData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!selectedPage) return;
    setSaving(true);
    setSuccess(null);
    setError(null);
    try {
      const result = await seoSettingsService.update(selectedPage.id, formData);
      if (result.success) {
        setSuccess('SEO settings saved successfully.');
        // Refresh pages list to reflect saved changes
        const updated = await seoSettingsService.getAll();
        if (updated.success && Array.isArray(updated.data)) {
          setPages(updated.data);
          const freshPage = updated.data.find(p => p.id === selectedPage.id);
          if (freshPage) setSelectedPage(freshPage);
        }
      } else {
        setError(result.error || 'Failed to save SEO settings');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (selectedPage) selectPage(selectedPage);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>
          <FileSearch size={24} />
          SEO Management
        </h1>
        <p className={styles.subtitle}>
          Configure page titles, meta descriptions, keywords and Open Graph data for each page of the website.
        </p>
      </div>

      {loading ? (
        <div className={styles.loadingState}>
          <Loader2 size={32} className="animate-spin" />
          <span>Loading SEO settings…</span>
        </div>
      ) : (
        <div className={styles.layout}>
          {/* Left – page list */}
          <div className={styles.pageList}>
            <div className={styles.pageListHeader}>Pages</div>

            {/* Search within page list */}
            <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border-primary)' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  placeholder="Filter pages…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    width: '100%',
                    paddingLeft: 28,
                    paddingRight: 8,
                    paddingTop: 5,
                    paddingBottom: 5,
                    border: '1px solid var(--border-primary)',
                    borderRadius: 4,
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.8rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {filteredPages.map(page => (
              <button
                key={page.id}
                className={`${styles.pageItem} ${selectedPage?.id === page.id ? styles.pageItemActive : ''}`}
                onClick={() => selectPage(page)}
              >
                <span className={styles.pageItemLabel}>{page.page_name}</span>
              </button>
            ))}

            {filteredPages.length === 0 && (
              <div style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                No pages match your search.
              </div>
            )}
          </div>

          {/* Right – edit form */}
          {selectedPage ? (
            <div className={styles.editPanel}>
              <div className={styles.editPanelHeader}>
                <div>
                  <h2 className={styles.editPanelTitle}>{selectedPage.page_name}</h2>
                  <span className={styles.editPanelSubtitle}>page_key: {selectedPage.page_key}</span>
                </div>
              </div>

              {success && (
                <div className={styles.successBanner}>
                  <CheckCircle size={16} />
                  {success}
                </div>
              )}
              {error && (
                <div className={styles.errorBanner}>
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              {/* ── Primary Meta ── */}
              <p className={styles.sectionLabel}>Primary Meta Tags</p>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Meta Title</label>
                <span className={styles.fieldHint}>Displayed in browser tabs and search engine results. Keep under 60 characters.</span>
                <input
                  type="text"
                  className={styles.input}
                  value={formData.meta_title ?? ''}
                  onChange={e => handleChange('meta_title', e.target.value)}
                  placeholder="Page title for search engines…"
                  maxLength={255}
                />
                <CharCount value={formData.meta_title ?? ''} warn={TITLE_WARN} max={TITLE_MAX} />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Meta Description</label>
                <span className={styles.fieldHint}>Shown in search snippets. Aim for 120–155 characters.</span>
                <textarea
                  className={styles.textarea}
                  value={formData.meta_description ?? ''}
                  onChange={e => handleChange('meta_description', e.target.value)}
                  placeholder="Brief description of this page for search engines…"
                  rows={3}
                />
                <CharCount value={formData.meta_description ?? ''} warn={DESC_WARN} max={DESC_MAX} />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Meta Keywords</label>
                <span className={styles.fieldHint}>Comma-separated keywords. Less important for modern SEO but still used for internal reference.</span>
                <input
                  type="text"
                  className={styles.input}
                  value={formData.meta_keywords ?? ''}
                  onChange={e => handleChange('meta_keywords', e.target.value)}
                  placeholder="keyword one, keyword two, keyword three"
                  maxLength={500}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Robots Directive</label>
                <span className={styles.fieldHint}>Controls how search engine crawlers index this page.</span>
                <select
                  className={styles.selectField}
                  value={formData.robots ?? 'index, follow'}
                  onChange={e => handleChange('robots', e.target.value)}
                >
                  <option value="index, follow">index, follow (default – allow indexing)</option>
                  <option value="noindex, follow">noindex, follow – hide from results, follow links</option>
                  <option value="index, nofollow">index, nofollow – index page, don't follow links</option>
                  <option value="noindex, nofollow">noindex, nofollow – block completely</option>
                </select>
              </div>

              <hr className={styles.sectionDivider} />

              {/* ── Open Graph ── */}
              <p className={styles.sectionLabel}>Open Graph (Social Sharing)</p>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>OG Title</label>
                <span className={styles.fieldHint}>Title shown when sharing on social media. Leave blank to fall back to Meta Title.</span>
                <input
                  type="text"
                  className={styles.input}
                  value={formData.og_title ?? ''}
                  onChange={e => handleChange('og_title', e.target.value)}
                  placeholder="Social sharing title (optional override)…"
                  maxLength={255}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>OG Description</label>
                <span className={styles.fieldHint}>Description shown when sharing on social media. Leave blank to fall back to Meta Description.</span>
                <textarea
                  className={styles.textarea}
                  value={formData.og_description ?? ''}
                  onChange={e => handleChange('og_description', e.target.value)}
                  placeholder="Social sharing description (optional override)…"
                  rows={3}
                />
              </div>

              {/* ── Actions ── */}
              <div className={styles.actions}>
                <Button variant="secondary" onClick={handleReset} disabled={saving}>
                  Reset
                </Button>
                <Button variant="primary" onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" style={{ marginRight: 4 }} />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Save size={14} style={{ marginRight: 4 }} />
                      Save SEO Settings
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <FileSearch size={40} />
              <span>Select a page from the list to edit its SEO settings.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SeoManagement;
