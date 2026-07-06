# Academy Subdomain Migration Design

**Date:** 2026-07-06
**Status:** Approved
**Goal:** Move the Academy module from `/akademia/*` routes to a separate subdomain `akademia.kosmetologwiktoriacwik.pl`.

## Context

The Academy is currently part of the main SPA (`apps/web/`). It has its own layout, pages, API layer, and access control. Moving it to a subdomain provides independent deploys, smaller bundles, and clearer separation.

## Architecture

```
cosmo-app/
├── apps/
│   ├── web/              # Main site (academy routes removed)
│   ├── academy-web/      # NEW: Subdomain academy app
│   └── server/           # Backend (unchanged API)
└── packages/
    └── shared/           # Extended with shared React UI components
```

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Admin academy routes | Stay in `apps/web/` at `/admin/akademia/*` | Keeps admin panel unified |
| App structure | Separate Vite app `apps/academy-web/` | Independent deploys, smaller bundles, clean separation |
| Auth between domains | Cookie on `.kosmetologwiktoriacwik.pl` | Single sign-on, user logs in once |
| UI consistency | Same design, shared components | Spójność wizualna |
| Shared components | Extend `packages/shared/` with React UI | No new package, fewer deps to manage |
| Deploy | Separate `deploy-academy.sh` | Independent from main deploy, no risk of breaking each other |

## What Changes

### 1. New App: `apps/academy-web/`

- Vite + React 19 + TypeScript
- Own `package.json`, `vite.config.ts`, `tsconfig.json`
- Own router with academy routes:
  - `/` → AcademyCatalog
  - `/moje-kursy` → MyCourses
  - `/quizy` → StandaloneQuizPage
  - `/certyfikaty` → Certificates
  - `/kurs/:slug` → CourseDetail
  - `/kurs/:slug/lekcja/:lessonSlug` → LessonPlayer
  - `/brak-dostepu` → NoAccess
- Own AcademyLayout (moved from `apps/web/`)
- Own axios instance configured for API + auth
- Own Zustand auth store (same pattern as main app)
- Tailwind + same theme/design tokens as main app

### 2. Shared Package Extension (`packages/shared/`)

Move reusable React components from `apps/web/` to `packages/shared/`:
- UI primitives used by both apps (buttons, inputs, cards, modals, spinners, etc.)
- Theme configuration / design tokens
- Auth store pattern / axios interceptor logic (as reusable utilities)
- Keep Zod schemas and types as-is

### 3. Backend Changes

Minimal but critical:
- **CORS**: Change from single-string `origin: env.CLIENT_URL` to array/callback supporting multiple origins. Add `ACADEMY_URL` env var to `config/env.ts` Zod schema. Update CORS config to `origin: [env.CLIENT_URL, env.ACADEMY_URL]`
- **Cookie domain**: Set refresh token cookie domain to `.kosmetologwiktoriacwik.pl` (with leading dot) so it works across subdomains
- **Cookie sameSite**: Change `sameSite: 'strict'` to `sameSite: 'lax'` on refresh token cookie — `strict` blocks cross-subdomain cookie sending entirely
- **Socket.IO CORS**: Update Socket.IO CORS origins in `socket.ts` to also include `ACADEMY_URL` (needed if academy uses any real-time features like notifications)
- **OAuth cookies**: Social login (Facebook/Google) cookies and redirect URLs are `CLIENT_URL`-based. Academy subdomain will NOT have social login — users log in on main domain. Spec this explicitly: no OAuth flows on academy subdomain
- API endpoints (`/api/academy/*`) remain unchanged
- Academy middleware (`requireAcademyAccess`) remains unchanged

### 4. Main App Changes (`apps/web/`)

- Remove academy page components from `src/pages/academy/`
- Remove academy component from `src/components/academy/`
- Remove AcademyLayout
- Remove `/akademia/*` routes from `router.tsx`
- Keep admin academy routes (`/admin/akademia/*`) — they call the same API
- Keep full `academy.api.ts` in `apps/web/` — admin pages need both admin and user-facing endpoints for previewing
- Create user-only subset `academy.api.ts` in `apps/academy-web/` (no admin endpoints)
- Add redirect: `/akademia/*` → `https://akademia.kosmetologwiktoriacwik.pl/*` — both nginx 301 (for direct URL hits/bookmarks/SEO) AND React Router `Navigate` (for in-app navigation)

### 5. Infrastructure

**DNS:**
- A record: `akademia.kosmetologwiktoriacwik.pl` → `51.83.160.253` (same VPS)

**Nginx:**
- New server block for `akademia.kosmetologwiktoriacwik.pl`
- Serves static files from `/var/www/akademia.kosmetologwiktoriacwik.pl/`
- Proxies `/api/*` to `http://127.0.0.1:3001`
- SSL certificate (extend existing or new Let's Encrypt cert for subdomain)

**Deploy:**
- New `deploy-academy.sh` script
- Builds `apps/academy-web/`
- Copies dist to `/var/www/akademia.kosmetologwiktoriacwik.pl/`
- Reloads nginx

### 6. SSL

- Extend Let's Encrypt certificate to include `akademia.kosmetologwiktoriacwik.pl`
- Or issue separate cert for subdomain
- Certbot: `certbot --expand -d kosmetologwiktoriacwik.pl -d akademia.kosmetologwiktoriacwik.pl`

## What Does NOT Change

- Backend API (endpoints, middleware, database) — zero changes beyond CORS/cookie
- Prisma schema — no changes
- Admin academy panel — stays in main app
- Database models — no changes
- Authentication flow logic — same JWT dual-token, just cookie domain widens

## File Inventory

### Files to CREATE (in `apps/academy-web/`):
- `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`
- `index.html`
- `src/main.tsx`, `src/App.tsx`, `src/router.tsx`
- `src/lib/axios.ts` (configured for subdomain)
- `src/store/auth.store.ts` (Zustand, same pattern)
- `src/api/academy.api.ts` (user-facing endpoints only)
- `src/pages/` — moved from `apps/web/src/pages/academy/`
- `src/components/` — AcademyLayout + LessonQuizPlayer
- `tailwind.config.ts`, `postcss.config.js`
- `.env` with `VITE_API_URL` (dev: empty/proxied, prod: same server)

**Dev configuration notes:**
- Vite dev server on port **5174** (main app uses 5173) to avoid conflicts
- Vite proxy rules: `/api`, `/uploads`, `/socket.io` → `localhost:3001` (same as main app)
- Turborepo: `pnpm dev` from root starts all apps including academy

### Files to MODIFY:
- `apps/web/src/router.tsx` — remove academy routes, add redirect
- `apps/server/src/app.ts` — CORS origins
- `apps/server/src/modules/auth/auth.controller.ts` — cookie domain + sameSite change
- `apps/server/src/config/env.ts` — add `ACADEMY_URL` to Zod schema
- `apps/server/src/socket.ts` — CORS origins for Socket.IO
- `apps/server/.env` — add `ACADEMY_URL`
- `packages/shared/package.json` — add React UI exports
- `cosmo-app/pnpm-workspace.yaml` — verify academy-web included
- `cosmo-app/turbo.json` — add academy-web pipeline

### Files to DELETE (from `apps/web/`):
- `src/pages/academy/*.tsx` (6 page files: AcademyCatalog, MyCourses, CourseDetail, LessonPlayer, StandaloneQuizPage, Certificates, NoAccess)
- `src/components/academy/LessonQuizPlayer.tsx`
- `src/pages/academy/AcademyLayout.tsx`

**Files that STAY in `apps/web/` (admin):**
- `src/pages/admin/academy/AdminAkademia.tsx`
- `src/pages/admin/academy/AdminCourseList.tsx`
- `src/pages/admin/academy/AdminCourseEditor.tsx`
- `src/pages/admin/academy/AdminStandaloneQuizEditor.tsx`
- `src/pages/admin/academy/AdminAccessManager.tsx`
- `src/api/academy.api.ts` (full version, used by admin pages)

### Files to CREATE (infrastructure):
- `deploy-academy.sh` (must build shared package first: `pnpm build --filter=academy-web...`)
- `deploy/nginx/academy.conf`

## Note: Shared Package and React

`packages/shared/` currently has only `zod` — no React dependency. Adding React UI components would leak React into `apps/server/`. To avoid this, shared React components will be added as a separate export path (`@cosmo/shared/ui`) with React as a **peer dependency** only. The server app imports only `@cosmo/shared` (schemas/types) and will not resolve the UI subpath. Alternatively, if this gets complex, we can create `packages/ui/` later — but start with subpath exports to keep it simple.
