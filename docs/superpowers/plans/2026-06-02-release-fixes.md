# Release Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix four production-blocking issues before release: push notifications for all users, missing mobile nav badges, iOS input zoom, scroll-to-top, and chat unread count persistence.

**Architecture:** All changes are confined to the React frontend (`apps/web/`). No backend changes needed — VAPID keys and push service are already configured. Changes touch layout components, a new `PushPermissionPrompt` component, a new `ScrollToTop` utility, the service worker source, global CSS, and the user Profile page.

**Tech Stack:** React 19, TypeScript, Vite + vite-plugin-pwa, Zustand, TanStack Query, react-router-dom v7, Tailwind CSS / inline styles (caramel `#C4965A` brand color)

**Spec:** `docs/superpowers/specs/2026-06-02-release-fixes-design.md`

---

## File Map

| Status | File | Change |
|--------|------|--------|
| CREATE | `apps/web/src/components/shared/ScrollToTop.tsx` | Scrolls window to top on every route change |
| CREATE | `apps/web/src/components/push/PushPermissionPrompt.tsx` | One-time bottom-sheet/modal push opt-in for users |
| MODIFY | `apps/web/src/sw.ts` | Fix `/admin/wizyty` fallback URLs → `/` |
| MODIFY | `apps/web/src/index.css` | iOS input zoom fix (font-size 16px on mobile) |
| MODIFY | `apps/web/src/components/layout/MobileBottomNav.tsx` | Add `moreBadge` to "Więcej" button |
| MODIFY | `apps/web/src/components/layout/UserLayout.tsx` | Add ScrollToTop, push subscription init, push prompt, chat unread init |
| MODIFY | `apps/web/src/components/layout/AdminLayout.tsx` | Add ScrollToTop + mobile push subscribe button |
| MODIFY | `apps/web/src/components/layout/EmployeeLayout.tsx` | Add ScrollToTop |
| MODIFY | `apps/web/src/pages/user/Profile.tsx` | Add push notification toggle section |

---

## Task 1: ScrollToTop component

**Files:**
- Create: `apps/web/src/components/shared/ScrollToTop.tsx`

- [ ] **Step 1: Create the component**

```tsx
// apps/web/src/components/shared/ScrollToTop.tsx
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};
```

- [ ] **Step 2: Add to UserLayoutInner**

In `apps/web/src/components/layout/UserLayout.tsx`, import and render `<ScrollToTop />` as the first child of the outermost `<div>` returned by `UserLayoutInner`:

```tsx
import { ScrollToTop } from '@/components/shared/ScrollToTop';

// Inside UserLayoutInner return:
return (
  <div className="min-h-screen flex flex-col bg-background">
    <ScrollToTop />
    {/* ... rest of layout ... */}
  </div>
);
```

- [ ] **Step 3: Add to AdminLayout**

In `apps/web/src/components/layout/AdminLayout.tsx`, import and render `<ScrollToTop />` as first child of the outermost `<div>`:

```tsx
import { ScrollToTop } from '@/components/shared/ScrollToTop';

// Inside AdminLayout return:
return (
  <div className="min-h-screen flex flex-col bg-muted/20 pt-[72px]">
    <ScrollToTop />
    {/* ... */}
  </div>
);
```

- [ ] **Step 4: Add to EmployeeLayout**

In `apps/web/src/components/layout/EmployeeLayout.tsx`:

```tsx
import { ScrollToTop } from '@/components/shared/ScrollToTop';

// Inside EmployeeLayout return:
return (
  <div className="min-h-screen flex flex-col pt-[72px]">
    <ScrollToTop />
    {/* ... */}
  </div>
);
```

- [ ] **Step 5: TypeScript check**

```bash
cd cosmo-app/apps/web && npx tsc --noEmit
```
Expected: no errors related to ScrollToTop

- [ ] **Step 6: Commit**

```bash
cd cosmo-app
git add apps/web/src/components/shared/ScrollToTop.tsx apps/web/src/components/layout/UserLayout.tsx apps/web/src/components/layout/AdminLayout.tsx apps/web/src/components/layout/EmployeeLayout.tsx
git commit -m "feat: add ScrollToTop to authenticated layouts"
```

---

## Task 2: iOS input zoom fix + sw.ts URL fix

**Files:**
- Modify: `apps/web/src/index.css`
- Modify: `apps/web/src/sw.ts`

- [ ] **Step 1: Fix iOS input zoom**

Open `apps/web/src/index.css`. Append at the end of the file:

```css
/* iOS: prevent auto-zoom on input focus (requires font-size >= 16px) */
@media (max-width: 768px) {
  input,
  textarea,
  select {
    font-size: 16px !important;
  }
}
```

- [ ] **Step 2: Fix sw.ts fallback URLs**

Open `apps/web/src/sw.ts`. Find and change both occurrences of `'/admin/wizyty'`:

In the `push` event handler (the `showNotification` call), change:
```ts
data: { url: data.url ?? '/admin/wizyty' },
```
to:
```ts
data: { url: data.url ?? '/' },
```

In the `notificationclick` handler, change:
```ts
(self as any).clients.openWindow(event.notification.data?.url ?? '/admin/wizyty'),
```
to:
```ts
(self as any).clients.openWindow(event.notification.data?.url ?? '/'),
```

After the changes the full `sw.ts` should look like:
```ts
// cache-version: v2
/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Cosmo', {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url ?? '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    (self as any).clients.openWindow(event.notification.data?.url ?? '/'),
  );
});
```

- [ ] **Step 3: Commit**

```bash
cd cosmo-app
git add apps/web/src/index.css apps/web/src/sw.ts
git commit -m "fix: iOS input zoom and push notification fallback URL"
```

---

## Task 3: MobileBottomNav "Więcej" badge

**Files:**
- Modify: `apps/web/src/components/layout/MobileBottomNav.tsx`

- [ ] **Step 1: Compute and render moreBadge**

In `MobileBottomNav.tsx`, the three counts are already fetched:
```ts
const { data: journalUnread = 0 } = useQuery<number>({ ... });
const { data: notifUnread = 0 } = useQuery<number>({ ... });
const { data: routineUnread = 0 } = useQuery<number>({ ... });
```

Add the computation just before the `return` statement:
```ts
const moreBadge = notifUnread + journalUnread + routineUnread;
```

Find the "Więcej" button render block (the `tab.isMenu` branch). It currently renders:
```tsx
<button
  key="menu"
  onClick={() => setMenuOpen(true)}
  className="flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium min-h-[44px]"
  style={{ color: menuOpen ? '#C4965A' : '#5A7A62' }}
>
  <span ... />
  <Icon size={20} />
  <span>{label}</span>
</button>
```

Wrap `<Icon size={20} />` in a relative container and add the badge:
```tsx
<button
  key="menu"
  onClick={() => setMenuOpen(true)}
  className="flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium min-h-[44px]"
  style={{ color: menuOpen ? '#C4965A' : '#5A7A62' }}
>
  <span className={cn('block h-0.5 rounded-full mx-auto mb-0.5 transition-all duration-200', menuOpen ? 'w-4 bg-caramel' : 'w-0 bg-transparent')} />
  <div className="relative">
    <Icon size={20} />
    {!menuOpen && moreBadge > 0 && (
      <span
        className="absolute -top-1 -right-1 text-[9px] rounded-full px-1 font-bold leading-4 min-w-[14px] text-center"
        style={{ background: '#C4965A', color: '#fff' }}
      >
        {moreBadge > 9 ? '9+' : moreBadge}
      </span>
    )}
  </div>
  <span>{label}</span>
</button>
```

Note: Badge is hidden when menu is open (`!menuOpen`) since the items are visible and their own badges show.

- [ ] **Step 2: TypeScript check**

```bash
cd cosmo-app/apps/web && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
cd cosmo-app
git add apps/web/src/components/layout/MobileBottomNav.tsx
git commit -m "feat: add aggregate unread badge to MobileBottomNav Więcej button"
```

---

## Task 4: Chat unread count init in UserLayout

**Files:**
- Modify: `apps/web/src/components/layout/UserLayout.tsx`

- [ ] **Step 1: Add imports**

At the top of `UserLayout.tsx`, add:
```ts
import { chatApi } from '@/api/chat.api';
import type { ChatMessagePayload } from '@cosmo/shared';
```

Also ensure `setUnreadCount` is destructured from `useChatStore`:
```ts
const { unreadCount, incrementUnread, setUnreadCount } = useChatStore();
```
(Currently only `unreadCount` and `incrementUnread` are destructured — add `setUnreadCount`)

- [ ] **Step 2: Add the query and useEffect**

Inside `UserLayoutInner`, after the existing `useQuery` blocks, add:

```ts
const { data: chatRoom } = useQuery({
  queryKey: ['chat', 'my-room'],
  queryFn: chatApi.getMyRoom,
  enabled: isAuthenticated,
  staleTime: 30_000,
});

useEffect(() => {
  if (!chatRoom || !user) return;
  const serverUnread = (chatRoom.messages as ChatMessagePayload[])
    ?.filter((m) => m.readAt == null && m.senderId !== user.id)
    .length ?? 0;
  setUnreadCount(serverUnread);
}, [chatRoom?.messages, user?.id, setUnreadCount]);
```

- [ ] **Step 3: TypeScript check**

```bash
cd cosmo-app/apps/web && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
cd cosmo-app
git add apps/web/src/components/layout/UserLayout.tsx
git commit -m "fix: initialize chat unread count from server on app start"
```

---

## Task 5: PushPermissionPrompt component

**Files:**
- Create: `apps/web/src/components/push/PushPermissionPrompt.tsx`

- [ ] **Step 1: Create the component**

```tsx
// apps/web/src/components/push/PushPermissionPrompt.tsx
import { useState } from 'react';
import { Bell, X } from 'lucide-react';

interface PushPermissionPromptProps {
  onSubscribe: () => Promise<void>;
  onDismiss: () => void;
}

export const PushPermissionPrompt = ({ onSubscribe, onDismiss }: PushPermissionPromptProps) => {
  const [loading, setLoading] = useState(false);

  const handleEnable = async () => {
    setLoading(true);
    try {
      await onSubscribe();
      localStorage.setItem('push_prompt_shown', '1');
    } catch {
      // subscribe() already shows a toast on failure — do NOT set flag so prompt can retry
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('push_prompt_shown', '1');
    onDismiss();
  };

  return (
    <>
      {/* Mobile: bottom sheet */}
      <div
        className="fixed bottom-16 inset-x-0 z-[70] md:hidden mx-3 mb-2 rounded-2xl shadow-xl border p-4"
        style={{ background: '#fff', borderColor: 'rgba(196,150,90,0.25)' }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: 'rgba(196,150,90,0.1)' }}
          >
            <Bell size={20} style={{ color: '#C4965A' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold mb-0.5" style={{ color: '#1A3828' }}>
              Włącz powiadomienia push
            </p>
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(20,40,28,0.55)' }}>
              Bądź na bieżąco — dowiedz się o potwierdzeniu wizyty, nowych promocjach i komentarzach kosmetologa.
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleEnable}
                disabled={loading}
                className="flex-1 py-2 rounded-xl text-xs font-semibold transition-colors"
                style={{ background: '#1A3828', color: '#fff', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Włączanie…' : 'Włącz'}
              </button>
              <button
                onClick={handleDismiss}
                className="flex-1 py-2 rounded-xl text-xs font-medium transition-colors border"
                style={{ borderColor: 'rgba(0,0,0,0.1)', color: 'rgba(20,40,28,0.55)' }}
              >
                Nie teraz
              </button>
            </div>
          </div>
          <button onClick={handleDismiss} className="shrink-0 p-1" style={{ color: 'rgba(20,40,28,0.3)' }}>
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Desktop: floating card bottom-right */}
      <div
        className="hidden md:block fixed bottom-6 right-6 z-[70] w-80 rounded-2xl shadow-xl border p-5"
        style={{ background: '#fff', borderColor: 'rgba(196,150,90,0.25)' }}
      >
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100"
          style={{ color: 'rgba(20,40,28,0.3)' }}
        >
          <X size={16} />
        </button>
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'rgba(196,150,90,0.1)' }}
          >
            <Bell size={20} style={{ color: '#C4965A' }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: '#1A3828' }}>
            Włącz powiadomienia push
          </p>
        </div>
        <p className="text-xs leading-relaxed mb-4" style={{ color: 'rgba(20,40,28,0.55)' }}>
          Bądź na bieżąco — dowiedz się o potwierdzeniu wizyty, nowych promocjach i komentarzach kosmetologa.
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleEnable}
            disabled={loading}
            className="flex-1 py-2 rounded-xl text-xs font-semibold transition-colors"
            style={{ background: '#1A3828', color: '#fff', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Włączanie…' : 'Włącz powiadomienia'}
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-2 rounded-xl text-xs font-medium border transition-colors"
            style={{ borderColor: 'rgba(0,0,0,0.1)', color: 'rgba(20,40,28,0.55)' }}
          >
            Nie teraz
          </button>
        </div>
      </div>
    </>
  );
};
```

- [ ] **Step 2: TypeScript check**

```bash
cd cosmo-app/apps/web && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
cd cosmo-app
git add apps/web/src/components/push/PushPermissionPrompt.tsx
git commit -m "feat: add PushPermissionPrompt component"
```

---

## Task 6: Push subscription in UserLayout

**Files:**
- Modify: `apps/web/src/components/layout/UserLayout.tsx`

- [ ] **Step 1: Add import and hook**

In `UserLayout.tsx`, add the import:
```ts
import { usePushSubscription } from '@/hooks/usePushSubscription';
import { PushPermissionPrompt } from '@/components/push/PushPermissionPrompt';
```

Inside `UserLayoutInner`, add state and hook:
```ts
const [showPushPrompt, setShowPushPrompt] = useState(false);
const { isSupported, isSubscribed, permission, subscribe } = usePushSubscription();
```

(Add `useState` to the existing React import if not already there)

- [ ] **Step 2: Show prompt after auth + data load**

Add a `useEffect` in `UserLayoutInner` that shows the prompt once conditions are met:

```ts
useEffect(() => {
  if (
    isAuthenticated &&
    isSupported &&
    !isSubscribed &&
    permission !== 'denied' &&
    !localStorage.getItem('push_prompt_shown')
  ) {
    // Small delay so the page renders first
    const timer = setTimeout(() => setShowPushPrompt(true), 2000);
    return () => clearTimeout(timer);
  }
}, [isAuthenticated, isSupported, isSubscribed, permission]);
```

- [ ] **Step 3: Render the prompt**

In the JSX returned by `UserLayoutInner`, add before the closing `</div>` at the bottom (after `<ReviewPromptModal />` and `<MobileBottomNav />`):

```tsx
{showPushPrompt && (
  <PushPermissionPrompt
    onSubscribe={async () => {
      await subscribe();
      setShowPushPrompt(false);
    }}
    onDismiss={() => setShowPushPrompt(false)}
  />
)}
```

- [ ] **Step 4: TypeScript check**

```bash
cd cosmo-app/apps/web && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
cd cosmo-app
git add apps/web/src/components/layout/UserLayout.tsx
git commit -m "feat: add push subscription init and prompt to UserLayout"
```

---

## Task 7: Push toggle in User Profile

**Files:**
- Modify: `apps/web/src/pages/user/Profile.tsx`

- [ ] **Step 1: Add push hook to Profile**

In `apps/web/src/pages/user/Profile.tsx`, add import:
```ts
import { usePushSubscription } from '@/hooks/usePushSubscription';
import { Bell, BellOff } from 'lucide-react';
```

Inside `UserProfile`, destructure the hook:
```ts
const { isSupported, isSubscribed, permission, subscribe, unsubscribe } = usePushSubscription();
```

- [ ] **Step 2: Add push section to Profile JSX**

Find the last section in the Profile page JSX (e.g. the consent toggles section). Add a new section after it:

```tsx
{isSupported && (
  <section className="mt-8">
    <h3
      className="text-sm font-semibold tracking-widest uppercase mb-4"
      style={{ color: 'rgba(20,40,28,0.4)', letterSpacing: '0.12em' }}
    >
      Powiadomienia push
    </h3>
    <div
      className="flex items-center justify-between p-4 rounded-2xl border"
      style={{ borderColor: 'rgba(0,0,0,0.07)', background: 'rgba(250,250,249,0.8)' }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(196,150,90,0.1)' }}
        >
          {isSubscribed ? (
            <Bell size={18} style={{ color: '#C4965A' }} />
          ) : (
            <BellOff size={18} style={{ color: 'rgba(20,40,28,0.35)' }} />
          )}
        </div>
        <div>
          <p className="text-sm font-medium" style={{ color: '#1A3828' }}>
            {isSubscribed ? 'Powiadomienia aktywne' : 'Powiadomienia wyłączone'}
          </p>
          <p className="text-xs" style={{ color: 'rgba(20,40,28,0.5)' }}>
            {permission === 'denied'
              ? 'Zablokowane w ustawieniach przeglądarki'
              : isSubscribed
              ? 'Otrzymujesz powiadomienia o wizytach i promocjach'
              : 'Włącz, aby być na bieżąco z wizytami i promocjami'}
          </p>
        </div>
      </div>
      {permission !== 'denied' && (
        <button
          onClick={isSubscribed ? unsubscribe : subscribe}
          className="text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
          style={
            isSubscribed
              ? { background: 'rgba(0,0,0,0.05)', color: 'rgba(20,40,28,0.6)' }
              : { background: '#1A3828', color: '#fff' }
          }
        >
          {isSubscribed ? 'Wyłącz' : 'Włącz'}
        </button>
      )}
    </div>
  </section>
)}
```

- [ ] **Step 3: TypeScript check**

```bash
cd cosmo-app/apps/web && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
cd cosmo-app
git add apps/web/src/pages/user/Profile.tsx
git commit -m "feat: add push notification toggle to user Profile page"
```

---

## Task 8: Admin mobile push button

**Files:**
- Modify: `apps/web/src/components/layout/AdminLayout.tsx`

- [ ] **Step 1: Add mobile push button**

In `apps/web/src/components/layout/AdminLayout.tsx`, the `usePushSubscription` hook is already imported and destructured:
```ts
const { isSupported, isSubscribed, permission, subscribe } = usePushSubscription();
```

Find the mobile horizontal nav block. It looks like:
```tsx
<nav className="md:hidden overflow-x-auto border-b bg-card flex gap-1 px-3 py-2 shrink-0" ...>
  {[...].map(...)}
</nav>
```

After this `<nav>` closing tag and before the `<div className="flex-1 flex overflow-hidden">`, add:

```tsx
{isSupported && !isSubscribed && permission !== 'denied' && (
  <div className="md:hidden px-3 py-2 border-b bg-card">
    <button
      onClick={subscribe}
      className="w-full text-xs px-3 py-2 rounded-md bg-primary/10 hover:bg-primary/20 text-primary font-medium transition-colors"
    >
      🔔 Włącz powiadomienia push
    </button>
  </div>
)}
```

- [ ] **Step 2: TypeScript check**

```bash
cd cosmo-app/apps/web && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
cd cosmo-app
git add apps/web/src/components/layout/AdminLayout.tsx
git commit -m "feat: add push subscribe button to admin mobile layout"
```

---

## Task 9: Manual verification

- [ ] **Step 1: Start dev server**

```bash
cd cosmo-app && pnpm dev
```

- [ ] **Step 2: Verify scroll-to-top**
Navigate between pages in the user panel (e.g. Dashboard → Profil → Wizyty). Each navigation should scroll the page to the top.

- [ ] **Step 3: Verify MobileBottomNav badge**
On mobile viewport (DevTools or real device), go to a page that generates unread notifications. Open MobileBottomNav — "Więcej" button should show a caramel badge with the count.

- [ ] **Step 4: Verify push prompt**
Log in as a user (not admin). After ~2 seconds, the push permission prompt should appear. Click "Włącz" — browser permission dialog should appear. If granted, toast "Powiadomienia push włączone" should show. Prompt should not appear again after refresh.

- [ ] **Step 5: Verify Profile push toggle**
Go to `/user/profil`. Scroll to the bottom. A "Powiadomienia push" section should be visible with current subscription state and enable/disable button.

- [ ] **Step 6: Verify admin mobile push**
On mobile viewport, log in as admin. Below the horizontal scroll nav, the "🔔 Włącz powiadomienia push" button should appear (if not already subscribed).

- [ ] **Step 7: Verify iOS zoom (real device or iOS simulator)**
Open the app on an iPhone. Tap any input field. The page should NOT zoom in.

- [ ] **Step 8: Final TypeScript build**

```bash
cd cosmo-app/apps/web && pnpm build
```
Expected: build completes without TypeScript errors.

- [ ] **Step 9: Commit verification**

```bash
cd cosmo-app
git log --oneline -10
```
Confirm all 8 feature commits are present.
