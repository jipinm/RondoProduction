import { useState, useEffect, useCallback } from 'react';

/**
 * Currency conversion response from Frankfurter API
 */
interface FrankfurterResponse {
  amount: number;
  base: string;
  date: string;
  rates: {
    [currency: string]: number;
  };
}

/**
 * Multi-currency conversion result
 */
export interface MultiCurrencyConversionResult {
  exchangeRates: Map<string, number>;
  isLoading: boolean;
  error: string | null;
  convertAmount: (amount: number, fromCurrency: string) => number;
  getExchangeRate: (currency: string) => number;
  hasConversion: (currency: string) => boolean;
}

// ---------------------------------------------------------------------------
// Module-level rate cache — survives component remounts/re-renders for the
// full browser session. Key: `${fromCurrency}_${toCurrency}`.
//
// Reading directly from this map (instead of React state) means that when the
// user switches currency, the SAME render that receives the new toCurrency also
// gets the correct rate — no extra render cycle, no stale closure.
// ---------------------------------------------------------------------------
const ratesCache = new Map<string, number>();
const getCacheKey = (from: string, to: string) => `${from}_${to}`;

/**
 * Hook for real-time multi-currency conversion using Frankfurter API.
 *
 * Design:
 * - convertAmount / getExchangeRate / hasConversion read directly from the
 *   module-level ratesCache, NOT from React state. This eliminates the stale-
 *   closure render cycle that previously caused a one-frame price flicker when
 *   switching currencies.
 * - A lightweight `rateVersion` counter is the only React state kept. It
 *   increments when new rates are fetched, which triggers a re-render so the
 *   page picks up the freshly-cached value.
 * - `isLoading` is true only while a network fetch is in flight for a brand-new
 *   currency pair that has never been fetched before.
 */
export const useMultiCurrencyConversion = (
  currencies: string[],
  toCurrency: string = 'USD'
): MultiCurrencyConversionResult => {
  // Used solely to trigger re-renders when new rates arrive from the network.
  const [rateVersion, setRateVersion] = useState(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const uniqueCurrencies = [...new Set(currencies.filter(c => c && c !== toCurrency))];

    if (uniqueCurrencies.length === 0) {
      setIsLoading(false);
      setError(null);
      return;
    }

    // Determine which pairs still need a network fetch.
    const missingCurrencies = uniqueCurrencies.filter(
      c => !ratesCache.has(getCacheKey(c, toCurrency))
    );

    if (missingCurrencies.length === 0) {
      // All rates already in the module-level cache.
      // convertAmount reads from ratesCache directly, so no state update needed —
      // the current render already produces the correct price. Do nothing.
      setIsLoading(false);
      setError(null);
      return;
    }

    // Fetch only the pairs that are not yet cached.
    const fetchExchangeRates = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const fetchPromises = missingCurrencies.map(async (currency) => {
          try {
            const exchangeRateBase = `${import.meta.env.VITE_CUSTOMER_API_BASE_URL || ''}/api/v1/exchange-rates`;
            const response = await fetch(
              `${exchangeRateBase}?from=${currency}&to=${toCurrency}`
            );

            if (!response.ok) {
              console.warn(`Failed to fetch exchange rate for ${currency}: ${response.status}`);
              return { currency, rate: null };
            }

            const data: FrankfurterResponse = await response.json();
            return { currency, rate: data.rates[toCurrency] ?? null };
          } catch (err) {
            console.warn(`Error fetching exchange rate for ${currency}:`, err);
            return { currency, rate: null };
          }
        });

        const results = await Promise.all(fetchPromises);

        results.forEach(({ currency, rate }) => {
          if (rate !== null) {
            ratesCache.set(getCacheKey(currency, toCurrency), rate);
          }
        });

        // Bump version to trigger a re-render so the page reads the new rates.
        setRateVersion(v => v + 1);
        setError(null);
      } catch (err) {
        console.error('Error fetching exchange rates:', err);
        setError('Failed to load exchange rates');
      } finally {
        setIsLoading(false);
      }
    };

    fetchExchangeRates();
  }, [currencies.join(','), toCurrency]);

  // convertAmount reads directly from ratesCache — no React state dependency.
  // When toCurrency changes, the new function produced by useCallback immediately
  // uses the new toCurrency to look up the cached rate on the very same render.
  const convertAmount = useCallback((amount: number, fromCurrency: string): number => {
    if (!fromCurrency || fromCurrency === toCurrency) return amount;
    const rate = ratesCache.get(getCacheKey(fromCurrency, toCurrency));
    if (rate === undefined) return amount;
    return amount * rate;
  }, [toCurrency, rateVersion]); // rateVersion ensures re-memoisation after a fetch

  const getExchangeRate = useCallback((currency: string): number => {
    if (!currency || currency === toCurrency) return 1;
    return ratesCache.get(getCacheKey(currency, toCurrency)) ?? 1;
  }, [toCurrency, rateVersion]);

  const hasConversion = useCallback((currency: string): boolean => {
    if (!currency || currency === toCurrency) return true;
    return ratesCache.has(getCacheKey(currency, toCurrency));
  }, [toCurrency, rateVersion]);

  // Build the exchangeRates Map from the cache for API compatibility.
  // Consumers that destructure this field get a consistent snapshot.
  const exchangeRates = new Map<string, number>();
  exchangeRates.set(toCurrency, 1);
  currencies.forEach(c => {
    if (c && c !== toCurrency) {
      const rate = ratesCache.get(getCacheKey(c, toCurrency));
      if (rate !== undefined) exchangeRates.set(c, rate);
    }
  });

  return {
    exchangeRates,
    isLoading,
    error,
    convertAmount,
    getExchangeRate,
    hasConversion,
  };
};

export default useMultiCurrencyConversion;
