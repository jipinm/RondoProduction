import { useState, useEffect } from 'react';
import { apiClient } from '../services/apiRoutes';

export type EventMinPrices = Map<string, Record<string, number>>;

const BATCH_SIZE = 50;

export const useEventMinPrices = (
  eventIds: string[]
): { eventMinPrices: EventMinPrices; loading: boolean } => {
  const [eventMinPrices, setEventMinPrices] = useState<EventMinPrices>(new Map());
  const [loading, setLoading] = useState(false);

  const key = eventIds.join(',');

  useEffect(() => {
    if (!eventIds.length) {
      setEventMinPrices(new Map());
      return;
    }

    let cancelled = false;
    setLoading(true);

    // Split into chunks so we never exceed the backend's 50-ID limit.
    // Fires all chunks in parallel and merges results.
    const chunks: string[][] = [];
    for (let i = 0; i < eventIds.length; i += BATCH_SIZE) {
      chunks.push(eventIds.slice(i, i + BATCH_SIZE));
    }

    const requests = chunks.map(chunk =>
      apiClient.get<{ success: boolean; data: Record<string, Record<string, number>> }>(
        '/v1/events/min-ticket-prices',
        { event_ids: chunk.join(',') }
      )
    );

    Promise.allSettled(requests)
      .then(results => {
        if (cancelled) return;
        const map = new Map<string, Record<string, number>>();
        results.forEach(result => {
          if (result.status !== 'fulfilled') return;
          const raw = result.value.data?.data ?? {};
          Object.entries(raw).forEach(([eventId, prices]) => {
            const normalized: Record<string, number> = {};
            Object.entries(prices).forEach(([currency, cents]) => {
              normalized[currency] = (cents as number) / 100;
            });
            map.set(eventId, normalized);
          });
        });
        setEventMinPrices(map);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { eventMinPrices, loading };
};
