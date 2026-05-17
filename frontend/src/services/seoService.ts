/**
 * SEO Service – Frontend
 *
 * Fetches SEO settings from the public API endpoint and provides
 * per-page metadata for the useSEO hook.
 */

const API_BASE = import.meta.env.VITE_CUSTOMER_API_BASE_URL || '';

export interface SeoData {
  id: number;
  page_key: string;
  page_name: string;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  og_title: string | null;
  og_description: string | null;
  robots: string;
}

interface SeoApiResponse {
  success: boolean;
  data?: SeoData | SeoData[];
  error?: string;
}

// Simple in-memory cache so we only hit the network once per session.
let allSettingsCache: Record<string, SeoData> | null = null;
let fetchPromise: Promise<Record<string, SeoData>> | null = null;

/**
 * Fetch all SEO settings and index them by page_key.
 * Results are cached for the lifetime of the page.
 */
async function fetchAllSettings(): Promise<Record<string, SeoData>> {
  if (allSettingsCache) return allSettingsCache;

  // Deduplicate in-flight requests
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE}/api/v1/seo-settings`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json: SeoApiResponse = await response.json();
      if (!json.success || !Array.isArray(json.data)) {
        return {};
      }
      const indexed: Record<string, SeoData> = {};
      for (const item of json.data) {
        indexed[item.page_key] = item;
      }
      allSettingsCache = indexed;
      return indexed;
    } catch {
      return {};
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

/**
 * Get SEO data for a specific page key.
 * Returns null if the key is not found or the request fails.
 */
export async function getSeoByPageKey(pageKey: string): Promise<SeoData | null> {
  const all = await fetchAllSettings();
  return all[pageKey] ?? null;
}

/**
 * Invalidate the in-memory cache (useful for testing).
 */
export function invalidateSeoCache(): void {
  allSettingsCache = null;
  fetchPromise = null;
}
