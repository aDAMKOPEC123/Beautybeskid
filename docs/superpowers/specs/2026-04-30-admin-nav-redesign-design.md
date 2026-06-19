# Admin Navigation Redesign — Design Spec

**Date:** 2026-04-30
**Status:** Approved
**Scope:** `cosmo-app/apps/web/src/components/layout/AdminLayout.tsx`

## Problem

The current admin sidebar mixes three collapsible groups (Pracownik, Edycja stron, Zniżki) with six loose standalone links (Użytkownicy, Asortyment, Regulamin, Quizy, Recenzje, Twoja Skóra). The loose items create visual noise and make navigation hard to scan.

## Decision

Replace with **7 clearly named collapsible sections**. Nothing standalone except Dashboard.

## New Navigation Structure

```
Dashboard  →  /admin

[Komunikacja]
  - Powiadomienia          /admin/powiadomienia   badge: adminNotifUnread (bg-destructive, animate-pulse on badge span)
  - Chat                   /admin/chat             badge: staffUnreadTotal (bg-destructive, animate-pulse on badge span)
    note: "Chat" replaces current label "Wiadomości (Chat)" — intentional

[Wizyty i personel]
  - Wizyty                 /admin/wizyty           badge: unreadCount (bg-destructive); pulsing row when > 0; onClick: markAllRead
  - Konsultacje            /admin/konsultacje       badge: newLeadsCount (bg-primary — NOT red)
  - Pracownicy             /admin/pracownicy
  - Praca                  /admin/praca

[Klienci]
  - Użytkownicy            /admin/uzytkownicy
  - Recenzje               /admin/recenzje

[Treści]
  - Slider strony głównej  /admin/hero
  - Polecane zabiegi       /admin/polecane-zabiegi
  - Strona „O nas"         /admin/o-nas
  - Zarządzaj Usługami     /admin/uslugi
  - Wpisy na Blogu         /admin/blog
  - Metamorfozy            /admin/metamorfozy

[Diagnostyka]
  - Quizy                  /admin/quizy
  - Twoja Skóra            /admin/pogoda-skory

[Sprzedaż]
  - Kody Rabatowe          /admin/kody-rabatowe
  - Program Lojalnościowy  /admin/lojalnosc
  - Asortyment             /admin/asortyment

[Ustawienia]
  - Regulamin              /admin/regulamin
```

## State — 7 useState Flags

Replace `pagesOpen`, `discountsOpen`, `staffOpen` with 7 new flags. Each initializes via `location.pathname`:

| Flag | Initializer routes |
|---|---|
| `komunikacjaOpen` | `/admin/powiadomienia`, `/admin/chat` |
| `wizytyOpen` | `/admin/wizyty`, `/admin/konsultacje`, `/admin/pracownicy`, `/admin/praca` |
| `klienciOpen` | `/admin/uzytkownicy`, `/admin/recenzje` |
| `tresciOpen` | `/admin/hero`, `/admin/polecane-zabiegi`, `/admin/o-nas`, `/admin/uslugi`, `/admin/blog`, `/admin/metamorfozy` |
| `diagnostykaOpen` | `/admin/quizy`, `/admin/pogoda-skory` |
| `sprzedazOpen` | `/admin/kody-rabatowe`, `/admin/lojalnosc`, `/admin/asortyment` |
| `ustawieniaOpen` | `/admin/regulamin` |

Each: `() => ['/admin/route1', ...].some(p => location.pathname.startsWith(p))`

## Badge Behavior

### Group header aggregate badges (shown only when section is collapsed)

Two group headers show an aggregate badge **only when that section is collapsed** (`!komunikacjaOpen`, `!wizytyOpen`):

- **Komunikacja**: `adminNotifUnread + staffUnreadTotal`
- **Wizyty i personel**: `unreadCount + newLeadsCount`

Condition in JSX: `{!komunikacjaOpen && (adminNotifUnread + staffUnreadTotal) > 0 && <span ...>}`

Styling: `bg-destructive text-white animate-pulse`, capped at `"9+"` when > 9. Hide entirely when sum is 0.

### Sub-item badge styles

| Link | Badge value | Color | animate-pulse |
|---|---|---|---|
| Powiadomienia | adminNotifUnread | bg-destructive | yes — on badge span |
| Chat | staffUnreadTotal | bg-destructive | yes — on badge span |
| Wizyty | unreadCount | bg-destructive | via row pulsing (see below) |
| Konsultacje | newLeadsCount | bg-primary | no |

### Wizyty special behavior (preserve exactly)
```tsx
<Link
  to="/admin/wizyty"
  onClick={markAllRead}
  className={`px-3 py-1.5 text-sm rounded-md flex items-center justify-between ${
    unreadCount > 0
      ? 'bg-destructive/10 text-destructive animate-pulse font-semibold'
      : 'hover:bg-accent hover:text-accent-foreground'
  }`}
>
  <span>Wizyty</span>
  {unreadCount > 0 && (
    <span className="bg-destructive text-white text-xs rounded-full px-1.5 min-w-[1.25rem] text-center">
      {unreadCount > 9 ? '9+' : unreadCount}
    </span>
  )}
</Link>
```

## Implementation Steps

Single file: `apps/web/src/components/layout/AdminLayout.tsx`

1. **Replace state flags**: Remove `pagesOpen`, `discountsOpen`, `staffOpen`. Add 7 new flags from the table above.

2. **Remove `totalStaffBadge`**: Remove `const totalStaffBadge = unreadCount + newLeadsCount`. Compute group header aggregate badges inline or as new named consts.

3. **Rebuild nav JSX**: 7 section groups, same visual pattern (border-l, pl-3, chevron rotation). Each section: `<button>` header toggles its flag + `<div>` of sub-links when open. Group header badges follow the collapsed-only condition from the Badge Behavior section.

4. **Preserve Wizyty link exactly**: Copy the JSX from the snippet above verbatim — `onClick={markAllRead}`, pulsing row class, red badge.

5. **Preserve Konsultacje badge color**: `bg-primary` on the badge span, not `bg-destructive`.

6. **Remove icon JSX and imports**: Remove the `<Bell />`, `<ShoppingBag />`, and `<Cloud />` JSX from the Powiadomienia, Asortyment, and Twoja Skóra links respectively. Then remove the now-unused `Bell`, `ShoppingBag`, `Cloud` from the Lucide import line.

7. **Use full display labels**: Use the Polish display labels from the structure table (e.g. "Slider strony głównej", "Wpisy na Blogu") — not shortened slugs.

## What Does NOT Change

- All route paths (`/admin/...`)
- All badge data sources (React Query hooks, socket events, stores)
- Push notification subscribe button at sidebar bottom
- `<main>` content area, `<Navbar />`, mobile behavior (`hidden md:flex`)
- Active-state highlighting logic per sub-link
