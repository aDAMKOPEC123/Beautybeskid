# Mobile Bottom Nav on Public Pages — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the user-panel mobile bottom tab bar on public pages when the user is logged in.

**Architecture:** Extract the inline bottom nav + sheet from `UserLayout` into a standalone `MobileBottomNav` component that manages its own state and queries, then use it in both `UserLayout` and `PublicLayout`.

**Tech Stack:** React, React Router v7, TanStack Query, Zustand, Tailwind CSS, lucide-react

---

### Task 1: Create `MobileBottomNav` component

**Files:**
- Create: `apps/web/src/components/layout/MobileBottomNav.tsx`

- [ ] **Step 1: Create the component file**

Extract everything related to the mobile bottom bar from `UserLayout.tsx`:
- `BOTTOM_TABS` and `ALL_MENU_ITEMS` constants
- `menuOpen` state
- `journalUnread` and `notifUnread` queries
- `unreadCount` from `useChatStore`
- `isActive` helper
- The full bottom bar `<nav>` JSX
- The sheet JSX (backdrop + drawer)

The component returns `null` when `!isAuthenticated`.

```tsx
// apps/web/src/components/layout/MobileBottomNav.tsx
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useChatStore } from '@/store/chat.store';
import { skinJournalApi } from '@/api/skin-journal.api';
import { notificationsApi } from '@/api/notifications.api';
import type { ElementType } from 'react';
import {
  LayoutDashboard, Calendar, Star, Clock, BookOpen,
  ShoppingBag, Users, Bell, User as UserIcon, Menu, X, MessageCircle,
} from 'lucide-react';

const ALL_MENU_ITEMS = [
  { to: '/user',               label: 'Dashboard',       icon: LayoutDashboard },
  { to: '/user/wizyty',        label: 'Moje Wizyty',     icon: Calendar },
  { to: '/user/lojalnosc',     label: 'Punkty',          icon: Star },
  { to: '/user/historia',      label: 'Moja Historia',   icon: Clock },
  { to: '/user/dziennik',      label: 'Dziennik',        icon: BookOpen },
  { to: '/user/produkty',      label: 'Moje Produkty',   icon: ShoppingBag },
  { to: '/user/polecenia',     label: 'Program Poleceń', icon: Users },
  { to: '/user/chat',          label: 'Czat',            icon: MessageCircle },
  { to: '/user/powiadomienia', label: 'Powiadomienia',   icon: Bell },
  { to: '/user/profil',        label: 'Mój Profil',      icon: UserIcon },
];

type BottomTab =
  | { isMenu: true; label: string; icon: ElementType }
  | { isMenu?: never; to: string; label: string; icon: ElementType };

const BOTTOM_TABS: BottomTab[] = [
  { isMenu: true,              label: 'Menu',          icon: Menu },
  { to: '/user/wizyty',        label: 'Wizyty',        icon: Calendar },
  { to: '/user/dziennik',      label: 'Dziennik',      icon: BookOpen },
  { to: '/user/powiadomienia', label: 'Powiadomienia', icon: Bell },
  { to: '/user/profil',        label: 'Profil',        icon: UserIcon },
];

export const MobileBottomNav = () => {
  const { isAuthenticated } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const { unreadCount } = useChatStore();
  const location = useLocation();

  const { data: journalUnread = 0 } = useQuery<number>({
    queryKey: ['journal', 'unread'],
    queryFn: skinJournalApi.getUnreadCount,
    enabled: isAuthenticated,
    refetchInterval: 30_000,
    staleTime: 0,
  });

  const { data: notifUnread = 0 } = useQuery<number>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.getUnreadCount(),
    enabled: isAuthenticated,
    refetchInterval: 30_000,
  });

  if (!isAuthenticated) return null;

  const isActive = (path: string) =>
    path === '/user' ? location.pathname === '/user' : location.pathname.startsWith(path);

  return (
    <>
      {/* Bottom tab bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t"
        style={{ background: '#fff', borderColor: 'rgba(0,0,0,0.08)' }}
      >
        <div className="flex items-stretch h-16">
          {BOTTOM_TABS.map((tab) => {
            const { label, icon: Icon } = tab;
            if (tab.isMenu) {
              return (
                <button
                  key="menu"
                  onClick={() => setMenuOpen(true)}
                  className="flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium"
                  style={{ color: menuOpen ? '#B8913A' : '#6B6560' }}
                >
                  <Icon size={20} />
                  <span>{label}</span>
                </button>
              );
            }
            const { to } = tab;
            const active = isActive(to);
            const color = active ? '#B8913A' : '#6B6560';
            return (
              <Link
                key={to}
                to={to}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium relative"
                style={{ color }}
              >
                <div className="relative">
                  <Icon size={20} />
                  {to === '/user/dziennik' && journalUnread > 0 && (
                    <span
                      className="absolute -top-1 -right-1 text-[9px] rounded-full px-1 font-bold leading-4 min-w-[14px] text-center"
                      style={{ background: '#B8913A', color: '#fff' }}
                    >
                      {journalUnread > 9 ? '9+' : journalUnread}
                    </span>
                  )}
                  {to === '/user/powiadomienia' && notifUnread > 0 && (
                    <span
                      className="absolute -top-1 -right-1 text-[9px] rounded-full px-1 font-bold leading-4 min-w-[14px] text-center"
                      style={{ background: '#B8913A', color: '#fff' }}
                    >
                      {notifUnread > 9 ? '9+' : notifUnread}
                    </span>
                  )}
                </div>
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile Menu Sheet */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-[59] md:hidden"
            onClick={() => setMenuOpen(false)}
          />
          <div
            className="fixed inset-x-0 bottom-0 z-[60] md:hidden bg-white rounded-t-3xl"
            style={{ maxHeight: '82vh', overflowY: 'auto' }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>
            <div className="flex items-center justify-between px-5 py-3">
              <span className="text-base font-semibold" style={{ color: '#1A1208' }}>Menu</span>
              <button onClick={() => setMenuOpen(false)} style={{ color: 'rgba(26,18,8,0.5)' }}>
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 px-4 pb-4">
              {ALL_MENU_ITEMS.map(({ to, label, icon: Icon }) => {
                const active = isActive(to);
                return (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl border text-sm font-medium transition-all relative"
                    style={
                      active
                        ? { background: 'rgba(184,145,58,0.08)', borderColor: 'rgba(184,145,58,0.3)', color: '#B8913A' }
                        : { background: '#FAFAF9', borderColor: 'rgba(0,0,0,0.07)', color: '#1A1208' }
                    }
                  >
                    <Icon size={20} />
                    <span>{label}</span>
                    {to === '/user/dziennik' && journalUnread > 0 && (
                      <span className="absolute top-2 right-2 text-[9px] rounded-full px-1 font-bold leading-4 min-w-[14px] text-center"
                        style={{ background: '#B8913A', color: '#fff' }}>
                        {journalUnread > 9 ? '9+' : journalUnread}
                      </span>
                    )}
                    {to === '/user/chat' && unreadCount > 0 && (
                      <span className="absolute top-2 right-2 text-[9px] rounded-full px-1 font-bold leading-4 min-w-[14px] text-center"
                        style={{ background: '#B8913A', color: '#fff' }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                    {to === '/user/powiadomienia' && notifUnread > 0 && (
                      <span className="absolute top-2 right-2 text-[9px] rounded-full px-1 font-bold leading-4 min-w-[14px] text-center"
                        style={{ background: '#B8913A', color: '#fff' }}>
                        {notifUnread > 9 ? '9+' : notifUnread}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
            <div className="px-4 pb-6">
              <Link
                to="/rezerwacja"
                onClick={() => setMenuOpen(false)}
                className="block w-full text-center py-3 px-4 rounded-full text-sm font-semibold"
                style={{ background: '#1A1208', color: '#fff' }}
              >
                + Umów wizytę
              </Link>
            </div>
          </div>
        </>
      )}
    </>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/layout/MobileBottomNav.tsx
git commit -m "feat: extract MobileBottomNav into standalone component"
```

---

### Task 2: Refactor `UserLayout` to use `MobileBottomNav`

**Files:**
- Modify: `apps/web/src/components/layout/UserLayout.tsx`

- [ ] **Step 1: Remove inline bottom nav code from UserLayout**

Remove from `UserLayout.tsx`:
- `BOTTOM_TABS` constant (lines 63–69)
- `ALL_MENU_ITEMS` constant (lines 34–45)
- `BottomTab` type (lines 59–62)
- `menuOpen` state: `const [menuOpen, setMenuOpen] = useState(false);`
- The entire `{/* Mobile bottom tab bar */}` block (lines 266–320)
- The entire `{/* Mobile Menu Sheet */}` block (lines 321–402)

Add import:
```tsx
import { MobileBottomNav } from './MobileBottomNav';
```

Replace the removed JSX with:
```tsx
<MobileBottomNav />
```

(Place it just before the closing `</div>` of the root element, after `<ReviewPromptModal />`.)

Remove unused imports from UserLayout that were only used by the bottom nav:
- `Menu` from lucide-react (keep `X` only if used elsewhere — check)
- `LayoutDashboard, Star, Clock, ShoppingBag, Users` — remove if not used elsewhere in UserLayout
- Keep: `Bell, BookOpen, Calendar, UserIcon, MessageCircle` only if still referenced

Note: `menuOpen` was also used in the `setMenuOpen` call on the hamburger sidebar — it no longer exists. Double-check the sidebar doesn't reference `menuOpen`.

- [ ] **Step 2: Verify the app compiles without errors**

```bash
cd apps/web && pnpm build 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/layout/UserLayout.tsx
git commit -m "refactor: use MobileBottomNav component in UserLayout"
```

---

### Task 3: Add `MobileBottomNav` to `PublicLayout`

**Files:**
- Modify: `apps/web/src/components/layout/PublicLayout.tsx`

- [ ] **Step 1: Import and render MobileBottomNav**

```tsx
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { MobileBottomNav } from './MobileBottomNav';

export const PublicLayout = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pb-16 md:pb-0">
        <Outlet />
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
};
```

Note: `pb-16 md:pb-0` on `<main>` ensures content isn't hidden behind the fixed bottom bar on mobile. On desktop (`md:`) it resets to no padding.

- [ ] **Step 2: Verify the app compiles without errors**

```bash
cd apps/web && pnpm build 2>&1 | head -30
```

- [ ] **Step 3: Manual smoke test**
  - Open the app on mobile viewport (or DevTools mobile emulation)
  - Not logged in: bottom bar should NOT appear on public pages
  - Log in as a user: bottom bar should appear on both public pages and user panel pages
  - Tap "Menu" tab: sheet should open with all menu items
  - Navigate between public pages: active state on bottom bar updates correctly

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/layout/PublicLayout.tsx
git commit -m "feat: show MobileBottomNav on public pages for logged-in users"
```
