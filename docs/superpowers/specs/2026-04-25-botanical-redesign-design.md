# COSMO — Botanical Redesign Design Spec
**Date:** 2026-04-25
**Status:** Approved

## Overview

Full visual re-skin of the COSMO frontend to match the physical salon's aesthetic: light, natural, living greenery, natural wood shelving. All functionality, UX flows, and UI structure remain unchanged. Only colors, border-radius, and hardcoded color values change.

## Design Direction

- **Green:** Lighter forest green (`#3D7A54`) — rich but not dark, natural and alive
- **Wood:** Warm oak (`#C4965A`) — golden-honey tone, decorative accent
- **Style:** Organic/Botanic — gently rounded corners, soft green surfaces, wellness spa feel
- **Typography:** Unchanged — Cormorant Garamond + Playfair Display + DM Sans work well with the new palette

## Color Palette

All existing token names (`ivory`, `cream`, `caramel`, `walnut`, `espresso`, `mink`) are preserved. Only their values change. This means **zero component code changes** for color class names.

| Token | Old value | New value | Role |
|-------|-----------|-----------|------|
| `ivory` | `#FAF7F2` | `#F4F9F5` | Page background (white with green tint) |
| `cream` | `#F0EBE3` | `#E8F3EA` | Secondary surface, card backgrounds |
| `caramel` | `#C4A882` | `#3D7A54` | Primary action color (CTAs, active states, eyebrow labels) |
| `walnut` | `#8C6A4A` | `#2A5C3E` | Deep accent, hover states |
| `espresso` | `#1C1510` | `#1A3828` | Text color (near-black dark forest) |
| `mink` | `#6B5A4E` | `#5A7A62` | Muted text, secondary labels |
| `oak` | *(new)* | `#C4965A` | Warm oak accent (wood detail strips, decorative elements) |

## CSS Variables — Light Mode (index.css :root)

HSL approximations of the new hex values for shadcn/radix compatibility:

```css
--background: 130 30% 97%;       /* #F4F9F5 ivory */
--foreground: 150 37% 16%;       /* #1A3828 espresso */

--card: 0 0% 100%;
--card-foreground: 150 37% 16%;

--popover: 0 0% 100%;
--popover-foreground: 150 37% 16%;

--primary: 142 33% 36%;          /* #3D7A54 caramel (forest green) */
--primary-foreground: 130 30% 97%; /* INTENTIONAL FLIP: was dark text on tan; now light text on green */

--secondary: 128 28% 93%;        /* #E8F3EA cream */
--secondary-foreground: 150 37% 16%;

--muted: 128 28% 93%;
--muted-foreground: 135 15% 42%; /* #5A7A62 mink */

--accent: 128 28% 93%;
--accent-foreground: 150 37% 16%;

--destructive: 0 84.2% 60.2%;
--destructive-foreground: 130 30% 97%;

--border: 128 20% 88%;
--input: 128 20% 88%;
--ring: 142 33% 36%;             /* #3D7A54 forest green focus ring */

--radius: 0.5rem;                /* organic: gentle rounding (was 0rem) */
```

Note: `--primary-foreground` flips from dark (`25 27% 9%`) to light (`130 30% 97%`). This is intentional — forest green primary buttons require light text for contrast. All primary button text will be near-white.

## CSS Variables — Dark Mode (index.css .dark)

Same hue shift as light mode (warm brown → forest green), preserving relative lightness values:

```css
--background: 140 20% 15%;
--foreground: 130 30% 96%;
--card: 140 15% 20%;
--card-foreground: 130 30% 96%;
--popover: 140 15% 20%;
--popover-foreground: 130 30% 96%;
--primary: 142 33% 36%;
--primary-foreground: 140 20% 97%;
--secondary: 140 10% 30%;
--secondary-foreground: 130 30% 96%;
--muted: 140 10% 25%;
--muted-foreground: 140 10% 65%;
--accent: 140 10% 30%;
--accent-foreground: 130 30% 96%;
--destructive: 0 62.8% 30.6%;
--destructive-foreground: 130 30% 96%;
--border: 140 10% 25%;
--input: 140 10% 25%;
--ring: 142 33% 36%;
```

## Component-Level Changes

### index.css utilities

- **`glass-dark`**: `rgba(28, 21, 16, 0.88)` → `rgba(26, 56, 40, 0.88)` (dark forest overlay)
- **`skeleton-caramel`**: three gradient stops — replace `rgba(196,168,130,` prefix with `rgba(61,122,84,`; opacity suffixes (`,0.05)`, `,0.15)`, `,0.05)`) stay unchanged — the same opacities produce an equivalently subtle shimmer in green.

### tailwind.config.ts

- Update all fixed hex values in the `colors` extension to new values above
- Add `oak: '#C4965A'` to the fixed palette

## Hardcoded Color Audit

After updating tokens, grep `apps/web/src/` for raw hex values that would leak the old brown palette. Also grep `apps/web/src/index.css` for the rgba patterns.

| Pattern | Replace with | Notes |
|---------|-------------|-------|
| `#1C1510` | `#1A3828` | Navbar logo color (confirmed in Navbar.tsx); also espresso text in inline styles |
| `#6B5A4E` | `#5A7A62` | Old mink in any inline styles |
| `#8C6A4A` | `#2A5C3E` | Old walnut (used in service card shadows per tailwind.config.ts comment) |
| `#C4A882` | `#3D7A54` | Old caramel in any inline styles |
| `#FAF7F2` | `#F4F9F5` | Old ivory in any inline styles |
| `#F0EBE3` | `#E8F3EA` | Old cream in any inline styles |
| `rgba(28, 21, 16` | `rgba(26, 56, 40` | glass-dark in index.css |
| `rgba(196,168,130` | `rgba(61,122,84` | skeleton-caramel in index.css (3 instances, opacities unchanged) |

## Out of Scope

- No changes to routing, API calls, state management, or component logic
- No changes to typography (fonts, weights, sizes, letter-spacing)
- No changes to layout, spacing, or component structure
- No changes to animations or keyframe timings (only the color of the skeleton shimmer)
