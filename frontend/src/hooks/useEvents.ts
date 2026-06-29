import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient, API_ENDPOINTS } from '../services/apiRoutes';
import type { Event, EventsResponse } from '../services/apiRoutes';

interface EventsParams {
  sport_type?: string;
  tournament_id?: string;
  team_id?: string;
  date?: string;
  season?: string;
}

const normalizeEvents = (rawEvents: Event[]): Event[] =>
  rawEvents.map(event => ({
    ...event,
    min_ticket_price_eur: event.min_ticket_price_eur != null ? event.min_ticket_price_eur / 100 : event.min_ticket_price_eur,
    max_ticket_price_eur: event.max_ticket_price_eur != null ? event.max_ticket_price_eur / 100 : event.max_ticket_price_eur,
  }));

export const useEvents = (params?: EventsParams) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<any>(null);
  const currentPageRef = useRef(1);
  const paramsRef = useRef(params);
  paramsRef.current = params;

  useEffect(() => {
    if (!params) return;

    let cancelled = false;

    currentPageRef.current = 1;
    setLoading(true);
    setError(null);

    const apiParams: any = {
      sport_type: params.sport_type,
      tournament_id: params.tournament_id,
      team_id: params.team_id,
      page_size: 50,
      page: 1,
    };

    // Keep the events query consistent with the active season used by the
    // menu/tournaments/teams layers so the season-specific tournament_id and
    // team_id resolve to the correct season's events.
    if (params.season) {
      apiParams.season = params.season;
    }

    if (params.date) {
      apiParams.date_start = params.date;
      apiParams.date_stop = params.date;
    }

    console.log('🌐 useEvents API Request:', {
      endpoint: API_ENDPOINTS.EVENTS,
      params: apiParams,
      fullUrl: `${import.meta.env.VITE_XS2EVENT_BASE_URL || 'https://api.rondosportstickets.com'}${API_ENDPOINTS.EVENTS}?${new URLSearchParams(Object.entries(apiParams).filter(([_, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString()}`
    });

    apiClient.get<EventsResponse>(API_ENDPOINTS.EVENTS, apiParams)
      .then(response => {
        if (cancelled) return;
        console.log('📦 useEvents API Response received:', {
          status: 'success',
          eventsCount: response.data.events?.length || 0,
          pagination: response.data.pagination,
        });
        console.log('🎯 Events sample (first 3):',
          response.data.events?.slice(0, 3).map(e => ({
            id: e.event_id,
            name: e.event_name,
            date: e.date_start,
            venue: e.venue_name
          }))
        );
        setEvents(normalizeEvents(response.data.events || []));
        setPagination(response.data.pagination);
      })
      .catch(err => {
        if (cancelled) return;
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch events';
        console.error('❌ useEvents API Error:', { error: err, message: errorMessage, params });
        setError(errorMessage);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [params?.sport_type, params?.tournament_id, params?.team_id, params?.date, params?.season]);

  const totalSize: number | null = pagination?.total_size ?? null;
  const hasMore = totalSize !== null && events.length < totalSize;

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    const p = paramsRef.current;
    if (!p) return;

    const nextPage = currentPageRef.current + 1;
    setLoadingMore(true);

    const apiParams: any = {
      sport_type: p.sport_type,
      tournament_id: p.tournament_id,
      team_id: p.team_id,
      page_size: 50,
      page: nextPage,
    };

    if (p.season) {
      apiParams.season = p.season;
    }

    if (p.date) {
      apiParams.date_start = p.date;
      apiParams.date_stop = p.date;
    }

    apiClient.get<EventsResponse>(API_ENDPOINTS.EVENTS, apiParams)
      .then(response => {
        setEvents(prev => [...prev, ...normalizeEvents(response.data.events || [])]);
        setPagination(response.data.pagination);
        currentPageRef.current = nextPage;
      })
      .catch(err => {
        console.error('❌ useEvents loadMore error:', err);
      })
      .finally(() => {
        setLoadingMore(false);
      });
  }, [loadingMore, hasMore]);

  return { events, loading, loadingMore, error, pagination, totalSize, hasMore, loadMore };
};
