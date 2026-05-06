import { useState, useCallback, useEffect, useRef } from 'react';
import { apiClient, API_ENDPOINTS } from '../services/apiRoutes';
import { getCurrentSeason } from '../utils/dateUtils';
import { apiCache } from '../utils/apiCache';
import type { Tournament, TournamentsResponse, Team, TeamsResponse } from '../services/apiRoutes';
import type { DisplaySettings } from './useDisplaySettings';

interface MenuHierarchy {
  tournaments: Tournament[];
  teamsMap: Record<string, Team[]>; // tournament_id -> teams
  linksMap: Record<string, string>; // team_id -> generated URL
  season: string;
  lastUpdated: number;
}

interface UseMenuHierarchyReturn {
  tournaments: Tournament[];
  loading: boolean;
  error: string | null;
  getTeamsForTournament: (tournamentId: string) => Team[];
  getTeamLink: (tournamentId: string, teamId: string) => string;
  refreshMenuHierarchy: () => Promise<void>;
  clearMenuCache: () => void;
}

interface UseMenuHierarchyProps {
  /** Pass display settings to apply tournament and team filtering. */
  displaySettings?: DisplaySettings;
}

/**
 * Custom hook for managing complete menu hierarchy with caching
 * Handles tournaments, teams, and navigation links in a unified cache
 */
export const useMenuHierarchy = (props?: UseMenuHierarchyProps): UseMenuHierarchyReturn => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [teamsMap, setTeamsMap] = useState<Record<string, Team[]>>({});
  const [linksMap, setLinksMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displaySettings = props?.displaySettings;
  const currentSeason = getCurrentSeason();

  // Use a ref for the in-flight guard so it doesn't appear in useCallback deps
  // (which would cause fetchCompleteHierarchy to recreate and re-trigger effects).
  const fetchingRef = useRef(false);

  // Keep a ref of displaySettings so the async fetch closure in Step 5 always
  // reads the *latest* value — not a stale closure capture from when the fetch
  // was initiated (before useDisplaySettings may have resolved).
  const displaySettingsRef = useRef(displaySettings);
  displaySettingsRef.current = displaySettings;

  const generateTeamLink = useCallback((tournamentId: string, teamId: string, season: string): string => {
    return `/events?tournament_id=${tournamentId}&team_id=${teamId}&season=${season}`;
  }, []);

  const loadFromCache = useCallback((): MenuHierarchy | null => {
    const cacheKey = apiCache.getMenuHierarchyKey(currentSeason);
    return apiCache.get<MenuHierarchy>(cacheKey);
  }, [currentSeason]);

  const saveToCache = useCallback((hierarchy: MenuHierarchy): void => {
    const cacheKey = apiCache.getMenuHierarchyKey(currentSeason);
    // Cache for 20 minutes since this is the complete menu structure
    apiCache.set(cacheKey, hierarchy, 20);
  }, [currentSeason]);

  const fetchCompleteHierarchy = useCallback(async (): Promise<void> => {
    // Check cache first — cache stores the full unfiltered hierarchy so
    // display-settings filtering is always applied fresh on top of it.
    const cachedHierarchy = loadFromCache();
    if (cachedHierarchy) {
      const visibleTournamentIds = displaySettings?.football_visible_tournaments ?? [];
      const cachedTournaments = visibleTournamentIds.length > 0
        ? cachedHierarchy.tournaments.filter(t => visibleTournamentIds.includes(t.tournament_id))
        : cachedHierarchy.tournaments;

      const filteredTeamsMap: Record<string, Team[]> = {};
      const filteredLinksMap: Record<string, string> = {};
      cachedTournaments.forEach(t => {
        const excludedIds = displaySettings?.excluded_teams?.[t.tournament_id] ?? [];
        const allTeams = cachedHierarchy.teamsMap[t.tournament_id] ?? [];
        const visibleTeams = excludedIds.length > 0
          ? allTeams.filter(team => !excludedIds.includes(team.team_id))
          : allTeams;
        filteredTeamsMap[t.tournament_id] = visibleTeams;
        visibleTeams.forEach(team => {
          filteredLinksMap[`${t.tournament_id}_${team.team_id}`] =
            cachedHierarchy.linksMap[`${t.tournament_id}_${team.team_id}`] ||
            generateTeamLink(t.tournament_id, team.team_id, currentSeason);
        });
      });

      setTournaments(cachedTournaments);
      setTeamsMap(filteredTeamsMap);
      setLinksMap(filteredLinksMap);
      return;
    }

    // Guard against concurrent fetches using a ref (not state, to avoid
    // adding `loading` to this callback's deps which would cause infinite loops).
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      // Step 1: Fetch all tournaments for the current season
      const tournamentsUrl = `${API_ENDPOINTS.TOURNAMENTS}?page_size=50&page=1&sport_type=soccer&season=${currentSeason}`;
      const tournamentsResponse = await apiClient.get<TournamentsResponse>(tournamentsUrl);

      const allTournaments = tournamentsResponse.data.tournaments || [];
      const filteredTournaments = allTournaments.filter(tournament =>
        (tournament.number_events ?? 0) >= 1
      );

      // Step 2: Fetch teams for ALL tournaments so the cache is fully populated
      // and can be re-filtered when display settings change.
      const teamsPromises = filteredTournaments.map(async (tournament) => {
        try {
          const teamsUrl = `${API_ENDPOINTS.TEAMS}?club_logo=true&sport_type=soccer&tournament_id=${tournament.tournament_id}&popular=true`;
          const teamsResponse = await apiClient.get<TeamsResponse>(teamsUrl);
          return { tournamentId: tournament.tournament_id, teams: teamsResponse.data.teams || [] };
        } catch {
          return { tournamentId: tournament.tournament_id, teams: [] };
        }
      });

      const teamsResults = await Promise.all(teamsPromises);

      // Step 3: Build RAW (unfiltered) maps for caching
      const rawTeamsMap: Record<string, Team[]> = {};
      const rawLinksMap: Record<string, string> = {};
      teamsResults.forEach(({ tournamentId, teams }) => {
        rawTeamsMap[tournamentId] = teams;
        teams.forEach(team => {
          rawLinksMap[`${tournamentId}_${team.team_id}`] =
            generateTeamLink(tournamentId, team.team_id, currentSeason);
        });
      });

      // Step 4: Cache the FULL unfiltered hierarchy
      const hierarchy: MenuHierarchy = {
        tournaments: filteredTournaments,
        teamsMap: rawTeamsMap,
        linksMap: rawLinksMap,
        season: currentSeason,
        lastUpdated: Date.now()
      };
      saveToCache(hierarchy);

      // Step 5: Apply current display settings filter for this render.
      // Read from the ref so we always use the *latest* settings, even if
      // they resolved while this async fetch was in-flight.
      const latestSettings = displaySettingsRef.current;
      const settingIds = latestSettings?.football_visible_tournaments ?? [];
      const visibleForRender = settingIds.length > 0
        ? filteredTournaments.filter(t => settingIds.includes(t.tournament_id))
        : filteredTournaments;

      const renderTeamsMap: Record<string, Team[]> = {};
      const renderLinksMap: Record<string, string> = {};
      visibleForRender.forEach(t => {
        const excludedIds = latestSettings?.excluded_teams?.[t.tournament_id] ?? [];
        const rawTeams = rawTeamsMap[t.tournament_id] ?? [];
        const visibleTeams = excludedIds.length > 0
          ? rawTeams.filter(team => !excludedIds.includes(team.team_id))
          : rawTeams;
        renderTeamsMap[t.tournament_id] = visibleTeams;
        visibleTeams.forEach(team => {
          renderLinksMap[`${t.tournament_id}_${team.team_id}`] =
            rawLinksMap[`${t.tournament_id}_${team.team_id}`] ||
            generateTeamLink(t.tournament_id, team.team_id, currentSeason);
        });
      });

      setTournaments(visibleForRender);
      setTeamsMap(renderTeamsMap);
      setLinksMap(renderLinksMap);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch menu hierarchy';
      setError(errorMessage);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  // NOTE: `loading` state is intentionally omitted — fetchingRef guards against
  // concurrent calls without causing this callback to re-create on state change.
  }, [currentSeason, loadFromCache, saveToCache, generateTeamLink, displaySettings]);

  const getTeamsForTournament = useCallback((tournamentId: string): Team[] => {
    return teamsMap[tournamentId] || [];
  }, [teamsMap]);

  const getTeamLink = useCallback((tournamentId: string, teamId: string): string => {
    const linkKey = `${tournamentId}_${teamId}`;
    return linksMap[linkKey] || generateTeamLink(tournamentId, teamId, currentSeason);
  }, [linksMap, generateTeamLink, currentSeason]);

  const refreshMenuHierarchy = useCallback(async (): Promise<void> => {
    // Clear cache and refetch
    const cacheKey = apiCache.getMenuHierarchyKey(currentSeason);
    apiCache.delete(cacheKey);
    await fetchCompleteHierarchy();
  }, [currentSeason, fetchCompleteHierarchy]);

  const clearMenuCache = useCallback((): void => {
    const cacheKey = apiCache.getMenuHierarchyKey(currentSeason);
    apiCache.delete(cacheKey);
    
    setTournaments([]);
    setTeamsMap({});
    setLinksMap({});
    setError(null);
  }, [currentSeason]);

  // Re-run whenever fetchCompleteHierarchy changes — which happens whenever
  // displaySettings changes — so the filtered list is always up to date.
  useEffect(() => {
    fetchCompleteHierarchy();
  }, [fetchCompleteHierarchy]);

  return {
    tournaments,
    loading,
    error,
    getTeamsForTournament,
    getTeamLink,
    refreshMenuHierarchy,
    clearMenuCache,
  };
};
