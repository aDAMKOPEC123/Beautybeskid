# Client Onboarding Tour Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an interactive step-by-step onboarding tour (driver.js) that fires on first login, highlights key UI elements across the full app, and can be restarted from the user profile.

**Architecture:** driver.js library powers the tour engine; a React Context (`TourProvider`) wraps the app in `App.tsx`; persisted completion state lives in PostgreSQL via a new `onboardingCompleted` boolean on the `User` model; `UserLayout` triggers the tour based on `freshUser.onboardingCompleted === false`.

**Tech Stack:** driver.js ^1.3.1, React Context, React Query (`freshUser` query already in UserLayout), Prisma migration, Express controller boolean guard.

---

## File Map

| Action | File |
|--------|------|
| Modify | `apps/server/prisma/schema.prisma` |
| Modify | `packages/shared/src/types/user.types.ts` |
| Modify | `apps/server/src/modules/users/users.service.ts` |
| Modify | `apps/server/src/modules/users/users.controller.ts` |
| Create | `apps/web/src/tours/utils.ts` |
| Create | `apps/web/src/tours/cosmo-tour.ts` |
| Create | `apps/web/src/contexts/TourContext.tsx` |
| Create | `apps/web/src/hooks/useTour.ts` |
| Modify | `apps/web/src/App.tsx` |
| Modify | `apps/web/src/components/layout/UserLayout.tsx` |
| Modify | `apps/web/src/components/layout/Navbar.tsx` |
| Modify | `apps/web/src/pages/public/ServiceList.tsx` |
| Modify | `apps/web/src/pages/user/Appointments.tsx` |
| Modify | `apps/web/src/components/loyalty/PointsBar.tsx` |
| Modify | `apps/web/src/components/chat/ChatWindow.tsx` |
| Modify | `apps/web/src/pages/user/Profile.tsx` (data-tour + restart button) |
| Modify | `apps/web/package.json` (add driver.js) |

---

## Task 1: Prisma migration — add `onboardingCompleted`

**Files:**
- Modify: `apps/server/prisma/schema.prisma`

- [ ] **Step 1: Add field to schema**

Open `apps/server/prisma/schema.prisma`. After line `photoConsent Boolean @default(false)` (around line 80) add:

```prisma
onboardingCompleted Boolean @default(false)
```

- [ ] **Step 2: Run migration**

```bash
cd cosmo-app/apps/server && pnpm prisma:migrate
```

When prompted for migration name enter: `add_onboarding_completed`

Expected: `✔ Database schema was successfully updated!`

- [ ] **Step 3: Commit**

```bash
cd cosmo-app
git add apps/server/prisma/schema.prisma apps/server/prisma/migrations
git commit -m "feat: add onboardingCompleted field to User model"
```

---

## Task 2: Shared type — add `onboardingCompleted`

**Files:**
- Modify: `packages/shared/src/types/user.types.ts`

- [ ] **Step 1: Add field to User interface**

In `packages/shared/src/types/user.types.ts`, after `referralCount?: number;` add:

```ts
onboardingCompleted?: boolean;
```

Optional (`?`) because existing sessions/tokens may not yet have this field hydrated.

- [ ] **Step 2: Commit**

```bash
cd cosmo-app
git add packages/shared/src/types/user.types.ts
git commit -m "feat: add onboardingCompleted to shared User type"
```

---

## Task 3: Backend — expose `onboardingCompleted` in service selects

**Files:**
- Modify: `apps/server/src/modules/users/users.service.ts`

- [ ] **Step 1: Add field to `getUserById` select**

In `users.service.ts`, in `getUserById` function, inside the `select` object (around line 70–89), add after `cardStaffNotes: true,`:

```ts
onboardingCompleted: true,
```

- [ ] **Step 2: Add field to `updateUser` select**

In `users.service.ts`, in `updateUser` function (around line 362–384), inside the `select` object, add after `cardStaffNotes: true,`:

```ts
onboardingCompleted: true,
```

- [ ] **Step 3: Regenerate Prisma client**

```bash
cd cosmo-app/apps/server && pnpm prisma:generate
```

Expected: `✔ Generated Prisma Client`

- [ ] **Step 4: Commit**

```bash
cd cosmo-app
git add apps/server/src/modules/users/users.service.ts
git commit -m "feat: expose onboardingCompleted in users service selects"
```

---

## Task 4: Backend — handle `onboardingCompleted` in controller

**Files:**
- Modify: `apps/server/src/modules/users/users.controller.ts`

- [ ] **Step 1: Update `updateMe` handler**

Replace the current `updateMe` function (lines 16–24):

```ts
export const updateMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, phone } = req.body;
    const user = await usersService.updateUser(req.user!.id, { name, phone });
    res.status(200).json({ status: 'success', data: { user } });
  } catch (error) {
    next(error);
  }
};
```

With:

```ts
export const updateMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, phone, onboardingCompleted } = req.body;
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (phone !== undefined) data.phone = phone;
    if (typeof onboardingCompleted === 'boolean') data.onboardingCompleted = onboardingCompleted;
    const user = await usersService.updateUser(req.user!.id, data);
    res.status(200).json({ status: 'success', data: { user } });
  } catch (error) {
    next(error);
  }
};
```

Note: The boolean type-guard mirrors the existing pattern in `updateConsents` (lines 26–37). Without it, a non-boolean value would cause a silent failure or Prisma type error.

- [ ] **Step 2: Build backend to check for TypeScript errors**

```bash
cd cosmo-app/apps/server && pnpm build
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
cd cosmo-app
git add apps/server/src/modules/users/users.controller.ts
git commit -m "feat: handle onboardingCompleted in updateMe controller"
```

---

## Task 5: Install driver.js

**Files:**
- Modify: `apps/web/package.json`

- [ ] **Step 1: Install package**

```bash
cd cosmo-app/apps/web && pnpm add driver.js
```

Expected: `driver.js` appears in `apps/web/package.json` dependencies.

- [ ] **Step 2: Commit**

```bash
cd cosmo-app
git add apps/web/package.json pnpm-lock.yaml
git commit -m "feat: add driver.js dependency"
```

---

## Task 6: Create `waitForElement` utility

**Files:**
- Create: `apps/web/src/tours/utils.ts`

- [ ] **Step 1: Create the file**

```ts
// apps/web/src/tours/utils.ts

/**
 * Polls the DOM every 100ms until the element matching `selector` appears,
 * or until `timeout` ms elapses. Returns the element or null.
 *
 * Used between tour steps that require navigating to a new route —
 * driver.js calls onNextClick synchronously, but React Router navigation
 * takes time before the DOM element exists.
 */
export function waitForElement(selector: string, timeout = 3000): Promise<Element | null> {
  return new Promise((resolve) => {
    const start = Date.now();
    const poll = () => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);
      if (Date.now() - start > timeout) {
        console.warn(`[Tour] Element "${selector}" not found within ${timeout}ms — skipping step`);
        return resolve(null);
      }
      setTimeout(poll, 100);
    };
    poll();
  });
}
```

- [ ] **Step 2: Commit**

```bash
cd cosmo-app
git add apps/web/src/tours/utils.ts
git commit -m "feat: add waitForElement tour utility"
```

---

## Task 7: Create TourContext

**Files:**
- Create: `apps/web/src/contexts/TourContext.tsx`
- Create: `apps/web/src/hooks/useTour.ts`

- [ ] **Step 1: Create TourContext**

```tsx
// apps/web/src/contexts/TourContext.tsx
import { createContext, useContext, useRef, useState, useCallback, ReactNode } from 'react';
import { driver, type Config } from 'driver.js';
import 'driver.js/dist/driver.css';

interface TourContextValue {
  startTour: () => void;
  stopTour: () => void;
  isActive: boolean;
}

const TourContext = createContext<TourContextValue | null>(null);

export function TourProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  // driverInstance is created lazily on startTour to avoid importing steps at module level
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);

  const stopTour = useCallback(() => {
    driverRef.current?.destroy();
    setIsActive(false);
  }, []);

  const startTour = useCallback(() => {
    // Lazy import to avoid circular deps — steps import from TourContext indirectly via useTour
    import('../tours/cosmo-tour').then(({ buildTourSteps }) => {
      const steps = buildTourSteps(stopTour);

      const config: Config = {
        animate: true,
        showProgress: true,
        allowClose: true,
        overlayOpacity: 0.6,
        stagePadding: 8,
        stageRadius: 8,
        popoverClass: 'cosmo-tour-popover',
        onDestroyStarted: () => {
          stopTour();
        },
        steps,
      };

      const d = driver(config);
      driverRef.current = d;
      setIsActive(true);
      d.drive();
    });
  }, [stopTour]);

  return (
    <TourContext.Provider value={{ startTour, stopTour, isActive }}>
      {children}
    </TourContext.Provider>
  );
}

export function useTourContext() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTourContext must be used inside TourProvider');
  return ctx;
}
```

- [ ] **Step 2: Create useTour hook**

```ts
// apps/web/src/hooks/useTour.ts
export { useTourContext as useTour } from '@/contexts/TourContext';
```

- [ ] **Step 3: Commit**

```bash
cd cosmo-app
git add apps/web/src/contexts/TourContext.tsx apps/web/src/hooks/useTour.ts
git commit -m "feat: add TourContext and useTour hook"
```

---

## Task 8: Create tour steps configuration

**Files:**
- Create: `apps/web/src/tours/cosmo-tour.ts`

- [ ] **Step 1: Create the tour steps file**

```ts
// apps/web/src/tours/cosmo-tour.ts
import { type DriveStep } from 'driver.js';
import { waitForElement } from './utils';

// navigate is called via window.history / react-router — we use the global router instance
// imported lazily to avoid module load order issues
async function navigateTo(path: string) {
  const { router } = await import('@/router');
  router.navigate(path);
}

/**
 * Builds the 11-step onboarding tour steps.
 * @param onTourEnd - called when the tour is finished or skipped (marks onboardingCompleted)
 */
export function buildTourSteps(onTourEnd: () => void): DriveStep[] {
  const markCompleted = async () => {
    try {
      const { api } = await import('@/lib/axios');
      await api.patch('/users/me', { onboardingCompleted: true });
    } catch {
      // non-blocking — tour still ends even if PATCH fails
    }
    onTourEnd();
  };

  return [
    // Step 1 — Welcome overlay (no element)
    {
      popover: {
        title: 'Witaj w COSMO! 💆‍♀️',
        description: 'Pokażemy Ci jak działa aplikacja. Możesz pominąć tour w dowolnej chwili.',
        nextBtnText: 'Zaczynamy →',
        doneBtnText: 'Pomiń tour',
      },
    },

    // Step 2 — Navbar booking button (still on /)
    {
      element: '[data-tour="navbar-booking-btn"]',
      popover: {
        title: 'Rezerwacja wizyty',
        description: 'Tutaj zarezerwujesz wizytę w kilka kliknięć.',
        nextBtnText: 'Dalej →',
        doneBtnText: 'Pomiń tour',
        onNextClick: async () => {
          await navigateTo('/uslugi');
          await waitForElement('[data-tour="services-list"]');
          (window as any).__cosmoDriver?.moveNext();
        },
      },
    },

    // Step 3 — Services list
    {
      element: '[data-tour="services-list"]',
      popover: {
        title: 'Nasze usługi',
        description: 'Przeglądaj nasze zabiegi i sprawdź szczegóły każdego z nich.',
        nextBtnText: 'Dalej →',
        doneBtnText: 'Pomiń tour',
        onNextClick: async () => {
          await navigateTo('/rezerwacja');
          await waitForElement('[data-tour="booking-wizard"]');
          (window as any).__cosmoDriver?.moveNext();
        },
      },
    },

    // Step 4 — BookingWizard
    {
      element: '[data-tour="booking-wizard"]',
      popover: {
        title: 'Kreator rezerwacji',
        description: 'Nasz kreator poprowadzi Cię przez rezerwację krok po kroku.',
        nextBtnText: 'Dalej →',
        doneBtnText: 'Pomiń tour',
        onNextClick: async () => {
          // Same page — wait for the quiz wrapper which may be conditionally rendered
          await waitForElement('[data-tour="service-quiz"]');
          (window as any).__cosmoDriver?.moveNext();
        },
      },
    },

    // Step 5 — Service quiz (same page, conditional render)
    {
      element: '[data-tour="service-quiz"]',
      popover: {
        title: 'Quiz doboru zabiegu',
        description: 'Nie wiesz co wybrać? Quiz dobierze zabieg idealnie do Twoich potrzeb.',
        nextBtnText: 'Dalej →',
        doneBtnText: 'Pomiń tour',
        onNextClick: async () => {
          await navigateTo('/user/wizyty');
          await waitForElement('[data-tour="appointments-list"]');
          (window as any).__cosmoDriver?.moveNext();
        },
      },
    },

    // Step 6 — Appointments list
    {
      element: '[data-tour="appointments-list"]',
      popover: {
        title: 'Moje wizyty',
        description: 'Tutaj znajdziesz wszystkie swoje wizyty — nadchodzące i historyczne.',
        nextBtnText: 'Dalej →',
        doneBtnText: 'Pomiń tour',
        onNextClick: async () => {
          await navigateTo('/user/lojalnosc');
          await waitForElement('[data-tour="loyalty-points-bar"]');
          (window as any).__cosmoDriver?.moveNext();
        },
      },
    },

    // Step 7 — Loyalty points bar
    {
      element: '[data-tour="loyalty-points-bar"]',
      popover: {
        title: 'Program lojalnościowy',
        description: 'Zbieraj punkty za każdą wizytę i wymieniaj je na nagrody.',
        nextBtnText: 'Dalej →',
        doneBtnText: 'Pomiń tour',
        onNextClick: async () => {
          await navigateTo('/user/chat');
          await waitForElement('[data-tour="chat-window"]');
          (window as any).__cosmoDriver?.moveNext();
        },
      },
    },

    // Step 8 — Chat window
    {
      element: '[data-tour="chat-window"]',
      popover: {
        title: 'Czat z salonem',
        description: 'Napisz do nas bezpośrednio — odpowiemy najszybciej jak możemy.',
        nextBtnText: 'Dalej →',
        doneBtnText: 'Pomiń tour',
        onNextClick: async () => {
          await navigateTo('/user/dziennik');
          await waitForElement('[data-tour="skin-journal"]');
          (window as any).__cosmoDriver?.moveNext();
        },
      },
    },

    // Step 9 — Skin journal
    {
      element: '[data-tour="skin-journal"]',
      popover: {
        title: 'Dziennik skóry',
        description: 'Prowadź swój osobisty dziennik skóry i śledź postępy leczenia.',
        nextBtnText: 'Dalej →',
        doneBtnText: 'Pomiń tour',
        onNextClick: async () => {
          await navigateTo('/user/profil');
          await waitForElement('[data-tour="profile-form"]');
          (window as any).__cosmoDriver?.moveNext();
        },
      },
    },

    // Step 10 — Profile form
    {
      element: '[data-tour="profile-form"]',
      popover: {
        title: 'Mój profil',
        description: 'Uzupełnij swój profil i zarządzaj ustawieniami konta.',
        nextBtnText: 'Dalej →',
        doneBtnText: 'Pomiń tour',
        onNextClick: async () => {
          await markCompleted();
        },
      },
    },

    // Step 11 — Finish overlay (no element)
    {
      popover: {
        title: 'Gotowe! 🎉',
        description: 'To wszystko! Zapraszamy na pierwszą wizytę. Możesz wrócić do tego przewodnika w ustawieniach profilu.',
        nextBtnText: 'Zacznij korzystać →',
        doneBtnText: 'Zamknij',
        onNextClick: async () => {
          await markCompleted();
        },
      },
    },
  ];
}
```

- [ ] **Step 2: Update TourContext to expose driver instance on window**

In `apps/web/src/contexts/TourContext.tsx`, inside the `startTour` callback, after `const d = driver(config);` add:

```ts
(window as any).__cosmoDriver = d;
```

And in `stopTour` callback, after `driverRef.current?.destroy();` add:

```ts
delete (window as any).__cosmoDriver;
```

- [ ] **Step 3: Commit**

```bash
cd cosmo-app
git add apps/web/src/tours/cosmo-tour.ts apps/web/src/contexts/TourContext.tsx
git commit -m "feat: add cosmo tour steps configuration"
```

---

## Task 9: Mount TourProvider in App.tsx

**Files:**
- Modify: `apps/web/src/App.tsx`

- [ ] **Step 1: Import TourProvider**

Add import at the top of `App.tsx`:

```ts
import { TourProvider } from '@/contexts/TourContext';
```

- [ ] **Step 2: Wrap RouterProvider**

In the JSX return, wrap `<RouterProvider router={router} />` with `<TourProvider>`:

```tsx
return (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TourProvider>
        <RouterProvider router={router} />
      </TourProvider>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  </HelmetProvider>
);
```

- [ ] **Step 3: Build check**

```bash
cd cosmo-app/apps/web && pnpm build 2>&1 | head -30
```

Expected: no TypeScript errors in App.tsx.

- [ ] **Step 4: Commit**

```bash
cd cosmo-app
git add apps/web/src/App.tsx
git commit -m "feat: mount TourProvider in App.tsx above RouterProvider"
```

---

## Task 10: Tour trigger in UserLayout

**Files:**
- Modify: `apps/web/src/components/layout/UserLayout.tsx`

- [ ] **Step 1: Import useTour**

Add to imports at the top of `UserLayout.tsx`:

```ts
import { useTour } from '@/hooks/useTour';
```

- [ ] **Step 2: Add trigger useEffect**

In `UserLayout` component body, after the existing `const { data: freshUser } = useQuery(...)` block (after line 95), add:

```ts
const { startTour } = useTour();

useEffect(() => {
  if (freshUser !== undefined && freshUser.onboardingCompleted === false) {
    startTour();
  }
}, [freshUser, startTour]);
```

This effect depends on both `freshUser` (server-hydrated value, not stale store) and `startTour` (stable callback from context) to satisfy `exhaustive-deps`.

- [ ] **Step 3: Commit**

```bash
cd cosmo-app
git add apps/web/src/components/layout/UserLayout.tsx
git commit -m "feat: trigger onboarding tour on first login in UserLayout"
```

---

## Task 11: Add `data-tour` attributes — public pages & Navbar

**Files:**
- Modify: `apps/web/src/components/layout/Navbar.tsx`
- Modify: `apps/web/src/pages/public/ServiceList.tsx`

- [ ] **Step 1: Navbar — booking button**

In `Navbar.tsx`, find the desktop auth section. The existing link to `/rezerwacja` is rendered as an inline link inside the UserLayout sidebar, not in Navbar. We need to add a "Zarezerwuj" link to Navbar for the tour to target. Find the block where `isAuthenticated` is true (around line 65–79) and add after the panel link:

```tsx
<Link
  to="/rezerwacja"
  data-tour="navbar-booking-btn"
  className="text-sm font-medium px-5 py-2 rounded-full bg-foreground text-background transition-opacity hover:opacity-90"
>
  Rezerwacja
</Link>
```

Note: If a "Rezerwacja" button already exists anywhere in the navbar markup, simply add `data-tour="navbar-booking-btn"` to it instead of creating a new element.

- [ ] **Step 2: ServiceList — services container**

In `ServiceList.tsx`, find the main `<div>` or `<section>` that contains the list of service cards (look for the grid/flex container wrapping the service cards). Add `data-tour="services-list"` to that container element.

- [ ] **Step 3: Commit**

```bash
cd cosmo-app
git add apps/web/src/components/layout/Navbar.tsx apps/web/src/pages/public/ServiceList.tsx
git commit -m "feat: add data-tour attributes to Navbar and ServiceList"
```

---

## Task 12: Add `data-tour` attributes — BookingWizard

**Files:**
- Modify: `apps/web/src/pages/` — BookingWizard component (check exact file; likely `apps/web/src/pages/public/BookingWizard.tsx` or in `/components/`)

- [ ] **Step 1: Find BookingWizard file**

```bash
grep -r "BookingWizard" cosmo-app/apps/web/src --include="*.tsx" -l
```

- [ ] **Step 2: Add `data-tour="booking-wizard"` to outer wrapper**

Find the root `<div>` or `<section>` of the BookingWizard component. Add `data-tour="booking-wizard"` to it.

- [ ] **Step 3: Add `data-tour="service-quiz"` to quiz container**

Find the `ServiceQuiz` usage in BookingWizard. It's conditionally rendered (`{quizOpen && <ServiceQuiz ... />}`). Add a stable wrapper `<div>` around it that is always rendered:

```tsx
{/* Tour anchor — always in DOM so tour can target it */}
<div data-tour="service-quiz">
  {quizOpen && <ServiceQuiz ... />}
</div>
```

This ensures `[data-tour="service-quiz"]` always exists in DOM on `/rezerwacja`, even when quiz is closed.

- [ ] **Step 4: Commit**

```bash
cd cosmo-app
git add <modified BookingWizard file>
git commit -m "feat: add data-tour attributes to BookingWizard"
```

---

## Task 13: Add `data-tour` attributes — user panel pages

**Files:**
- Modify: `apps/web/src/pages/user/Appointments.tsx`
- Modify: `apps/web/src/components/loyalty/PointsBar.tsx`
- Modify: `apps/web/src/components/chat/ChatWindow.tsx`
- Modify: `apps/web/src/pages/user/` — skin journal page (route `/user/dziennik`)
- Modify: `apps/web/src/pages/user/Profile.tsx`

- [ ] **Step 1: Appointments — add `data-tour="appointments-list"`**

In `Appointments.tsx`, find the outer container of the appointments list (the `<div>` wrapping the list of appointment cards). Add `data-tour="appointments-list"`.

- [ ] **Step 2: PointsBar — add `data-tour="loyalty-points-bar"`**

In `PointsBar.tsx`, add `data-tour="loyalty-points-bar"` to the root element.

- [ ] **Step 3: ChatWindow — add `data-tour="chat-window"`**

In `ChatWindow.tsx`, add `data-tour="chat-window"` to the root element.

- [ ] **Step 4: Skin journal page — add `data-tour="skin-journal"`**

Find the skin journal page file (route `/user/dziennik`):
```bash
grep -r "dziennik\|SkinJournal\|skin-journal" cosmo-app/apps/web/src/pages --include="*.tsx" -l
```
Add `data-tour="skin-journal"` to the root container of that page.

- [ ] **Step 5: Profile — add `data-tour="profile-form"`**

In `Profile.tsx`, find the `<form>` or the container wrapping the profile fields. Add `data-tour="profile-form"`.

- [ ] **Step 6: Commit**

Add the skin journal file found in Step 4 manually to the staged files:

```bash
cd cosmo-app
git add apps/web/src/pages/user/Appointments.tsx \
        apps/web/src/components/loyalty/PointsBar.tsx \
        apps/web/src/components/chat/ChatWindow.tsx \
        apps/web/src/pages/user/Profile.tsx \
        <path-to-skin-journal-page-found-in-step-4>
git commit -m "feat: add data-tour attributes to user panel pages"
```

---

## Task 14: Add `updateOnboarding` to users API + Profile restart button

**Files:**
- Modify: `apps/web/src/api/users.api.ts`
- Modify: `apps/web/src/pages/user/Profile.tsx`

- [ ] **Step 1: Add API method to users.api.ts**

In `users.api.ts`, add to the `usersApi` object:

```ts
updateOnboarding: async (completed: boolean): Promise<void> => {
  await api.patch('/users/me', { onboardingCompleted: completed });
},
```

- [ ] **Step 2: Add restart button to Profile page**

In `Profile.tsx`, import `useTour`:

```ts
import { useTour } from '@/hooks/useTour';
```

Add in the component body:

```ts
const { startTour } = useTour();

const handleRestartTour = async () => {
  await usersApi.updateOnboarding(false);
  startTour();
};
```

Add the button somewhere visible in the profile UI (e.g., below the form, in a "Ustawienia" or "Pomoc" section):

```tsx
<button
  onClick={handleRestartTour}
  className="text-sm font-medium px-4 py-2 rounded-full border border-border text-foreground transition-colors hover:bg-accent flex items-center gap-2"
  type="button"
>
  <span>↺</span>
  Powtórz przewodnik po aplikacji
</button>
```

- [ ] **Step 3: Commit**

```bash
cd cosmo-app
git add apps/web/src/api/users.api.ts apps/web/src/pages/user/Profile.tsx
git commit -m "feat: add restart tour button to profile page"
```

---

## Task 15: Style the COSMO branded tooltip

**Files:**
- Create or modify: `apps/web/src/tours/tour.css` (or add to existing global CSS)

- [ ] **Step 1: Add CSS overrides for driver.js popover**

Create `apps/web/src/tours/tour.css`:

```css
/* COSMO branded driver.js tooltip overrides */
.cosmo-tour-popover {
  background: #FAF7F4 !important;
  border: 1px solid rgba(184, 145, 58, 0.2) !important;
  border-radius: 16px !important;
  padding: 20px 24px !important;
  box-shadow: 0 8px 32px rgba(26, 18, 8, 0.12) !important;
  font-family: inherit !important;
  max-width: 320px !important;
}

.cosmo-tour-popover .driver-popover-title {
  font-family: inherit !important;
  font-size: 16px !important;
  font-weight: 700 !important;
  color: #1A1208 !important;
  margin-bottom: 8px !important;
}

.cosmo-tour-popover .driver-popover-description {
  font-size: 14px !important;
  color: rgba(26, 18, 8, 0.7) !important;
  line-height: 1.6 !important;
}

.cosmo-tour-popover .driver-popover-footer {
  margin-top: 16px !important;
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
}

.cosmo-tour-popover .driver-popover-next-btn {
  background: #1A1208 !important;
  color: #FAF7F4 !important;
  border: none !important;
  border-radius: 999px !important;
  padding: 8px 20px !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  cursor: pointer !important;
  transition: opacity 0.2s !important;
}

.cosmo-tour-popover .driver-popover-next-btn:hover {
  opacity: 0.85 !important;
}

.cosmo-tour-popover .driver-popover-close-btn,
.cosmo-tour-popover .driver-popover-prev-btn {
  background: transparent !important;
  border: none !important;
  color: rgba(26, 18, 8, 0.5) !important;
  font-size: 13px !important;
  cursor: pointer !important;
  padding: 8px 12px !important;
}

.cosmo-tour-popover .driver-popover-progress-text {
  font-size: 12px !important;
  color: rgba(26, 18, 8, 0.4) !important;
  margin-left: auto !important;
}

/* COSMO logo header in popover */
.cosmo-tour-popover .driver-popover-title::before {
  content: 'COSMO · ';
  color: #B8913A;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  display: block;
  margin-bottom: 4px;
}
```

- [ ] **Step 2: Import CSS in TourContext**

In `TourContext.tsx`, replace the existing `import 'driver.js/dist/driver.css';` line with:

```ts
import 'driver.js/dist/driver.css';
import '@/tours/tour.css';
```

- [ ] **Step 3: Commit**

```bash
cd cosmo-app
git add apps/web/src/tours/tour.css apps/web/src/contexts/TourContext.tsx
git commit -m "feat: add COSMO branded styles for tour tooltip"
```

---

## Task 16: Smoke test end-to-end

- [ ] **Step 1: Start the app**

```bash
cd cosmo-app && pnpm dev
```

- [ ] **Step 2: Manual test — first login**

1. Open browser at `http://localhost:5173`
2. Register a new user (or use a user with `onboardingCompleted = false` in DB)
3. Log in
4. Tour should start automatically — verify step 1 overlay appears
5. Click "Zaczynamy →" — should navigate to `/uslugi` and highlight services list
6. Continue through all 11 steps across all routes
7. Verify tour ends and `onboardingCompleted` is set to `true` in DB:
   ```bash
   cd cosmo-app/apps/server && npx prisma studio
   ```
   Check User table — `onboardingCompleted` should be `true`.

- [ ] **Step 3: Manual test — restart from profile**

1. Navigate to `/user/profil`
2. Find "Powtórz przewodnik po aplikacji" button
3. Click it — tour should restart from step 1
4. Check DB — `onboardingCompleted` should be `false` then `true` again after finish

- [ ] **Step 4: Manual test — skip**

1. Log in with a user that has `onboardingCompleted = false`
2. Click "Pomiń tour" on any step
3. Tour should close immediately
4. Check DB — `onboardingCompleted` should be `true` (pominięcie = ukończenie dla celów persystencji)

- [ ] **Step 5: Final commit**

```bash
cd cosmo-app
git add -A
git commit -m "feat: complete onboarding tour implementation"
```
