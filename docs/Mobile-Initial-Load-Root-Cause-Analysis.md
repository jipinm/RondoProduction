# Mobile Initial Page Load — Root Cause Analysis

**Date:** 2026-07-03  
**Scope:** Root cause analysis of blank page / missing images on first mobile load when opening links from WhatsApp. No code changes made — analysis only.

---

## 1. Observed Symptoms

| Test Case | What user sees | Resolves after |
|---|---|---|
| Case 1 | Completely blank or dark page, no content | Manual refresh |
| Case 2 | Page structure / navigation visible, all images missing | Manual refresh |

Both cases affect iOS and Android when the link is opened from WhatsApp. The app works correctly on subsequent page refreshes.

---

## 2. Two Failure Modes, One Loading Chain

Cases 1 and 2 are not separate bugs — they are two different points where the user observed the same sequential loading chain mid-flight.

```
[Browser cold cache]
  → JS bundle download + parse + execute       ← Case 1 caught here
    → React mounts
      → Hero renders (loading=true → skeleton)
        → Banner API call fires (cross-origin)
          → Banners arrive → loading=false → imageUrl set
            → <img src={imageUrl} opacity:0 /> renders  ← Case 2 caught here
              → Browser fetches image (cross-origin)
                → onLoad fires — OR — 1.5 s fallback timer fires
                  → opacity:1 → image visible ✓
```

**Case 1 (blank/dark page):** React has mounted, Hero is in `loading=true` skeleton state (dark shimmer, `background: #1a2332`). The banner API has not yet responded. The user sees the skeleton or an empty `<div id="root">` if JS has not yet finished executing.

**Case 2 (structure visible, no images):** `loading=false`, banner data arrived, but `isImageReady=false` so `.heroImage` renders at `opacity: 0`. All other component images (events, branding, etc.) are simultaneously fetching from cross-origin sources and are also not yet visible.

---

## 3. Root Cause 1 (Primary) — Monolithic JS bundle, no route-level code splitting

**File:** `frontend/src/App.tsx:6–35`  
All 26+ pages are eagerly imported with no `React.lazy()`. Vite produces a single large app bundle that must fully download, parse, and execute before React can mount and any API calls begin.

On a mobile device opening a WhatsApp link with a **cold HTTP cache**:
- The JS bundle download is the critical-path bottleneck before any content appears
- On slow 4G or congested venue WiFi this can consume 5–10 seconds
- Until JS executes, the page shows only `<div id="root"></div>` — visually blank

On refresh, the bundle is served from the WebView's warm cache, so React mounts in under a second and all API calls begin ~5–10 seconds sooner.

---

## 4. Root Cause 2 (Primary) — Hero image has a 3-step async dependency chain with no preloading

**Files:** `frontend/src/components/home/Hero.tsx`, `frontend/src/services/bannersService.ts`

The hero image cannot appear until three sequential async steps complete:

1. **Banner API call** (`bannersService.getHomepageHeroBanners()`) → cross-origin HTTP request to `VITE_CUSTOMER_API_BASE_URL`. No `<link rel="preconnect">` exists, so DNS + TCP + TLS resolve cold after JS executes.
2. **Image URL set** → `<img src={imageUrl} style={{ opacity: 0 }}>` renders for the first time.
3. **1.5 s fallback timer** (`Hero.tsx:79–81`) → starts only _after step 2_ (not from page load). If the banner API takes 3 s, the earliest the image can appear is **API latency + 1.5 s = 4.5 s** after React mounts — or longer if the image itself takes time to download.

```typescript
// Hero.tsx:77-85 — timer starts when imageUrl changes (after banners arrive)
useEffect(() => {
  if (!imageUrl || loadedUrls.has(imageUrl) || brokenUrls.has(imageUrl)) return;
  fadeTimerRef.current = setTimeout(() => {
    setLoadedUrls((prev) => new Set(prev).add(imageUrl));
  }, 1500);
}, [imageUrl]);
```

On a slow mobile connection where JS download takes 6 s and the banner API takes 3 s, the total wait before any hero image appears exceeds **10 s**.

---

## 5. Root Cause 3 (Contributing) — WhatsApp's in-app WebView has an isolated HTTP cache

On iOS, WhatsApp opens links in a `WKWebView` with its own cache store **not shared with Safari**. On Android, WhatsApp may use its own WebView (isolated cache) rather than Chrome Custom Tabs (shared cache).

This means every WhatsApp link open is effectively a first visit with an empty cache, regardless of prior visits in the user's main browser. The user's Safari or Chrome cache provides zero benefit when the link is opened from WhatsApp.

Refresh works because it re-uses the **same** WebView's cache (now warm from that first load).

---

## 6. Root Cause 4 (Contributing) — No resource hints in `index.html`

**File:** `frontend/index.html`

The HTML shell contains no `<link rel="preconnect">`, `<link rel="dns-prefetch">`, or `<link rel="preload">` tags. Consequences:

- The browser cannot begin DNS lookup + TCP + TLS to the API server until JS executes and the first `fetch()` fires
- Critical fonts are not hinted
- The browser has no advance signal about which cross-origin resources to prioritize

All cross-origin connections (banner API, image host, currency conversion API) start cold after the JS bundle fully executes.

---

## 7. Why Test Case 2 Shows ALL Images Missing

When React mounts, multiple components fire their own image-loading calls simultaneously:

| Component | Data source | Images |
|---|---|---|
| `Hero` | `bannersService` → `VITE_CUSTOMER_API_BASE_URL` | Hero banner images |
| `FaviconUpdater` | `useSiteBranding` → `VITE_CUSTOMER_API_BASE_URL` | Logo / favicon URLs |
| Event sections | `useEvents` / featured events hooks | Event cover images |

On a cold mobile connection, bandwidth is shared across all these parallel requests. Images render at `opacity: 0` by default (React state `isImageReady=false`) and only reveal when `onLoad` fires. If the network is slow, all images are still downloading at the time the user screenshots the page.

---

## 8. Why Refresh Fixes It

| Resource | First load (cold) | Refresh (warm) |
|---|---|---|
| JS/CSS bundle | Full download — 5–10 s on slow mobile | Served from WebView cache — ~instant |
| Banner API response | Cold TCP + TLS + HTTP roundtrip | Connection reused; may be cached |
| Banner images | Cold download, `opacity:0` while loading | May be in WebView image cache |
| Event images | Cold download, all queued | May be in WebView image cache |
| DNS for API host | Cold lookup | Already resolved |

The JS bundle cache elimination is the dominant factor. Once the bundle is cached, React mounts in ~200 ms instead of 5–10 s, and all API calls and image fetches start seconds sooner.

---

## 9. Ranked Root Causes

| # | Root Cause | Impact |
|---|---|---|
| 1 | No route-level code splitting — full bundle ships on cold load | **High** — blank screen for 5–10 s before any content |
| 2 | Hero image chain: Banner API → URL set → image fetch → 1.5 s fallback | **High** — hero invisible for 4–15 s even if JS is fast |
| 3 | WhatsApp WebView cache isolation — first-ever load always cold | **High** — removes any benefit of prior browser visits |
| 4 | No `<link rel="preconnect">` / `<link rel="preload">` hints in `index.html` | **Medium** — delays all cross-origin requests by extra DNS + TCP roundtrip |
| 5 | All page components eagerly bundled | **Medium** — contributes to large bundle size (overlaps #1) |
| 6 | Banner API cold-start latency (PHP/Slim server) | **Low** — possible if server has inactivity cold-start |

---

## 10. File References

| File | Role | Relevant lines |
|---|---|---|
| `frontend/src/App.tsx` | All routes eagerly imported, no `React.lazy()` | 6–35 |
| `frontend/index.html` | SPA shell — no preconnect/preload hints | — |
| `frontend/src/components/home/Hero.tsx` | Banner fetch → image URL chain → 1.5 s fallback | 44–85 |
| `frontend/src/services/bannersService.ts` | Banner API call via `customerApiClient` | 13–30 |
| `frontend/src/hooks/useSiteBranding.ts` | Additional cross-origin call at mount | — |
| `frontend/vite.config.ts` | Manual chunks (vendor + stripe only) — no route chunks | — |

---

*Analysis only. No code changes were made.*
