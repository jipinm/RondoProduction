# Hero Images — Production Performance Root Cause Analysis

**Date:** 2026-07-04  
**Scope:** Root cause analysis of slow Hero Slider image loading on the **live production website** (https://rondosportstickets.com). Images are already WebP and optimised — this analysis focuses on production server, network, and delivery bottlenecks. No code changes made.

---

## 1. Measured Timings (curl against live production endpoints)

### Connection overhead to `api.rondosportstickets.com`

| Phase | Time | Notes |
|---|---|---|
| DNS lookup | ~15–30 ms | Fast — not a bottleneck |
| TCP connect | **~320 ms** | One RTT to the server |
| TLS handshake | **~310 ms additional** | One additional RTT (TLS 1.3) |
| **Total cold connection** | **~630 ms** | Paid on every fresh TCP connection |

### Banner API call — `GET /api/v1/banners/homepage_hero`

| Phase | Time |
|---|---|
| Cold TCP+TLS | 629 ms |
| Server processing after connect | **~928 ms** |
| **Total TTFB** | **1,557 ms** |
| Response body (2,357 bytes JSON) | ~1 ms |

### First hero banner image — `banner_6a3a796ac10c0_1782217066.webp` (510 KB WebP)

| Scenario | TTFB | Body download | Total |
|---|---|---|---|
| Cold connection (first visit) | **944 ms** | ~1.5 s | **~2.4 s** |
| Reused connection (Keep-Alive, same session) | **283 ms** | ~0.3 s | **~0.6 s** |

### Frontend HTML — `rondosportstickets.com/`

| Phase | Time |
|---|---|
| TCP+TLS | 613 ms |
| TTFB | **909 ms** |
| Total (906-byte HTML) | **~910 ms** |
| HTTP version | **1.1 (NOT HTTP/2)** |

---

## 2. Root Cause 1 (Primary): Banner API Server Processing Time ~928 ms

The banner API response takes ~928 ms of pure server-side time after the TCP+TLS connection is established — for a query that returns 5 rows from a `banners` table. A properly-configured PHP+MySQL server serves this type of query in under 30 ms.

Evidence: `curl` timing shows TTFB of 1,557 ms. Subtracting 629 ms of connection overhead leaves **928 ms of server processing time**.

This is the dominant bottleneck in the Hero loading chain. The Hero component cannot begin fetching the image until the API responds with the image URL. Even with the `<link rel="preconnect">` fix already deployed (which eliminates the 630 ms connection cost), this 928 ms server processing time remains.

Likely causes on this server:
- **Shared hosting CPU/memory contention** — confirmed cPanel environment (`api/public/.user.ini`)
- **Cold PHP-FPM workers** — PHP process re-initialises on each request if no persistent workers are kept warm
- **No OPcache** — PHP re-compiles application files on each request
- **New database connection per request** — PDO with no connection pooling, requiring fresh MySQL auth on each API call

---

## 3. Root Cause 2 (Primary): No CDN — Every Request Hits the Origin Server

No CDN headers are present on any production response:

```
Server: Apache
# Missing: CF-Ray, X-Cache, Via, Age, CDN-Cache, X-Served-By, X-CDN
```

Both production domains are unproxied:
- `rondosportstickets.com` — direct Apache
- `api.rondosportstickets.com` — direct Apache

Without a CDN:
- Every user worldwide connects to the same physical server for every request
- The banner API's `Cache-Control: public, max-age=300` only caches in the requesting user's browser — other users still hit origin
- Images have no shared cache — each unique device downloads from origin
- The ~928 ms server processing time is paid by every user on every page load

**With a CDN:** The banner API's `max-age=300` (5 minutes) causes CDN edge nodes to cache the JSON and serve it to all users in that region without touching origin. The ~928 ms drops to ~10–30 ms for ~99% of requests. The image TTFB likewise drops from 283–944 ms to ~10–30 ms.

---

## 4. Root Cause 3 (Significant): HTTP/1.1 Only — No HTTP/2

All production endpoints respond on **HTTP/1.1**, confirmed by protocol negotiation:

```
HTTP version: 1.1  (all endpoints)
```

The `Upgrade: h2,h2c` header visible in responses advertises cleartext HTTP/2 (h2c over plain HTTP). This is **not** the same as HTTP/2 over TLS. HTTP/2 over HTTPS requires ALPN advertisement during the TLS handshake. The server does not do this, so browsers negotiate HTTP/1.1.

**Impact without HTTP/2:**
- No request multiplexing — JS bundle, CSS, banner API, and images must queue across parallel connections
- Each new TCP connection costs 630 ms (TCP+TLS)
- The preconnect fix covers `api.rondosportstickets.com` but not other origins

Note: A CDN (Cloudflare, etc.) automatically provides HTTP/2 and HTTP/3 to browsers regardless of the origin protocol — fixing this at the CDN layer requires no server changes.

---

## 5. Root Cause 4 (Significant): `Vary: User-Agent` Prevents CDN Caching

Every response carries a `Vary: User-Agent` header:

```
# Images:
Vary: Accept-Encoding,User-Agent

# Banner API:
Vary: User-Agent
```

The `User-Agent` field in `Vary` instructs every cache layer to store **separate cache entries for each unique User-Agent string**. There are thousands of unique User-Agents in production (each browser version on each OS is a different string).

**Consequence:** If a CDN is deployed without removing this header, CDN caching will be near-useless. Chrome 125 on Android, Chrome 126 on Android, Safari on iOS 17.4, Safari on iOS 17.5 — each generates an independent cache miss back to origin. The CDN's cache hit rate on images and the API will approach zero.

This header **must be removed** before deploying a CDN, or the CDN provides no benefit.

`Vary: User-Agent` should not be on image responses or JSON API responses. It is only appropriate for responses where the content genuinely differs per User-Agent (e.g., serving WebP vs JPEG based on the User-Agent). Since all images are already WebP and the API returns the same JSON regardless of client, this header is incorrect and harmful.

---

## 6. Root Cause 5 (Significant): Sequential Loading Chain — No Preload Possible

The Hero image cannot start loading until the banner API responds. The sequence is unavoidable with the current architecture:

```
<link rel="preconnect"> fires early (connection pre-warmed)
  → React mounts → Hero component fires banner API request
    → ~928ms server processing → API responds
      → imageUrl state set → <img src="..."> renders
        → Image request sent (reused connection)
          → ~283ms server latency + ~300ms download
            → onLoad fires → opacity: 1 → image visible
```

**Minimum time from React mount to visible image (with preconnect fix):**
928ms (API) + 283ms (image TTFB) + ~300ms (download) = **~1.5 seconds**

There is no `<link rel="preload">` possible in `index.html` for the hero image — the URL comes from the database at request time and is not known at build time.

With a CDN caching the banner API response, the chain becomes:
~15ms (CDN edge API) + 15ms (CDN edge image) + ~300ms (download) = **~330ms**

---

## 7. Root Cause 6 (Contributing): Static Image Server Latency is 283 ms

A static WebP file served by Apache should have a TTFB of under 10 ms once a connection is established. The measured 283 ms for static file serving indicates the origin server is under significant CPU or I/O load — consistent with shared cPanel hosting where resources are contended between multiple tenants.

---

## 8. Root Cause 7 (Contributing): Mobile Receives Same 510 KB WebP as Desktop

From the live production API response, `image_url` and `mobile_image_url` are still identical:

```json
"image_url":        "https://api.rondosportstickets.com/images/banners/banner_6a3a796ac10c0_1782217066.webp",
"mobile_image_url": "https://api.rondosportstickets.com/images/banners/banner_6a3a796ac10c0_1782217066.webp"
```

A 375px mobile screen needs a hero image of roughly 375×450px. The current 510 KB WebP is almost certainly a wide desktop-format image (1,400px+). A correctly-sized mobile WebP would be 40–80 KB — a **6–12× saving** for mobile users who are already on slower connections.

---

## 9. CDN Evaluation (Production-Specific)

| Question | Answer |
|---|---|
| Is a CDN recommended? | **Yes — the single highest-impact fix available** |
| Would CDN alone resolve the slow loading? | **Mostly yes.** The root cause is server TTFB (928ms), not image size or bandwidth |
| How much improvement on the API? | ~928ms → ~10–30ms from CDN edge cache (~97% reduction) |
| How much improvement on images? | ~283–944ms TTFB → ~10–30ms from CDN edge |
| Is image format or size the problem? | **No.** At 510KB WebP the format is fine; latency dominates over download time |
| What must be done **before** CDN? | **Remove `Vary: User-Agent`** from all responses — otherwise CDN cache hit rate ≈ 0% |
| Does HTTP/2 need fixing separately? | No — CDN providers automatically deliver HTTP/2/HTTP/3 to browsers, even with an HTTP/1.1 origin |
| Which CDN? | Cloudflare free tier covers both domains, provides HTTP/2+HTTP/3, global edge, and DDoS protection |

---

## 10. Ranked Fixes (Production-Specific, by Impact)

| Priority | Fix | Where | Expected improvement |
|---|---|---|---|
| **1** | Remove `Vary: User-Agent` from image serving and API responses | `api/public/images/banners/.htaccess` + `BannersController.php` | Prerequisite — unlocks CDN caching |
| **2** | Deploy Cloudflare (free tier) in front of both domains | DNS change (A record → Cloudflare proxy) | API TTFB: 928ms → ~15ms; Image TTFB: ~15ms; HTTP/2+3 enabled automatically |
| **3** | Enable PHP OPcache on the origin server | cPanel → PHP settings | Reduces origin processing time for CDN cache misses |
| **4** | Confirm gzip/Brotli on API JSON responses | `BannersController.php` + server config | Small improvement on API response body |
| **5** | Generate separate mobile-sized images (smaller WebP crop) | `BannersService::uploadBannerImage()` | Saves 430–470 KB per mobile page load |

---

## 11. Expected Outcome After Priorities 1 + 2

| Metric | Current | After CDN + Vary fix |
|---|---|---|
| Banner API TTFB (typical user) | ~1,557 ms | ~15–30 ms (CDN edge cache) |
| First hero image TTFB | ~283–944 ms | ~15–30 ms (CDN edge) |
| Total: React mount → image visible | **~1.5–2.5 s** | **~300–500 ms** |
| Repeat visitor (warm CDN edge) | ~1.5 s | **~100–200 ms** |
| Mobile user on 4G | ~3–4 s | **~400–600 ms** |

---

## 12. Key Response Headers (Production Evidence)

```
# Hero banner image
HTTP/1.1 200 OK
Server: Apache
Cache-Control: max-age=2592000          ← 30 days, but no `immutable`
Vary: Accept-Encoding,User-Agent        ← USER-AGENT breaks CDN caching
Content-Length: 522296                  ← 510 KB
Content-Type: image/webp
Last-Modified: Wed, 01 Jul 2026 ...
# No: CF-Ray, X-Cache, Via, Age        ← No CDN confirmed

# Banner API endpoint
HTTP/1.1 200 OK
Server: Apache
Cache-Control: public, max-age=300, stale-while-revalidate=60
Vary: User-Agent                        ← USER-AGENT breaks CDN caching
Content-Type: application/json
# No: Content-Encoding                 ← Likely no gzip on JSON
```

---

*Analysis only. No code changes were made.*
