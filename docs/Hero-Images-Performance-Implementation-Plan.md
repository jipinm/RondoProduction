# Hero Image Performance — Implementation Roadmap

**Status:** Planning only. No code changes in this document.
**Source analysis:** [`Hero-Images-Production-Performance-Analysis.md`](Hero-Images-Production-Performance-Analysis.md)
**Scope:** `rondosportstickets.com` (frontend, Apache + static build) and `api.rondosportstickets.com` (PHP/Slim API, Apache, cPanel).

---

## 0. Current-State Baseline (from codebase review)

Recorded here so later phases don't re-litigate what already exists.

| Area | Current state | File |
|---|---|---|
| `Vary: User-Agent` on images + API + frontend HTML | **Fixed in-repo, NOT yet deployed to production** — confirmed 2026-07-14 via live `curl` against `rondosportstickets.com`, the banner API, and the banner image: all three still return `Vary: Accept-Encoding,User-Agent`. `mod_headers` "edit" rules exist locally to strip `User-Agent` while preserving `Accept-Encoding`/`Origin`, but the edited `.htaccess` files have never been pushed to the live cPanel server. **This is now urgent** — Cloudflare is live (Phase 2 done) and already auto-caching the banner image by default (`Cf-Cache-Status: MISS` observed), so the undeployed fix is actively fragmenting cache in production right now. | [`api/public/.htaccess`](../api/public/.htaccess), [`api/public/images/banners/.htaccess`](../api/public/images/banners/.htaccess), [`frontend/public/.htaccess`](../frontend/public/.htaccess) |
| Image gzip/deflate | **Already removed** — `SetOutputFilter DEFLATE` on `jpg/png/gif/webp` deleted (was wasting CPU on pre-compressed formats) | [`api/public/images/banners/.htaccess`](../api/public/images/banners/.htaccess) |
| Image cache header | **Already set** to `public, max-age=2592000, immutable` (safe: uploads always get a unique filename, see `BannersService::generateUniqueFilename`) | [`api/public/images/banners/.htaccess`](../api/public/images/banners/.htaccess) |
| `<link rel="preconnect">` to API origin | Already present | [`frontend/index.html:10-11`](../frontend/index.html) |
| Hero loading logic | Already has: fetchPriority="high", loading="eager", 800ms fallback-reveal timer, cross-fade base/active layers, **next-slide preload** (P2), broken-image tracking (P8) | [`frontend/src/components/home/Hero.tsx`](../frontend/src/components/home/Hero.tsx) |
| Mobile image | **Not yet fixed** — `image_url` and `mobile_image_url` are identical (same 510KB desktop WebP served to mobile) | `BannersService::uploadBannerImage()` |
| CDN | **Not deployed** — both domains hit Apache origin directly, no CF-Ray/X-Cache headers | DNS |
| OPcache | **Not confirmed enabled** | cPanel PHP config |
| HTTP/2 over TLS | **Not enabled** at origin (ALPN not negotiated) | Apache/cPanel TLS config |

This means **Priority 1 (Vary header) from the original analysis is done**. The remaining roadmap starts from Priority 2 (CDN) as the highest-leverage remaining item, and folds in the two items the codebase review surfaced as still open (mobile image sizing, OPcache/HTTP2 confirmation).

---

## Phase 1 — Pre-CDN Verification (prerequisite gate)

Goal: confirm the groundwork the CDN depends on is actually correct in production before touching DNS.

1.1. **[BLOCKING — confirmed still outstanding as of 2026-07-14]** Deploy the current `.htaccess` changes (Vary strip, immutable cache, deflate removal) to production — verified via live `curl` that they are not live yet on any of the three affected files (`api/public/.htaccess`, `api/public/images/banners/.htaccess`, `frontend/public/.htaccess`). This repo has no CI/CD deploy step observed (see `frontend/dist.zip`/`admin/dist.zip` in git status, suggesting manual zip-and-upload via cPanel File Manager or FTP) — deployment must be done manually on the cPanel side; it cannot be performed from this environment.
1.2. Run `curl -sI` against the live banner image URL and the `GET /api/v1/banners/homepage_hero` endpoint; confirm `Vary` no longer contains `User-Agent` and `Cache-Control` on images includes `immutable`.
1.3. Confirm `Cache-Control: public, max-age=300, stale-while-revalidate=60` is still present unchanged on the banner API (this is what CDN edge caching will key off in Phase 3).
1.4. Grep the codebase for any other endpoints reusing `Vary: User-Agent` semantics or the removed deflate pattern (other `.htaccess` files, other controllers) so the CDN isn't deployed with a hidden cache-buster elsewhere. Check in particular: `frontend/public/.htaccess`, `admin/` static assets, and any other `Controller` classes that set `Cache-Control`/`Vary`.
1.5. Confirm no authenticated/admin routes are unintentionally cacheable — the banner API's public endpoint (`getPublicBanners`) is the only one intended for edge caching; admin endpoints (`getBanners`, `getBanner`, create/update/delete) must never be cached by a shared CDN cache. Document which route patterns must be marked "bypass cache" in Phase 3.

**Validation:** header inspection only, no functional test needed yet — this phase is a config audit.
**Rollback:** N/A (read-only verification phase).

---

## Phase 2 — Cloudflare Account & DNS Setup

Goal: get both domains behind Cloudflare without changing what origin serves.

2.1. Create (or confirm existing) Cloudflare account tied to the domain registrar/DNS access for `rondosportstickets.com`.
2.2. Add `rondosportstickets.com` as a site in Cloudflare (free plan is sufficient per the analysis).
2.3. Let Cloudflare auto-scan existing DNS records; manually verify against current authoritative DNS (registrar or current host) so nothing is missed — in particular:
   - `A`/`AAAA` record for `rondosportstickets.com` (frontend)
   - `A`/`AAAA` (or `CNAME`) record for `api.rondosportstickets.com` (API)
   - Any `MX`, `TXT` (SPF/DKIM/DMARC), or other subdomain records currently in use — these must be preserved exactly, just not proxied.
2.4. Set proxy status ("orange cloud") **ON** for both `rondosportstickets.com` and `api.rondosportstickets.com`. Leave mail-related records (MX, and any TXT/CNAME used for email auth) **DNS-only (grey cloud)** — proxying non-HTTP records breaks them.
2.5. At the registrar, change nameservers to the two Cloudflare-assigned nameservers.
2.6. Wait for nameserver propagation (Cloudflare dashboard shows "Active" status; can take minutes to ~24h).
2.7. **Do not proceed to Phase 3 cache rules until propagation is confirmed** — verify with `dig NS rondosportstickets.com` (or equivalent) showing Cloudflare nameservers globally.

**Validation:** Site loads identically through Cloudflare with proxy on (compare page content/functionality against pre-Cloudflare baseline — nothing should visibly change yet since no caching rules are active).
**Rollback:** Cloudflare dashboard → toggle proxy to DNS-only (grey cloud) instantly reverts to direct-to-origin traffic without a nameserver change. Keep the original DNS records noted in 2.3 so a full revert (nameservers back to original host) is possible if Cloudflare setup goes wrong.

---

## Phase 3 — SSL/TLS, HTTP/2/3, and Compression Configuration

Goal: get the protocol-level wins (HTTP/2, HTTP/3, Brotli) that require no origin changes.

3.1. **SSL/TLS mode:** Set to **Full (Strict)** if the origin has a valid cert (recommended — verifies origin cert too), or **Full** if origin cert is self-signed/expiring. Never use "Flexible" (would break `Upgrade: h2,h2c`/API auth flows relying on end-to-end HTTPS). Confirm origin cert validity first (`openssl s_client` or cPanel SSL status) before choosing Strict.
3.2. Enable **"Always Use HTTPS"** (redirect HTTP→HTTPS at edge).
3.3. Set **Minimum TLS Version** to 1.2 (matches current TLS 1.3 origin capability without breaking older clients unnecessarily).
3.4. Enable **HTTP/2** (on by default for proxied domains).
3.5. Enable **HTTP/3 (with QUIC)** — Network settings tab.
3.6. Enable **0-RTT Connection Resumption** (optional, minor latency win for repeat visitors).
3.7. **Brotli** compression — no dashboard action needed. Cloudflare has enabled Brotli by default for all proxied zones (including free plan) for years; there's no manual toggle anymore. Verify it's active post-cutover with `curl -sI -H "Accept-Encoding: br" https://rondosportstickets.com | grep -i content-encoding` — expect `Content-Encoding: br`.
3.8. Evaluate **Early Hints** (Speed → Optimization): generates a `103 Early Hints` response so the browser can start fetching preconnect/preload resources while Cloudflare waits on the origin response. Turn on if available on the plan; low risk, asks Cloudflare to learn from observed `Link` headers, none currently set by the app so limited effect until Phase 6's preload work — worth enabling now, more useful once real `<link rel=preload>` headers exist.
3.9. **Do not enable "Rocket Loader"** — it defers/rewrites `<script>` tags and can break React hydration/module script order; explicitly leave off.

**Validation:** `curl -sI` against both domains shows `cf-ray` header present, `HTTP/2` or `HTTP/3` negotiated (verify via browser DevTools → Network → Protocol column), TLS handshake succeeds, and existing checkout/booking/login flows (anything hitting `api.rondosportstickets.com` with auth headers) still work — this is the point most likely to surface a regression if SSL mode is misconfigured, so manually exercise login and a booking flow here.
**Rollback:** Each of these is a toggle in the Cloudflare dashboard; revert individually. If TLS mode change breaks API auth, drop back to previous mode immediately (symptom: 526/525 errors or handshake failures in browser console).

---

## Phase 4 — Caching Strategy (Cache Rules) and Image Optimization

Goal: this is the phase that actually delivers the 928ms → ~15ms improvement — everything before it is prerequisite plumbing.

4.1. **Caching level:** Speed/Caching → set Browser Cache TTL to "Respect Existing Headers" (so origin's `Cache-Control: max-age=2592000, immutable` on images and `max-age=300` on the banner API are honored, not overridden).
4.2. **Cache Rules** (Cloudflare's modern replacement for Page Rules — use these, not legacy Page Rules, unless plan requires otherwise):

   **Where to find it:** dashboard nav has been reorganized on this account (confirmed during Phase 3 setup — classic "Speed"/"Network" tabs weren't where expected). Don't hunt through the sidebar — use the **Quick Search** box at the top (`Ctrl K`) and type `Cache Rules`; it will jump you straight to the right page regardless of which top-level section it's currently filed under (historically "Caching" → "Cache Rules", may now be under a consolidated "Rules" section).

   **General steps, repeated for each rule below:**
   1. On the Cache Rules page, click **Create rule** (or **+ Add rule** if one already exists).
   2. Give it the name shown in bold below (e.g. "Banner API caching") — names are just for your own reference in the rule list.
   3. Under "When incoming requests match…", switch to **Edit expression** (a small link/toggle near the visual field-picker) and paste the exact expression given below — this avoids ambiguity from the visual dropdown builder, which uses different field names across dashboard versions.
   4. Under "Then...", set the fields listed below for that rule.
   5. Click **Deploy** (not just Save — unsaved/undeployed rules don't take effect).

   **Rule A — Banner API caching:**
   - Expression:
     ```
     (http.host eq "api.rondosportstickets.com" and starts_with(http.request.uri.path, "/api/v1/banners/") and http.request.method eq "GET")
     ```
     (`GET`-only by design — this matches `getPublicBanners`'s route, `GET /api/v1/banners/{location}`, defined at `Application.php:851-855`, and deliberately excludes the `POST /api/v1/banners/{id}/click` and `POST /api/v1/banners/{id}/impression` tracking routes on the same prefix, which must never be cached.)
   - Cache eligibility: **Eligible for cache**
   - Edge TTL: choose the option that **respects/uses the origin's `Cache-Control` header** (do not enter a fixed override value) — this defers to the existing `max-age=300, stale-while-revalidate=60` already set in `BannersController::getPublicBanners()` (api/src/Controller/BannersController.php:507).
   - Browser TTL: same — respect origin header, don't override.

   **Rule B — Banner images:**
   - Expression:
     ```
     (http.host eq "api.rondosportstickets.com" and starts_with(http.request.uri.path, "/images/banners/"))
     ```
   - Cache eligibility: **Eligible for cache**
   - Edge TTL: respect origin header (picks up the `public, max-age=2592000, immutable` set in `api/public/images/banners/.htaccess` once that file is deployed — see Phase 1.1).
   - Note: Cloudflare's default cache behavior already auto-caches common image extensions like `.webp` even without this rule (confirmed via live `curl` showing `Cf-Cache-Status: MISS`, i.e. cache-eligible, on the banner image before this rule existed) — Rule B isn't strictly required for the image to be cached at all, but makes the `immutable` TTL intent explicit and guarantees the behavior isn't dependent on Cloudflare's default extension list.

   **Rule C — Explicit bypass for admin/auth routes (safety net):**
   - Expression:
     ```
     (http.host eq "api.rondosportstickets.com" and (starts_with(http.request.uri.path, "/admin/") or starts_with(http.request.uri.path, "/auth/")))
     ```
     (`/admin/*` covers every admin-only route registered in `Application.php:369-768` — dashboard, reports, banners CRUD, users, etc., all behind `AuthMiddleware`. `/auth/*` covers login/refresh/logout/me — `Application.php:276-299` — separately, since it isn't nested under `/admin`.)
   - Cache eligibility: **Bypass cache**
   - This is a safety net, not strictly load-bearing: Cloudflare's default behavior already doesn't cache `application/json` responses unless a Cache Rule explicitly marks them eligible, and Rule A only marks `/api/v1/banners/*` GETs as eligible — so nothing under `/admin/*` or `/auth/*` should be reachable by Rule A's pattern anyway. Keep this rule regardless: if Rule A's expression is ever edited/widened later, this rule guarantees admin/auth responses still can't be cached even if that edit is careless.

   **Rule D (optional) — frontend dynamic routes**, only if you later find the SPA's `index.html` being served with unexpectedly cacheable headers (unlikely — `frontend/public/.htaccess:53-54` already sets `ExpiresByType text/html "access plus 0 seconds"` — verify this rather than assuming it's needed):
   - Expression:
     ```
     (http.host eq "rondosportstickets.com" and (starts_with(http.request.uri.path, "/checkout") or starts_with(http.request.uri.path, "/bookings")))
     ```
   - Cache eligibility: **Bypass cache**

   **Rule ordering:** Rules A/B/C/D match non-overlapping URL paths, so execution order shouldn't matter for correctness — but as a defensive practice, drag Rule C (admin/auth bypass) above Rule A in the rule list anyway, so it's evaluated first if the list is ever reordered or Rule A's expression is loosened later.
4.3. **Respect "Origin Cache Control"** setting on: ensures Cloudflare doesn't second-guess the app's own `Cache-Control`/`stale-while-revalidate` values.
4.4. **Cloudflare Polish/Mirage** — evaluate but do not blanket-enable:
   - **Polish** (automatic image re-compression/format conversion): since images are already optimized WebP, Polish's main remaining value is stripping metadata — enable "Lossless" mode only if testing shows no visible quality change; skip "Lossy" to avoid re-compressing an already-compressed WebP a second time (diminishing/negative returns, possible quality loss). This is a paid-tier feature — confirm plan tier before including it in the phase.
   - **Mirage** (adaptive image loading based on device/connection): paid-tier feature: evaluate against Phase 6's own mobile-image-size fix (Root Cause 7) — the two overlap. Prefer fixing mobile image sizing at the source (Phase 6) since it's a real dimension fix, not a delivery heuristic; treat Mirage as optional/secondary rather than a substitute.
4.5. **Cache Purge strategy** — document the operational procedure, since admins upload new banner images through `uploadBannerImage()`:
   - Because `generateUniqueFilename()` gives every new upload a brand-new filename, uploaded images never need a manual purge — the URL itself changes, so there's no stale-cache risk for images.
   - The banner API response (`/api/v1/banners/homepage_hero`), however, is cached at the edge for up to 5 minutes (`max-age=300`). After an admin adds/edits/reorders/deletes a banner, the edge cache will serve the old list for up to 5 minutes unless purged.
   - Two options to evaluate: (a) accept the 5-minute staleness as-is (matches existing origin cache header intent, no code change), or (b) add a **"Purge by URL"** call (via Cloudflare API, using a scoped API token) triggered from `updateBanner`/`createBanner`/`deleteBanner`/`updateBannerPositions` in `BannersController.php` so admin changes go live immediately. Flag (b) as a Phase 7 (post-launch) enhancement, not required for the initial rollout — it's a code change, and the plan's instruction is to keep initial CDN rollout to config only.

**Validation:**
- `curl -sI` on banner image and banner API repeatedly; confirm `cf-cache-status: HIT` appears on the 2nd+ request (first request will show `MISS` or `EXPIRED`).
- Confirm admin panel (`/admin/banners`) create/edit/delete/reorder still works and reflects changes (within the accepted TTL window from 4.5) — this is the functionality most likely to regress if Rule C's bypass pattern doesn't fully cover admin routes.
- Confirm login and any authenticated customer flow (booking, cart) still functions — these must never be served from shared cache.

**Rollback:** Cache Rules can be individually disabled/deleted in the dashboard without a deploy. If admin panel breaks, disable Rule A first (most likely overlap culprit) and re-test.

---

## Phase 5 — Origin Server Configuration (parallel track, can run alongside Phase 2–4)

Goal: reduce origin processing time for the ~1% of requests that still reach origin (cache misses, admin routes, TTL expiry).

5.1. **Enable OPcache** via cPanel → MultiPHP INI Editor (or WHM if access allows) for the PHP version serving `api.rondosportstickets.com`. Confirm with `php -i | grep opcache.enable` or an admin-only phpinfo check — **do not** expose a public phpinfo page.
5.2. **Confirm PHP-FPM (or equivalent) worker persistence** — check cPanel's PHP handler is `ea-php81` with FPM enabled (not suPHP/DSO, which re-spawn per request). This directly affects the "cold PHP-FPM workers" cause named in the original analysis.
5.3. **Confirm database connection behavior** — review the PDO connection setup (wherever the app bootstraps its DB connection) for persistent connections (`PDO::ATTR_PERSISTENT`) vs. fresh-connect-per-request. Evaluate risk: persistent connections on shared hosting can exhaust connection limits under load — test in a staging window, not directly in production, if changed.
5.4. **Confirm gzip/Brotli on API JSON responses** at the origin (independent of Cloudflare, for the cache-miss path): check `zlib.output_compression` is already `On` (confirmed present in `api/public/.user.ini`) and that responses actually carry `Content-Encoding: gzip` when requested with `Accept-Encoding: gzip` — the original analysis flagged this as unconfirmed.
5.5. **HTTP/2 over TLS at origin** — lower priority since Cloudflare provides this to browsers regardless (per the analysis, "no server changes" needed for this specific problem once CDN is live). Only pursue origin-side ALPN/HTTP2 if cPanel/WHM makes it a one-setting change; otherwise treat as not-worth-pursuing post-CDN.

**Validation:** Re-run the original `curl` timing methodology from the analysis doc directly against origin (bypassing Cloudflare via `--resolve` to the origin IP, or a temporary DNS-only test hostname) to measure whether server-processing time actually dropped from ~928ms. This isolates origin improvement from CDN masking effects.
**Rollback:** OPcache/FPM changes are cPanel toggles, revert in place. Persistent DB connections: revert the connection flag/config value if connection-limit errors appear in logs.

---

## Phase 6 — Frontend Tasks

Goal: close the two frontend gaps the codebase review found — first-image load isn't preloaded (only next-slide is), and mobile still downloads the full desktop image. Everything else in the "already implemented" list in Phase 0 stays as-is; this phase should not touch that working logic.

6.1. **Mobile image sizing (Root Cause 7 — highest remaining frontend-adjacent impact):**
   - Extend `BannersService::uploadBannerImage()` (PHP) to generate a second, mobile-sized WebP (~375–450px wide crop/resize) alongside the existing upload, and store its URL in `mobile_image_url` instead of duplicating `image_url`.
   - Requires confirming GD or Imagick availability on the cPanel PHP build (`php -m | grep -i -E "gd|imagick"`) before implementation — this determines the resize approach.
   - Frontend already consumes `mobile_image_url` correctly via `Hero.tsx`'s `getImageUrl()` (`frontend/src/components/home/Hero.tsx:35-38`) — **no frontend code change needed**, this is purely a backend/admin-upload-pipeline change. Flag clearly as backend work, sequenced here only because it's the direct fix for the mobile-performance root cause.
   - Admin UI (`admin/src/pages/...` banner upload screens) may need a preview of both generated sizes — review after the backend change, not before.
6.2. **First-image preload review:** the current 800ms fallback-reveal timer and next-slide preload (P2) mask perceived latency but don't eliminate the first request's dependency on the banner API responding. Once Phase 4's CDN caching is live, the API+image chain drops to ~300-500ms per the analysis, which may make this a non-issue. Re-measure after Phase 4 before deciding whether additional preload work (e.g., a lightweight server-rendered/edge-injected `<link rel="preload">` using Cloudflare Workers, out of scope for this plan) is worth pursuing.
6.3. **Resource prioritization audit:** confirm `fetchPriority="high"` and `loading="eager"` (already present, `Hero.tsx:225-226`) remain the only high-priority image in the initial viewport — check `UpcomingEvents.tsx` and other homepage components don't also request `fetchPriority="high"`, which would dilute the browser's prioritization of the hero image.
6.4. **Error handling review:** confirm the existing broken-image handling (`handleImageError`, `brokenUrls` state, `Hero.tsx:131-135`) still behaves correctly once images are served through Cloudflare — specifically, that a Cloudflare edge error (e.g., 522/524 timeout) surfaces as an `onError` event rather than hanging past the 800ms fallback timer. No code change expected; this is a verification task.
6.5. **Production build verification:** run the existing `vite build` (`frontend/vite.config.ts`) and confirm no new console errors/warnings related to preconnect (now potentially redundant once Cloudflare proxies the API — `<link rel="preconnect" href="https://api.rondosportstickets.com">` still helps since it's the same hostname the browser connects to; no change needed here since Cloudflare sits transparently behind that hostname).

**Validation:** Build and serve the production bundle locally (or on staging) pointed at the Cloudflare-fronted domains; visually confirm hero slider renders, cross-fades, and auto-advances identically to current behavior; confirm mobile viewport (< 768px per `Hero.tsx:32`) loads the new smaller image once 6.1 ships.
**Rollback:** 6.1 is the only code change in this phase — gate it behind confirming GD/Imagick availability first; if the resize introduces quality issues, the admin can still fall back to re-uploading with `mobile_image_url` manually set equal to `image_url` (current behavior), so there's no hard dependency risk.

---

## Phase 7 — End-to-End Validation

Run after Phases 1–6 (Phase 6.1 can trail behind if it needs more lead time — Phases 1–5 + 6.2–6.5 deliver the bulk of the win independently).

7.1. **Initial page load performance:** re-run the exact `curl` timing methodology from the original analysis against production, compare TTFB/total-time numbers directly against the "Expected Outcome" table (Section 11 of the analysis doc) to confirm the predicted ~300-500ms total is actually achieved.
7.2. **Desktop performance:** Lighthouse/WebPageTest run on desktop, focus on LCP (hero image is almost certainly the LCP element) and TTFB.
7.3. **Mobile performance:** same tooling, throttled to a 4G profile matching the analysis's "~3-4s → ~400-600ms" mobile prediction; confirm smaller mobile image (6.1) is actually being served (check Network tab for image size, not just URL).
7.4. **Hero image rendering speed:** manual check across at least 3 banners (if more than one exists) to confirm cross-fade and preload-next-slide (existing P2 logic) still work through Cloudflare's cache.
7.5. **Browser compatibility:** spot-check Chrome, Safari (iOS), and one older Android WebView if feasible — the original analysis specifically called out Safari/iOS and Android Chrome version fragmentation as the reason `Vary: User-Agent` was so damaging; confirm cache hit rates are now high across these.
7.6. **No regressions in existing functionality:** explicitly re-test, since these are the flows most exposed to Cloudflare/cache-rule misconfiguration:
   - Login / authentication (JWT `Authorization` header handling — confirm `CorsMiddleware`'s CORS/Vary:Origin behavior survives Cloudflare's proxy layer)
   - Booking/checkout flow (Stripe integration — confirm `frame-src https://js.stripe.com` CSP and any Stripe webhook/API calls aren't affected by Cloudflare)
   - Admin banner CRUD (create/update/delete/reorder) — confirm changes are not served stale beyond the accepted TTL (Phase 4.5)
   - Any other endpoints under `api.rondosportstickets.com` not directly part of this analysis (events, tickets, hospitality, etc.) — confirm Cache Rules (Phase 4.2) don't accidentally widen beyond `/banners/*` and `/images/banners/*`.
7.7. **Header verification:** confirm final production headers match the target state — no `Vary: User-Agent`, `cf-cache-status: HIT` on repeat image/API requests, `immutable` present, HTTP/2 or HTTP/3 negotiated.

**Rollback (whole-rollout level):** If Phase 7 surfaces a functional regression that can't be isolated to one Cache Rule, the fastest full revert is toggling both Cloudflare zones back to DNS-only (grey cloud) — this restores direct-to-origin behavior immediately without a DNS/nameserver change, buying time to debug the specific rule offline.

---

## Summary — Execution Order

1. Phase 1 — verify current `.htaccess` fixes are live and correctly scoped (config audit, no risk)
2. Phase 2 — Cloudflare account + DNS + proxy on (both domains)
3. Phase 3 — SSL/TLS mode, HTTP/2/3, Brotli, Early Hints
4. Phase 4 — Cache Rules (API + images), Polish/Mirage evaluation, purge strategy
5. Phase 5 — origin OPcache/FPM/DB-connection confirmation (parallel to 2-4)
6. Phase 6 — frontend: mobile image sizing (backend-driven), prioritization/error-handling verification, build check
7. Phase 7 — full validation pass (performance + regression) across desktop, mobile, and browser matrix

Phases 2-4 are sequential (each depends on the previous). Phase 5 can run in parallel with 2-4. Phase 6.1 (mobile image) has no dependency on Cloudflare and could start immediately if desired, but is sequenced last here since Phase 0 already shows it's the only remaining item requiring an actual code change, and the instruction was to prioritize the config/infra roadmap.
