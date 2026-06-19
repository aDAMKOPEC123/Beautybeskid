# Release Fixes Design — 2026-06-02

## Overview

Four production-blocking issues to fix before release of the COSMO salon app:
1. Push notifications not working on mobile (for users and admins)
2. Notification badges missing in mobile nav
3. Mobile responsiveness — iOS zoom on inputs + scroll position not resetting
4. Chat unread count lost on app restart

---

## 1. Push Notifications

### Problem
`usePushSubscription` is only initialized in `AdminLayout` desktop sidebar. Regular users have no way to subscribe. Admins on mobile cannot see the subscribe button (sidebar is `hidden md:flex`). The `push` event handler in `sw.ts` defaults notification click URL to `/admin/wizyty` even for user notifications.

### Solution

**UserLayout (`apps/web/src/components/layout/UserLayout.tsx`)**
- Initialize `usePushSubscription()` inside `UserLayoutInner`
- Render `<PushPermissionPrompt>` — shown once, gated by `localStorage` key `push_prompt_shown`
- Condition: `isAuthenticated && isSupported && !isSubscribed && permission !== 'denied' && !localStorage.getItem('push_prompt_shown')`

**PushPermissionPrompt component (`apps/web/src/components/push/PushPermissionPrompt.tsx`)**
- Bottom-sheet on mobile (`fixed bottom-0 inset-x-0`), centered modal on desktop
- Two buttons: "Włącz powiadomienia" and "Nie teraz"
- "Włącz powiadomienia": calls `subscribe()`, then sets `localStorage.setItem('push_prompt_shown', '1')` only on success (if `subscribe()` throws, flag is NOT set so the prompt can appear again on next session)
- "Nie teraz": immediately sets `localStorage.setItem('push_prompt_shown', '1')` and closes

**User Profile page (`apps/web/src/pages/user/Profile.tsx`)**
- Add "Powiadomienia push" section with enable/disable toggle using `usePushSubscription()`
- This is the persistent opt-in/out path after the one-time prompt

**AdminLayout mobile push access (`apps/web/src/components/layout/AdminLayout.tsx`)**
- The existing push subscribe button is in the desktop sidebar (inside `hidden md:flex` aside)
- Add a duplicate push button in the `md:hidden` mobile section below the horizontal scroll nav, same conditions: `isSupported && !isSubscribed && permission !== 'denied'`

**sw.ts fix (`apps/web/src/sw.ts`)**
- Two occurrences of `'/admin/wizyty'` fallback must both be changed to `'/'`:
  1. In `push` event handler: `data: { url: data.url ?? '/admin/wizyty' }` → `data: { url: data.url ?? '/' }`
  2. In `notificationclick` handler: `?? '/admin/wizyty'` → `?? '/'`
- Using `/` as fallback since backend already passes the correct `url` for every notification type

---

## 2. Notification Badges

### Problem
`MobileBottomNav` "Więcej" button has no badge even when items inside (Powiadomienia, Dziennik, Rutyna) have unread counts.

### Solution (`apps/web/src/components/layout/MobileBottomNav.tsx`)
- Compute `moreBadge = notifUnread + journalUnread + routineUnread`
- Chat (`unreadCount`) is NOT included — it is a direct tab in `BOTTOM_TABS`, not hidden behind "Więcej", and already shows its own badge
- All three counts are fetched with `useQuery` and default to `0` — no NaN risk
- Render badge on the "Więcej" tab button when `moreBadge > 0`
- Badge style: `absolute -top-1 -right-1 text-[9px] rounded-full px-1 font-bold leading-4 min-w-[14px] text-center` with `background: '#C4965A', color: '#fff'`

---

## 3. Mobile Responsiveness

### 3a. Scroll to top on navigation

**Problem**: React Router `createBrowserRouter` does not auto-scroll to top on route changes in authenticated layouts. `PublicLayout` already has `<ScrollRestoration />` — no change needed there.

**Solution**: Create `ScrollToTop` component (`apps/web/src/components/shared/ScrollToTop.tsx`):
```tsx
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
};
```

Placement — render `<ScrollToTop />` at the top of the JSX returned by:
- `UserLayoutInner` (the inner component, not the outer `UserLayout` wrapper that adds `TourProvider`)
- `AdminLayout`
- `EmployeeLayout`

Do NOT add to `PublicLayout` — it already has `<ScrollRestoration />` from react-router-dom.

### 3b. iOS input zoom

**Problem**: iOS Safari zooms in when `<input>` or `<textarea>` has `font-size < 16px`.

**Solution**: Add to `apps/web/src/index.css`:
```css
@media (max-width: 768px) {
  input,
  textarea,
  select {
    font-size: 16px !important;
  }
}
```
Scoped to mobile only so desktop typography is unchanged.

---

## 4. Chat Unread Count Persistence

### Problem
`useChatStore.unreadCount` starts at 0 on every app start/refresh. Chat badge disappears even if unread messages exist. Socket events only increment the count for messages received in the current session.

### Solution (`apps/web/src/components/layout/UserLayout.tsx`)
`useChatStore` has `setUnreadCount(count: number)`. Initialize from server data in `UserLayoutInner`:

```ts
const { data: chatRoom } = useQuery({
  queryKey: ['chat', 'my-room'],
  queryFn: chatApi.getMyRoom,
  enabled: isAuthenticated,   // guard: do not fire before auth is hydrated
});

useEffect(() => {
  if (!chatRoom || !user) return;
  const serverUnread = (chatRoom.messages as ChatMessagePayload[])
    ?.filter(m => m.readAt == null && m.senderId !== user.id)
    .length ?? 0;
  setUnreadCount(serverUnread);
}, [chatRoom?.messages, user?.id, setUnreadCount]);
```

Notes:
- `enabled: isAuthenticated` prevents a 401 during the initial auth-hydration window (consistent with existing queries in `UserLayoutInner`)
- Dependency `[chatRoom?.messages, user?.id, setUnreadCount]` is correct per exhaustive-deps; Zustand actions are stable references
- `ChatMessagePayload` from `@cosmo/shared`
- Socket `chat:message` handler continues to call `incrementUnread()` for real-time messages
- Navigating to `/user/chat` calls `setUnreadCount(0)` + `markAsRead` as before — no change needed there

---

## Files to Modify

| File | Change |
|------|--------|
| `apps/web/src/sw.ts` | Fix both `/admin/wizyty` fallbacks → `/` |
| `apps/web/src/index.css` | Add iOS input font-size fix |
| `apps/web/src/components/layout/UserLayout.tsx` | Add `usePushSubscription`, `PushPermissionPrompt`, chat unread init, `ScrollToTop` |
| `apps/web/src/components/layout/AdminLayout.tsx` | Add `ScrollToTop`; add mobile push subscribe button below mobile nav |
| `apps/web/src/components/layout/EmployeeLayout.tsx` | Add `ScrollToTop` |
| `apps/web/src/components/layout/MobileBottomNav.tsx` | Add `moreBadge` to "Więcej" button |
| `apps/web/src/pages/user/Profile.tsx` | Add push notification toggle section |

## Files to Create

| File | Purpose |
|------|---------|
| `apps/web/src/components/push/PushPermissionPrompt.tsx` | One-time push opt-in prompt for users |
| `apps/web/src/components/shared/ScrollToTop.tsx` | Scroll-to-top on route change |

---

## Out of Scope

- Backend changes (push service ready, VAPID keys configured)
- Per-type notification preferences — post-release
- Android/iOS PWA install prompt — post-release
