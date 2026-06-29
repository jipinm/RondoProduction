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
  active_season: string;
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
  region?: string;
  slug?: string;
}

export interface Team {
  team_id: string;
  official_name: string;
  slug?: string;
  team_slug?: string;
  iso_country?: string;
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

function getCurrentFootballSeason(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-indexed
  // Football season flips in July
  const seasonStart = month >= 7 ? year : year - 1;
  const seasonEnd = (seasonStart + 1) % 100;
  return `${seasonStart}/${String(seasonEnd).padStart(2, '0')}`;
}

class DisplaySettingsService {
  private readonly adminBase = '/admin/display-settings';
  private readonly v1Base = '/v1';

  // ---- Settings CRUD -----

  async getSettings(): Promise<DisplaySettings> {
    const response = await apiClient.get<DisplaySettingsResponse>(this.adminBase);

    // Merge with safe defaults so callers always get all keys
    return {
      football_visible_tournaments: [],
      excluded_teams: {},
      other_sports_visible: [],
      active_season: '',
      ...(response.data ?? {}),
    };
  }

  async updateSetting(
    key: keyof DisplaySettings,
    value: string[] | Record<string, string[]> | string
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

  async getFootballTournaments(activeSeason?: string): Promise<Tournament[]> {
    const season = activeSeason && activeSeason.trim() !== '' ? activeSeason : getCurrentFootballSeason();
    const url = `${this.v1Base}/tournaments?sport_type=soccer&page_size=100&page=1&season=${encodeURIComponent(season)}`;
    const response = await apiClient.get<TournamentsApiResponse>(url);
    return response.tournaments ?? [];
  }

  async getTeamsForTournament(tournamentId: string): Promise<Team[]> {
    // season is NOT sent to /v1/teams — XS2Event returns 400 for unknown params.
    // Teams are implicitly season-scoped via tournament_id.
    const url = `${this.v1Base}/teams?sport_type=soccer&tournament_id=${encodeURIComponent(tournamentId)}&page_size=100`;
    const response = await apiClient.get<TeamsApiResponse>(url);
    return response.teams ?? [];
  }
}

export const displaySettingsService = new DisplaySettingsService();
