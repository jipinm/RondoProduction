import { useState, useEffect } from 'react';
import { apiCache } from '../utils/apiCache';

export interface SiteBranding {
  header_logo_url: string | null;
  footer_logo_url: string | null;
  favicon_url: string | null;
}

interface SiteBrandingResponse {
  success: boolean;
  data: SiteBranding;
}

const CACHE_KEY = 'site_branding';
const CACHE_TTL_MINUTES = 10;
const API_BASE = import.meta.env.VITE_CUSTOMER_API_BASE_URL || '';

const DEFAULT_BRANDING: SiteBranding = {
  header_logo_url: null,
  footer_logo_url: null,
  favicon_url: null,
};

export const useSiteBranding = (): SiteBranding => {
  const [branding, setBranding] = useState<SiteBranding>(() => {
    const cached = apiCache.get<SiteBranding>(CACHE_KEY);
    return cached ?? DEFAULT_BRANDING;
  });

  useEffect(() => {
    const cached = apiCache.get<SiteBranding>(CACHE_KEY);
    if (cached) {
      setBranding(cached);
      return;
    }

    let cancelled = false;

    fetch(`${API_BASE}/api/v1/site-branding`)
      .then((res) => res.json())
      .then((json: SiteBrandingResponse) => {
        if (cancelled) return;
        if (json.success && json.data) {
          const merged = { ...DEFAULT_BRANDING, ...json.data };
          apiCache.set(CACHE_KEY, merged, CACHE_TTL_MINUTES);
          setBranding(merged);
        }
      })
      .catch(() => {
        // Fall back to defaults silently
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return branding;
};
