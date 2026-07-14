# Hero Slider — Root Cause Analysis

**Date:** 1 July 2026
**Prepared By:** Claude Code (automated codebase analysis)
**Component:** `frontend/src/components/home/Hero.tsx`
**Status:** Diagnosis complete — fixes pending

---

## Observed Issue

The hero section consistently shows a dark `#1a2332` background before any image appears. Some slides never show their image. On mobile the degradation is worse and more frequent. The screenshot confirms the fallback static state ("Exciting Sports Events") is being shown in production, which means either the API failed or images returned `opacity:0` and were never revealed.

---

## Likely Causes

---

### 1. Double sequential waterfall before any pixel of image is visible

**Confidence: Critical**

The image URL is unknown until the API responds. The load sequence is:

```
Browser parses HTML
→ Downloads + executes React bundle
→ React mounts Hero
→ useEffect fires → fetch('/api/v1/banners/homepage_hero')
→ API responds → setBanners() → re-render
→ <img src={imageUrl}> appears in DOM for the first time
→ Browser starts downloading the image
→ onLoad fires → opacity: 0 → 1
```

Every single step is sequential. The hero image download cannot start until the API round-trip completes. On a mobile connection at 50–100 ms RTT, even a fast API adds 200–400 ms before the image download begins. `index.html` has no `<link rel="preload">` for any banner image because the URL isn't known at HTML parse time — so the browser's preload scanner is entirely useless here.

**Evidence:** `bannersService.getHomepageHeroBanners()` inside `useEffect` (Hero.tsx:25–44). `index.html` has no preload hints. The `<img>` element does not exist in the DOM during the loading state — it only appears after `setLoading(false)` and `setBanners(data)` both complete.

---

### 2. `opacity: 0` with a 4-second hard timeout is the direct cause of the "container without image" symptom

**Confidence: Critical**

```tsx
style={{ opacity: isImageReady ? 1 : 0, transition: 'opacity 0.4s ease' }}
```

Every new slide starts invisible. The image is present in the DOM but the user sees only the dark background gradient (`#1a2332`) until `onLoad` fires. If the image stalls — slow connection, origin server under load, DNS delay — it stays invisible for a full 4 seconds before the fallback timer forces it visible. The auto-slide timer runs independently at 5 seconds, so it is possible to transition from slide 1 (still loading, invisible) to slide 2 (also loading, also invisible), producing an entirely dark hero for the first 10 seconds of page load.

**Evidence:** `fadeTimerRef` timeout of `4000` ms (Hero.tsx:71–73). Auto-slide interval is `5000` ms (Hero.tsx:83). These timers are not coordinated.

---

### 3. No `fetchpriority="high"` and no `loading` hint on the hero image

**Confidence: High**

```tsx
<img
  key={imageUrl}
  src={imageUrl}
  alt={currentBanner.title}
  className={styles.heroImage}
  onLoad={handleImageLoad}
  onError={handleImageError}
  style={{ opacity: isImageReady ? 1 : 0, ... }}
/>
```

No `fetchpriority`, no `loading` attribute. Since this image is added to the DOM dynamically (post-API), the browser's preload scanner has no opportunity to discover it early. Even once the element exists, without `fetchpriority="high"` it competes with all other in-flight resources at default priority. In a React SPA with a large JS bundle, the bundle itself has already consumed high-priority bandwidth by the time this image is requested.

**Evidence:** Hero.tsx:168–176. No `fetchpriority` or `loading` attributes present anywhere in the file.

---

### 4. Images are served from the PHP API origin server — no CDN

**Confidence: High**

Banner images are stored at `/var/www/api/public/images/banners/` and the public URL is built as `APP_URL + '/images/banners/' + filename` (BannersService.php:304, Application.php:562–563). Every image request hits the same PHP/Nginx origin. There is no CDN layer, no edge caching, no geographic distribution. A user in London hitting a server in UAE adds 80–120 ms of latency *per image*, on top of the API call latency.

**Evidence:** `BannersService.php:39–40` — default `$baseUrl = 'https://apix2.redberries.ae/images/banners'`. `Application.php:562–563` — `$this->config->getAppUrl() . '/images/banners'`. No CDN origin or CloudFront/Cloudflare URL patterns anywhere in the codebase.

---

### 5. No HTTP cache headers on the `/banners/{location}` API response

**Confidence: High**

`BannersController.getPublicBanners()` builds the JSON response with no `Cache-Control`, `Expires`, or `ETag` headers. This means every page load triggers a fresh API round-trip. Browsers cannot cache the banner list between navigations. Even 60 seconds of client-side caching (`Cache-Control: public, max-age=60`) would eliminate this network hit for returning visitors.

**Evidence:** Searched `BannersController.php` for `Cache-Control|Expires|ETag|Last-Modified` — zero matches.

---

### 6. `key={imageUrl}` destroys and recreates the `<img>` element on every slide change

**Confidence: High**

```tsx
<img key={imageUrl} src={imageUrl} ... />
```

`key={imageUrl}` forces React to unmount and remount the element when the slide changes. This means:
- Each transition creates a brand new `<img>` DOM element
- `opacity` resets to `0` immediately
- A new image fetch (or cache lookup + decode) must complete before the slide is visible
- The `loadedUrls` Set mitigates this for URLs already downloaded, but on first-load each slide goes through its own invisible loading period

A better pattern is a single `<img>` element with `src` swapped in place, or pre-rendered hidden slides with CSS transitions.

**Evidence:** Hero.tsx:169 — `key={imageUrl}`.

---

### 7. Auto-slide timer is not coordinated with first image load

**Confidence: Medium**

```tsx
useEffect(() => {
  if (banners.length <= 1) return;
  const interval = setInterval(() => {
    setCurrentSlide((prev) => (prev + 1) % banners.length);
  }, 5000);
  return () => clearInterval(interval);
}, [banners.length]);
```

The 5-second auto-advance starts the moment `banners` is populated — not when the first image is visible. On a slow connection: API responds at t=0, image still loading at t=3s (opacity:0), auto-advance fires at t=5s (slides forward with new invisible image, old image never shown). This is the most visible symptom for users on mobile or slow connections.

**Evidence:** Hero.tsx:80–88. No dependency on `isImageReady` or `loadedUrls` in the interval effect.

---

### 8. Next-slide images are never preloaded

**Confidence: Medium**

The component only loads an image when `currentSlide` advances and the `<img key={imageUrl}>` gets a new URL. The image for slide N+1 doesn't start downloading until the timer fires. With a 240 KB WebP from an uncached origin server, that download will take 200–800 ms on a mobile connection — ensuring every slide transition produces a blank slide.

**Evidence:** No `<link rel="preload">` injection, no hidden `<img>` elements for upcoming slides, no `Image()` preloading in the useEffect chain.

---

### 9. `mobile_image_url` is always identical to `image_url` — mobile users download desktop images

**Confidence: Medium**

```php
// BannersService.php:312–313
'image_url' => $imageUrl,
'mobile_image_url' => $imageUrl   // same file, always
```

The upload handler sets both fields to the same value. The `Banner` type has `mobile_image_url: string | null` and the frontend correctly checks `isMobile && b?.mobile_image_url`, but since both URLs point to the same full-size image, mobile users download a full desktop-sized WebP. No `srcset` or `<picture>` element is used for responsive delivery.

**Evidence:** BannersService.php:310–313. Hero.tsx:62–64.

---

### 10. `normalizeImageUrl` can silently produce wrong URLs

**Confidence: Low-to-medium**

```php
$marker = '/images/banners/';
$pos = strpos($path, $marker);
if ($pos === false) {
    return $storedUrl; // unexpected format — leave as-is
}
return rtrim($this->baseUrl, '/') . '/' . $relativePart;
```

If a banner `image_url` in the database doesn't contain `/images/banners/` (e.g. a manually entered external URL or a path from an old deployment), `normalizeImageUrl` silently returns the original stored URL. That URL may point to a decommissioned server, a wrong hostname, or a dev environment. The result is a broken `<img src>` that fires `onError`, marks itself as "loaded" (Hero.tsx:161–162), and shows just the dark background — which looks identical to a slow-loading image to the user.

**Evidence:** BannersService.php:395–407. Hero.tsx:159–163 — `onError` marks the image as "ready" rather than entering a distinct broken-image state.

---

## Impact Summary

| Issue | Visible Effect | Devices Most Affected |
|---|---|---|
| Double waterfall | Long blank/skeleton before any image | All, worse on mobile |
| `opacity:0` before load | Dark background visible for seconds | All |
| No `fetchpriority` | Image deprioritized behind JS/CSS | All |
| No CDN | 100–200 ms added TTFB per image | Users far from origin |
| No API cache headers | API re-fetched on every page load | All |
| `key={imageUrl}` remount | Flash of dark on every slide transition | All |
| Timer not coordinated with load | Slides advance before first image visible | Slow connections, mobile |
| No next-slide preload | Every transition shows dark background | All |
| Same image for mobile | Mobile downloads desktop-size file | Mobile only |
| Silent URL rebasing failure | Broken images show as permanent dark slides | All |

---

## Frontend vs Backend vs Delivery

- **Frontend (primary):** The `opacity:0` pattern, missing `fetchpriority`, `key={imageUrl}` remounting, uncoordinated auto-slide timer, and no next-slide preloading are all fixable in `Hero.tsx` without any backend changes.
- **Backend/API (secondary):** Missing `Cache-Control` headers on the banners API response. The `normalizeImageUrl` silent fallback.
- **Asset delivery (compounding):** No CDN. Images served from the PHP origin on every request.

---

## Refactor Verdict

**A full rewrite is not required. Targeted changes to `Hero.tsx` address the majority of symptoms.**

The architecture (API-driven banners, WebP, `<img>` tag, CSS overlay) is sound. The problems are in loading orchestration, not structure. The most impactful fixes are surgical changes to the existing component.

---

## Recommended Plan

### P1 — Coordinate auto-slide timer with first image load *(Hero.tsx — immediate)*

Start the auto-slide interval only after `isImageReady` is true for the first slide. Add a `firstImageReady` ref and gate the interval on it. Reduce the 4-second fallback timeout to 1.5 seconds. This alone eliminates the "blank slide" symptom on the majority of connections.

### P2 — Preload the next slide's image *(Hero.tsx — immediate)*

Use a `useEffect` that fires when `currentSlide` or `banners` changes and creates a `new Image()` for `banners[(currentSlide + 1) % banners.length]`. The browser caches it; by the time the timer fires the next image is already decoded and in memory.

### P3 — Replace `key={imageUrl}` with a cross-fade transition *(Hero.tsx — short term)*

Replace the single `<img key={imageUrl}>` with two absolutely-positioned `<img>` elements (outgoing + incoming) that cross-fade with CSS opacity. This eliminates the remount-induced opacity flash on every transition and produces a smooth visual handoff.

### P4 — Add `fetchpriority="high"` to the active slide image *(Hero.tsx — trivial)*

Add `fetchpriority="high"` and `loading="eager"` to the visible `<img>`. Even though the URL is unknown at HTML parse time, these attributes elevate the image in the browser's request queue once the element is inserted.

### P5 — Cache the `/banners/homepage_hero` API response *(BannersController.php — short term)*

Add `Cache-Control: public, max-age=300, stale-while-revalidate=60` to the JSON response. Repeat visitors will not hit the API at all for 5 minutes.

### P6 — CDN for banner images *(infrastructure — medium term)*

Put Cloudflare in front of `api.rondosportstickets.com`. Static assets under `/images/banners/*` will be cached at the edge with a single page rule. For a global audience this is the single highest-leverage infrastructure change for image load time — reducing TTFB from 300–800 ms to 20–50 ms.

### P7 — Responsive images for mobile *(BannersService.php + Hero.tsx — medium term)*

Generate and store a true mobile variant (≤800px wide) at upload time using server-side image resizing. Update `Hero.tsx` to use a `<picture>` element with `<source media="(max-width: 767px)" srcset="...">` so mobile users download a proportionate file rather than the full desktop image.

### P8 — Fix `onError` to distinguish broken images from slow loads *(Hero.tsx — trivial)*

`onError` currently marks the image as "ready", making broken images invisible with no indicator. It should set a distinct `brokenUrls` state so broken banners render a placeholder, and so they are distinguishable during debugging from slow-loading images.

---

## CDN Note

Yes, CDN would materially improve the issue. Currently every image request traverses the full internet path to the origin server. With Cloudflare (free tier) or CloudFront, the first visitor from a region warms the edge cache; every subsequent visitor in that region gets the image from a POP ≤30 ms away. For 240 KB WebP files, this reduces TTFB from ~300–800 ms to ~20–50 ms — a 10–20× improvement in perceived image load speed that no amount of frontend optimisation can match.

---

## Risky Patterns to Fix Immediately

1. **Auto-slide advancing before first image is visible** — users see a dark hero for the full first 5-second interval on slow connections.
2. **4-second `opacity:0` fallback** — too long; should be 1.5 seconds maximum.
3. **`onError` marking broken images as "ready"** — silent failures are indistinguishable from slow loads; a broken banner shows as a permanent dark background.
4. **`normalizeImageUrl` silent passthrough** — a banner with an unreachable URL fails silently and shows as a dark slide, with no log entry or admin-facing alert.

---

*Analysis generated by automated codebase review against live screenshot evidence.*
*Files inspected: `Hero.tsx`, `Hero.module.css`, `bannersService.ts`, `banners.ts`, `BannersController.php`, `BannersService.php`, `BannersRepository.php`, `Application.php`, `index.html`*
