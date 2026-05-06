# Design Spec: Modul Akademia

**Date:** 2026-05-06
**Project:** COSMO beauty salon management app
**Stack:** React 19 + Vite + React Router v7 (frontend), Express 5 + Prisma + PostgreSQL (backend)
**Scope:** Full MVP — all 13 steps from requirements

---

## 1. Overview

Add a premium educational platform ("Akademia") to the existing COSMO monorepo. Access is manually granted by admin. Users with access can browse courses, watch video lessons (YouTube/Vimeo), track progress, take quizzes, and receive PDF certificates. Admins can manage access and build courses via a CRUD interface with drag-and-drop ordering.

**Not in scope (v1):** custom video uploads, dark mode toggle specific to academy, push notifications for new courses.

---

## 2. Architecture

### Approach

Dedicated `AcademyLayout` for user-facing pages (`/akademia/*`), new admin section under existing `AdminLayout` (`/admin/akademia/*`). Single Express module `academy/` following existing `controller / router / service` pattern.

### Backend structure

```
apps/server/src/modules/academy/
├── academy.router.ts
├── courses/
│   ├── courses.controller.ts
│   ├── courses.router.ts
│   └── courses.service.ts
├── lessons/
│   ├── lessons.controller.ts
│   ├── lessons.router.ts
│   └── lessons.service.ts
├── progress/
│   ├── progress.controller.ts
│   ├── progress.router.ts
│   └── progress.service.ts
├── assessments/             # lesson quizzes (named to avoid confusion with existing quiz/ module)
│   ├── assessments.controller.ts
│   ├── assessments.router.ts
│   └── assessments.service.ts
├── certificates/
│   ├── certificates.controller.ts
│   ├── certificates.router.ts
│   └── certificates.service.ts
└── access/
    ├── access.controller.ts
    ├── access.router.ts
    └── access.service.ts
```

Mounted in `app.ts`:
- `/api/academy` — user endpoints (requireAuth + requireAcademyAccess)
- `/api/admin/academy` — admin endpoints (requireAuth + requireAdmin)

### Frontend structure

```
apps/web/src/
├── pages/
│   ├── academy/
│   │   ├── AcademyHome.tsx         # course catalog
│   │   ├── CourseDetail.tsx        # course page with module list
│   │   ├── LessonPlayer.tsx        # video player + sidebar
│   │   ├── MyCourses.tsx
│   │   ├── Favorites.tsx
│   │   ├── Certificates.tsx
│   │   └── NoAccess.tsx
│   └── admin/academy/
│       ├── AdminAcademyDashboard.tsx   # tabbed: overview + stats
│       ├── AdminCourses.tsx
│       ├── AdminCourseEditor.tsx       # module/lesson/quiz builder
│       ├── AdminLessonEditor.tsx
│       └── AdminAcademyAccess.tsx
├── components/
│   ├── academy/
│   │   ├── CourseCard.tsx
│   │   ├── CourseFilters.tsx
│   │   ├── LessonSidebar.tsx
│   │   ├── VideoPlayer.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── QuizRunner.tsx
│   │   ├── CertificateCard.tsx
│   │   └── NotesPanel.tsx
│   └── layout/
│       └── AcademyLayout.tsx
├── api/
│   └── academy.api.ts
└── store/
    └── academy.store.ts            # Zustand: access status, currentCourse, progress map
```

---

## 3. Database

### User model extensions (add fields to existing model)

```prisma
hasAcademyAccess       Boolean   @default(false)
academyAccessExpiresAt DateTime?
academyGrantedById     String?
academyGrantedAt       DateTime?
academyGrantedBy       User?          @relation("AcademyGrants", fields: [academyGrantedById], references: [id])
academyGrantsGiven     User[]         @relation("AcademyGrants")
courseProgress         UserCourseProgress[]
lessonProgress         UserLessonProgress[]
lessonQuizAttempts     LessonQuizAttempt[]
certificates           Certificate[]
favorites              CourseFavorite[]
lessonNotes            LessonNote[]
```

### New models

**Note on naming:** The existing schema has a `Quiz` model (booking decision-tree) and a `Tag` model (blog tags). New academy models use prefixed names `LessonQuiz`, `LessonQuizQuestion`, `LessonQuizAttempt`, and `CourseTag` to avoid Prisma name collisions.

```prisma
model Course {
  id           String       @id @default(cuid())
  slug         String       @unique
  title        String
  description  String       @db.Text
  thumbnail    String?
  difficulty   Difficulty   @default(BEGINNER)
  durationMin  Int          @default(0)
  instructor   String?
  language     String       @default("pl")
  status       CourseStatus @default(DRAFT)
  isFeatured   Boolean      @default(false)
  categoryId   String?
  category     CourseCategory? @relation(fields: [categoryId], references: [id])
  tags         CourseTag[]  @relation("CourseTags")
  modules      CourseModule[]
  progress     UserCourseProgress[]
  certificates Certificate[]
  favorites    CourseFavorite[]
  publishedAt  DateTime?
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
  @@index([status, publishedAt])
  @@index([slug])
}

model CourseModule {
  id          String   @id @default(cuid())
  courseId    String
  course      Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  title       String
  description String?  @db.Text
  order       Int
  lessons     Lesson[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@index([courseId, order])
}

model Lesson {
  id            String          @id @default(cuid())
  moduleId      String
  module        CourseModule    @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  slug          String
  title         String
  type          LessonType      @default(VIDEO)
  content       String?         @db.Text
  videoUrl      String?
  videoProvider VideoProvider?
  durationMin   Int             @default(0)
  order         Int
  isFreePreview Boolean         @default(false)
  quiz          LessonQuiz?
  progress      UserLessonProgress[]
  notes         LessonNote[]
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt
  @@unique([moduleId, slug])
  @@index([moduleId, order])
}

model LessonQuiz {
  id           String              @id @default(cuid())
  lessonId     String              @unique
  lesson       Lesson              @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  title        String
  passingScore Int                 @default(70)
  timeLimit    Int?
  questions    LessonQuizQuestion[]
  attempts     LessonQuizAttempt[]
  createdAt    DateTime            @default(now())
}

model LessonQuizQuestion {
  id          String       @id @default(cuid())
  quizId      String
  quiz        LessonQuiz   @relation(fields: [quizId], references: [id], onDelete: Cascade)
  text        String       @db.Text
  type        QuestionType @default(SINGLE_CHOICE)
  options     Json         // [{ id: string, text: string, isCorrect: boolean }]
  explanation String?      @db.Text
  points      Int          @default(1)
  order       Int
  @@index([quizId, order])
}

model LessonQuizAttempt {
  id         String     @id @default(cuid())
  userId     String
  user       User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  quizId     String
  quiz       LessonQuiz @relation(fields: [quizId], references: [id], onDelete: Cascade)
  score      Int
  passed     Boolean
  answers    Json       // [{ questionId: string, selectedOptionIds: string[] }]
  startedAt  DateTime
  finishedAt DateTime   @default(now())
  @@index([userId, quizId])
}

model UserCourseProgress {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  courseId        String
  course          Course    @relation(fields: [courseId], references: [id], onDelete: Cascade)
  percentComplete Int       @default(0)
  startedAt       DateTime  @default(now())
  completedAt     DateTime?
  lastAccessedAt  DateTime  @default(now())
  @@unique([userId, courseId])
  @@index([userId])
}

model UserLessonProgress {
  id           String    @id @default(cuid())
  userId       String
  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  lessonId     String
  lesson       Lesson    @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  isCompleted  Boolean   @default(false)
  completedAt  DateTime?
  watchSeconds Int       @default(0)
  lastPosition Int       @default(0)
  updatedAt    DateTime  @updatedAt
  @@unique([userId, lessonId])
  @@index([userId])
}

model Certificate {
  id               String   @id @default(cuid())
  userId           String
  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  courseId         String
  course           Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  verificationCode String   @unique
  pdfUrl           String?
  issuedAt         DateTime @default(now())
  @@unique([userId, courseId])
}

model CourseFavorite {
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  courseId  String
  course    Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  @@id([userId, courseId])
}

model LessonNote {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  lessonId  String
  lesson    Lesson   @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  content   String   @db.Text
  timestamp Int?     // video second when note was taken
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([userId, lessonId])
}

model CourseCategory {
  id        String   @id @default(cuid())
  slug      String   @unique
  name      String
  icon      String?
  courses   Course[]
  createdAt DateTime @default(now())
}

model CourseTag {
  id      String   @id @default(cuid())
  slug    String   @unique
  name    String
  courses Course[] @relation("CourseTags")
}

model AcademyAccessLog {
  id           String       @id @default(cuid())
  targetUserId String
  adminId      String
  action       AccessAction
  reason       String?
  expiresAt    DateTime?
  createdAt    DateTime     @default(now())
  @@index([targetUserId])
}

enum Difficulty    { BEGINNER INTERMEDIATE ADVANCED }
enum CourseStatus  { DRAFT PUBLISHED ARCHIVED }
enum LessonType    { VIDEO TEXT QUIZ PDF }
enum VideoProvider { YOUTUBE VIMEO }
enum QuestionType  { SINGLE_CHOICE MULTIPLE_CHOICE TRUE_FALSE }
enum AccessAction  { GRANTED REVOKED EXTENDED EXPIRED }
```

Migration command: `pnpm prisma:migrate` (from `apps/server/`) with name `add_academy_module`.

---

## 4. Access Control

### Backend middleware

New `requireAcademyAccess` middleware in `apps/server/src/middleware/academy.middleware.ts`:

1. Verify JWT (chain after existing `authenticate` from `auth.middleware.ts`)
2. Query `user.hasAcademyAccess` and `user.academyAccessExpiresAt`
3. If `expiresAt` is set and in the past: auto-update `hasAcademyAccess = false`, write `AcademyAccessLog` entry with `action: EXPIRED`, return 403
4. If `hasAcademyAccess = false`: return 403
5. Call `next()`

Route registration pattern: `router.use(authenticate, requireAcademyAccess)` for all `/api/academy/*` routes. Admin routes use `router.use(authenticate, requireAdmin)`.

### Frontend guard

`AcademyGuard` component wraps `AcademyLayout`:
- On mount: `GET /api/academy/access/me` → caches result in `academy.store`
- No access: redirect to `/akademia/brak-dostepu`
- Not logged in: redirect to `/auth/login`
- Result cached for the session (not re-fetched on each navigation)

`/akademia/brak-dostepu` is a **sibling route outside the guard** — it must be placed in `router.tsx` as a plain route, not as a child of the guarded `/akademia` group, otherwise the redirect would loop.

---

## 5. Data Flow

### Course viewing

```
GET /api/academy/courses              # catalog with my progress per course
GET /api/academy/courses/:slug        # course detail: modules + lessons + my progress
GET /api/academy/lessons/:id          # lesson detail: content / videoUrl
```

### Progress tracking

- Every 10s during video: `PATCH /api/academy/progress/lesson` `{ lessonId, watchSeconds, lastPosition }`
- Lesson complete when: video ≥90% watched OR "Mark complete" clicked OR quiz passed
- On lesson complete: backend recalculates `UserCourseProgress.percentComplete`
- On course 100%: backend generates certificate atomically via `prisma.$transaction()`

### Quiz flow

```
POST /api/academy/assessments/:quizId/submit
  body: { answers: [{ questionId: string, selectedOptionIds: string[] }], startedAt: string }
  returns: { score: number, passed: boolean, details: [{ questionId, correct, explanation }] }
  → if passed: triggers lesson completion
  → max 3 attempts per LessonQuiz per 24h enforced in service layer
```

### Certificate generation

- Server-side via `pdf-lib`
- Contains: user name, course title, issue date, unique `verificationCode` (nanoid 12 chars)
- Saved to `apps/server/uploads/certificates/[code].pdf`
- Served via existing `/uploads` static endpoint
- Public verification: `GET /api/academy/certificates/verify/:code` (no auth required)

---

## 6. Admin — Course Builder

`AdminCourseEditor` page:
- Metadata form: title, slug (auto-generated from title), description, thumbnail upload (existing multer), difficulty, category, tags, instructor, language
- Module list: drag-and-drop reorder via `@dnd-kit/sortable`
  - Each module: expandable, contains lesson list (also drag-and-drop)
  - Each lesson: inline form — title, type, videoUrl (if VIDEO), Markdown content (if TEXT), isFreePreview toggle
  - Attach quiz to any lesson via QuizBuilder sub-panel
- Incremental save: each resource has its own API endpoint, no single mega-save
- Publish/Draft toggle on course

### Admin access management (`/admin/akademia/dostepy`)

Table columns: avatar, name, email, status (badge), expiry date, actions.

Filters: all / with access / without access / expiring in 7 days.

Search: by name or email.

Per-row actions:
- Grant: modal with duration choice (indefinite / 30 / 90 / 180 / 365 days / custom date)
- Revoke: confirm dialog
- Extend: modal with duration

Bulk select: grant access to multiple users at once.

All actions write to `AcademyAccessLog`.

API: `POST /api/admin/academy/access` with body `{ userId, action: "GRANT" | "REVOKE" | "EXTEND", durationDays?: number, reason?: string }`.

**Bulk grant:** The UI allows selecting multiple users and granting access. This fires the single-user endpoint once per selected user (client-side loop). No batch endpoint needed.

### Admin dashboard (`/admin/akademia`)

Single `AdminAcademyDashboard` component with two tabs:
- **Przegląd** (default tab): quick stats cards (total courses, active users, completions this month)
- **Statystyki**: detailed charts (per-course completion rates, active learners over time)

Both tabs are rendered within one route `/admin/akademia`. There is no separate `/admin/akademia/statystyki` route — the stats tab is a UI tab within the same page.

---

## 7. New npm Packages

### Frontend (`apps/web`)
- `react-player` — YouTube + Vimeo embed
- `@dnd-kit/core` + `@dnd-kit/sortable` — drag-and-drop in builder
- `sonner` — already installed (v1.4.41), no action needed
- `date-fns` — already installed (v3.6.0), no action needed

### Backend (`apps/server`)
- `pdf-lib` — certificate PDF generation
- `nanoid` — unique verification codes

Existing packages reused: `zod`, `multer`, `sharp`, existing `RichTextViewer` for Markdown rendering.

---

## 8. Security

| Threat | Mitigation |
|---|---|
| Accessing lessons without premium | `requireAcademyAccess` middleware on all `/api/academy/*` |
| Admin endpoints without role | Existing `requireAdmin` middleware |
| XSS in Markdown content | `rehype-sanitize` in RichTextViewer (verify/add) |
| Input injection | Zod validation schemas on all POST/PUT endpoints |
| Quiz brute-force | Max 3 attempts per LessonQuiz per 24h in service layer |
| Forged certificates | Public verification endpoint by `verificationCode` |

---

## 9. Routes

### Frontend router additions

```
/akademia                                  AcademyHome (catalog)
/akademia/brak-dostepu                     NoAccess
/akademia/moje-kursy                       MyCourses
/akademia/ulubione                         Favorites
/akademia/certyfikaty                      Certificates
/akademia/kurs/:slug                       CourseDetail
/akademia/kurs/:slug/lekcja/:lessonSlug    LessonPlayer

/admin/akademia                            AdminAcademyDashboard (tabbed: overview + stats)
/admin/akademia/kursy                      AdminCourses
/admin/akademia/kursy/nowy                 AdminCourseEditor (new)
/admin/akademia/kursy/:id/edytuj           AdminCourseEditor (edit)
/admin/akademia/dostepy                    AdminAcademyAccess
```

### Backend API

```
GET    /api/academy/access/me
GET    /api/academy/courses
GET    /api/academy/courses/:slug
GET    /api/academy/lessons/:id
PATCH  /api/academy/progress/lesson
POST   /api/academy/assessments/:quizId/submit
GET    /api/academy/certificates
GET    /api/academy/certificates/verify/:code   (no auth)
POST   /api/academy/favorites
DELETE /api/academy/favorites/:courseId
GET    /api/academy/notes/:lessonId
POST   /api/academy/notes
PUT    /api/academy/notes/:id
DELETE /api/academy/notes/:id

POST   /api/admin/academy/access
GET    /api/admin/academy/users
GET    /api/admin/academy/courses
POST   /api/admin/academy/courses
PUT    /api/admin/academy/courses/:id
DELETE /api/admin/academy/courses/:id
POST   /api/admin/academy/modules
PATCH  /api/admin/academy/modules/reorder    # MUST be registered before /:id route
                                              # body: { items: [{ id: string, order: number }] }
PUT    /api/admin/academy/modules/:id
DELETE /api/admin/academy/modules/:id
POST   /api/admin/academy/lessons
PATCH  /api/admin/academy/lessons/reorder    # MUST be registered before /:id route
                                              # body: { moduleId: string, items: [{ id: string, order: number }] }
PUT    /api/admin/academy/lessons/:id
DELETE /api/admin/academy/lessons/:id
POST   /api/admin/academy/quizzes
PUT    /api/admin/academy/quizzes/:id
DELETE /api/admin/academy/quizzes/:id
GET    /api/admin/academy/stats
```

**Note on reorder routes:** Static path segments (`/reorder`) must be registered in Express **before** parameterized segments (`/:id`) in each router file to prevent Express from matching `"reorder"` as an `:id` value.

---

## 10. Implementation Order

1. Prisma migration + seed (1 example course, 2 modules, 3 lessons)
2. `requireAcademyAccess` middleware + `access.service.ts`
3. Admin: `/admin/akademia/dostepy` — access management table + grant/revoke API
4. Frontend: `AcademyLayout`, `AcademyGuard`, `/akademia/brak-dostepu`
5. Frontend: `/akademia` catalog + `/akademia/kurs/:slug` course detail page
6. Frontend + backend: `/akademia/kurs/:slug/lekcja/:lessonSlug` — VideoPlayer + progress tracking
7. Backend: quiz grading (`assessments/`) + Frontend: QuizRunner
8. Backend: certificate PDF generation + Frontend: Certificates page
9. Admin: AdminCourseEditor (CRUD + drag-and-drop)
10. Frontend: MyCourses, Favorites, Notes, search/filters
11. Admin: statistics tab in AdminAcademyDashboard
