# Academy Subdomain Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the Academy module from `/akademia/*` in the main SPA to a separate Vite app served at `akademia.kosmetologwiktoriacwik.pl`.

**Architecture:** New `apps/academy-web/` Vite app in the Turborepo monorepo. Same backend API, shared auth via `.kosmetologwiktoriacwik.pl` domain cookie. Admin academy stays in main app. Shared UI components stay in `packages/shared/` (extended with React subpath export).

**Tech Stack:** React 19, Vite 5, TypeScript, Tailwind CSS 3, Zustand, TanStack Query, React Router 7, pnpm workspaces, Turborepo.

**Spec:** `docs/superpowers/specs/2026-07-06-academy-subdomain-design.md`

---

## File Structure

### New files (`apps/academy-web/`):
- `package.json` — app manifest, deps subset of `apps/web`
- `vite.config.ts` — Vite config, port 5174, proxy rules
- `tsconfig.json` — mirrors `apps/web` tsconfig
- `tsconfig.node.json` — for vite config
- `postcss.config.js` — tailwind + autoprefixer
- `tailwind.config.ts` — same theme as main app
- `index.html` — minimal HTML shell for academy
- `src/main.tsx` — React entry
- `src/App.tsx` — providers + router + error boundary
- `src/router.tsx` — academy routes only
- `src/index.css` — same CSS variables/tailwind base
- `src/lib/axios.ts` — axios instance with auth interceptors
- `src/lib/queryClient.ts` — TanStack Query client
- `src/store/auth.store.ts` — Zustand auth store
- `src/hooks/useAuth.ts` — auth convenience hook
- `src/api/academy.api.ts` — user-only academy API (no admin endpoints)
- `src/pages/AcademyLayout.tsx` — adapted layout (paths changed from `/akademia/X` to `/X`)
- `src/pages/NoAccess.tsx` — moved from main app
- `src/pages/AcademyCatalog.tsx` — moved
- `src/pages/MyCourses.tsx` — moved
- `src/pages/Certificates.tsx` — moved
- `src/pages/StandaloneQuizPage.tsx` — moved
- `src/pages/CourseDetail.tsx` — moved
- `src/pages/LessonPlayer.tsx` — moved
- `src/components/LessonQuizPlayer.tsx` — moved

### Modified files:
- `apps/server/src/config/env.ts` — add `ACADEMY_URL` env var
- `apps/server/src/app.ts:57-60` — CORS from single string to array
- `apps/server/src/socket.ts:16-19` — Socket.IO CORS to array
- `apps/server/src/modules/auth/auth.controller.ts:24-29` — cookie `sameSite` + `domain`
- `apps/web/src/router.tsx:107-115,221-238` — remove academy imports/routes, add redirect
- `cosmo-app/package.json:10` — add academy-web to dev command

### New infrastructure files:
- `deploy/nginx/academy.conf` — nginx server block for subdomain
- `deploy-academy.sh` — deploy script for academy app

---

## Task 1: Backend — Environment & CORS

**Files:**
- Modify: `apps/server/src/config/env.ts`
- Modify: `apps/server/src/app.ts:57-60`
- Modify: `apps/server/src/socket.ts:14-20`

- [ ] **Step 1: Add `ACADEMY_URL` to env schema**

In `apps/server/src/config/env.ts`, add after `CLIENT_URL` (line 8):

```typescript
ACADEMY_URL: z.string().url().optional(),
```

- [ ] **Step 2: Update CORS in `app.ts` to support multiple origins**

In `apps/server/src/app.ts`, replace lines 57-60:

```typescript
// OLD:
app.use(cors({
  origin: env.CLIENT_URL,
  credentials: true
}));

// NEW:
app.use(cors({
  origin: [env.CLIENT_URL, ...(env.ACADEMY_URL ? [env.ACADEMY_URL] : [])],
  credentials: true
}));
```

- [ ] **Step 3: Update Socket.IO CORS in `socket.ts`**

In `apps/server/src/socket.ts`, replace lines 16-19:

```typescript
// OLD:
cors: {
  origin: env.CLIENT_URL,
  credentials: true
}

// NEW:
cors: {
  origin: [env.CLIENT_URL, ...(env.ACADEMY_URL ? [env.ACADEMY_URL] : [])],
  credentials: true
}
```

- [ ] **Step 4: Add `ACADEMY_URL` to `.env` files**

In `apps/server/.env` add:
```
ACADEMY_URL=http://localhost:5174
```

On VPS later, this will be `https://akademia.kosmetologwiktoriacwik.pl`.

- [ ] **Step 5: Verify backend starts**

Run: `cd cosmo-app/apps/server && pnpm build`
Expected: Success, no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/config/env.ts apps/server/src/app.ts apps/server/src/socket.ts apps/server/.env
git commit -m "feat: add ACADEMY_URL env var and multi-origin CORS support"
```

---

## Task 2: Backend — Cookie Domain & sameSite

**Files:**
- Modify: `apps/server/src/modules/auth/auth.controller.ts:24-29`

- [ ] **Step 1: Update `buildRefreshCookieOptions` to set domain and sameSite**

In `apps/server/src/modules/auth/auth.controller.ts`, replace lines 24-29:

```typescript
// OLD:
const buildRefreshCookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge,
});

// NEW:
const buildRefreshCookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge,
  ...(env.NODE_ENV === 'production' && { domain: '.kosmetologwiktoriacwik.pl' }),
});
```

Key changes:
- `sameSite: 'strict'` → `'lax'` — `strict` blocks cookies on cross-subdomain navigation
- `domain: '.kosmetologwiktoriacwik.pl'` — only in production, allows cookie sharing between main site and academy subdomain
- In development, no `domain` set, so cookie works on localhost as before

- [ ] **Step 2: Verify backend builds**

Run: `cd cosmo-app/apps/server && pnpm build`
Expected: Success.

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/modules/auth/auth.controller.ts
git commit -m "feat: change refresh cookie to sameSite=lax with subdomain domain"
```

---

## Task 3: Scaffold `apps/academy-web/` — Config Files

**Files:**
- Create: `apps/academy-web/package.json`
- Create: `apps/academy-web/vite.config.ts`
- Create: `apps/academy-web/tsconfig.json`
- Create: `apps/academy-web/tsconfig.node.json`
- Create: `apps/academy-web/postcss.config.js`
- Create: `apps/academy-web/tailwind.config.ts`
- Create: `apps/academy-web/index.html`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "cosmo-academy-web",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview"
  },
  "dependencies": {
    "@cosmo/shared": "workspace:*",
    "@hookform/resolvers": "^3.4.2",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-label": "^2.0.2",
    "@radix-ui/react-slot": "^1.0.2",
    "@tanstack/react-query": "^5.39.0",
    "axios": "^1.7.2",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "date-fns": "^3.6.0",
    "dompurify": "^3.4.5",
    "framer-motion": "^11.2.6",
    "lucide-react": "^0.390.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-helmet-async": "^3.0.0",
    "react-hook-form": "^7.51.5",
    "react-player": "^3.4.0",
    "react-router-dom": "^7.0.0",
    "sonner": "^1.4.41",
    "tailwind-merge": "^2.3.0",
    "tailwindcss-animate": "^1.0.7",
    "zod": "^3.23.8",
    "zustand": "^4.5.2"
  },
  "devDependencies": {
    "@types/node": "^20.12.12",
    "@types/react": "^18.3.3",
    "@types/dompurify": "^3.2.0",
    "@types/react-dom": "^18.3.0",
    "@typescript-eslint/eslint-plugin": "^7.10.0",
    "@typescript-eslint/parser": "^7.10.0",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.3",
    "typescript": "^5.4.5",
    "vite": "^5.2.11"
  }
}
```

Note: No PWA, no TipTap, no xyflow, no fullcalendar, no dnd-kit, no socket.io — academy doesn't need these. `react-player` is kept for video lessons. `@types/dompurify` added as devDep since lesson content uses DOMPurify.

- [ ] **Step 2: Create `vite.config.ts`**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@cosmo/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('/node_modules/')) return undefined;
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) return 'vendor-react';
          if (id.includes('@tanstack/react-query')) return 'vendor-query';
          if (id.includes('axios')) return 'vendor-http';
          if (id.includes('zustand')) return 'vendor-state';
          if (id.includes('lucide-react')) return 'vendor-icons';
          if (id.includes('framer-motion')) return 'vendor-motion';
          return undefined;
        },
      },
    },
  },
  server: {
    port: 5174,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["./src/*"],
      "@cosmo/shared": ["../../packages/shared/src/index.ts"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 4: Create `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 5: Create `postcss.config.js`**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 6: Create `tailwind.config.ts`**

Copy `apps/web/tailwind.config.ts` exactly (same theme, colors, fonts, animations). No changes needed — academy uses the same design.

- [ ] **Step 7: Create `index.html`**

```html
<!doctype html>
<html lang="pl">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" href="/favicon.ico" sizes="any" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light" />
    <meta name="robots" content="noindex, nofollow" />
    <title>Akademia BeskidStudio By Wiktoria Cwik</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preload" href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&family=Playfair+Display:ital,wght@0,700;1,400&display=optional" as="style" onload="this.onload=null;this.rel='stylesheet'">
    <noscript><link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&family=Playfair+Display:ital,wght@0,700;1,400&display=optional" rel="stylesheet"></noscript>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 8: Create `.env` for local development**

Create `apps/academy-web/.env`:
```
VITE_API_URL=
VITE_MAIN_SITE_URL=http://localhost:5173
```

In production on VPS, create `apps/academy-web/.env` with:
```
VITE_MAIN_SITE_URL=https://kosmetologwiktoriacwik.pl
```

- [ ] **Step 9: Commit**

```bash
git add apps/academy-web/
git commit -m "feat: scaffold academy-web app config files"
```

---

## Task 4: Academy App — Core Source Files

**Files:**
- Create: `apps/academy-web/src/index.css`
- Create: `apps/academy-web/src/lib/axios.ts`
- Create: `apps/academy-web/src/lib/queryClient.ts`
- Create: `apps/academy-web/src/store/auth.store.ts`
- Create: `apps/academy-web/src/hooks/useAuth.ts`
- Create: `apps/academy-web/src/api/academy.api.ts`

- [ ] **Step 1: Create `src/index.css`**

Copy `apps/web/src/index.css` — same CSS variables, tailwind directives, dark mode vars. This ensures identical styling.

- [ ] **Step 2: Create `src/lib/axios.ts`**

Same as `apps/web/src/lib/axios.ts` but with one change — the redirect on auth failure goes to the main site login:

```typescript
import axios from 'axios';
import { useAuthStore } from '../store/auth.store';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;

type Subscriber = { resolve: (token: string) => void; reject: (err: unknown) => void };
let refreshSubscribers: Subscriber[] = [];

function onRefreshed(token: string) {
  refreshSubscribers.forEach(s => s.resolve(token));
  refreshSubscribers = [];
}

function onRefreshFailed(err: unknown) {
  refreshSubscribers.forEach(s => s.reject(err));
  refreshSubscribers = [];
}

function addRefreshSubscriber(resolve: (token: string) => void, reject: (err: unknown) => void) {
  refreshSubscribers.push({ resolve, reject });
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/refresh') && !originalRequest.url?.includes('/auth/login')) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          addRefreshSubscriber(
            (token: string) => {
              originalRequest.headers['Authorization'] = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            (err: unknown) => reject(err),
          );
        });
      }

      isRefreshing = true;
      try {
        const { data } = await api.post('/auth/refresh', {}, { withCredentials: true });
        const newToken = data.data.accessToken;
        useAuthStore.getState().setAccessToken(newToken);
        if (data.data.user) {
          useAuthStore.getState().setUser(data.data.user);
        }
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;

        onRefreshed(newToken);
        return api(originalRequest);
      } catch (refreshError) {
        onRefreshFailed(refreshError);
        useAuthStore.getState().logout();
        // Redirect to main site login
        const mainSiteLogin = import.meta.env.VITE_MAIN_SITE_URL
          ? `${import.meta.env.VITE_MAIN_SITE_URL}/auth/login`
          : '/auth/login';
        window.location.href = mainSiteLogin;
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);
```

Key differences from main app's axios:
- No Socket.IO re-auth on token refresh (academy doesn't use sockets directly)
- Auth failure redirects to main site login via `VITE_MAIN_SITE_URL`

- [ ] **Step 3: Create `src/lib/queryClient.ts`**

```typescript
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

- [ ] **Step 4: Create `src/store/auth.store.ts`**

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User } from '@cosmo/shared';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isLoading: true,
      setUser: (user) => set({ user }),
      setAccessToken: (accessToken) => set({ accessToken }),
      logout: () => set({ user: null, accessToken: null }),
      hydrate: () => set({ isLoading: false }),
    }),
    {
      name: 'academy-auth-storage',
      storage: createJSONStorage(() => sessionStorage),
      onRehydrateStorage: () => (state) => {
        if (state) state.isLoading = false;
      },
    }
  )
);
```

- [ ] **Step 5: Create `src/hooks/useAuth.ts`**

```typescript
import { useAuthStore } from '../store/auth.store';

export const useAuth = () => {
  const { user, accessToken, isLoading, setUser, setAccessToken, logout } = useAuthStore();
  const isAuthenticated = !!accessToken && !!user;

  return {
    user,
    accessToken,
    isAuthenticated,
    isLoading,
    setUser,
    setAccessToken,
    logout,
  };
};
```

- [ ] **Step 6: Create `src/api/academy.api.ts`**

User-only API endpoints (no admin endpoints — those stay in main app):

```typescript
import { api } from '@/lib/axios';

export const academyApi = {
  // Courses
  getCourses: () =>
    api.get('/academy/courses').then((r) => r.data.data),

  getCourseBySlug: (slug: string) =>
    api.get(`/academy/courses/${slug}`).then((r) => r.data.data),

  getLessonBySlug: (courseSlug: string, lessonSlug: string) =>
    api.get(`/academy/courses/${courseSlug}/lessons/${lessonSlug}`).then((r) => r.data.data),

  // Progress
  markLessonComplete: (lessonId: string) =>
    api.post(`/academy/progress/lesson/${lessonId}/complete`).then((r) => r.data),

  updateVideoProgress: (lessonId: string, watchedSeconds: number) =>
    api.patch(`/academy/progress/lesson/${lessonId}/video`, { watchedSeconds }).then((r) => r.data),

  getCourseProgress: (courseId: string) =>
    api.get(`/academy/progress/course/${courseId}`).then((r) => r.data.data),

  // Quizzes
  getStandaloneQuizzes: () =>
    api.get('/academy/quizzes').then((r) => r.data.data),

  getStandaloneQuiz: (quizId: string) =>
    api.get(`/academy/quizzes/${quizId}`).then((r) => r.data.data),

  submitQuizAttempt: (quizId: string, answers: { questionId: string; selectedOptionIds: string[] }[]) =>
    api.post(`/academy/quizzes/${quizId}/attempt`, { answers }).then((r) => r.data.data),

  getLessonQuiz: (lessonId: string) =>
    api.get(`/academy/lessons/${lessonId}/quiz`).then((r) => r.data.data),

  // Certificates
  getCertificates: () =>
    api.get('/academy/certificates').then((r) => r.data.data),

  getCertificateDownloadUrl: (code: string) => `/api/academy/certificates/download/${code}`,

  verifyCertificate: (code: string) =>
    api.get(`/academy/certificates/verify/${code}`).then((r) => r.data.data),
};
```

- [ ] **Step 7: Commit**

```bash
git add apps/academy-web/src/
git commit -m "feat: add academy-web core source files (axios, auth, api)"
```

---

## Task 5: Academy App — Pages & Layout

**Files:**
- Create: `apps/academy-web/src/pages/AcademyLayout.tsx`
- Copy: all page components from `apps/web/src/pages/academy/`
- Copy: `apps/web/src/components/academy/LessonQuizPlayer.tsx`

- [ ] **Step 1: Create adapted `AcademyLayout.tsx`**

Copy from `apps/web/src/pages/academy/AcademyLayout.tsx` with path changes — routes are now root-relative (e.g., `/` instead of `/akademia`, `/moje-kursy` instead of `/akademia/moje-kursy`):

```typescript
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { GraduationCap, BookOpen, Award, LayoutGrid, Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export function AcademyLayout() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <div className="p-8 text-center">Ladowanie...</div>;
  if (!isAuthenticated) {
    const mainSiteLogin = import.meta.env.VITE_MAIN_SITE_URL
      ? `${import.meta.env.VITE_MAIN_SITE_URL}/auth/login`
      : '/auth/login';
    window.location.href = mainSiteLogin;
    return null;
  }
  if (!user?.hasAcademyAccess) return <Navigate to="/brak-dostepu" replace />;

  const navItems = [
    { to: '/', label: 'Katalog', icon: LayoutGrid, exact: true },
    { to: '/moje-kursy', label: 'Moje Kursy', icon: BookOpen },
    { to: '/quizy', label: 'Quizy', icon: Star },
    { to: '/certyfikaty', label: 'Certyfikaty', icon: Award },
  ];

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <GraduationCap className="w-6 h-6 text-primary" />
          <span className="font-heading font-semibold text-lg">Akademia BeskidStudio By Wiktoria Cwik</span>
        </div>
      </header>

      <nav className="md:hidden overflow-x-auto border-b bg-card flex gap-1 px-3 py-2 shrink-0" style={{ scrollbarWidth: 'none' }}>
        {navItems.map(({ to, label, icon: Icon, exact }) => {
          const isActive = exact ? location.pathname === to : location.pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-6 flex gap-6">
        <aside className="w-48 shrink-0 hidden md:block">
          <nav className="space-y-1">
            {navItems.map(({ to, label, icon: Icon, exact }) => {
              const isActive = exact ? location.pathname === to : location.pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

Key changes from original:
- Auth redirect goes to main site login (not internal `/auth/login`)
- Nav paths: `/` instead of `/akademia`, `/moje-kursy` instead of `/akademia/moje-kursy`
- NoAccess redirect: `/brak-dostepu` instead of `/akademia/brak-dostepu`

- [ ] **Step 2: Copy page components**

Copy these files from `apps/web/src/pages/academy/` to `apps/academy-web/src/pages/`:
- `NoAccess.tsx`
- `AcademyCatalog.tsx`
- `MyCourses.tsx`
- `Certificates.tsx`
- `StandaloneQuizPage.tsx`
- `CourseDetail.tsx`
- `LessonPlayer.tsx`

After copying, update imports in each file:
- `@/api/academy.api` imports stay the same (same relative structure)
- `@/hooks/useAuth` stays the same
- `@/lib/axios` stays the same
- Any internal links like `/akademia/kurs/...` must be changed to `/kurs/...`
- Any links to main app pages (e.g., `/user/...`) should use full URL via `VITE_MAIN_SITE_URL`

**IMPORTANT:** Search each copied file for `/akademia` in route paths and replace with the root-relative equivalent.

- [ ] **Step 3: Copy `LessonQuizPlayer.tsx`**

Copy `apps/web/src/components/academy/LessonQuizPlayer.tsx` to `apps/academy-web/src/components/LessonQuizPlayer.tsx`.

Update imports to match new paths.

- [ ] **Step 4: Copy shared UI components needed by academy pages**

Check which `@/components/ui/` components are imported by the academy pages. Common ones:
- Button, Card, Input, Badge, Dialog, etc.

For now, copy only the needed UI components from `apps/web/src/components/ui/` to `apps/academy-web/src/components/ui/`. This is duplication, but it's the simplest path. Extracting to `packages/shared` can be done as a follow-up.

To find which components are needed:
```bash
grep -rh "from '@/components/" apps/web/src/pages/academy/ apps/web/src/components/academy/ | sort -u
```

- [ ] **Step 5: Copy `lib/utils.ts`**

If academy pages import `@/lib/utils` (typically the `cn()` function), copy it:

```typescript
// apps/academy-web/src/lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/academy-web/src/pages/ apps/academy-web/src/components/
git commit -m "feat: add academy pages, layout, and UI components"
```

---

## Task 6: Academy App — Entry Point & Router

**Files:**
- Create: `apps/academy-web/src/main.tsx`
- Create: `apps/academy-web/src/App.tsx`
- Create: `apps/academy-web/src/router.tsx`

- [ ] **Step 1: Create `src/main.tsx`**

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 2: Create `src/router.tsx`**

```typescript
import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';

const S = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div className="p-8 text-center">Ladowanie...</div>}>{children}</Suspense>
);

const AcademyLayout = lazy(() => import('./pages/AcademyLayout').then(m => ({ default: m.AcademyLayout })));
const NoAccess = lazy(() => import('./pages/NoAccess').then(m => ({ default: m.NoAccess })));
const AcademyCatalog = lazy(() => import('./pages/AcademyCatalog').then(m => ({ default: m.AcademyCatalog })));
const MyCourses = lazy(() => import('./pages/MyCourses').then(m => ({ default: m.MyCourses })));
const Certificates = lazy(() => import('./pages/Certificates').then(m => ({ default: m.Certificates })));
const StandaloneQuizPage = lazy(() => import('./pages/StandaloneQuizPage').then(m => ({ default: m.StandaloneQuizPage })));
const CourseDetail = lazy(() => import('./pages/CourseDetail').then(m => ({ default: m.CourseDetail })));
const LessonPlayer = lazy(() => import('./pages/LessonPlayer').then(m => ({ default: m.LessonPlayer })));

export const router = createBrowserRouter([
  {
    path: '/',
    children: [
      { path: 'brak-dostepu', element: <S><NoAccess /></S> },
      {
        element: <S><AcademyLayout /></S>,
        children: [
          { index: true, element: <S><AcademyCatalog /></S> },
          { path: 'moje-kursy', element: <S><MyCourses /></S> },
          { path: 'certyfikaty', element: <S><Certificates /></S> },
          { path: 'quizy', element: <S><StandaloneQuizPage /></S> },
          { path: 'quiz/:quizId', element: <S><StandaloneQuizPage /></S> },
          { path: 'kurs/:slug', element: <S><CourseDetail /></S> },
          { path: 'kurs/:slug/lekcja/:lessonSlug', element: <S><LessonPlayer /></S> },
        ],
      },
    ],
  },
]);
```

- [ ] **Step 3: Create `src/App.tsx`**

```typescript
import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { router } from './router';
import { queryClient } from './lib/queryClient';
import { useAuthStore } from './store/auth.store';
import { api } from './lib/axios';

function App() {
  const { hydrate, setAccessToken, setUser, logout } = useAuthStore();

  useEffect(() => {
    api.post('/auth/refresh')
      .then((res) => {
        setAccessToken(res.data.data.accessToken);
        setUser(res.data.data.user);
      })
      .catch((err) => {
        if (err?.response?.status === 401) {
          logout();
        }
      })
      .finally(() => {
        hydrate();
      });
  }, [hydrate, logout, setAccessToken, setUser]);

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
```

Simplified compared to main app — no ErrorBoundary (can add later), no TourProvider, no PWA, no analytics, no visibility change handler.

- [ ] **Step 4: Install dependencies and verify build**

```bash
cd cosmo-app && pnpm install
cd apps/academy-web && pnpm build
```

Expected: TypeScript compilation + Vite build succeed. Fix any import errors.

- [ ] **Step 5: Verify dev server starts**

```bash
cd cosmo-app/apps/academy-web && pnpm dev
```

Open `http://localhost:5174/` — should show academy catalog (or redirect to login if not authenticated).

- [ ] **Step 6: Commit**

```bash
git add apps/academy-web/
git commit -m "feat: add academy-web entry point, router, and App component"
```

---

## Task 7: Main App — Remove Academy Routes & Add Redirect

**Files:**
- Modify: `apps/web/src/router.tsx:107-115,221-238`

- [ ] **Step 1: Remove academy lazy imports**

In `apps/web/src/router.tsx`, delete lines 107-115:

```typescript
// DELETE these lines:
// Academy pages
const AcademyLayout = lazy(() => import('./pages/academy/AcademyLayout').then(m => ({ default: m.AcademyLayout })));
const NoAccess = lazy(() => import('./pages/academy/NoAccess').then(m => ({ default: m.NoAccess })));
const AcademyCatalog = lazy(() => import('./pages/academy/AcademyCatalog').then(m => ({ default: m.AcademyCatalog })));
const MyCourses = lazy(() => import('./pages/academy/MyCourses').then(m => ({ default: m.MyCourses })));
const Certificates = lazy(() => import('./pages/academy/Certificates').then(m => ({ default: m.Certificates })));
const StandaloneQuizPage = lazy(() => import('./pages/academy/StandaloneQuizPage').then(m => ({ default: m.StandaloneQuizPage })));
const CourseDetail = lazy(() => import('./pages/academy/CourseDetail').then(m => ({ default: m.CourseDetail })));
const LessonPlayer = lazy(() => import('./pages/academy/LessonPlayer').then(m => ({ default: m.LessonPlayer })));
```

- [ ] **Step 2: Replace academy route block with redirect**

In `apps/web/src/router.tsx`, replace the `/akademia` route block (lines 221-238) with a redirect component:

```typescript
{
  path: '/akademia/*',
  element: <AcademyRedirect />,
},
```

Add the redirect component at the top of the file (after imports):

```typescript
const ACADEMY_URL = import.meta.env.VITE_ACADEMY_URL || 'https://akademia.kosmetologwiktoriacwik.pl';

const AcademyRedirect = () => {
  const { pathname } = useLocation();
  const subPath = pathname.replace(/^\/akademia/, '') || '/';
  window.location.href = `${ACADEMY_URL}${subPath}`;
  return null;
};
```

Also add `useLocation` to the react-router-dom import if not already there.

- [ ] **Step 3: Remove the `/akademia` prefix check in App.tsx**

In `apps/web/src/App.tsx`, line 124 has `'/akademia'` in the protected path list. Remove it:

```typescript
// OLD:
const protectedPath = ['/admin', '/employee', '/user', '/rezerwacja', '/akademia'].some((prefix) =>

// NEW:
const protectedPath = ['/admin', '/employee', '/user', '/rezerwacja'].some((prefix) =>
```

- [ ] **Step 4: Add `VITE_ACADEMY_URL` to `.env`**

In `apps/web/.env` (create if needed):
```
VITE_ACADEMY_URL=http://localhost:5174
```

- [ ] **Step 5: Verify main app builds**

```bash
cd cosmo-app/apps/web && pnpm build
```

Expected: No errors. Academy pages are no longer imported.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/router.tsx apps/web/src/App.tsx
git commit -m "feat: remove academy routes from main app, add redirect to subdomain"
```

---

## Task 8: Delete Academy Files from Main App

**Files:**
- Delete: `apps/web/src/pages/academy/` (entire directory)
- Delete: `apps/web/src/components/academy/` (entire directory)

- [ ] **Step 1: Delete academy page files**

```bash
rm -rf cosmo-app/apps/web/src/pages/academy/
rm -rf cosmo-app/apps/web/src/components/academy/
```

**DO NOT DELETE:**
- `apps/web/src/pages/admin/academy/` — admin academy stays
- `apps/web/src/api/academy.api.ts` — used by admin pages

- [ ] **Step 2: Verify main app still builds**

```bash
cd cosmo-app/apps/web && pnpm build
```

Expected: Success. Admin academy pages still import `academy.api.ts` and work.

- [ ] **Step 3: Commit**

```bash
git add -A apps/web/src/pages/academy/ apps/web/src/components/academy/
git commit -m "chore: remove academy user pages from main app (moved to academy-web)"
```

---

## Task 9: Update Root Monorepo Config

**Files:**
- Modify: `cosmo-app/package.json:10`

- [ ] **Step 1: Add academy-web to dev command**

In `cosmo-app/package.json`, update the `dev` script to include academy:

```json
"dev": "concurrently --kill-others-on-fail --names \"server,web,academy\" --prefix-colors \"cyan,magenta,yellow\" \"pnpm --filter cosmo-server dev\" \"pnpm --filter cosmo-web dev\" \"pnpm --filter cosmo-academy-web dev\""
```

- [ ] **Step 2: Verify `pnpm install` resolves academy-web**

```bash
cd cosmo-app && pnpm install
```

The `pnpm-workspace.yaml` already includes `apps/*`, so `apps/academy-web` is auto-discovered.

- [ ] **Step 3: Verify full monorepo build**

```bash
cd cosmo-app && pnpm build
```

Expected: All three apps build successfully (shared → server → web + academy-web).

- [ ] **Step 4: Commit**

```bash
git add cosmo-app/package.json
git commit -m "feat: add academy-web to monorepo dev command"
```

---

## Task 10: Nginx Config for Academy Subdomain

**Files:**
- Create: `deploy/nginx/academy.conf`

- [ ] **Step 1: Create `deploy/nginx/academy.conf`**

```nginx
# Nginx config for akademia.kosmetologwiktoriacwik.pl
# Install as /etc/nginx/sites-available/akademia.kosmetologwiktoriacwik.pl

# Reuse the same forwarded-proto map as the main config (defined in cosmo.conf).
# If this file is loaded independently, uncomment the map block below:
# map $http_x_forwarded_proto $cosmo_forwarded_proto {
#     default $scheme;
#     https https;
# }

server {
    listen 80;
    listen [::]:80;
    server_name akademia.kosmetologwiktoriacwik.pl;
    return 301 https://akademia.kosmetologwiktoriacwik.pl$request_uri;
}

server {
    listen 127.0.0.1:8080;
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name akademia.kosmetologwiktoriacwik.pl;

    ssl_certificate /etc/letsencrypt/live/kosmetologwiktoriacwik.pl/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/kosmetologwiktoriacwik.pl/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    add_header Strict-Transport-Security "max-age=31536000" always;

    root /var/www/akademia.kosmetologwiktoriacwik.pl;
    index index.html;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/javascript
        application/javascript
        application/json
        application/manifest+json
        application/xml
        image/svg+xml
        font/woff2;

    location /assets/ {
        try_files $uri =404;
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
    }

    location /uploads/ {
        alias /home/ubuntu/cosmo-app/apps/server/uploads/;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000" always;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $cosmo_forwarded_proto;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $cosmo_forwarded_proto;
    }

    # SPA fallback — all routes serve index.html
    location / {
        add_header Strict-Transport-Security "max-age=31536000" always;
        add_header X-Robots-Tag "noindex, nofollow, noarchive" always;
        add_header Cache-Control "no-store, no-cache, must-revalidate, max-age=0" always;
        try_files $uri $uri/ /index.html;
    }
}
```

- [ ] **Step 2: Update main nginx to redirect `/akademia` to subdomain**

In `deploy/nginx/cosmo.conf`, add a redirect rule before the existing `/akademia` location match. In the existing location block at line 206, remove `akademia` from the regex pattern:

```nginx
# OLD (line 206):
location ~ ^/(admin|employee|user|auth|akademia|rezerwacja)(/|$) {

# NEW:
location ~ ^/(admin|employee|user|auth|rezerwacja)(/|$) {
```

And add a new redirect block above it:

```nginx
# Redirect old academy routes to subdomain
location ~ ^/akademia(/.*)?$ {
    return 301 https://akademia.kosmetologwiktoriacwik.pl$1;
}
```

- [ ] **Step 3: Commit**

```bash
git add deploy/nginx/academy.conf deploy/nginx/cosmo.conf
git commit -m "feat: add nginx config for academy subdomain"
```

---

## Task 11: Deploy Script for Academy

**Files:**
- Create: `deploy-academy.sh`

- [ ] **Step 1: Create `deploy-academy.sh`**

```bash
#!/bin/bash
# Deploy script for COSMO Academy app
# Usage: ./deploy-academy.sh

set -e

VPS="ubuntu@51.83.160.253"
REMOTE_DIR="/home/ubuntu/cosmo-app"
WEBROOT="/var/www/akademia.kosmetologwiktoriacwik.pl"

echo "=== COSMO Academy Deploy ==="

# 1. Push local changes
echo "[1/4] Pushing to GitHub..."
git -C "$(dirname "$0")" push origin main

# 2. Pull on VPS
echo "[2/4] Pulling on VPS..."
ssh "$VPS" "cd $REMOTE_DIR && git pull origin main"

# 3. Install deps and build academy app
echo "[3/4] Installing dependencies and building academy-web..."
ssh "$VPS" "cd $REMOTE_DIR && pnpm install --frozen-lockfile && pnpm --filter cosmo-academy-web... build"

# 4. Deploy to webroot
echo "[4/4] Synchronizing webroot..."
ssh "$VPS" "sudo mkdir -p $WEBROOT"
ssh "$VPS" "sudo rsync -a --delete --exclude='assets/' $REMOTE_DIR/apps/academy-web/dist/ $WEBROOT/"
ssh "$VPS" "sudo mkdir -p $WEBROOT/assets && sudo rsync -a $REMOTE_DIR/apps/academy-web/dist/assets/ $WEBROOT/assets/"
ssh "$VPS" "sudo find $WEBROOT/assets -type f -mtime +30 -delete"

# Install nginx config
echo "      Installing nginx configuration..."
ssh "$VPS" "sudo cp $REMOTE_DIR/deploy/nginx/academy.conf /etc/nginx/sites-available/akademia.kosmetologwiktoriacwik.pl"
ssh "$VPS" "sudo ln -sf /etc/nginx/sites-available/akademia.kosmetologwiktoriacwik.pl /etc/nginx/sites-enabled/"
ssh "$VPS" "sudo nginx -t && sudo systemctl reload nginx"

echo ""
echo "=== Academy Deploy complete ==="
```

- [ ] **Step 2: Make executable**

```bash
chmod +x cosmo-app/deploy-academy.sh
```

- [ ] **Step 3: Commit**

```bash
git add deploy-academy.sh
git commit -m "feat: add deploy script for academy subdomain"
```

---

## Task 12: DNS & SSL Setup (Manual — VPS)

These steps are manual and must be done on the VPS/DNS provider.

- [ ] **Step 1: Add DNS A record**

In your DNS provider (Cloudflare or other), add:
- Type: `A`
- Name: `akademia`
- Value: `51.83.160.253`
- Proxy: off (or on if using Cloudflare tunnel)

- [ ] **Step 2: Expand SSL certificate on VPS**

SSH into VPS and expand the Let's Encrypt certificate:

```bash
sudo certbot --expand -d kosmetologwiktoriacwik.pl -d www.kosmetologwiktoriacwik.pl -d akademia.kosmetologwiktoriacwik.pl
```

Or if using Cloudflare, the origin cert may already cover `*.kosmetologwiktoriacwik.pl`.

- [ ] **Step 3: Set `ACADEMY_URL` on VPS**

In `/home/ubuntu/cosmo-app/apps/server/.env`, add:
```
ACADEMY_URL=https://akademia.kosmetologwiktoriacwik.pl
```

- [ ] **Step 4: Restart backend on VPS**

```bash
ssh ubuntu@51.83.160.253 "pm2 restart cosmo-server"
```

- [ ] **Step 5: Deploy academy and frontend**

```bash
./deploy-academy.sh
./deploy.sh frontend
```

- [ ] **Step 6: Verify**

- `https://akademia.kosmetologwiktoriacwik.pl/` — should load academy app
- `https://kosmetologwiktoriacwik.pl/akademia` — should 301 redirect to subdomain
- Login on main site → navigate to academy subdomain → should be authenticated (shared cookie)
- Certificate download URLs still work

---

## Summary of All Commits

1. `feat: add ACADEMY_URL env var and multi-origin CORS support`
2. `feat: change refresh cookie to sameSite=lax with subdomain domain`
3. `feat: scaffold academy-web app config files`
4. `feat: add academy-web core source files (axios, auth, api)`
5. `feat: add academy pages, layout, and UI components`
6. `feat: add academy-web entry point, router, and App component`
7. `feat: remove academy routes from main app, add redirect to subdomain`
8. `chore: remove academy user pages from main app (moved to academy-web)`
9. `feat: add academy-web to monorepo dev command`
10. `feat: add nginx config for academy subdomain`
11. `feat: add deploy script for academy subdomain`
