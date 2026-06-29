# Design: Navbar App Entry Button

**Date:** 2026-05-26
**Status:** Approved
**File affected:** `cosmo-app/apps/web/src/components/layout/Navbar.tsx`

## Problem

The public landing page has no clear, prominent entry point to the client application. The existing "Moje Konto" / "Zaloguj" links are styled as plain small-text links, making them easy to miss. Users visiting the marketing site don't have an obvious CTA to enter the app.

## Solution

Replace the existing "Moje Konto" / "Zaloguj sie" text links with a two-line styled block ("Panel klienta") that:
- Makes the app entry point visually distinct from navigation links
- Explains what will happen when not authenticated
- Adapts its text and destination to the user's auth state

The `panelLabel` and `panelLink` variable declarations at the top of the component become unused and must be removed.

## Design Details

### Visual Style

A two-line flex column block:

```
Panel klienta →              <- line 1: caramel, 10px, uppercase, caramel underline
zaloguj lub zarejestruj sie  <- line 2: 8px, uppercase, muted gray
```

**Wrapper (desktop):**
```
display: flex
flexDirection: column
alignItems: flex-end
gap: 2px
```

**Wrapper (mobile):** same but `alignItems: flex-start` to match left-aligned items in the mobile bottom section.

**Line 1 styles:**
```
color: '#C8956C'
fontSize: '10px'
letterSpacing: '0.2em'
textTransform: 'uppercase'
borderBottom: '1px solid #C8956C'
paddingBottom: '1px'
```

**Line 2 styles:**
```
color: '#9A9A8A'
fontSize: '8px'
letterSpacing: '0.12em'
textTransform: 'uppercase'
```

### Behavior by Auth State

| State | Line 1 | Line 2 | Destination |
|-------|--------|--------|-------------|
| Not logged in | Panel klienta → | zaloguj lub zarejestruj sie | `/auth/login` |
| Logged in (user) | Panel klienta → | moje konto | `/user` |
| Logged in (admin) | Panel admina → | panel administracyjny | `/admin` |
| Logged in (employee) | Panel pracownika → | panel pracownika | `/employee` |

### Desktop CTA — Final Element Order

The desktop CTA area uses `flex items-center gap-3`. There is no explicit divider DOM element; spacing comes from `gap-3` alone.

**Unauthenticated:**
```
[Rezerwacja button]  [two-line Panel block]
```

**Authenticated:**
```
[Rezerwacja button]  [two-line Panel block]  [Wyloguj button]
```

### Mobile Overlay — Bottom Section Changes

The mobile bottom section currently contains:
- (authenticated) `{panelLabel}` link + `Wyloguj` button
- (unauthenticated) `Zaloguj sie` link

**After change:**
- Replace `{panelLabel}` / `Zaloguj sie` with the two-line block (left-aligned)
- `Wyloguj` button stays in place below the block (authenticated only), unchanged
- `Zarezerwuj wizyte` booking block stays unchanged at the bottom
- The two-line block Link must call `onClick={() => setMobileOpen(false)}` to close the overlay on navigation

### Behavioral Note

The entire two-line block is wrapped in a `<Link>` (react-router-dom) pointing to the appropriate destination. On mobile it includes `onClick={() => setMobileOpen(false)}`.

## Scope

- **In scope:** `Navbar.tsx` desktop CTA area, `Navbar.tsx` mobile bottom section, remove unused `panelLabel`/`panelLink` variables
- **Out of scope:** Footer, FloatingBookingCTA, any other file

## Implementation Summary

Single file change: `Navbar.tsx`
- Remove `panelLabel` and `panelLink` variable declarations
- Replace unauthenticated desktop "Zaloguj" link with two-line Panel block
- Replace authenticated desktop "Moje Konto"/"Panel Admina"/"Panel Pracownika" link with two-line Panel block
- Replace mobile "Zaloguj sie" / `{panelLabel}` link with two-line Panel block (left-aligned, with close handler)
