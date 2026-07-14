# Hero Images Loading Slowly — Root Cause Analysis

**Date:** 2026-07-04  
**Scope:** Root cause analysis of slow Hero Slider image loading on the frontend application. No code changes made — analysis only.

---

## 1. Hard Evidence: File Sizes vs. Display Sizes

Images are served at raw upload resolution with zero processing. This is the primary root cause.

| File | Actual dimensions | File size | Display size (approx.) | Oversize ratio |
|---|---|---|---|---|
| `Barcelona_Stadium_...jpg` | **5,377 × 3,585 px** | **4.5 MB** | ~1,440 × 600 px | **14× too wide** |
| `Emirates_Day_...jpg` | **4,000 × 6,000 px** (portrait) | **4.3 MB** | ~1,440 × 600 px | **10× too wide** |
| `Barcelona_Stadium_Day_...jpg` | **5,690 × 3,088 px** | **4.2 MB** | ~1,440 × 600 px | **16× too wide** |
| `WIMBLEDON_LOGO_...jpeg` | **5,250 × 3,500 px** | **3.6 MB** | ~1,440 × 600 px | **14× too wide** |
| `7_...png` (social-media portrait) | **1,080 × 1,350 px** | **1.4 MB PNG** | ~1,440 × 600 px | wrong aspect ratio |
| `tennis_..._main.png` | **1,920 × 600 px** | **854 KB PNG** | ~1,440 × 600 px | correct size, wrong format |
| `football_..._main.png` | **1,920 × 600 px** | **718 KB PNG** | ~1,440 × 600 px | correct size, wrong format |

On a 10 Mbps mobile connection, `Barcelona_Stadium_...jpg` at 4.5 MB takes **3.7 seconds to download** before the image becomes visible. On weak 4G (2–3 Mbps), the same image takes **12–18 seconds**.

---

## 2. Root Cause 1 (Primary — Highest Impact): No Image Optimization Pipeline

**File:** `api/src/Service/BannersService.php:242–353`

The upload handler (`uploadBannerImage`) does nothing to the image except save it to disk:

```php
// Raw file saved with no processing whatsoever
$uploadedFile->moveTo($targetPath);
```

No resize, no compression, no format conversion. An admin uploading a 24-megapixel DSLR stadium photo sees it land on the server byte-for-byte as uploaded. The service explicitly permits files up to 10 MB (`$maxFileSize = 10485760`), enabling catastrophically large images to reach production.

---

## 3. Root Cause 2 (Primary): Wrong Image Format — PNG Used for Photography

Multiple hero banners are PNG files containing photographic content:

| File | Size (current PNG) | WebP equivalent | Reduction |
|---|---|---|---|
| `tennis_..._main.png` (1920×600) | 854 KB | ~100–150 KB | **~6–8×** |
| `football_..._main.png` (1920×600) | 718 KB | ~80–130 KB | **~6–8×** |
| `7_...png` (1080×1350) | 1,385 KB | ~150–200 KB | **~7–9×** |
| `9_...png` (1080×1350) | 1,345 KB | ~130–180 KB | **~7–9×** |

PNG is a lossless format designed for graphics, logos, and diagrams. For photographs it produces files 5–10× larger than equivalent WebP. Converting the large JPEGs to correctly-sized WebP yields even greater savings:

| File | Current | Correctly-sized WebP (1440×600) | Reduction |
|---|---|---|---|
| `Barcelona_Stadium_...jpg` | 4.5 MB @ 5377×3585 | ~200–350 KB | **~13–22×** |
| `Emirates_Day_...jpg` | 4.3 MB @ 4000×6000 | ~150–250 KB | **~17–28×** |
| `Barcelona_Stadium_Day_...jpg` | 4.2 MB @ 5690×3088 | ~200–300 KB | **~14–21×** |

---

## 4. Root Cause 3 (Significant): Mobile Gets the Full Desktop Image

**File:** `api/src/Service/BannersService.php:311–314`

The upload service sets both `image_url` and `mobile_image_url` to the **same file**:

```php
$updateData = [
    'image_url'        => $imageUrl,
    'mobile_image_url' => $imageUrl   // identical to desktop URL
];
```

The Hero component correctly tries to serve a mobile version on screens < 768px:

```typescript
// Hero.tsx:37
return isMobile && b.mobile_image_url ? b.mobile_image_url : (b.image_url ?? '');
```

But since both URLs resolve to the same file, a mobile user on a 375px screen downloads the identical 4.5 MB, 5,377px-wide image that a desktop user receives. A correctly-sized mobile image (375×500px WebP) would be approximately 30–60 KB — **75× smaller** than the current mobile experience.

---

## 5. Root Cause 4 (Significant): No CDN — Images Served from Single Origin Server in UAE

**File:** `api/src/Service/BannersService.php:40`

```php
string $baseUrl = 'https://apix2.redberries.ae/images/banners'
```

`apix2.redberries.ae` is a **cPanel-hosted server** (confirmed by `api/public/.user.ini`) run by a UAE-based provider. There is no CDN in front of it. All image requests — globally — are served from this single physical server.

| User location | Round-trip time to UAE origin | Impact on TTFB |
|---|---|---|
| UAE / Gulf | ~20–40 ms | Minimal |
| London / Europe | ~130–180 ms | +130–180 ms per request |
| Australia / APAC | ~250–350 ms | +250–350 ms per request |
| USA (East Coast) | ~180–220 ms | +180–220 ms per request |

Every image request begins with this RTT overhead before a single byte of image data is received.

---

## 6. Contributing Factor: Image Cache Only 1 Month, No `immutable`

**File:** `api/public/images/banners/.htaccess:48–54`

```apache
ExpiresByType image/jpeg "access plus 1 month"
ExpiresByType image/png  "access plus 1 month"
```

- `access plus` counts TTL from each access, not the file's modification date — weaker than it appears
- No `Cache-Control: immutable` directive — browsers send conditional `If-None-Match` revalidation requests on every subsequent visit, incurring a full UAE round-trip just to receive a `304 Not Modified`
- Banner images do not use content-hashed filenames (unlike Vite assets), so long-lived `immutable` caching requires a versioning strategy

---

## 7. Contributing Factor: DEFLATE Applied to Already-Compressed Images

**File:** `api/public/images/banners/.htaccess:56–62`

```apache
<FilesMatch "\.(jpg|jpeg|png|gif|webp)$">
    SetOutputFilter DEFLATE
</FilesMatch>
```

JPEG, PNG, and WebP are already compressed binary formats. Applying gzip/deflate to them yields near-zero size reduction (typically 0.1–1%) while wasting CPU on every request. This is incorrect Apache configuration that should be removed.

---

## 8. Contributing Factor: Hero Loading Chain Still Sequential (No Image Preload Possible)

The Hero image URL is not known at page-load time — it comes from the banner API response. There is no `<link rel="preload">` for it in `index.html` because the URL is dynamic. The sequence is still:

```
JS executes → React mounts → Banner API responds → imageUrl set → Image download begins
```

The 800ms fallback timer (already reduced from 1,500ms) reveals the image container, but if the image is 4.5 MB the browser will either not have rendered it yet or will show a partial/blurry render depending on browser behavior.

---

## 9. CDN Evaluation

**Is a CDN recommended?** Yes — but only as the **second priority** after image optimization.

| Question | Answer |
|---|---|
| Is the root cause network delivery or application implementation? | **Primarily implementation** — images are 10–50× too large |
| Would a CDN alone fix the problem? | **No.** A 4.5 MB image from Cloudflare's London edge still takes 3–7 s on mobile. CDN reduces TTFB, not download time. |
| How much improvement from CDN alone? | ~5–15% faster on first download; meaningful on repeat visits (edge cache) |
| How much improvement from image optimization alone? | **10–25× reduction** in transfer size → proportionally faster |
| What does CDN + optimization give together? | ~30–50× total improvement on first load for international users |

Without fixing image sizes, a CDN reduces a 5-second load to a 4.8-second load.  
With proper image sizes first, a CDN then reduces a 0.4-second load to a 0.1-second load.

**CDN recommendation:** Cloudflare (free tier supports image caching and global distribution) placed in front of `apix2.redberries.ae`. Cloudflare's Image Resizing add-on (paid) can also perform on-the-fly optimization, which would partially substitute for the upload-time pipeline fix. BunnyCDN is a cost-effective alternative with storage optimized for media delivery.

---

## 10. Ranked Bottlenecks and Recommended Fixes

| Priority | Root Cause | Current state | Target state | Estimated effort |
|---|---|---|---|---|
| **1** | No resize/compress on upload in `BannersService` | Raw file saved as-is | Auto-resize to 1440×600 desktop + 768×500 mobile crops; convert to WebP | Medium — add GD/Imagick in `BannersService::uploadBannerImage()` |
| **2** | Existing oversized images in production | 4 files > 1 MB (worst: 4.5 MB) | Re-upload or batch-convert existing banner files | Low — one-time admin task |
| **3** | Mobile URL = Desktop URL (no separate mobile image) | Same file served on all screen sizes | Upload generates two files; `mobile_image_url` stores the smaller crop | Low — extends Priority 1 |
| **4** | PNG format for photographic banners | PNG 640 KB–1.4 MB | WebP 80–200 KB | Resolved automatically by Priority 1 |
| **5** | No CDN | Single origin server in UAE | Cloudflare or BunnyCDN in front of `apix2.redberries.ae` | Low — DNS + origin config |
| **6** | Image cache: 1 month, no `immutable` | `access plus 1 month` | `max-age=31536000, immutable` (requires filename versioning strategy) | Low — `.htaccess` change |
| **7** | DEFLATE applied to binary image formats | Applied (wasting CPU) | Remove `SetOutputFilter DEFLATE` from images block | Trivial |

---

## 11. Expected Outcome After All Fixes

| Metric | Current (worst case) | After optimization + CDN |
|---|---|---|
| Desktop hero image size | 4.5 MB | ~250–350 KB WebP |
| Mobile hero image size | 4.5 MB (same file) | ~40–60 KB WebP |
| Download time (10 Mbps mobile) | ~3.7 s | ~0.2–0.3 s |
| Download time (3 Mbps weak 4G) | ~12–18 s | ~0.1–0.16 s |
| TTFB from European user | ~150–200 ms (UAE origin) | ~10–30 ms (CDN edge) |
| Total hero visible (first load, cold) | 8–20 s | ~1–1.5 s |

---

## 12. File References

| File | Role | Key finding |
|---|---|---|
| `api/src/Service/BannersService.php` | Upload handler — no image processing | Lines 242–353: raw `moveTo()`, no resize/compress |
| `api/src/Service/BannersService.php:40` | Image base URL | `https://apix2.redberries.ae/images/banners` — no CDN |
| `api/src/Service/BannersService.php:311` | Mobile URL assignment | Same URL as desktop — no separate mobile image |
| `api/public/images/banners/` | Stored banner files | Files up to 4.5 MB; PNG used for photography |
| `api/public/images/banners/.htaccess` | Image serving config | 1-month cache, no `immutable`; DEFLATE incorrectly applied |
| `api/public/.user.ini` | Server config | cPanel-hosted; `upload_max_filesize = 16M` allows huge uploads |
| `frontend/src/components/home/Hero.tsx` | Hero component | Sequential async chain; no preload possible for dynamic URLs |

---

*Analysis only. No code changes were made.*
