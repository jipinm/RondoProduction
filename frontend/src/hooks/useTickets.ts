import { useState, useEffect } from 'react';
import { apiClient, type Ticket, type TicketsResponse, API_ENDPOINTS } from '../services/apiRoutes';

interface UseTicketsParams {
  event_id?: string;
}

interface UseTicketsResult {
  tickets: Ticket[];
  loading: boolean;
  error: string | null;
}

export const useTickets = (params: UseTicketsParams): UseTicketsResult => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTickets = async () => {
      if (!params.event_id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const queryParams = new URLSearchParams();
        if (params.event_id) queryParams.set('event_id', params.event_id);

        const endpoint = `${API_ENDPOINTS.TICKETS}?${queryParams.toString()}`;
        const response = await apiClient.request<TicketsResponse>(endpoint);

        // API returns prices in cents (e.g. 40000 = £400.00). Normalize to standard
        // currency units here so all consumers (display, calculations, checkout) are correct.
        const normalized = (response.data.tickets || []).map(ticket => ({
          ...ticket,
          face_value: ticket.face_value != null ? ticket.face_value / 100 : ticket.face_value,
          net_rate: ticket.net_rate != null ? ticket.net_rate / 100 : ticket.net_rate,
        }));

        setTickets(normalized);
      } catch (err: any) {
        const errorMessage = err?.message || 'Failed to fetch tickets';
        setError(errorMessage);
        setTickets([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [params.event_id]);

  return {
    tickets,
    loading,
    error,
  };
};
