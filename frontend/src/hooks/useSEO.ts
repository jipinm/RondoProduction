/**
 * useSEO – React hook
 *
 * Fetches SEO metadata for a given page key and applies it to the document
 * (title, meta description, meta keywords, robots, Open Graph).
 *
 * Usage:
 *   useSEO('home');
 *   useSEO('about-us');
 *   useSEO('events');
 *
 * The hook also accepts optional runtime overrides so that dynamic pages
 * (e.g. an individual event) can merge in contextual data:
 *
 *   useSEO('event-tickets', { titleSuffix: 'UEFA Champions League Final' });
 */

import { useEffect } from 'react';
import { getSeoByPageKey, type SeoData } from '../services/seoService';

export interface SEOOverrides {
  /** Appended to the meta_title after ' – '.  Useful for dynamic pages. */
  titleSuffix?: string;
  /** Fully override the document title (skips meta_title from DB). */
  title?: string;
  /** Fully override the meta description. */
  description?: string;
}

function setMeta(name: string, content: string | null | undefined) {
  if (!content) return;
  // property= for OG tags, name= for standard tags
  const attr = name.startsWith('og:') ? 'property' : 'name';
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function applySeо(data: SeoData, overrides: SEOOverrides = {}) {
  // ── Document title ──────────────────────────────────────────────────────
  let title = overrides.title ?? data.meta_title ?? document.title;
  if (!overrides.title && overrides.titleSuffix) {
    title = `${overrides.titleSuffix} – ${data.meta_title ?? 'Rondo Sports Tickets'}`;
  }
  document.title = title;

  // ── Standard meta tags ──────────────────────────────────────────────────
  setMeta('description', overrides.description ?? data.meta_description ?? undefined);
  setMeta('keywords', data.meta_keywords ?? undefined);
  setMeta('robots', data.robots ?? 'index, follow');

  // ── Open Graph ──────────────────────────────────────────────────────────
  const ogTitle = data.og_title || title;
  const ogDesc  = data.og_description || overrides.description || data.meta_description;
  setMeta('og:type', 'website');
  setMeta('og:title', ogTitle);
  setMeta('og:description', ogDesc ?? undefined);
  setMeta('og:site_name', 'Rondo Sports Tickets');
}

/**
 * Hook – fetches & applies SEO data for `pageKey`.
 */
export function useSEO(pageKey: string, overrides: SEOOverrides = {}) {
  useEffect(() => {
    let cancelled = false;

    getSeoByPageKey(pageKey).then(data => {
      if (cancelled || !data) return;
      applySeо(data, overrides);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey, overrides.title, overrides.titleSuffix, overrides.description]);
}
