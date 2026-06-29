import { useState, useEffect } from 'react';
import { apiClient, API_ENDPOINTS } from '../services/apiRoutes';
import type { TeamCredentials } from '../services/apiRoutes';

export const useTeamCredentials = (teamId?: string) => {
  const [teamCredentials, setTeamCredentials] = useState<TeamCredentials | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!teamId) {
      setTeamCredentials(null);
      setLoading(false);
      setError(null);
      setNotFound(false);
      return;
    }

    const fetchTeamCredentials = async () => {
      const endpoint = API_ENDPOINTS.TEAM_CREDENTIALS(teamId);

      setLoading(true);
      setError(null);
      setNotFound(false);

      try {
        const response = await apiClient.get<{success: boolean; data: TeamCredentials}>(endpoint);
        setTeamCredentials(response.data.data);
        setNotFound(false);
      } catch (err: any) {
        const status = err.apiError?.status || err.response?.status || err.status;

        if (status === 404) {
          setTeamCredentials(null);
          setNotFound(true);
          setError(null);
        } else {
          const errorMessage = err.apiError?.message || err.message || 'Failed to fetch team credentials';
          console.error('Team Credentials API error', { endpoint, error: errorMessage, status });
          setError(errorMessage);
          setNotFound(false);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTeamCredentials();
  }, [teamId]);

  return { teamCredentials, loading, error, notFound };
};
