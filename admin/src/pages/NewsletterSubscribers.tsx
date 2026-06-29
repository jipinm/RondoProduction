import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Trash2, Download, Loader2, AlertCircle, Mail,
  UserPlus, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, XCircle,
} from 'lucide-react';
import newsletterManagementService, {
  type NewsletterSubscriber,
  type NewsletterBulkImportResponse,
} from '../services/newsletterManagementService';
import styles from './NewsletterSubscribers.module.css';

const LIMIT = 50;

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseEmailInput(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map(e => e.trim())
    .filter(e => e.length > 0);
}

// ── Bulk-import result panel ──────────────────────────────────────────────────

interface ImportResultProps {
  result: NewsletterBulkImportResponse;
  onClose: () => void;
}

const ImportResult: React.FC<ImportResultProps> = ({ result, onClose }) => {
  const [showDupes, setShowDupes]    = useState(false);
  const [showInvalid, setShowInvalid] = useState(false);

  return (
    <div className={styles.importResult}>
      <div className={styles.importResultHeader}>
        <span className={styles.importResultTitle}>Import complete</span>
        <button className={styles.importResultClose} onClick={onClose} aria-label="Dismiss">✕</button>
      </div>

      <div className={styles.importResultStats}>
        {/* Added */}
        <div className={`${styles.importStat} ${styles.importStatAdded}`}>
          <CheckCircle2 size={18} />
          <div>
            <span className={styles.importStatCount}>{result.added.length}</span>
            <span className={styles.importStatLabel}>added</span>
          </div>
        </div>

        {/* Duplicates */}
        <div className={`${styles.importStat} ${styles.importStatDupe}`}>
          <AlertTriangle size={18} />
          <div>
            <span className={styles.importStatCount}>{result.duplicates.length}</span>
            <span className={styles.importStatLabel}>already subscribed</span>
          </div>
        </div>

        {/* Invalid */}
        <div className={`${styles.importStat} ${styles.importStatInvalid}`}>
          <XCircle size={18} />
          <div>
            <span className={styles.importStatCount}>{result.invalid.length}</span>
            <span className={styles.importStatLabel}>invalid</span>
          </div>
        </div>
      </div>

      {result.duplicates.length > 0 && (
        <div className={styles.importDetailSection}>
          <button
            className={styles.importDetailToggle}
            onClick={() => setShowDupes(v => !v)}
          >
            {showDupes ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {showDupes ? 'Hide' : 'Show'} skipped addresses ({result.duplicates.length})
          </button>
          {showDupes && (
            <ul className={styles.importEmailList}>
              {result.duplicates.map(e => <li key={e}>{e}</li>)}
            </ul>
          )}
        </div>
      )}

      {result.invalid.length > 0 && (
        <div className={styles.importDetailSection}>
          <button
            className={styles.importDetailToggle}
            onClick={() => setShowInvalid(v => !v)}
          >
            {showInvalid ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {showInvalid ? 'Hide' : 'Show'} invalid addresses ({result.invalid.length})
          </button>
          {showInvalid && (
            <ul className={`${styles.importEmailList} ${styles.importEmailListInvalid}`}>
              {result.invalid.map(e => <li key={e}>{e}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

const NewsletterSubscribers: React.FC = () => {
  const [subscribers, setSubscribers]   = useState<NewsletterSubscriber[]>([]);
  const [total, setTotal]               = useState(0);
  const [totalPages, setTotalPages]     = useState(1);
  const [currentPage, setCurrentPage]   = useState(1);
  const [searchTerm, setSearchTerm]     = useState('');
  const [searchInput, setSearchInput]   = useState('');
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [deletingId, setDeletingId]     = useState<number | null>(null);
  const [exporting, setExporting]       = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Import panel state
  const [showImport, setShowImport]         = useState(false);
  const [importInput, setImportInput]       = useState('');
  const [importLoading, setImportLoading]   = useState(false);
  const [importError, setImportError]       = useState<string | null>(null);
  const [importResult, setImportResult]     = useState<NewsletterBulkImportResponse | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await newsletterManagementService.list({
        search: searchTerm,
        page:   currentPage,
        limit:  LIMIT,
      });
      setSubscribers(res.data);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch (err: any) {
      setError(err.message || 'Failed to load subscribers.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, currentPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    setSearchTerm(searchInput.trim());
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    setConfirmDeleteId(null);
    try {
      await newsletterManagementService.delete(id);
      setSubscribers(prev => prev.filter(s => s.id !== id));
      setTotal(prev => prev - 1);
    } catch (err: any) {
      setError(err.message || 'Failed to delete subscriber.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await newsletterManagementService.exportCsv();
    } catch (err: any) {
      setError(err.message || 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportError(null);
    setImportResult(null);

    const emails = parseEmailInput(importInput);
    if (emails.length === 0) {
      setImportError('Please enter at least one email address.');
      return;
    }
    if (emails.length > 500) {
      setImportError('Maximum 500 emails per import. Please split into smaller batches.');
      return;
    }

    setImportLoading(true);
    try {
      const res = await newsletterManagementService.bulkImport(emails);
      setImportResult(res);
      setImportInput('');
      if (res.added.length > 0) {
        // Refresh list so newly added addresses appear
        setCurrentPage(1);
        setSearchTerm('');
        setSearchInput('');
        fetchData();
      }
    } catch (err: any) {
      setImportError(err.message || 'Import failed. Please try again.');
    } finally {
      setImportLoading(false);
    }
  };

  const handleToggleImport = () => {
    setShowImport(v => !v);
    setImportError(null);
    setImportResult(null);
    setImportInput('');
  };

  const formatDate = (dt: string) =>
    new Date(dt).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const emailCount = parseEmailInput(importInput).length;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <Mail size={24} />
          <h1>Newsletter Subscribers</h1>
          <span className={styles.badge}>{total.toLocaleString()}</span>
        </div>
        <div className={styles.headerActions}>
          <button
            className={`${styles.importToggleBtn} ${showImport ? styles.importToggleBtnActive : ''}`}
            onClick={handleToggleImport}
          >
            <UserPlus size={16} />
            Add Subscribers
            {showImport ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button
            className={styles.exportBtn}
            onClick={handleExport}
            disabled={exporting || total === 0}
          >
            {exporting ? <Loader2 size={16} className={styles.spin} /> : <Download size={16} />}
            Export CSV
          </button>
        </div>
      </div>

      {/* ── Import panel ── */}
      {showImport && (
        <div className={styles.importPanel}>
          <div className={styles.importPanelHeader}>
            <UserPlus size={16} />
            <span>Add subscribers manually</span>
          </div>
          <p className={styles.importHint}>
            Enter one email per line, or separate multiple addresses with commas or semicolons.
            Duplicates and invalid addresses are skipped automatically. Maximum 500 per import.
          </p>

          <form onSubmit={handleImport}>
            <textarea
              className={styles.importTextarea}
              placeholder={`jane@example.com\njohn@example.com, alice@example.com`}
              value={importInput}
              onChange={e => { setImportInput(e.target.value); setImportResult(null); setImportError(null); }}
              rows={12}
              disabled={importLoading}
            />
            <div className={styles.importActions}>
              <span className={styles.importCount}>
                {emailCount > 0 ? `${emailCount} address${emailCount === 1 ? '' : 'es'} detected` : ''}
              </span>
              <button
                type="submit"
                className={styles.importBtn}
                disabled={importLoading || emailCount === 0}
              >
                {importLoading
                  ? <><Loader2 size={15} className={styles.spin} /> Importing…</>
                  : <><UserPlus size={15} /> Import</>}
              </button>
            </div>
          </form>

          {importError && (
            <div className={styles.importErrorBanner}>
              <AlertCircle size={15} />
              {importError}
            </div>
          )}

          {importResult && (
            <ImportResult
              result={importResult}
              onClose={() => setImportResult(null)}
            />
          )}
        </div>
      )}

      {/* ── Search ── */}
      <form className={styles.searchBar} onSubmit={handleSearch}>
        <div className={styles.searchInputWrap}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search by email…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <button type="submit" className={styles.searchBtn}>Search</button>
        {searchTerm && (
          <button
            type="button"
            className={styles.clearBtn}
            onClick={() => { setSearchInput(''); setSearchTerm(''); setCurrentPage(1); }}
          >
            Clear
          </button>
        )}
      </form>

      {/* ── Error ── */}
      {error && (
        <div className={styles.errorBanner}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* ── Table ── */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Email</th>
              <th>Name</th>
              <th>Submit From</th>
              <th>Subscribed At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className={styles.centerCell}>
                  <Loader2 size={20} className={styles.spin} />
                  <span>Loading…</span>
                </td>
              </tr>
            ) : subscribers.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.centerCell}>No subscribers found.</td>
              </tr>
            ) : (
              subscribers.map((s, idx) => (
                <tr key={s.id}>
                  <td className={styles.tdNum}>{(currentPage - 1) * LIMIT + idx + 1}</td>
                  <td>{s.email}</td>
                  <td>{s.name || '-'}</td>
                  <td>
                    <span className={styles.sourceBadge} data-source={s.submit_from === 'Interest register' ? 'interest' : 'newsletter'}>
                      {s.submit_from}
                    </span>
                  </td>
                  <td className={styles.tdDate}>{formatDate(s.subscribed_at)}</td>
                  <td>
                    {confirmDeleteId === s.id ? (
                      <span className={styles.confirmWrap}>
                        <span className={styles.confirmText}>Delete?</span>
                        <button
                          className={styles.confirmYes}
                          onClick={() => handleDelete(s.id)}
                          disabled={deletingId === s.id}
                        >
                          {deletingId === s.id ? <Loader2 size={14} className={styles.spin} /> : 'Yes'}
                        </button>
                        <button
                          className={styles.confirmNo}
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          No
                        </button>
                      </span>
                    ) : (
                      <button
                        className={styles.deleteBtn}
                        onClick={() => setConfirmDeleteId(s.id)}
                        title="Delete subscriber"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageBtn}
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(p => p - 1)}
          >
            Previous
          </button>
          <span className={styles.pageInfo}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            className={styles.pageBtn}
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(p => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default NewsletterSubscribers;
