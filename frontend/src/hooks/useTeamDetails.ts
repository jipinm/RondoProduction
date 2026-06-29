import { useState, useEffect } from 'react';
import { apiClient, API_ENDPOINTS } from '../services/apiRoutes';
import type { Team } from '../services/apiRoutes';

export const useTeamDetails = (teamId?: string) => {
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId) {
      setTeam(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    const fetchTeamDetails = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiClient.get<Team>(API_ENDPOINTS.TEAM_DETAILS(teamId));
        if (!cancelled) {
          setTeam(response.data);
        }
      } catch (err) {
        if (!cancelled) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to fetch team details';
          setError(errorMessage);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchTeamDetails();

    return () => {
      cancelled = true;
    };
  }, [teamId]);

  return { team, loading, error };
};
