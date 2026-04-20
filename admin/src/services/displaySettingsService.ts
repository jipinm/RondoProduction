/**
 * Display Settings Service
 * Handles reading and writing the three frontend display-control settings:
 *   - football_visible_tournaments
 *   - excluded_teams
 *   - other_sports_visible
 *
 * Also exposes helpers to fetch sports, tournaments, and teams from the
 * XS2Event proxy (same API host) so the admin panel can populate the UI.
 */

import { apiClient } from './api-client';

// ---- Types ---------------------------------------------------------------

export interface DisplaySettings {
  football_visible_tournaments: string[];
  excluded_teams: Record<string, string[]>;
  other_sports_visible: string[];
}

export interface Sport {
  sport_id: string;
  name?: string;
}

export interface Tournament {
  tournament_id: string;
  official_name: string;
  number_events?: number;
  season?: string;
}

export interface Team {
  team_id: string;
  official_name: string;
}

interface DisplaySettingsResponse {
  success: boolean;
  data: Partial<DisplaySettings>;
}

interface UpdateSettingResponse {
  success: boolean;
  message?: string;
}

interface SportsApiResponse {
  sports: Sport[];
}

interface TournamentsApiResponse {
  tournaments: Tournament[];
}

interface TeamsApiResponse {
  teams: Team[];
}

// ---- Service class -------------------------------------------------------

/**
 * Returns the current football season in "YY/YY" format (e.g. "25/26").
 * Football seasons run August → July; before August we're still in the
 * season that started the previous calendar year.
 */
function getCurrentFootballSeason(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  const startYear = month >= 7 ? year : year - 1;
  const endYear = startYear + 1;
  return `${String(startYear).slice(-2)}/${String(endYear).slice(-2)}`;
}

class DisplaySettingsService {
  private readonly adminBase = '/admin/display-settings';
  private readonly v1Base = '/v1';

  // ---- Settings CRUD -----

  async getSettings(): Promise<DisplaySettings> {
    const response = await apiClient.get<DisplaySettingsResponse>(this.adminBase);

    // Merge with safe defaults so callers always get all three keys
    return {
      football_visible_tournaments: [],
      excluded_teams: {},
      other_sports_visible: [],
      ...(response.data ?? {}),
    };
  }

  async updateSetting(
    key: keyof DisplaySettings,
    value: string[] | Record<string, string[]>
  ): Promise<void> {
    await apiClient.put<UpdateSettingResponse>(`${this.adminBase}/${key}`, {
      value,
    });
  }

  // ---- XS2Event proxy helpers -----

  async getSports(): Promise<Sport[]> {
    const response = await apiClient.get<SportsApiResponse>(`${this.v1Base}/sports`);
    return response.sports ?? [];
  }

  async getFootballTournaments(): Promise<Tournament[]> {
    const season = getCurrentFootballSeason();
    const url = `${this.v1Base}/tournaments?sport_type=soccer&page_size=100&page=1&season=${encodeURIComponent(season)}`;
    const response = await apiClient.get<TournamentsApiResponse>(url);
    const all = response.tournaments ?? [];
    return all.filter((t) => (t.number_events ?? 0) >= 1);
  }

  async getTeamsForTournament(tournamentId: string): Promise<Team[]> {
    const url = `${this.v1Base}/teams?sport_type=soccer&tournament_id=${encodeURIComponent(tournamentId)}&page_size=100`;
    const response = await apiClient.get<TeamsApiResponse>(url);
    return response.teams ?? [];
  }
}

export const displaySettingsService = new DisplaySettingsService();
