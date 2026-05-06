import { useState, useEffect } from 'react';
import { apiClient, API_ENDPOINTS } from '../services/apiRoutes';
import type { CityItem, CitiesResponse } from '../services/apiRoutes';

interface CitiesParams {
  country?: string;      // ISO-3 country code to scope results
  page_size?: number;
}

export const useCities = (params?: CitiesParams) => {
  const [cities, setCities] = useState<CityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCities = async () => {
      setLoading(true);
      setError(null);

      try {
        const apiParams: Record<string, string | number> = {
          page_size: params?.page_size ?? 200,
          page: 1,
        };

        if (params?.country) {
          apiParams.country = params.country;
        }

        const response = await apiClient.get<CitiesResponse>(
          API_ENDPOINTS.CITIES,
          apiParams
        );

        setCities(response.data.cities ?? []);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to fetch cities';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchCities();
  }, [params?.country, params?.page_size]);

  return { cities, loading, error };
};
