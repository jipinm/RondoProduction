import { useState, useCallback, useEffect } from 'react';
import { apiClient, API_ENDPOINTS } from '../services/apiRoutes';
import { getActiveSeason } from '../utils/dateUtils';
import { apiCache } from '../utils/apiCache';
import type { Tournament, TournamentsResponse } from '../services/apiRoutes';
import type { DisplaySettings } from './useDisplaySettings';

interface UseFootballTournamentsReturn {
  tournaments: Tournament[];
  loading: boolean;
  error: string | null;
  fetchTournaments: () => Promise<void>;
  clearTournaments: () => void;
}

interface UseFootballTournamentsProps {
  displaySettings?: DisplaySettings;
}

export const useFootballTournaments = (props?: UseFootballTournamentsProps): UseFootballTournamentsReturn => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displaySettings = props?.displaySettings;

  const fetchTournaments = useCallback(async () => {
    const currentSeason = getActiveSeason(displaySettings?.active_season ?? '');
    const cacheKey = apiCache.getTournamentsKey(currentSeason);
    
    // Check cache first
    const cachedData = apiCache.get<Tournament[]>(cacheKey);
    if (cachedData) {
      setTournaments(cachedData);
      return;
    }

    // Don't fetch if already loading
    if (loading) return;
    
    setLoading(true);
    setError(null);

    try {
      
      const response = await apiClient.get<TournamentsResponse>(
        `${API_ENDPOINTS.TOURNAMENTS}?page_size=50&page=1&sport_type=soccer&season=${currentSeason}`
      );
      
      // Extract tournaments array from response
      const allTournaments = response.data.tournaments || [];
      
      // Filter tournaments to only show those with events (number_events >= 1)
      const filteredTournaments = allTournaments.filter(tournament => 
        (tournament.number_events ?? 0) >= 1
      );
      
      // Cache the filtered results for 10 minutes
      apiCache.set(cacheKey, filteredTournaments, 10);

      setTournaments(filteredTournaments);
      setLoading(false);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch tournaments';

      setError(errorMessage);
      setTournaments([]);
      setLoading(false);
    }
  }, [loading, displaySettings?.active_season]);

  const clearTournaments = useCallback(() => {
    const currentSeason = getActiveSeason(displaySettings?.active_season ?? '');
    const cacheKey = apiCache.getTournamentsKey(currentSeason);
    
    apiCache.delete(cacheKey);
    setTournaments([]);
    setError(null);
  }, [displaySettings?.active_season]);

  // Load tournaments on component mount
  useEffect(() => {
    fetchTournaments();
  }, []);

  return {
    tournaments,
    loading,
    error,
    fetchTournaments,
    clearTournaments,
  };
};
