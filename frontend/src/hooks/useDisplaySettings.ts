import { useState, useEffect } from 'react';
import { apiClient } from '../services/apiRoutes';
import { apiCache } from '../utils/apiCache';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DisplaySettings {
  /** Array of tournament_ids to show in Football nav. Empty = show all. */
  football_visible_tournaments: string[];
  /** Map of tournament_id → team_ids to hide. Empty object = hide none. */
  excluded_teams: Record<string, string[]>;
  /** Array of sport_ids to show in Other Sports dropdown. Empty = show all. */
  other_sports_visible: string[];
  /** Active season to display in navigation (e.g., "26/27"). Empty = use calculated season. */
  active_season: string;
}

interface DisplaySettingsResponse {
  success: boolean;
  data: Partial<DisplaySettings>;
}

interface UseDisplaySettingsReturn {
  settings: DisplaySettings;
  loading: boolean;
  error: string | null;
}

// ── Constants ────────────────────────────────────────────────────────────────

const CACHE_KEY = 'display_settings';
const CACHE_TTL_MINUTES = 10;

const DEFAULT_SETTINGS: DisplaySettings = {
  football_visible_tournaments: [],
  excluded_teams: {},
  other_sports_visible: [],
  active_season: '',
};

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Fetches the public display settings from the API and caches the result.
 *
 * Empty arrays / objects represent "show all" — no filtering applied.
 * The hook never throws; on error it falls back to DEFAULT_SETTINGS so
 * the site continues working exactly as before.
 */
export const useDisplaySettings = (): UseDisplaySettingsReturn => {
  const [settings, setSettings] = useState<DisplaySettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchSettings = async () => {
      // Return cached result if available
      const cached = apiCache.get<DisplaySettings>(CACHE_KEY);
      if (cached) {
        if (!cancelled) {
          setSettings(cached);
          setLoading(false);
        }
        return;
      }

      try {
        const response = await apiClient.get<DisplaySettingsResponse>('/api/v1/display-settings');

        // Merge with defaults so every key is always present
        const merged: DisplaySettings = {
          ...DEFAULT_SETTINGS,
          ...(response.data?.data ?? {}),
        };

        apiCache.set(CACHE_KEY, merged, CACHE_TTL_MINUTES);

        if (!cancelled) {
          setSettings(merged);
          setError(null);
        }
      } catch (err) {
        // Fall back to defaults — site should behave as if no settings are set
        if (!cancelled) {
          setSettings(DEFAULT_SETTINGS);
          setError(err instanceof Error ? err.message : 'Failed to load display settings');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  return { settings, loading, error };
};
