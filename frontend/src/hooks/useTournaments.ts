import { useState, useEffect } from 'react';
import { apiClient, API_ENDPOINTS, ApiUtils, type Tournament, type TournamentsResponse } from '../services/apiRoutes';
import { getActiveSeason } from '../utils/dateUtils';
import type { DisplaySettings } from './useDisplaySettings';

interface UseTournamentsResult {
  tournaments: Tournament[];
  loading: boolean;
  error: string | null;
}

interface UseTournamentsProps {
  sportType?: string;
  displaySettings?: DisplaySettings;
}

export const useTournaments = (props?: UseTournamentsProps): UseTournamentsResult => {
  const sportType = props?.sportType;
  const displaySettings = props?.displaySettings;
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTournaments = async () => {

      setLoading(true);
      setError(null);

      try {
        const params: Record<string, any> = {
          date_stop: `ge:${ApiUtils.getCurrentDateForFilter()}`, // Only future events
        };

        if (sportType) {
          params.sport_type = sportType;
        }

        // Season applies only to soccer (format "26/27"). Tennis, F1, rugby, golf
        // and other sports use calendar-year seasons ("2026") that are incompatible
        // with the soccer format — passing the wrong format returns 0 results.
        // With no sport filter, omit season so all upcoming tournaments are returned.
        if (sportType === 'soccer') {
          const activeSeason = getActiveSeason(displaySettings?.active_season ?? '');
          if (activeSeason) {
            params.season = activeSeason;
          }
        }

        const response = await apiClient.get<TournamentsResponse>(API_ENDPOINTS.TOURNAMENTS, params);

        setTournaments(response.data.tournaments);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tournaments';
        setError(errorMessage);
        setTournaments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTournaments();
  }, [sportType, displaySettings?.active_season]);

  useEffect(() => {
    // State updated
  }, [tournaments, loading, error, sportType]);

  return { tournaments, loading, error };
};
