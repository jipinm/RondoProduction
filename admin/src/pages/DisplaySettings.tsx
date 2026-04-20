import React, { useState, useEffect, useCallback } from 'react';
import {
  Eye,
  Trophy,
  Users,
  Globe,
  Save,
  Loader2,
  CheckSquare,
  Square,
  ChevronDown,
  AlertCircle,
} from 'lucide-react';
import Button from '../components/Button';
import { useToast } from '../hooks/useToast';
import ToastContainer from '../components/ToastContainer';
import {
  displaySettingsService,
  type DisplaySettings as DisplaySettingsData,
  type Sport,
  type Tournament,
  type Team,
} from '../services/displaySettingsService';
import styles from './DisplaySettings.module.css';

// Fixed sports shown as main nav items — never appear in "Other Sports"
const FIXED_SPORTS = ['soccer', 'formula1', 'rugby', 'tennis', 'golf'];

const SPORT_LABELS: Record<string, string> = {
  soccer: 'Football',
  formula1: 'Formula One',
  rugby: 'Rugby',
  tennis: 'Tennis',
  cricket: 'Cricket',
  motorsport: 'Motorsport',
  basketball: 'Basketball',
  nba: 'NBA',
  nfl: 'NFL',
  mlb: 'MLB',
  darts: 'Darts',
  horseracing: 'Horse Racing',
  boxing: 'Boxing',
  motogp: 'MotoGP',
  combatsport: 'Combat Sport',
  icehockey: 'Ice Hockey',
  dtm: 'DTM',
  superbike: 'Superbike',
  padel: 'Padel',
  golf: 'Golf',
};

type TabId = 'tournaments' | 'teams' | 'otherSports';

const DisplaySettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('tournaments');

  // ── Shared loading/saving states ────────────────────────────────────────
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  // ── Settings ────────────────────────────────────────────────────────────
  const [_settings, setSettings] = useState<DisplaySettingsData>({
    football_visible_tournaments: [],
    excluded_teams: {},
    other_sports_visible: [],
  });

  // ── Tab 1: Football Tournaments ─────────────────────────────────────────
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loadingTournaments, setLoadingTournaments] = useState(false);
  const [selectedTournaments, setSelectedTournaments] = useState<string[]>([]);

  // ── Tab 2: Team Exclusions ───────────────────────────────────────────────
  const [excludedTeams, setExcludedTeams] = useState<Record<string, string[]>>({});
  const [selectedTournamentForTeams, setSelectedTournamentForTeams] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);

  // ── Tab 3: Other Sports ──────────────────────────────────────────────────
  const [sports, setSports] = useState<Sport[]>([]);
  const [loadingSports, setLoadingSports] = useState(false);
  const [selectedSports, setSelectedSports] = useState<string[]>([]);

  const { toasts, closeToast, success, error } = useToast();

  // ── Initial load ─────────────────────────────────────────────────────────
  const loadSettings = useCallback(async () => {
    setLoadingSettings(true);
    try {
      const data = await displaySettingsService.getSettings();
      setSettings(data);
      setSelectedTournaments(data.football_visible_tournaments ?? []);
      setExcludedTeams(data.excluded_teams ?? {});
      setSelectedSports(data.other_sports_visible ?? []);
    } catch (err) {
      error('Failed to load display settings');
    } finally {
      setLoadingSettings(false);
    }
  }, [error]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // ── Tab 1: load tournaments ───────────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'tournaments') return;
    setLoadingTournaments(true);
    displaySettingsService
      .getFootballTournaments()
      .then(setTournaments)
      .catch(() => error('Failed to load football tournaments'))
      .finally(() => setLoadingTournaments(false));
  }, [activeTab, error]);

  // ── Tab 2: load tournament list for selector ──────────────────────────────
  useEffect(() => {
    if (activeTab !== 'teams') return;
    if (tournaments.length > 0) return; // already loaded
    setLoadingTournaments(true);
    displaySettingsService
      .getFootballTournaments()
      .then(setTournaments)
      .catch(() => error('Failed to load football tournaments'))
      .finally(() => setLoadingTournaments(false));
  }, [activeTab, tournaments.length, error]);

  // ── Tab 2: load teams for selected tournament ─────────────────────────────
  useEffect(() => {
    if (!selectedTournamentForTeams) {
      setTeams([]);
      return;
    }
    setLoadingTeams(true);
    displaySettingsService
      .getTeamsForTournament(selectedTournamentForTeams)
      .then(setTeams)
      .catch(() => error('Failed to load teams'))
      .finally(() => setLoadingTeams(false));
  }, [selectedTournamentForTeams, error]);

  // ── Tab 3: load sports ────────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'otherSports') return;
    setLoadingSports(true);
    displaySettingsService
      .getSports()
      .then((all) => setSports(all.filter((s) => !FIXED_SPORTS.includes(s.sport_id))))
      .catch(() => error('Failed to load sports'))
      .finally(() => setLoadingSports(false));
  }, [activeTab, error]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const toggleItem = (id: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const selectAll = (ids: string[], setList: (v: string[]) => void) => setList([...ids]);
  const clearAll = (setList: (v: string[]) => void) => setList([]);

  const getSportLabel = (id: string) =>
    SPORT_LABELS[id] ?? id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  // ── Save handlers ─────────────────────────────────────────────────────────
  const saveTournaments = async () => {
    setSaving((s) => ({ ...s, tournaments: true }));
    try {
      await displaySettingsService.updateSetting('football_visible_tournaments', selectedTournaments);
      setSettings((prev) => ({ ...prev, football_visible_tournaments: selectedTournaments }));
      success(
        'Saved',
        selectedTournaments.length === 0
          ? 'All football tournaments will be displayed.'
          : `${selectedTournaments.length} tournament(s) selected.`
      );
    } catch (err) {
      error('Failed to save tournament settings');
    } finally {
      setSaving((s) => ({ ...s, tournaments: false }));
    }
  };

  const saveTeamExclusions = async () => {
    setSaving((s) => ({ ...s, teams: true }));
    try {
      await displaySettingsService.updateSetting('excluded_teams', excludedTeams);
      setSettings((prev) => ({ ...prev, excluded_teams: excludedTeams }));
      success('Saved', 'Team exclusion settings updated.');
    } catch (err) {
      error('Failed to save team exclusion settings');
    } finally {
      setSaving((s) => ({ ...s, teams: false }));
    }
  };

  const saveOtherSports = async () => {
    setSaving((s) => ({ ...s, sports: true }));
    try {
      await displaySettingsService.updateSetting('other_sports_visible', selectedSports);
      setSettings((prev) => ({ ...prev, other_sports_visible: selectedSports }));
      success(
        'Saved',
        selectedSports.length === 0
          ? 'All other sports will be displayed.'
          : `${selectedSports.length} sport(s) selected.`
      );
    } catch (err) {
      error('Failed to save other sports settings');
    } finally {
      setSaving((s) => ({ ...s, sports: false }));
    }
  };

  // ── Team exclusion toggle ─────────────────────────────────────────────────
  const toggleTeamExclusion = (teamId: string) => {
    const tournamentId = selectedTournamentForTeams;
    if (!tournamentId) return;
    const current = excludedTeams[tournamentId] ?? [];
    const updated = current.includes(teamId)
      ? current.filter((id) => id !== teamId)
      : [...current, teamId];
    setExcludedTeams((prev) => ({ ...prev, [tournamentId]: updated }));
  };

  const currentExcluded = excludedTeams[selectedTournamentForTeams] ?? [];

  // ── Render ────────────────────────────────────────────────────────────────
  if (loadingSettings) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingWrapper}>
          <Loader2 size={32} className={styles.spinner} />
          <p>Loading display settings…</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <ToastContainer toasts={toasts} onClose={closeToast} />

      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>
          <Eye size={28} />
          Display Settings
        </h1>
        <p className={styles.subtitle}>
          Control which tournaments, teams and sports are visible on the website.
          Leaving a section empty means all available items will be shown.
        </p>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'tournaments' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('tournaments')}
        >
          <Trophy size={16} />
          Football Tournaments
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'teams' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('teams')}
        >
          <Users size={16} />
          Team Exclusions
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'otherSports' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('otherSports')}
        >
          <Globe size={16} />
          Other Sports
        </button>
      </div>

      {/* ── Tab 1: Football Tournaments ──────────────────────────────────── */}
      {activeTab === 'tournaments' && (
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2 className={styles.panelTitle}>Football Tournament Visibility</h2>
              <p className={styles.panelDescription}>
                Select which football tournaments appear in the main navigation menu.
                <strong> Leave all unchecked to show every available tournament.</strong>
              </p>
            </div>
            <div className={styles.panelActions}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => selectAll(tournaments.map((t) => t.tournament_id), setSelectedTournaments)}
              >
                Select All
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => clearAll(setSelectedTournaments)}
              >
                Clear All
              </Button>
            </div>
          </div>

          {selectedTournaments.length === 0 && (
            <div className={styles.infoNotice}>
              <AlertCircle size={16} />
              No tournaments selected — all available tournaments will be shown on the website.
            </div>
          )}

          {loadingTournaments ? (
            <div className={styles.loadingInline}>
              <Loader2 size={20} className={styles.spinner} /> Loading tournaments…
            </div>
          ) : (
            <div className={styles.checklistGrid}>
              {tournaments.map((t) => {
                const checked = selectedTournaments.includes(t.tournament_id);
                return (
                  <label key={t.tournament_id} className={styles.checkItem}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        toggleItem(t.tournament_id, selectedTournaments, setSelectedTournaments)
                      }
                      className={styles.hiddenCheckbox}
                    />
                    <span className={styles.checkIcon}>
                      {checked ? <CheckSquare size={18} className={styles.checkIconChecked} /> : <Square size={18} />}
                    </span>
                    <span className={styles.checkLabel}>{t.official_name}</span>
                    {t.number_events != null && (
                      <span className={styles.badge}>{t.number_events} events</span>
                    )}
                  </label>
                );
              })}
            </div>
          )}

          <div className={styles.saveRow}>
            <Button
              variant="primary"
              onClick={saveTournaments}
              disabled={saving.tournaments}
            >
              {saving.tournaments ? (
                <><Loader2 size={16} className={styles.spinner} /> Saving…</>
              ) : (
                <><Save size={16} /> Save Tournament Settings</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ── Tab 2: Team Exclusions ────────────────────────────────────────── */}
      {activeTab === 'teams' && (
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2 className={styles.panelTitle}>Team Exclusions per Tournament</h2>
              <p className={styles.panelDescription}>
                Select a tournament, then check teams you want to <strong>hide</strong> from that
                tournament's listing. Teams with no exclusions set will all display normally.
              </p>
            </div>
          </div>

          {/* Tournament selector */}
          <div className={styles.selectorRow}>
            <label className={styles.selectorLabel}>
              <Trophy size={16} />
              Select Tournament
            </label>
            <div className={styles.selectWrapper}>
              <select
                className={styles.select}
                value={selectedTournamentForTeams}
                onChange={(e) => setSelectedTournamentForTeams(e.target.value)}
              >
                <option value="">— Choose a tournament —</option>
                {loadingTournaments ? (
                  <option disabled>Loading…</option>
                ) : (
                  tournaments.map((t) => (
                    <option key={t.tournament_id} value={t.tournament_id}>
                      {t.official_name}
                      {(excludedTeams[t.tournament_id]?.length ?? 0) > 0
                        ? ` (${excludedTeams[t.tournament_id].length} excluded)`
                        : ''}
                    </option>
                  ))
                )}
              </select>
              <ChevronDown size={16} className={styles.selectIcon} />
            </div>
          </div>

          {selectedTournamentForTeams && (
            <>
              <div className={styles.teamSectionHeader}>
                <p className={styles.teamSectionNote}>
                  Checked teams will be <strong>hidden</strong> from the website.
                </p>
                <div className={styles.panelActions}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      setExcludedTeams((prev) => ({
                        ...prev,
                        [selectedTournamentForTeams]: teams.map((t) => t.team_id),
                      }))
                    }
                  >
                    Exclude All
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      setExcludedTeams((prev) => ({
                        ...prev,
                        [selectedTournamentForTeams]: [],
                      }))
                    }
                  >
                    Clear Exclusions
                  </Button>
                </div>
              </div>

              {loadingTeams ? (
                <div className={styles.loadingInline}>
                  <Loader2 size={20} className={styles.spinner} /> Loading teams…
                </div>
              ) : teams.length === 0 ? (
                <p className={styles.emptyNote}>No teams found for this tournament.</p>
              ) : (
                <div className={styles.checklistGrid}>
                  {teams.map((t) => {
                    const excluded = currentExcluded.includes(t.team_id);
                    return (
                      <label key={t.team_id} className={`${styles.checkItem} ${excluded ? styles.checkItemExcluded : ''}`}>
                        <input
                          type="checkbox"
                          checked={excluded}
                          onChange={() => toggleTeamExclusion(t.team_id)}
                          className={styles.hiddenCheckbox}
                        />
                        <span className={styles.checkIcon}>
                          {excluded ? (
                            <CheckSquare size={18} className={styles.checkIconDanger} />
                          ) : (
                            <Square size={18} />
                          )}
                        </span>
                        <span className={styles.checkLabel}>{t.official_name}</span>
                        {excluded && <span className={styles.badgeDanger}>Hidden</span>}
                      </label>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {!selectedTournamentForTeams && (
            <p className={styles.emptyNote}>Select a tournament above to manage team visibility.</p>
          )}

          <div className={styles.saveRow}>
            <Button
              variant="primary"
              onClick={saveTeamExclusions}
              disabled={saving.teams}
            >
              {saving.teams ? (
                <><Loader2 size={16} className={styles.spinner} /> Saving…</>
              ) : (
                <><Save size={16} /> Save Team Exclusions</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ── Tab 3: Other Sports ───────────────────────────────────────────── */}
      {activeTab === 'otherSports' && (
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2 className={styles.panelTitle}>Other Sports Menu Visibility</h2>
              <p className={styles.panelDescription}>
                Select which sports appear in the "Other Sports" dropdown in the main menu.
                <strong> Leave all unchecked to show all available sports.</strong>
              </p>
            </div>
            <div className={styles.panelActions}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => selectAll(sports.map((s) => s.sport_id), setSelectedSports)}
              >
                Select All
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => clearAll(setSelectedSports)}
              >
                Clear All
              </Button>
            </div>
          </div>

          {selectedSports.length === 0 && (
            <div className={styles.infoNotice}>
              <AlertCircle size={16} />
              No sports selected — all available sports will be shown in the Other Sports menu.
            </div>
          )}

          {loadingSports ? (
            <div className={styles.loadingInline}>
              <Loader2 size={20} className={styles.spinner} /> Loading sports…
            </div>
          ) : (
            <div className={styles.checklistGrid}>
              {[...sports]
                .sort((a, b) => getSportLabel(a.sport_id).localeCompare(getSportLabel(b.sport_id)))
                .map((s) => {
                  const checked = selectedSports.includes(s.sport_id);
                  return (
                    <label key={s.sport_id} className={styles.checkItem}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleItem(s.sport_id, selectedSports, setSelectedSports)}
                        className={styles.hiddenCheckbox}
                      />
                      <span className={styles.checkIcon}>
                        {checked ? (
                          <CheckSquare size={18} className={styles.checkIconChecked} />
                        ) : (
                          <Square size={18} />
                        )}
                      </span>
                      <span className={styles.checkLabel}>{getSportLabel(s.sport_id)}</span>
                    </label>
                  );
                })}
            </div>
          )}

          <div className={styles.saveRow}>
            <Button
              variant="primary"
              onClick={saveOtherSports}
              disabled={saving.sports}
            >
              {saving.sports ? (
                <><Loader2 size={16} className={styles.spinner} /> Saving…</>
              ) : (
                <><Save size={16} /> Save Other Sports Settings</>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisplaySettings;
