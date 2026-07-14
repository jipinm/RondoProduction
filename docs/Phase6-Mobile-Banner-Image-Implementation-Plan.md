# Phase 6.1 — Mobile Banner Image Generation: Findings & Implementation Plan

**Source:** Phase 6 of [`Hero-Images-Performance-Implementation-Plan.md`](Hero-Images-Performance-Implementation-Plan.md) ("Root Cause 7" — mobile receives the same 510KB desktop WebP as desktop, since `image_url` and `mobile_image_url` are always identical).
**Scope:** Admin `/content` → Banners tab upload pipeline (`api/src/Service/BannersService.php`), no frontend or public-API changes required.

---

## Findings

### 1. No database migration needed
`production-database-rondo.sql:88-106` and `db_rondo.sql:85-109` both already define:
```sql
`mobile_image_url` varchar(500) DEFAULT NULL COMMENT 'Mobile-optimized image URL',
```
The column has existed all along. The bug is purely in application code: `BannersService::uploadBannerImage()` (api/src/Service/BannersService.php:238-353) writes the same URL into both `image_url` and `mobile_image_url` by design — its own doc comment says *"Saves file directly without image processing... Updates both image_url and mobile_image_url with same path"*. No `ALTER TABLE` is required or created.

### 2. GD availability is unconfirmed on production, and NOT available in local dev
`php -r "var_dump(function_exists('imagecreatefromjpeg'));"` on this machine (PHP 8.1.25, same version as the local Apache/rondoapi.local build) returns `false`. `api/composer.json` declares no `ext-gd`, no `ext-imagick`, no image library. The only existing precedent (`TeamCredentialsService::convertToPNG()`, api/src/Service/TeamCredentialsService.php:901-980) treats GD as optional at runtime and falls back to a plain file `copy()`. **Design constraint: the mobile-resize feature must be fully best-effort and never fail the upload** — if GD is missing or resizing fails for any reason, fall back to today's exact behavior (duplicate URL).

### 3. Admin UI needs zero changes
`admin/src/types/banners.ts` already declares `mobile_image_url?: string`, and the upload response already returns the full updated `banner` row. The public `Hero.tsx` (frontend/src/components/home/Hero.tsx:35-38) already branches correctly on `mobile_image_url`. Once the backend starts writing a genuinely different URL, the fix is live end-to-end with no UI code touched.

### 4. Two related bugs found and fixed as part of this change (not scope creep — direct consequences of introducing a second physical file)
- `cleanupBannerFiles()` (BannersService.php:521-541) explicitly assumes `image_url === mobile_image_url` and only ever deletes one file. Left as-is, every new-style upload would leak an orphaned mobile file on every banner delete.
- `uploadBannerImage()` never deleted the *previous* file(s) when an admin replaces a banner's image. This already existed as a minor gap for the single-file case; introducing a second file per upload would double the orphaning rate, so cleanup-on-replace is added now rather than compounding it.
- Both fixes explicitly skip `placeholder.jpg` (the shared default image set by `createBanner()`, api/src/Service/BannersService.php:161) since multiple banners may reference that same shared file — deleting it would break every banner still on the default image.

---

## Implementation (this change)

1. Add `private function generateMobileVariant(string $sourcePath, string $targetPath, string $mediaType): bool` to `BannersService.php` — GD-based scale-to-fit (max width 420px, aspect ratio preserved, no cropping since the 5 banner locations have very different aspect ratios), encoded as WebP. Guards on `function_exists()` per source type; supports jpeg/png/webp only (svg+xml and avif are left to share the full-size URL — SVG is vector, GD in this build can't reliably rasterize/encode AVIF). Returns `false` (never throws) on any failure, including when the source is already ≤420px wide (no benefit to a second file).
2. `uploadBannerImage()`: fetch the existing banner row before saving (for step 4), save the full-size file exactly as today, then attempt step 1's resize into a `..._mobile.webp` file. On success, `mobile_image_url` points at the new file; on any failure, `mobile_image_url = image_url` (today's behavior, unchanged).
3. `cleanupBannerFiles()`: delete `mobile_image_url`'s file independently of `image_url` when its filename differs (guards against double-deleting the same file for legacy banners where both still point to one file).
4. `uploadBannerImage()`: after the new files are confirmed saved and the DB row updated, best-effort delete the *previous* `image_url`/`mobile_image_url` files (skips `placeholder.jpg`, skips if unchanged, never fails the upload on cleanup error).

**Explicitly not changed:** `BannersController.php`, admin React components, `frontend/` (Hero.tsx already correct), any other upload path (Partners, TeamCredentials, SiteBranding, StaticPages, Blog, WhyRondoSports, ContactPage) — none of them call into `BannersService`, so none are touched.

**Rollback:** single-file diff to `BannersService.php`; `git revert` restores exact prior behavior. No migration to roll back.
