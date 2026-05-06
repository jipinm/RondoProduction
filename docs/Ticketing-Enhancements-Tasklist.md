# Implementation Task List — Rondo Sports Ticketing Enhancements

## Architecture Summary
- **API** ([api/src](api/src)) — Slim PHP framework proxying XS2Event API, with MariaDB for local data (settings, bookings, etc.).
- **Admin** ([admin/src](admin/src)) — React + Vite admin panel.
- **Frontend** ([frontend/src](frontend/src)) — React + Vite customer-facing website.
- **Database** — `system_settings` table stores key-value JSON settings with `is_public` and `category` fields.
- **Navigation** — Managed via `FIXED_SPORTS` array in [frontend/src/components/layout/Header.tsx](frontend/src/components/layout/Header.tsx).

---

## Phase 1: Database Migration Scripts
| # | Task | Status |
|---|------|--------|
| 1.1 | **Create migration: `add_display_settings.sql`** — Insert rows into `system_settings` for: `football_visible_tournaments` (JSON array), `excluded_teams` (JSON object), and `other_sports_visible` (JSON array). Set `is_public = 1` and `category = 'display'`. | ✅ Done |

## Phase 2: API Backend
| # | Task | Status |
|---|------|--------|
| 2.1 | **Create `SystemSettingsRepository.php`** — New repository in [api/src/Repository](api/src/Repository) for `system_settings` table. | ✅ Done |
| 2.2 | **Create `DisplaySettingsController.php`** — New controller for Admin (CRUD) and Public (read-only) display settings. | ✅ Done |
| 2.3 | **Register routes in `Application.php`** — Wire up new repository and controller for admin/public routes. | ✅ Done |

## Phase 3: Admin Panel — Display Settings Management
| # | Task | Status |
|---|------|--------|
| 3.1 | **Create `displaySettingsService.ts`** — API service for display settings CRUD. | ✅ Done |
| 3.2 | **Create `DisplaySettings.tsx` page** — Management UI with 3 sections: Football Tournament Selection, Team Exclusions per Tournament, and Other Sports Visibility. | ✅ Done |
| 3.3 | **Register route and sidebar item** — Add `/settings/display` to [admin/src/App.tsx](admin/src/App.tsx) and [admin/src/layouts/DashboardLayout.tsx](admin/src/layouts/DashboardLayout.tsx). | ✅ Done |

## Phase 4: Frontend — Visibility Logic
| # | Task | Status |
|---|------|--------|
| 4.1 | **Create `useDisplaySettings.ts` hook** — Fetch and cache public `display` category settings. | ✅ Done |
| 4.2 | **Update `useMenuHierarchy.ts`** — Filter football tournaments based on `football_visible_tournaments` setting. | ✅ Done |
| 4.3 | **Update `Header.tsx`** — Filter "Other Sports" dropdown based on `other_sports_visible` setting. | ✅ Done |
| 4.4 | **Implement Team Exclusions** — Filter team lists in `useMenuHierarchy.ts` and `TeamsPage.tsx` based on `excluded_teams` map. | ✅ Done |

## Phase 5: Menu Restructure — Cricket → Golf Swap
| # | Task | Status |
|---|------|--------|
| 5.1 | **Update `FIXED_SPORTS` in `Header.tsx`** — Replace `'cricket'` with `'golf'`. | ✅ Done |
| 5.2 | **Add Golf display mappings** — Update `sportDisplayNames` and ensure Golf has a tournament submenu (similar to Tennis). | ✅ Done |
| 5.3 | **Create `useGolfTournaments.ts`** — Hook to fetch and cache Golf tournaments for the main menu. | ✅ Done |

## Phase 6: Testing & Verification
| # | Task | Status |
|---|------|--------|
| 6.1 | **Verify defaults (Empty = Show All)** — Ensure no disruption when no settings are configured. | ✅ Done |
| 6.2 | **Verify Menu Structure** — Confirm Golf is main-nav with submenu; Cricket moved to Other Sports. | ✅ Done |
| 6.3 | **Verify Admin Control** — Confirm hiding tournaments/teams/sports works as expected on frontend. | ✅ Done |
