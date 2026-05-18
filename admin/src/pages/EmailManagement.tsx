import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mail,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Eye,
  Code2,
  AlignLeft,
  RotateCcw,
  Info,
} from 'lucide-react';
import {
  emailTemplateService,
  type EmailTemplate,
  type EmailTemplateSummary,
  type UpdateEmailTemplateData,
  EVENT_PLACEHOLDERS,
} from '../services/emailTemplateService';
import styles from './EmailManagement.module.css';

type EditorTab = 'html' | 'text' | 'preview';

const EmailManagement: React.FC = () => {
  const [templates, setTemplates] = useState<EmailTemplateSummary[]>([]);
  const [selected, setSelected] = useState<EmailTemplate | null>(null);
  const [formData, setFormData] = useState<UpdateEmailTemplateData>({});
  const [activeTab, setActiveTab] = useState<EditorTab>('html');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // ── Load template list on mount ──────────────────────────────────────────
  useEffect(() => {
    loadTemplates();
  }, []);

  // ── Update iframe preview when body_html or tab changes ─────────────────
  useEffect(() => {
    if (activeTab === 'preview' && iframeRef.current && formData.body_html !== undefined) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(formData.body_html);
        doc.close();
      }
    }
  }, [activeTab, formData.body_html]);

  const loadTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await emailTemplateService.getAll();
      if (res.success && Array.isArray(res.data)) {
        setTemplates(res.data as EmailTemplateSummary[]);
        // Auto-select first template
        if (res.data.length > 0) {
          await loadTemplate((res.data as EmailTemplateSummary[])[0].id);
        }
      } else {
        setError(res.error ?? 'Failed to load email templates');
      }
    } catch {
      setError('Failed to connect to the API');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplate = useCallback(async (id: number) => {
    setError(null);
    setSuccess(null);
    try {
      const res = await emailTemplateService.getById(id);
      if (res.success && res.data && !Array.isArray(res.data)) {
        const tpl = res.data as EmailTemplate;
        setSelected(tpl);
        setFormData({
          subject:   tpl.subject,
          body_html: tpl.body_html,
          body_text: tpl.body_text,
          is_active: tpl.is_active,
        });
        setActiveTab('html');
      } else {
        setError(res.error ?? 'Failed to load template');
      }
    } catch {
      setError('Failed to load template');
    }
  }, []);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    setSuccess(null);
    setError(null);
    try {
      const res = await emailTemplateService.update(selected.id, formData);
      if (res.success) {
        setSuccess('Email template saved successfully.');
        // Refresh the list to update the summary row
        const listRes = await emailTemplateService.getAll();
        if (listRes.success && Array.isArray(listRes.data)) {
          setTemplates(listRes.data as EmailTemplateSummary[]);
        }
        // Update the selected object's is_active state
        if (res.data && !Array.isArray(res.data)) {
          const updated = res.data as EmailTemplate;
          setSelected(updated);
        }
      } else {
        setError(res.error ?? 'Failed to save template');
      }
    } catch {
      setError('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!selected) return;
    if (!window.confirm(`Reset "${selected.event_label}" to its default content? This cannot be undone.`)) return;
    setResetting(true);
    setSuccess(null);
    setError(null);
    try {
      const res = await emailTemplateService.resetToDefault(selected.id);
      if (res.success && res.data && !Array.isArray(res.data)) {
        const tpl = res.data as EmailTemplate;
        setSelected(tpl);
        setFormData({
          subject:   tpl.subject,
          body_html: tpl.body_html,
          body_text: tpl.body_text,
          is_active: tpl.is_active,
        });
        setSuccess('Template reset to default content.');
        const listRes = await emailTemplateService.getAll();
        if (listRes.success && Array.isArray(listRes.data)) {
          setTemplates(listRes.data as EmailTemplateSummary[]);
        }
      } else {
        setError(res.error ?? 'Failed to reset template');
      }
    } catch {
      setError('Failed to reset template');
    } finally {
      setResetting(false);
    }
  };

  const placeholders = selected ? (EVENT_PLACEHOLDERS[selected.event_key] ?? []) : [];

  return (
    <div className={styles.container}>
      {/* ── Page header ────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <h1 className={styles.title}>
          <Mail size={26} />
          Email Management
        </h1>
        <p className={styles.subtitle}>
          Customise the email templates sent to customers for each event.
          Use <code>{'{{placeholder}}'}</code> tokens that will be replaced with live data at send time.
        </p>
      </div>

      {loading ? (
        <div className={styles.loadingState}>
          <Loader2 size={20} className="animate-spin" />
          Loading email templates…
        </div>
      ) : (
        <div className={styles.layout}>
          {/* ── Left: template list ───────────────────────────────────── */}
          <div className={styles.templateList}>
            <div className={styles.listHeader}>Templates</div>
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                className={`${styles.templateItem} ${selected?.id === tpl.id ? styles.templateItemActive : ''}`}
                onClick={() => loadTemplate(tpl.id)}
              >
                <span className={styles.templateLabel}>{tpl.event_label}</span>
                <span className={styles.templateKey}>{tpl.event_key}</span>
                <span
                  className={`${styles.statusBadge} ${!tpl.is_active ? styles.statusBadgeInactive : ''}`}
                >
                  {tpl.is_active ? 'Active' : 'Disabled'}
                </span>
              </button>
            ))}
          </div>

          {/* ── Right: editor ─────────────────────────────────────────── */}
          {selected ? (
            <div className={styles.editorPanel}>
              {/* Editor header */}
              <div className={styles.editorHeader}>
                <div>
                  <h2 className={styles.editorTitle}>{selected.event_label}</h2>
                  <p className={styles.editorSubtitle}>
                    Event key: <code>{selected.event_key}</code> &nbsp;·&nbsp;
                    Last updated: {new Date(selected.updated_at).toLocaleString()}
                  </p>
                </div>
                <div className={styles.editorActions}>
                  <button
                    className={styles.btnDanger}
                    onClick={handleReset}
                    disabled={resetting || saving}
                    title="Reset to default content"
                  >
                    {resetting ? <Loader2 size={15} /> : <RotateCcw size={15} />}
                    Reset to Default
                  </button>
                  <button
                    className={styles.btnPrimary}
                    onClick={handleSave}
                    disabled={saving || resetting}
                  >
                    {saving ? <Loader2 size={15} /> : <Save size={15} />}
                    Save
                  </button>
                </div>
              </div>

              <div className={styles.editorBody}>
                {/* Feedback banners */}
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

                {/* Active toggle */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Template Status</label>
                  <div className={styles.toggleRow}>
                    <label className={styles.toggle}>
                      <input
                        type="checkbox"
                        checked={formData.is_active ?? true}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, is_active: e.target.checked }))
                        }
                      />
                      <span className={styles.toggleSlider} />
                    </label>
                    <span className={styles.toggleLabel}>
                      {formData.is_active
                        ? 'Active — this template is used when sending emails'
                        : 'Disabled — the built-in fallback template will be used'}
                    </span>
                  </div>
                </div>

                <hr className={styles.divider} />

                {/* Subject */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Subject line
                    <span className={styles.labelNote}>— supports placeholders</span>
                  </label>
                  <input
                    className={styles.input}
                    type="text"
                    value={formData.subject ?? ''}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, subject: e.target.value }))
                    }
                  />
                </div>

                {/* Body editor with tabs */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Email Body</label>
                  <div className={styles.tabs}>
                    <button
                      className={`${styles.tab} ${activeTab === 'html' ? styles.tabActive : ''}`}
                      onClick={() => setActiveTab('html')}
                    >
                      <Code2 size={14} /> HTML
                    </button>
                    <button
                      className={`${styles.tab} ${activeTab === 'text' ? styles.tabActive : ''}`}
                      onClick={() => setActiveTab('text')}
                    >
                      <AlignLeft size={14} /> Plain Text
                    </button>
                    <button
                      className={`${styles.tab} ${activeTab === 'preview' ? styles.tabActive : ''}`}
                      onClick={() => setActiveTab('preview')}
                    >
                      <Eye size={14} /> Preview
                    </button>
                  </div>
                  <div className={styles.tabContent}>
                    {activeTab === 'html' && (
                      <textarea
                        className={styles.textarea}
                        style={{ minHeight: '320px' }}
                        value={formData.body_html ?? ''}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, body_html: e.target.value }))
                        }
                        spellCheck={false}
                      />
                    )}
                    {activeTab === 'text' && (
                      <textarea
                        className={styles.textarea}
                        style={{ minHeight: '220px' }}
                        value={formData.body_text ?? ''}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, body_text: e.target.value }))
                        }
                        spellCheck={false}
                      />
                    )}
                    {activeTab === 'preview' && (
                      <iframe
                        ref={iframeRef}
                        className={styles.previewFrame}
                        title="Email HTML preview"
                        sandbox="allow-same-origin"
                      />
                    )}
                  </div>
                </div>

                {/* Placeholder reference */}
                {placeholders.length > 0 && (
                  <div className={styles.placeholderPanel}>
                    <div className={styles.placeholderHeader}>
                      <Info size={13} /> Available placeholders
                    </div>
                    <table className={styles.placeholderTable}>
                      <tbody>
                        {placeholders.map((p) => (
                          <tr key={p.key}>
                            <td>{p.key}</td>
                            <td>{p.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <Mail size={48} />
              <p>Select a template from the list to start editing.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EmailManagement;
