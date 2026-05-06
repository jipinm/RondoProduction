# RONDO Brand Guidelines — Implementation Instructions for GitHub Copilot

> **Purpose:** This document provides a structured, task-by-task implementation plan for updating the RONDO Sports Travel website to align with the 2026 Brand Guidelines (Version 1.0).
>
> **Stack:** Vite · React · TypeScript · CSS Modules
>
> The agent must analyze the existing codebase and apply every change described below without altering layout structure, component logic, or any styles unrelated to color and typography.

---

## 0. Pre-Work — Codebase Analysis

Before making any changes, perform a read-only inspection of the project structure. This step is mandatory.

1. **Locate the global CSS entry point.** In a Vite + React project this is typically `src/index.css`, `src/styles/global.css`, or a file imported at the top of `src/main.tsx`. Identify it.
2. **Locate existing CSS custom property (`:root`) declarations.** These are the source of truth for all design tokens. They may live in the global CSS file or in a dedicated `src/styles/tokens.css` / `src/styles/variables.css`.
3. **Locate the `@font-face` declarations or any external font `@import` statements.** These may be in the global CSS file or in a separate `src/styles/fonts.css`.
4. **List all `.module.css` files** across `src/`. These are component-scoped stylesheets. Any hardcoded color or font-family values inside them must be found and updated.
5. **List the contents of `/fonts`** (the font asset directory). Record the exact filenames and formats present before writing any font paths.
6. **Check `src/main.tsx`** (or `src/main.ts`) for any stylesheet imports — this confirms the load order of global styles.

Do not modify any file until this analysis is complete.

---

## 1. Scope of Changes

Only the following two systems are in scope. Nothing else should be touched.

| System | What changes |
|---|---|
| **Color Palette** | CSS custom properties in `:root`, and any hardcoded color values in `.module.css` files |
| **Typography** | `@font-face` declarations, font-family custom properties in `:root`, and `font-family` rules in `.module.css` files |

**Out of scope:** component `.tsx` / `.ts` logic, layout, spacing, `z-index`, `border-radius`, animation, or any non-color/non-font CSS property.

---

## 2. Color Palette Implementation

### 2.1 — New Color Token Reference

| CSS Custom Property | Role | Hex Value |
|---|---|---|
| `--color-primary` | Primary brand color | `#245388` |
| `--color-secondary-1` | Secondary | `#83ACDC` |
| `--color-secondary-2` | Secondary (light) | `#C7D9ED` |
| `--color-accent` | Accent / CTA | `#C0504C` |
| `--color-accent-soft` | Accent (soft) | `#DD938C` |
| `--color-neutral-light` | Neutral light background | `#F7F7F7` |
| `--color-neutral-mid` | Neutral mid / supporting text | `#808080` |
| `--color-neutral-dark` | Near-black / primary text | `#1C191D` |

> Full color values for reference:
> - Atlantic Blue `#245388` · RGB 36 83 136
> - Skyward Blue `#83ACDC` · RGB 131 172 220
> - Mist Blue `#C7D9ED` · RGB 199 217 237
> - Heritage Red `#C0504C` · RGB 192 80 76
> - Blush Coral `#DD938C` · RGB 221 147 140
> - Cloud White `#F7F7F7` · RGB 247 247 247
> - Graphite Gray `#808080` · RGB 128 128 128
> - Black `#1C191D` · RGB 28 28 29

### 2.2 — Update the `:root` Token Block

In the global CSS file identified in Step 0, find the existing `:root { }` block that defines color custom properties. Replace the old color definitions with the following. Do not remove any non-color custom properties (spacing, radii, etc.) that may exist in the same block.

```css
:root {
  /* === RONDO Color Palette 2026 === */
  --color-primary:        #245388; /* Atlantic Blue  – primary brand */
  --color-secondary-1:    #83ACDC; /* Skyward Blue   – secondary */
  --color-secondary-2:    #C7D9ED; /* Mist Blue      – secondary light */
  --color-accent:         #C0504C; /* Heritage Red   – CTAs & highlights */
  --color-accent-soft:    #DD938C; /* Blush Coral    – soft accent */
  --color-neutral-light:  #F7F7F7; /* Cloud White    – backgrounds */
  --color-neutral-mid:    #808080; /* Graphite Gray  – supporting text */
  --color-neutral-dark:   #1C191D; /* Black          – primary text */
}
```

If no `:root` block exists yet, create one at the very top of the global CSS file and add the declarations above.

### 2.3 — Replace Hardcoded Colors in All `.module.css` Files

Search every `.module.css` file in `src/` for hardcoded color values. This includes hex codes (`#xxxxxx`), `rgb()`, `rgba()`, and `hsl()` values that correspond to old brand colors.

For each match:
1. Identify which new token from Section 2.1 is semantically correct for that usage.
2. Replace the hardcoded value with the CSS custom property using `var()`.

**Examples of the expected transformation:**

```css
/* BEFORE */
.button {
  background-color: #1a4a7a;
  color: #ffffff;
}

/* AFTER */
.button {
  background-color: var(--color-primary);
  color: var(--color-neutral-light);
}
```

```css
/* BEFORE */
.heroSection {
  background-color: #f5f5f5;
  border-bottom: 2px solid #b94040;
}

/* AFTER */
.heroSection {
  background-color: var(--color-neutral-light);
  border-bottom: 2px solid var(--color-accent);
}
```

> **Important:** CSS custom properties defined in `:root` are globally available and work natively in CSS Modules — no import is needed to use `var(--color-primary)` inside a `.module.css` file.

### 2.4 — Enforce Approved Color Pairings

When choosing which token to assign to a replaced value, follow these pairing rules from the brand guidelines to ensure proper contrast and brand consistency.

| Foreground | Background | Approved Use |
|---|---|---|
| `--color-neutral-light` (`#F7F7F7`) | `--color-primary` (`#245388`) | Primary sections, navbars, hero areas |
| `--color-primary` (`#245388`) | `--color-neutral-light` (`#F7F7F7`) | Text on light backgrounds |
| `--color-neutral-light` (`#F7F7F7`) | `--color-accent` (`#C0504C`) | CTA buttons, badges |
| `--color-neutral-dark` (`#1C191D`) | `--color-secondary-2` (`#C7D9ED`) | Cards, panels on light blue |
| `--color-neutral-dark` (`#1C191D`) | `--color-neutral-light` (`#F7F7F7`) | Body text on white |
| `--color-neutral-mid` (`#808080`) | `--color-neutral-light` (`#F7F7F7`) | Captions, metadata |

**Rules:**
- `--color-accent` (Heritage Red) must only be used for calls to action, interactive highlights, and key UI indicators. Never use it as a background for content sections or decorative elements.
- `--color-secondary-1` (Skyward Blue) and `--color-secondary-2` (Mist Blue) are for supporting layouts — backgrounds, dividers, and non-primary UI surfaces.
- If an existing pairing in a `.module.css` file cannot be cleanly mapped to any approved pair, **do not guess**. Leave the original value and add this comment on the line above:
  ```css
  /* RONDO: Review color pairing — could not auto-map to approved combination */
  ```

---

## 3. Typography Implementation

### 3.1 — Inspect `/fonts` Before Writing Any Paths

List the exact contents of the `/fonts` directory. The `@font-face` `src` paths written in Step 3.2 must use the exact filenames found there. Do not assume or invent filenames.

Expected files (names may vary — confirm before use):

| Typeface | Weight | Expected filename pattern |
|---|---|---|
| Gilroy | Semibold (600) | `Gilroy-SemiBold.ttf`, `Gilroy-SemiBold.woff` |
| Gilroy | Medium (500) | `Gilroy-Medium.ttf`, `Gilroy-Medium.woff` |
| Proxima Nova | Regular (400) | `ProximaNova-Regular.ttf`, `ProximaNova-Regular.woff` |
| Proxima Nova | Medium (500) | `ProximaNova-Medium.ttf`, `ProximaNova-Medium.woff` |

**Vite font path rule:** If the `/fonts` directory is inside `public/` (i.e., `public/fonts/`), reference files with an absolute path: `/fonts/filename.ttf`. If fonts are inside `src/assets/fonts/`, use a relative path from the CSS file that declares the `@font-face`. Confirm the location before writing any path.

### 3.2 — Declare `@font-face` Rules

Locate the file that currently declares `@font-face` blocks or imports an external font. This is the file to modify.

- If an external `@import url('https://fonts.googleapis.com/...')` or similar CDN import exists, **remove it entirely**.
- Replace with the following local `@font-face` declarations, adjusting filenames to exactly match those found in `/fonts`:

```css
/* === RONDO Fonts 2026 === */

/* Gilroy — Primary Typeface */
@font-face {
  font-family: 'Gilroy';
  src: url('/fonts/Gilroy-SemiBold.ttf') format('ttf'),
       url('/fonts/Gilroy-SemiBold.woff') format('woff');
  font-weight: 600;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Gilroy';
  src: url('/fonts/Gilroy-Medium.ttf') format('ttf'),
       url('/fonts/Gilroy-Medium.woff') format('woff');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}

/* Proxima Nova — Secondary Typeface */
@font-face {
  font-family: 'Proxima Nova';
  src: url('/fonts/ProximaNova-Regular.ttf') format('ttf'),
       url('/fonts/ProximaNova-Regular.woff') format('woff');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Proxima Nova';
  src: url('/fonts/ProximaNova-Medium.ttf') format('ttf'),
       url('/fonts/ProximaNova-Medium.woff') format('woff');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}
```

> `font-display: swap` is required to prevent invisible text (FOIT) during font load in Vite projects.

These declarations must appear **before** any other rules in the global CSS file, or in a dedicated `src/styles/fonts.css` that is the first import in `src/main.tsx`.

### 3.3 — Add Font Family Tokens to `:root`

Append the following font-family custom properties to the `:root` block updated in Section 2.2:

```css
:root {
  /* ... color tokens ... */

  /* === RONDO Typography 2026 === */
  --font-primary:   'Gilroy', sans-serif;
  --font-secondary: 'Proxima Nova', sans-serif;
}
```

### 3.4 — Update Global Base Typography

In the global CSS file, locate the base element selectors that set `font-family` on `body`, headings, and text elements. Update them as follows. Do not touch `font-size`, `line-height`, or `letter-spacing`.

```css
/* Base — Proxima Nova for all body content */
body {
  font-family: var(--font-secondary);
  font-weight: 400;
  color: var(--color-neutral-dark);
  background-color: var(--color-neutral-light);
}

/* Headings — Gilroy */
h1 {
  font-family: var(--font-primary);
  font-weight: 600; /* Semibold */
}

h2,
h3 {
  font-family: var(--font-primary);
  font-weight: 500; /* Medium */
}

h4,
h5,
h6 {
  font-family: var(--font-primary);
  font-weight: 500;
}

/* Body text — Proxima Nova Regular */
p,
li,
blockquote {
  font-family: var(--font-secondary);
  font-weight: 400;
}

/* Supporting text — Proxima Nova Medium */
label,
caption,
figcaption,
small {
  font-family: var(--font-secondary);
  font-weight: 500;
}
```

### 3.5 — Update `font-family` Overrides in `.module.css` Files

Search every `.module.css` file in `src/` for hardcoded `font-family` declarations. Replace each with the appropriate token:

```css
/* BEFORE */
.cardTitle {
  font-family: 'Inter', sans-serif;
}

/* AFTER */
.cardTitle {
  font-family: var(--font-primary);
}
```

Use this mapping to decide which token to apply:

| Element type | Token | Weight |
|---|---|---|
| Heading, title, card header | `var(--font-primary)` | `600` (Semibold) for h1, `500` (Medium) for h2/h3 |
| Button label, CTA text | `var(--font-primary)` | `600` |
| Paragraph, description, list | `var(--font-secondary)` | `400` |
| Label, caption, metadata, helper text | `var(--font-secondary)` | `500` |

---

## 4. Text Hierarchy Reference

Canonical hierarchy from the brand guidelines for resolving ambiguity in component-level styles.

| Level | Applies to | Font | Weight | CSS declaration |
|---|---|---|---|---|
| **Headline** | `h1`, hero titles, primary display text | Gilroy | Semibold (600) | `font-family: var(--font-primary); font-weight: 600;` |
| **Subheadline** | `h2`, `h3`, section titles, card headings | Gilroy | Medium (500) | `font-family: var(--font-primary); font-weight: 500;` |
| **Body Copy** | `p`, `li`, descriptions, article text | Proxima Nova | Regular (400) | `font-family: var(--font-secondary); font-weight: 400;` |
| **Supporting** | `label`, `caption`, metadata, helper text | Proxima Nova | Medium (500) | `font-family: var(--font-secondary); font-weight: 500;` |

---

## 5. Audit & Validation Checklist

Verify every item below before considering the task complete.

**Colors**
- [ ] The `:root` block contains all 8 new `--color-*` properties with the exact hex values from Section 2.1.
- [ ] No hardcoded hex, `rgb()`, or `hsl()` brand color values remain in any `.module.css` file.
- [ ] All color usages in `.module.css` files reference `var(--color-*)` tokens.
- [ ] `--color-accent` (Heritage Red) is not used as a section background or decorative fill anywhere.
- [ ] Unresolvable color pairings are marked with `/* RONDO: Review color pairing */`.

**Typography**
- [ ] Any external font CDN `@import` has been removed.
- [ ] `@font-face` rules exist for Gilroy (weights 500, 600) and Proxima Nova (weights 400, 500).
- [ ] All `@font-face` `src` paths use filenames confirmed to exist in `/fonts`.
- [ ] `--font-primary` and `--font-secondary` are defined in `:root`.
- [ ] Global base selectors (`body`, `h1`–`h6`, `p`, `label`, etc.) use `var(--font-*)` tokens.
- [ ] No hardcoded `font-family` values remain in any `.module.css` file.
- [ ] `font-size`, `line-height`, and `letter-spacing` values are unchanged throughout.

**General**
- [ ] No `.tsx` or `.ts` files have been modified.
- [ ] No layout, spacing, border-radius, or non-color/font CSS properties have been changed.
- [ ] The project builds successfully (`vite build` exits with no errors).
- [ ] No TypeScript errors have been introduced.

---

## 6. Notes for the Agent

- **Inspect before acting.** Read the file tree and confirm file locations before writing any changes (Step 0).
- **Token-first.** Update the `:root` source of truth first. All component `.module.css` files then consume it via `var()`. Never patch individual usages without updating the token.
- **CSS Modules + custom properties.** CSS custom properties on `:root` are globally scoped by the browser cascade. They are fully available inside `.module.css` files via `var()` with no import needed. This is by design — use it.
- **Vite static asset paths.** Files inside `/frontend/public/` are served at the root URL. `/frontend/public/fonts/Gilroy-SemiBold.ttf` is referenced as `/fonts/Gilroy-SemiBold.ttf` in CSS. Files inside `src/assets/` require a relative import path. Check before writing.
- **Do not modify `vite.config.ts`, `tsconfig.json`, or any `.tsx` / `.ts` file.** This is a pure CSS update.
- **One source of truth.** If color or font tokens are currently scattered across multiple CSS files, consolidate them into a single `:root` block as part of this task, and add a comment where the old definitions were removed.
- **Flag, don't guess.** For any ambiguous value that cannot be confidently mapped, add `/* RONDO: Review */` and leave the original value intact. Do not replace with an approximation.
