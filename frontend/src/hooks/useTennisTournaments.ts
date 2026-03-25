import { useState, useCallback, useEffect } from 'react';
import { apiClient, API_ENDPOINTS } from '../services/apiRoutes';
import { apiCache } from '../utils/apiCache';
import type { Tournament, TournamentsResponse } from '../services/apiRoutes';

interface UseTennisTournamentsReturn {
  tournaments: Tournament[];
  loading: boolean;
  error: string | null;
}

export const useTennisTournaments = (): UseTennisTournamentsReturn => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTournaments = useCallback(async () => {
    const cacheKey = apiCache.getTennisTournamentsKey();

    // Return from cache if available
    const cachedData = apiCache.get<Tournament[]>(cacheKey);
    if (cachedData) {
      setTournaments(cachedData);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const tournamentsUrl = `${API_ENDPOINTS.TOURNAMENTS}?page_size=50&page=1&sport_type=tennis`;
      const response = await apiClient.get<TournamentsResponse>(tournamentsUrl);

      const allTournaments = response.data.tournaments || [];
      const filteredTournaments = allTournaments.filter(
        (tournament) => (tournament.number_events ?? 0) >= 1
      );

      // Cache for 20 minutes – same duration as football menu hierarchy
      apiCache.set(cacheKey, filteredTournaments, 20);
      setTournaments(filteredTournaments);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch tennis tournaments';
      setError(errorMessage);
      setTournaments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  return { tournaments, loading, error };
};
