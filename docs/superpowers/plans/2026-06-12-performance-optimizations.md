# Performance Optimizations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 6 identified performance bottlenecks to significantly reduce bundle size, API response times, and unnecessary network requests.

**Architecture:** Six independent, incremental improvements — backend middleware additions, frontend build config changes, and React code splitting. Each task is self-contained and safe to deploy independently.

**Tech Stack:** Express 5, Vite, React 19, TanStack Query, React Router v7, Rollup (via Vite)

---

## Files Modified Overview

| File | Change |
|------|--------|
| `apps/server/src/app.ts` | Add `compression()` middleware before routes |
| `apps/server/package.json` | Add `compression` + `@types/compression` |
| `apps/web/src/lib/queryClient.ts` | Set global `staleTime: 60_000` |
| `apps/web/src/router.tsx` | Convert all static imports to `React.lazy` |
| `apps/web/src/components/layout/PublicLayout.tsx` | Wrap outlet in `<Suspense>` |
| `apps/web/src/components/layout/UserLayout.tsx` | Wrap outlet in `<Suspense>` |
| `apps/web/src/components/layout/AdminLayout.tsx` | Wrap outlet in `<Suspense>` |
| `apps/web/src/components/layout/EmployeeLayout.tsx` | Wrap outlet in `<Suspense>` |
| `apps/web/src/pages/academy/AcademyLayout.tsx` | Wrap outlet in `<Suspense>` |
| `apps/web/vite.config.ts` | Add `build.rollupOptions.manualChunks` |
| 19 `*.tsx` files with `<img>` | Add `loading="lazy"` attribute |

---

## Task 1: Add HTTP compression middleware (backend)

**Files:**
- Modify: `apps/server/package.json`
- Modify: `apps/server/src/app.ts`

- [ ] **Step 1: Install compression package**

Run from `cosmo-app/apps/server/`:
```bash
pnpm add compression
pnpm add -D @types/compression
```

Expected: packages added to `package.json`, no errors.

- [ ] **Step 2: Add compression middleware to app.ts**

In `apps/server/src/app.ts`, find the line with `app.use(helmet())` (around line 47).
Add import at the top (after existing imports):
```ts
import compression from 'compression';
```

Then add the middleware **immediately after** `app.use(helmet())`:
```ts
app.use(compression());
```

- [ ] **Step 3: Verify the server still starts**

From `cosmo-app/`:
```bash
pnpm --filter server build
```

Expected: TypeScript compiles without errors.

- [ ] **Step 4: Commit**

```bash
git add apps/server/package.json apps/server/src/app.ts pnpm-lock.yaml
git commit -m "perf: add gzip compression middleware to Express server"
```

---

## Task 2: Add Cache-Control headers to static file serving

**Files:**
- Modify: `apps/server/src/app.ts`

- [ ] **Step 1: Update express.static call**

In `apps/server/src/app.ts`, find the line:
```ts
app.use('/uploads', privateUploadMiddleware, express.static('uploads'));
```

Replace with:
```ts
app.use('/uploads', privateUploadMiddleware, express.static('uploads', {
  maxAge: '1y',
  immutable: true,
}));
```

The `immutable` flag tells browsers the file will never change (safe because all uploaded files use random UUID filenames). `maxAge: '1y'` sets a 1-year cache TTL.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm --filter server build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/app.ts
git commit -m "perf: add 1-year Cache-Control headers to uploaded static files"
```

---

## Task 3: Set global staleTime in QueryClient

**Files:**
- Modify: `apps/web/src/lib/queryClient.ts`

Current content of `apps/web/src/lib/queryClient.ts`:
```ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

- [ ] **Step 1: Add staleTime to defaultOptions**

Replace the file content with:
```ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

This means data fetched by any `useQuery` call that doesn't override `staleTime` will be considered fresh for 60 seconds. Navigating back to a page within 60 seconds won't trigger a new API call.

- [ ] **Step 2: Verify TypeScript compiles**

From `cosmo-app/`:
```bash
pnpm --filter web build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/queryClient.ts
git commit -m "perf: set global staleTime of 60s in QueryClient to reduce redundant API calls"
```

---

## Task 4: Add loading="lazy" to all below-fold images

**Files:** 19 `.tsx` files listed below.

- [ ] **Step 1: Add loading="lazy" to img tags in these files**

For each file, find `<img ` tags and add `loading="lazy"` unless the image is clearly above the fold (e.g., main hero images or logo). When in doubt, add lazy.

Files to update:
- `apps/web/src/components/assortment/RecommendationPanel.tsx`
- `apps/web/src/components/assortment/RecommendationModal.tsx`
- `apps/web/src/components/assortment/AssortmentPage.tsx`
- `apps/web/src/pages/employee/MyAppointments.tsx`
- `apps/web/src/pages/auth/Register.tsx`
- `apps/web/src/pages/user/SkinJournal.tsx`
- `apps/web/src/pages/user/BookingWizard.tsx`
- `apps/web/src/pages/user/Products.tsx`
- `apps/web/src/components/chat/ChatInput.tsx`
- `apps/web/src/components/skin-journal/SummaryModal.tsx`
- `apps/web/src/pages/academy/AcademyCatalog.tsx`
- `apps/web/src/components/shared/ImageUpload.tsx`
- `apps/web/src/pages/academy/CourseDetail.tsx`
- `apps/web/src/pages/admin/AdminBlogForm.tsx`
- `apps/web/src/pages/admin/Employees.tsx`
- `apps/web/src/pages/admin/Metamorphoses.tsx`
- `apps/web/src/pages/admin/Users.tsx`
- `apps/web/src/pages/admin/UserJournal.tsx`
- `apps/web/src/pages/admin/Services.tsx`

Pattern to follow — change:
```tsx
<img src={...} alt={...} className={...} />
```
to:
```tsx
<img src={...} alt={...} className={...} loading="lazy" />
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm --filter web build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/
git commit -m "perf: add loading=lazy to all below-fold img elements"
```

---

## Task 5: Add Vite build chunk splitting

**Files:**
- Modify: `apps/web/vite.config.ts`

Current `vite.config.ts` has no `build` section. Heavy libraries like `@xyflow/react` (quiz editor, ~400KB) and `@tiptap/*` (blog editor, ~300KB) are bundled with the main app code and downloaded even by users who never visit admin pages.

- [ ] **Step 1: Add build.rollupOptions to vite.config.ts**

Current file:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({ ... }),
  ],
  resolve: { ... },
  server: { ... }
});
```

Add a `build` section after `resolve`:
```ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor-react': ['react', 'react-dom', 'react-router-dom'],
        'vendor-query': ['@tanstack/react-query'],
        'vendor-editor': ['@tiptap/react', '@tiptap/starter-kit', '@tiptap/extension-link', '@tiptap/extension-image', '@tiptap/extension-placeholder'],
        'vendor-flow': ['@xyflow/react'],
        'vendor-dnd': ['@dnd-kit/core', '@dnd-kit/sortable'],
      },
    },
  },
},
```

Note: Only include packages that actually exist in `apps/web/package.json`. If a package is not installed, skip it. The `@tiptap/*` extension names should match exactly what's in `package.json`.

- [ ] **Step 2: Verify which tiptap packages are installed**

```bash
cat apps/web/package.json | grep tiptap
```

Adjust the `vendor-editor` chunk to only include packages that appear in the output.

- [ ] **Step 3: Run build and check chunk sizes**

```bash
pnpm --filter web build
```

Expected: build succeeds. Look for output showing multiple chunks instead of one large bundle. `vendor-flow` and `vendor-editor` chunks should appear separately.

- [ ] **Step 4: Commit**

```bash
git add apps/web/vite.config.ts
git commit -m "perf: add Vite manualChunks to split heavy vendor libraries into separate bundles"
```

---

## Task 6: Convert router to React.lazy code splitting (BIGGEST WIN)

**Files:**
- Modify: `apps/web/src/router.tsx`
- Modify: `apps/web/src/components/layout/PublicLayout.tsx`
- Modify: `apps/web/src/components/layout/UserLayout.tsx`
- Modify: `apps/web/src/components/layout/AdminLayout.tsx`
- Modify: `apps/web/src/components/layout/EmployeeLayout.tsx`
- Modify: `apps/web/src/pages/academy/AcademyLayout.tsx`

This task converts all 80+ static page imports into lazy-loaded chunks. Each route only downloads its code when first visited.

**Important:** React.lazy requires components to be `default` exports. Most pages in this codebase use **named exports** (e.g., `export const AdminDashboard = ...`). You must either:
- Add a `export default` to each page file, OR
- Use a wrapper: `const AdminDashboard = React.lazy(() => import('./pages/admin/Dashboard').then(m => ({ default: m.AdminDashboard })))`

The wrapper approach is safer (no file changes needed). Use it.

- [ ] **Step 1: Read the current router.tsx**

Read the full file to see all imports and the route structure. The file has ~200 lines.

- [ ] **Step 2: Replace all static imports with React.lazy in router.tsx**

Remove all the static `import { ... } from './pages/...'` statements at the top.

Add `import React, { lazy, Suspense } from 'react';` at the top (replace the existing react-router-dom import line, keeping `createBrowserRouter` and `Navigate`).

Replace each static import with a lazy version using this pattern:
```tsx
// BEFORE:
import { AdminDashboard } from './pages/admin/Dashboard';

// AFTER:
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard').then(m => ({ default: m.AdminDashboard })));
```

Do this for every single page import. Layout components (`PublicLayout`, `UserLayout`, `AdminLayout`, `EmployeeLayout`) should remain as static imports — they are always needed and contain the nav/shell.

Full list of imports to convert to lazy (from current router.tsx lines 8-82):
```tsx
// Public pages
const Home = lazy(() => import('./pages/public/Home').then(m => ({ default: m.Home })));
const ServiceList = lazy(() => import('./pages/public/ServiceList').then(m => ({ default: m.ServiceList })));
const BlogList = lazy(() => import('./pages/public/BlogList').then(m => ({ default: m.BlogList })));
const BlogPost = lazy(() => import('./pages/public/BlogPost').then(m => ({ default: m.BlogPost })));
const MetamorphosesGallery = lazy(() => import('./pages/public/MetamorphosesGallery').then(m => ({ default: m.MetamorphosesGallery })));
const LoyaltyInfo = lazy(() => import('./pages/public/LoyaltyInfo').then(m => ({ default: m.LoyaltyInfo })));
const PublicTerms = lazy(() => import('./pages/public/Terms').then(m => ({ default: m.PublicTerms })));
const Contact = lazy(() => import('./pages/public/Contact').then(m => ({ default: m.Contact })));
const About = lazy(() => import('./pages/public/About').then(m => ({ default: m.About })));
const ServiceDetail = lazy(() => import('./pages/public/ServiceDetail').then(m => ({ default: m.ServiceDetail })));

// Auth pages
const Login = lazy(() => import('./pages/auth/Login').then(m => ({ default: m.Login })));
const Register = lazy(() => import('./pages/auth/Register').then(m => ({ default: m.Register })));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword').then(m => ({ default: m.ResetPassword })));

// User pages
const UserDashboard = lazy(() => import('./pages/user/Dashboard').then(m => ({ default: m.UserDashboard })));
const UserAppointments = lazy(() => import('./pages/user/Appointments').then(m => ({ default: m.UserAppointments })));
const BookingWizard = lazy(() => import('./pages/user/BookingWizard').then(m => ({ default: m.BookingWizard })));
const UserLoyalty = lazy(() => import('./pages/user/Loyalty').then(m => ({ default: m.UserLoyalty })));
const UserProfile = lazy(() => import('./pages/user/Profile').then(m => ({ default: m.UserProfile })));
const UserChat = lazy(() => import('./pages/user/Chat').then(m => ({ default: m.UserChat })));
const UserTimeline = lazy(() => import('./pages/user/Timeline').then(m => ({ default: m.UserTimeline })));
const UserNotifications = lazy(() => import('./pages/user/Notifications').then(m => ({ default: m.UserNotifications })));
const UserReferrals = lazy(() => import('./pages/user/Referrals').then(m => ({ default: m.UserReferrals })));
const UserProducts = lazy(() => import('./pages/user/Products').then(m => ({ default: m.UserProducts })));
const UserSkinJournal = lazy(() => import('./pages/user/SkinJournal').then(m => ({ default: m.UserSkinJournal })));
const HomecareRoutinePage = lazy(() => import('./pages/user/HomecareRoutine').then(m => ({ default: m.HomecareRoutinePage })));
const ChangePassword = lazy(() => import('./pages/user/ChangePassword').then(m => ({ default: m.ChangePassword })));
const SkinWeatherProfile = lazy(() => import('./pages/user/SkinWeatherProfile').then(m => ({ default: m.SkinWeatherProfile })));

// Admin pages
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard').then(m => ({ default: m.AdminDashboard })));
const AdminAppointments = lazy(() => import('./pages/admin/Appointments').then(m => ({ default: m.AdminAppointments })));
const AdminServices = lazy(() => import('./pages/admin/Services').then(m => ({ default: m.AdminServices })));
const AdminBlog = lazy(() => import('./pages/admin/Blog').then(m => ({ default: m.AdminBlog })));
const AdminBlogForm = lazy(() => import('./pages/admin/AdminBlogForm').then(m => ({ default: m.AdminBlogForm })));
const AdminMetamorphoses = lazy(() => import('./pages/admin/Metamorphoses').then(m => ({ default: m.AdminMetamorphoses })));
const AdminLoyalty = lazy(() => import('./pages/admin/Loyalty').then(m => ({ default: m.AdminLoyalty })));
const AdminUsers = lazy(() => import('./pages/admin/Users').then(m => ({ default: m.AdminUsers })));
const AdminChat = lazy(() => import('./pages/admin/Chat').then(m => ({ default: m.AdminChat })));
const AdminEmployees = lazy(() => import('./pages/admin/Employees').then(m => ({ default: m.AdminEmployees })));
const AdminWork = lazy(() => import('./pages/admin/Work').then(m => ({ default: m.AdminWork })));
const AdminHeroSlides = lazy(() => import('./pages/admin/HeroSlides').then(m => ({ default: m.AdminHeroSlides })));
const AdminRecommendedSlides = lazy(() => import('./pages/admin/RecommendedSlides').then(m => ({ default: m.AdminRecommendedSlides })));
const AdminDiscountCodes = lazy(() => import('./pages/admin/DiscountCodes').then(m => ({ default: m.AdminDiscountCodes })));
const AdminTerms = lazy(() => import('./pages/admin/AdminTerms').then(m => ({ default: m.AdminTerms })));
const AdminAbout = lazy(() => import('./pages/admin/AdminAbout').then(m => ({ default: m.AdminAbout })));
const AdminConsultations = lazy(() => import('./pages/admin/Consultations').then(m => ({ default: m.AdminConsultations })));
const AdminServiceDetail = lazy(() => import('./pages/admin/AdminServiceDetail').then(m => ({ default: m.AdminServiceDetail })));
const AdminReviews = lazy(() => import('./pages/admin/Reviews').then(m => ({ default: m.AdminReviews })));
const AdminNotifications = lazy(() => import('./pages/admin/AdminNotifications').then(m => ({ default: m.AdminNotifications })));
const AdminBlogComments = lazy(() => import('./pages/admin/AdminBlogComments').then(m => ({ default: m.AdminBlogComments })));
const AdminAssortment = lazy(() => import('./pages/admin/AdminAssortment').then(m => ({ default: m.AdminAssortment })));
const AdminQuizzes = lazy(() => import('./pages/admin/AdminQuizzes').then(m => ({ default: m.default })));
const AdminQuizEditor = lazy(() => import('./pages/admin/AdminQuizEditor').then(m => ({ default: m.default })));
const SkinWeatherRules = lazy(() => import('./pages/admin/SkinWeatherRules').then(m => ({ default: m.SkinWeatherRules })));
const Marketing = lazy(() => import('./pages/admin/Marketing').then(m => ({ default: m.Marketing })));

// Academy pages
const NoAccess = lazy(() => import('./pages/academy/NoAccess').then(m => ({ default: m.NoAccess })));
const AcademyCatalog = lazy(() => import('./pages/academy/AcademyCatalog').then(m => ({ default: m.AcademyCatalog })));
const MyCourses = lazy(() => import('./pages/academy/MyCourses').then(m => ({ default: m.MyCourses })));
const Certificates = lazy(() => import('./pages/academy/Certificates').then(m => ({ default: m.Certificates })));
const StandaloneQuizPage = lazy(() => import('./pages/academy/StandaloneQuizPage').then(m => ({ default: m.StandaloneQuizPage })));
const CourseDetail = lazy(() => import('./pages/academy/CourseDetail').then(m => ({ default: m.CourseDetail })));
const LessonPlayer = lazy(() => import('./pages/academy/LessonPlayer').then(m => ({ default: m.LessonPlayer })));
const AdminAkademia = lazy(() => import('./pages/admin/academy/AdminAkademia').then(m => ({ default: m.AdminAkademia })));
const AdminCourseEditor = lazy(() => import('./pages/admin/academy/AdminCourseEditor').then(m => ({ default: m.AdminCourseEditor })));
const AdminStandaloneQuizEditor = lazy(() => import('./pages/admin/academy/AdminStandaloneQuizEditor').then(m => ({ default: m.AdminStandaloneQuizEditor })));

// Employee pages
const EmployeeSchedule = lazy(() => import('./pages/employee/Schedule').then(m => ({ default: m.EmployeeSchedule })));
const EmployeeAppointments = lazy(() => import('./pages/employee/MyAppointments').then(m => ({ default: m.EmployeeAppointments })));
const EmployeeChat = lazy(() => import('./pages/employee/Chat').then(m => ({ default: m.EmployeeChat })));
const EmployeeAssortment = lazy(() => import('./pages/employee/EmployeeAssortment').then(m => ({ default: m.EmployeeAssortment })));
```

Note: `AdminQuizzes` and `AdminQuizEditor` use `default` exports — use `m.default` for them.

- [ ] **Step 3: Add Suspense fallback to each layout**

Each layout component renders `<Outlet />` from react-router-dom. Wrap it in `<Suspense>`.

**`apps/web/src/components/layout/PublicLayout.tsx`** — find where `<Outlet />` is rendered and wrap:
```tsx
import { Suspense } from 'react';
// find the <Outlet /> render and wrap:
<Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
  <Outlet />
</Suspense>
```

Do the same for:
- `apps/web/src/components/layout/UserLayout.tsx`
- `apps/web/src/components/layout/AdminLayout.tsx`
- `apps/web/src/components/layout/EmployeeLayout.tsx`
- `apps/web/src/pages/academy/AcademyLayout.tsx`

The spinner markup uses Tailwind classes already present in the app. The spinner uses the `border-primary` color which is defined in the Tailwind config.

- [ ] **Step 4: Verify TypeScript builds without errors**

```bash
pnpm --filter web build
```

If there are errors about specific export names (e.g., component exported with different name), fix the `.then(m => ({ default: m.CORRECT_NAME }))` for that specific component.

- [ ] **Step 5: Quick smoke test**

```bash
pnpm dev
```

Open browser at `http://localhost:5173`. Navigate between a public page, user login, and admin page. Pages should load (possibly with brief spinner on first visit). No blank screens or console errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/router.tsx apps/web/src/components/layout/ apps/web/src/pages/academy/AcademyLayout.tsx
git commit -m "perf: convert all route imports to React.lazy for code splitting — eliminates monolithic bundle"
```

---

## Verification

After all 6 tasks are done, run a final build and check the output:

```bash
cd cosmo-app
pnpm --filter web build 2>&1 | grep -E "chunk|dist/"
```

You should see many separate chunks instead of one large file. The main `index.js` chunk should be significantly smaller than before (previously likely 2-4MB, should drop to <500KB).

```bash
pnpm --filter server build
```

Should compile cleanly with compression imported.
