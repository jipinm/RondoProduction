import React, { useState, useEffect, useCallback } from 'react';
import {
  MapPin,
  Search,
  RefreshCw,
  ChefHat,
  Check,
  X,
  Save,
  Loader,
  Building2,
  Info,
} from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';
import { useToast } from '../hooks/useToast';
import ToastContainer from '../components/ToastContainer';
import {
  hospitalityService,
  type Hospitality,
  type HospitalityAssignment,
} from '../services/hospitalityService';
import { apiClient } from '../services/api-client';
import styles from './VenueHospitalityManagement.module.css';

// ── Types ──────────────────────────────────────────────────────────────────

interface Venue {
  venue_id: string;
  name: string;
  official_name?: string;
  city?: string;
  country?: string;
  venue_type?: string;
  capacity?: number;
}

interface VenueApiResponse {
  venues?: Venue[];
  data?: Venue[];
}

// ── Component ──────────────────────────────────────────────────────────────

const VenueHospitalityManagement: React.FC = () => {
  const { toasts, showToast, closeToast } = useToast();

  // Venue search state
  const [venueSearch, setVenueSearch] = useState('');
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venuesLoading, setVenuesLoading] = useState(false);
  const [venuesError, setVenuesError] = useState<string | null>(null);

  // Selected venue
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);

  // Hospitality packages (full list)
  const [allHospitalities, setAllHospitalities] = useState<Hospitality[]>([]);
  const [hospitalitiesLoading, setHospitalitiesLoading] = useState(false);

  // Current assignments for the selected venue
  const [assignedIds, setAssignedIds] = useState<Set<number>>(new Set());
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);

  // Dirty tracking
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Data fetching ────────────────────────────────────────────────────────

  const fetchVenues = useCallback(async (search: string) => {
    const term = search.trim();
    if (term.length < 2) {
      setVenues([]);
      setVenuesError(null);
      return;
    }
    setVenuesLoading(true);
    setVenuesError(null);
    try {
      const params = new URLSearchParams({ page_size: '50', venue_name: term });
      const json = await apiClient.get<VenueApiResponse>(`/v1/venues?${params.toString()}`);
      const list: Venue[] = json.venues ?? json.data ?? [];
      setVenues(list);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load venues';
      setVenuesError(msg);
    } finally {
      setVenuesLoading(false);
    }
  }, []);

  const fetchAllHospitalities = useCallback(async () => {
    setHospitalitiesLoading(true);
    try {
      const res = await hospitalityService.getAllHospitalities(true);
      setAllHospitalities(res.data ?? []);
    } catch {
      showToast('error', 'Failed to load hospitality packages');
    } finally {
      setHospitalitiesLoading(false);
    }
  }, [showToast]);

  const fetchVenueAssignments = useCallback(async (venueId: string) => {
    setAssignmentsLoading(true);
    try {
      const res = await hospitalityService.getVenueHospitalities(venueId);
      const assignments: HospitalityAssignment[] = res.data ?? [];
      const ids = new Set(assignments.map((a) => Number(a.hospitality_id)));
      setAssignedIds(ids);
      setPendingIds(new Set(ids));
      setIsDirty(false);
    } catch {
      showToast('error', 'Failed to load venue hospitality assignments');
    } finally {
      setAssignmentsLoading(false);
    }
  }, [showToast]);

  // Load hospitalities on mount
  useEffect(() => {
    fetchAllHospitalities();
  }, [fetchAllHospitalities]);

  // Debounced venue search — only fires when 2+ chars are entered
  useEffect(() => {
    const timer = setTimeout(() => fetchVenues(venueSearch), 400);
    return () => clearTimeout(timer);
  }, [venueSearch, fetchVenues]);

  // Load assignments when a venue is selected
  useEffect(() => {
    if (selectedVenue) {
      fetchVenueAssignments(selectedVenue.venue_id);
    } else {
      setAssignedIds(new Set());
      setPendingIds(new Set());
      setIsDirty(false);
    }
  }, [selectedVenue, fetchVenueAssignments]);

  // ── Interaction ──────────────────────────────────────────────────────────

  const handleSelectVenue = (venue: Venue) => {
    if (isDirty) {
      if (!window.confirm('You have unsaved changes. Discard them?')) return;
    }
    setSelectedVenue(venue);
  };

  const toggleHospitality = (id: number) => {
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!selectedVenue) return;
    setSaving(true);
    try {
      await hospitalityService.replaceVenueHospitalities(
        selectedVenue.venue_id,
        selectedVenue.name,
        Array.from(pendingIds)
      );
      setAssignedIds(new Set(pendingIds));
      setIsDirty(false);
      showToast('success', 'Venue hospitality packages saved successfully');
    } catch {
      showToast('error', 'Failed to save venue hospitality assignments');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setPendingIds(new Set(assignedIds));
    setIsDirty(false);
  };

  // ── Render ───────────────────────────────────────────────────────────────

  const venueLabel = (v: Venue) => {
    const primary = v.official_name || v.name;
    const parts: string[] = [];
    if (v.city) parts.push(v.city);
    if (v.country) parts.push(v.country);
    return parts.length ? `${primary} — ${parts.join(', ')}` : primary;
  };

  return (
    <div className={styles.container}>
      <ToastContainer toasts={toasts} onClose={closeToast} />

      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>
            <Building2 size={28} />
            Venue Hospitality Management
          </h1>
          <p className={styles.subtitle}>
            Assign hospitality packages to specific venues. Packages assigned here apply automatically
            to every event hosted at that venue.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => { if (venueSearch.trim().length >= 2) fetchVenues(venueSearch); fetchAllHospitalities(); }}
          disabled={venuesLoading || hospitalitiesLoading}
        >
          <RefreshCw size={16} className={(venuesLoading || hospitalitiesLoading) ? styles.spin : undefined} />
          Refresh
        </Button>
      </div>

      {/* ── Info banner ── */}
      <div className={styles.infoBanner}>
        <Info size={16} />
        <span>
          Venue-level hospitality is the broadest assignment scope. It will be merged with any
          sport / tournament / team / event / ticket level packages — duplicates are deduplicated
          automatically (most-specific assignment wins).
        </span>
      </div>

      <div className={styles.layout}>
        {/* ── Venue List Panel ── */}
        <Card className={styles.venuePanel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>
              <MapPin size={18} />
              Venues
            </h2>
          </div>

          <div className={styles.searchBox}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search by venue name…"
              value={venueSearch}
              onChange={(e) => setVenueSearch(e.target.value)}
              className={styles.searchInput}
            />
            {venueSearch && (
              <button className={styles.clearBtn} onClick={() => setVenueSearch('')}>
                <X size={14} />
              </button>
            )}
          </div>

          {venuesLoading && (
            <div className={styles.loadingRow}>
              <Loader size={18} className={styles.spin} />
              <span>Searching venues…</span>
            </div>
          )}

          {venuesError && (
            <div className={styles.errorRow}>{venuesError}</div>
          )}

          {!venuesLoading && !venuesError && venueSearch.trim().length < 2 && (
            <div className={styles.emptyRow}>
              <Search size={16} />
              Type at least 2 characters to search across all venues.
            </div>
          )}

          {!venuesLoading && !venuesError && venueSearch.trim().length >= 2 && venues.length === 0 && (
            <div className={styles.emptyRow}>No venues found for "{venueSearch.trim()}".</div>
          )}

          <ul className={styles.venueList}>
            {venues.map((v) => {
              const isSelected = selectedVenue?.venue_id === v.venue_id;
              return (
                <li
                  key={v.venue_id}
                  className={`${styles.venueItem} ${isSelected ? styles.venueItemSelected : ''}`}
                  onClick={() => handleSelectVenue(v)}
                >
                  <MapPin size={14} className={styles.venueIcon} />
                  <div className={styles.venueInfo}>
                    <span className={styles.venueName}>{v.official_name || v.name}</span>
                    <span className={styles.venueLocation}>
                      {[v.city, v.country].filter(Boolean).join(', ') || v.name}
                    </span>
                  </div>
                  {isSelected && <Check size={14} className={styles.selectedCheck} />}
                </li>
              );
            })}
          </ul>
        </Card>

        {/* ── Assignment Panel ── */}
        <Card className={styles.assignmentPanel}>
          {!selectedVenue ? (
            <div className={styles.noSelection}>
              <Building2 size={48} className={styles.noSelectionIcon} />
              <p>Select a venue from the list to manage its hospitality packages.</p>
            </div>
          ) : (
            <>
              <div className={styles.panelHeader}>
                <div>
                  <h2 className={styles.panelTitle}>
                    <ChefHat size={18} />
                    Hospitality for: <span className={styles.selectedVenueLabel}>{venueLabel(selectedVenue)}</span>
                  </h2>
                  <p className={styles.panelSubtitle}>
                    Toggle packages to include them. Click <strong>Save</strong> to apply changes.
                  </p>
                </div>
                <div className={styles.panelActions}>
                  {isDirty && (
                    <Button variant="outline" onClick={handleDiscard} disabled={saving}>
                      <X size={16} /> Discard
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    onClick={handleSave}
                    disabled={!isDirty || saving}
                  >
                    {saving
                      ? <><Loader size={16} className={styles.spin} /> Saving…</>
                      : <><Save size={16} /> Save Changes</>
                    }
                  </Button>
                </div>
              </div>

              {(assignmentsLoading || hospitalitiesLoading) ? (
                <div className={styles.loadingRow}>
                  <Loader size={18} className={styles.spin} />
                  <span>Loading…</span>
                </div>
              ) : allHospitalities.length === 0 ? (
                <div className={styles.emptyRow}>
                  No active hospitality packages found. Create them in Hospitality Services first.
                </div>
              ) : (
                <ul className={styles.hospitalityList}>
                  {allHospitalities.map((h) => {
                    const checked = pendingIds.has(h.id);
                    return (
                      <li
                        key={h.id}
                        className={`${styles.hospitalityItem} ${checked ? styles.hospitalityItemChecked : ''}`}
                        onClick={() => toggleHospitality(h.id)}
                      >
                        <div className={`${styles.checkbox} ${checked ? styles.checkboxChecked : ''}`}>
                          {checked && <Check size={12} />}
                        </div>
                        <ChefHat size={16} className={styles.hospitalityIcon} />
                        <div className={styles.hospitalityInfo}>
                          <span className={styles.hospitalityName}>{h.name}</span>
                          {h.description && (
                            <span className={styles.hospitalityDesc}>{h.description}</span>
                          )}
                        </div>
                        {checked && (
                          <span className={styles.assignedBadge}>Assigned</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              {isDirty && (
                <div className={styles.dirtyNotice}>
                  <Info size={14} />
                  You have unsaved changes. Click <strong>Save Changes</strong> to apply them.
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default VenueHospitalityManagement;
