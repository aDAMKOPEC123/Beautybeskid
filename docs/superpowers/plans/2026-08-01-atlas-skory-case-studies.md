# Atlas Skory & Interaktywne Case Studies — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two premium interactive features to academy-web: Skin Atlas (interactive body map encyclopedia with quiz mode) and Diagnostic Case Studies (step-by-step clinical simulations).

**Architecture:** Two new backend modules under `apps/server/src/modules/academy/` (skin-atlas, diagnostic-cases), each with standard router/controller/service split. New Prisma models follow existing cuid ID + timestamp conventions. Frontend adds new pages to academy-web with lazy-loaded routes, using existing TanStack Query + Zustand patterns.

**Tech Stack:** React 19, TypeScript, Vite, TanStack Query, Zustand, Tailwind + custom CSS, Express 5, Prisma ORM, PostgreSQL, Vitest

**Spec:** `docs/superpowers/specs/2026-07-31-atlas-skory-case-studies-design.md`

---

## File Structure

### Backend (apps/server/)

**Create:**
- `src/modules/academy/skin-atlas/skin-atlas.router.ts` — route definitions for atlas public + admin endpoints
- `src/modules/academy/skin-atlas/skin-atlas.controller.ts` — request handlers
- `src/modules/academy/skin-atlas/skin-atlas.service.ts` — business logic + Prisma queries
- `src/modules/academy/skin-atlas/skin-atlas.service.test.ts` — unit tests
- `src/modules/academy/diagnostic-cases/diagnostic-cases.router.ts` — route definitions
- `src/modules/academy/diagnostic-cases/diagnostic-cases.controller.ts` — request handlers
- `src/modules/academy/diagnostic-cases/diagnostic-cases.service.ts` — business logic
- `src/modules/academy/diagnostic-cases/diagnostic-cases.service.test.ts` — unit tests

**Modify:**
- `prisma/schema.prisma` — add new models and enums
- `src/modules/academy/academy.router.ts` — register new sub-module routers

### Frontend (apps/academy-web/src/)

**Create:**
- `pages/atlas/SkinAtlasMap.tsx` — body map with hotspots + region list
- `pages/atlas/SkinAtlasRegion.tsx` — condition list for a region
- `pages/atlas/SkinAtlasCondition.tsx` — single condition detail card
- `pages/atlas/SkinAtlasQuiz.tsx` — quiz mode player
- `pages/case-studies/CaseStudyList.tsx` — list of case studies for a course
- `pages/case-studies/CaseStudyPlayer.tsx` — interactive step-by-step player

**Modify:**
- `api/academy.api.ts` — add atlas + diagnostic case API methods
- `router.tsx` — add new routes with lazy loading
- `index.css` — add atlas + case study styles
- `pages/AcademyLayout.tsx` — add "Atlas" nav link
- `pages/AcademyAdminLayout.tsx` — add admin nav items
- `pages/AcademyCatalog.tsx` — add "Ucz sie inaczej" section + case study badge on CourseCard

---

## Task 1: Prisma Schema — New Models and Enums

**Files:**
- Modify: `apps/server/prisma/schema.prisma`

- [ ] **Step 1: Add enums at the end of the enum block (after existing enums, around line 207)**

```prisma
enum SkinAtlasSeverity {
  MILD
  MODERATE
  SEVERE
}

enum DiagnosticDifficulty {
  EASY
  MEDIUM
  HARD
}

enum DiagnosticStepType {
  INTERVIEW
  DIAGNOSIS
  TREATMENT
  RESULT
}

enum DiagnosticImageType {
  BEFORE
  DURING
  AFTER
}
```

- [ ] **Step 2: Add Skin Atlas models at the end of the schema file**

```prisma
// ── Skin Atlas ──────────────────────────────────────────────

model SkinAtlasRegion {
  id           String   @id @default(cuid())
  name         String
  slug         String   @unique
  thumbnailUrl String?
  hotspotX     Float    @default(50)
  hotspotY     Float    @default(50)
  order        Int      @default(0)
  published    Boolean  @default(false)
  conditions   SkinAtlasCondition[]
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model SkinAtlasCondition {
  id                   String   @id @default(cuid())
  regionId             String
  region               SkinAtlasRegion @relation(fields: [regionId], references: [id], onDelete: Cascade)
  name                 String
  slug                 String   @unique
  description          String   @db.Text
  causes               String   @db.Text
  treatments           String   @db.Text
  contraindications    String   @db.Text
  order                Int      @default(0)
  published            Boolean  @default(false)
  relatedCourseId      String?
  relatedCourse        Course?  @relation(fields: [relatedCourseId], references: [id], onDelete: SetNull)
  relatedCaseStudyId   String?
  relatedCaseStudy     DiagnosticCaseStudy? @relation(fields: [relatedCaseStudyId], references: [id], onDelete: SetNull)
  images               SkinAtlasImage[]
  quizQuestions        SkinAtlasQuizQuestion[]
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  @@index([regionId])
}

model SkinAtlasImage {
  id          String              @id @default(cuid())
  conditionId String
  condition   SkinAtlasCondition  @relation(fields: [conditionId], references: [id], onDelete: Cascade)
  url         String
  alt         String              @default("")
  severity    SkinAtlasSeverity
  order       Int                 @default(0)

  @@index([conditionId])
}

model SkinAtlasQuizQuestion {
  id               String              @id @default(cuid())
  conditionId      String
  condition        SkinAtlasCondition  @relation(fields: [conditionId], references: [id], onDelete: Cascade)
  questionText     String
  questionImageUrl String?
  explanation      String              @db.Text
  order            Int                 @default(0)
  answers          SkinAtlasQuizAnswer[]

  @@index([conditionId])
}

model SkinAtlasQuizAnswer {
  id         String                  @id @default(cuid())
  questionId String
  question   SkinAtlasQuizQuestion   @relation(fields: [questionId], references: [id], onDelete: Cascade)
  text       String
  isCorrect  Boolean                 @default(false)
  order      Int                     @default(0)

  @@index([questionId])
}

model SkinAtlasQuizAttempt {
  id         String       @id @default(cuid())
  userId     String
  user       AcademyUser  @relation(fields: [userId], references: [id], onDelete: Cascade)
  regionSlug String?
  score      Int
  maxScore   Int
  answers    Json
  completedAt DateTime    @default(now())

  @@index([userId])
}
```

- [ ] **Step 3: Add Diagnostic Case Study models**

```prisma
// ── Diagnostic Case Studies ─────────────────────────────────

model DiagnosticCaseStudy {
  id                String   @id @default(cuid())
  title             String
  description       String   @db.Text
  thumbnailUrl      String?
  difficulty        DiagnosticDifficulty @default(MEDIUM)
  regionSlug        String?
  courseId           String?
  course            Course?  @relation(fields: [courseId], references: [id], onDelete: SetNull)
  published         Boolean  @default(false)
  order             Int      @default(0)
  clientName        String
  clientAge         Int
  clientDescription String   @db.Text
  steps             DiagnosticCaseStep[]
  attempts          DiagnosticCaseAttempt[]
  referencedByConditions SkinAtlasCondition[]
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([courseId])
}

model DiagnosticCaseStep {
  id           String               @id @default(cuid())
  caseStudyId  String
  caseStudy    DiagnosticCaseStudy  @relation(fields: [caseStudyId], references: [id], onDelete: Cascade)
  type         DiagnosticStepType
  content      String               @db.Text
  question     String?
  multiSelect  Boolean              @default(false)
  order        Int                  @default(0)
  answers      DiagnosticCaseAnswer[]
  images       DiagnosticCaseStepImage[]

  @@index([caseStudyId])
}

model DiagnosticCaseStepImage {
  id     String              @id @default(cuid())
  stepId String
  step   DiagnosticCaseStep  @relation(fields: [stepId], references: [id], onDelete: Cascade)
  url    String
  alt    String?
  type   DiagnosticImageType
  order  Int                 @default(0)

  @@index([stepId])
}

model DiagnosticCaseAnswer {
  id          String              @id @default(cuid())
  stepId      String
  step        DiagnosticCaseStep  @relation(fields: [stepId], references: [id], onDelete: Cascade)
  text        String
  isCorrect   Boolean             @default(false)
  explanation String?             @db.Text
  order       Int                 @default(0)

  @@index([stepId])
}

model DiagnosticCaseAttempt {
  id          String               @id @default(cuid())
  caseStudyId String
  caseStudy   DiagnosticCaseStudy  @relation(fields: [caseStudyId], references: [id], onDelete: Cascade)
  userId      String
  user        AcademyUser          @relation(fields: [userId], references: [id], onDelete: Cascade)
  score       Int
  maxScore    Int
  startedAt   DateTime             @default(now())
  completedAt DateTime?
  answers     Json

  @@index([userId])
  @@index([caseStudyId])
}
```

- [ ] **Step 4: Add reverse relations to existing models**

Add to `AcademyUser` model:
```prisma
  atlasQuizAttempts      SkinAtlasQuizAttempt[]
  diagnosticCaseAttempts DiagnosticCaseAttempt[]
```

Add to `Course` model:
```prisma
  atlasConditions       SkinAtlasCondition[]
  diagnosticCaseStudies DiagnosticCaseStudy[]
```

- [ ] **Step 5: Run migration**

```bash
cd apps/server && npx prisma migrate dev --name add_skin_atlas_and_diagnostic_cases
```

- [ ] **Step 6: Verify Prisma client generates without errors**

```bash
cd apps/server && npx prisma generate
```

- [ ] **Step 7: Commit**

```bash
git add apps/server/prisma/
git commit -m "feat(schema): add Skin Atlas and Diagnostic Case Study models"
```

---

## Task 2: Skin Atlas Backend — Service + Tests

**Files:**
- Create: `apps/server/src/modules/academy/skin-atlas/skin-atlas.service.ts`
- Create: `apps/server/src/modules/academy/skin-atlas/skin-atlas.service.test.ts`

- [ ] **Step 1: Write failing tests for atlas service**

Create `apps/server/src/modules/academy/skin-atlas/skin-atlas.service.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  regionFindMany: vi.fn(),
  regionFindUnique: vi.fn(),
  regionCreate: vi.fn(),
  regionUpdate: vi.fn(),
  regionDelete: vi.fn(),
  conditionFindMany: vi.fn(),
  conditionFindUnique: vi.fn(),
  conditionCreate: vi.fn(),
  conditionUpdate: vi.fn(),
  conditionDelete: vi.fn(),
  quizQuestionFindMany: vi.fn(),
  quizAttemptCreate: vi.fn(),
}));

vi.mock('../../../config/prisma', () => ({
  prisma: {
    skinAtlasRegion: {
      findMany: mocks.regionFindMany,
      findUnique: mocks.regionFindUnique,
      create: mocks.regionCreate,
      update: mocks.regionUpdate,
      delete: mocks.regionDelete,
    },
    skinAtlasCondition: {
      findMany: mocks.conditionFindMany,
      findUnique: mocks.conditionFindUnique,
      create: mocks.conditionCreate,
      update: mocks.conditionUpdate,
      delete: mocks.conditionDelete,
    },
    skinAtlasQuizQuestion: { findMany: mocks.quizQuestionFindMany },
    skinAtlasQuizAttempt: { create: mocks.quizAttemptCreate },
  },
}));

import * as atlasService from './skin-atlas.service';

describe('Skin Atlas Service', () => {
  beforeEach(() => Object.values(mocks).forEach(m => m.mockReset()));

  describe('listPublishedRegions', () => {
    it('returns only published regions with condition counts', async () => {
      mocks.regionFindMany.mockResolvedValue([
        { id: 'r1', name: 'Twarz', slug: 'twarz', published: true, _count: { conditions: 5 } },
      ]);
      const result = await atlasService.listPublishedRegions();
      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('twarz');
      expect(mocks.regionFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { published: true } })
      );
    });
  });

  describe('getConditionBySlug', () => {
    it('returns condition with images and related course', async () => {
      mocks.conditionFindUnique.mockResolvedValue({
        id: 'c1', slug: 'tradzik', published: true,
        region: { slug: 'twarz', name: 'Twarz' },
        images: [], relatedCourse: null,
      });
      const result = await atlasService.getConditionBySlug('tradzik');
      expect(result.slug).toBe('tradzik');
    });

    it('throws 404 for unpublished condition', async () => {
      mocks.conditionFindUnique.mockResolvedValue({ published: false });
      await expect(atlasService.getConditionBySlug('hidden'))
        .rejects.toMatchObject({ statusCode: 404 });
    });

    it('throws 404 for nonexistent condition', async () => {
      mocks.conditionFindUnique.mockResolvedValue(null);
      await expect(atlasService.getConditionBySlug('nope'))
        .rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('adminCreateRegion', () => {
    it('rejects slug "quiz" as reserved', async () => {
      await expect(atlasService.adminCreateRegion({ name: 'Quiz', slug: 'quiz' }))
        .rejects.toMatchObject({ statusCode: 400 });
    });

    it('rejects empty name', async () => {
      await expect(atlasService.adminCreateRegion({ name: '', slug: 'test' }))
        .rejects.toMatchObject({ statusCode: 400 });
    });

    it('creates region with valid data', async () => {
      mocks.regionCreate.mockResolvedValue({ id: 'r1', name: 'Twarz', slug: 'twarz' });
      const result = await atlasService.adminCreateRegion({ name: 'Twarz', slug: 'twarz' });
      expect(result.name).toBe('Twarz');
    });
  });

  describe('getQuizQuestions', () => {
    it('returns questions for a specific region', async () => {
      mocks.quizQuestionFindMany.mockResolvedValue([
        { id: 'q1', questionText: 'Co to?', answers: [{ id: 'a1', text: 'Tradzik', isCorrect: true }] },
      ]);
      const result = await atlasService.getQuizQuestions('twarz');
      expect(result).toHaveLength(1);
    });

    it('returns questions from all regions when regionSlug is null', async () => {
      mocks.quizQuestionFindMany.mockResolvedValue([]);
      await atlasService.getQuizQuestions(null);
      expect(mocks.quizQuestionFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { condition: { region: { published: true }, published: true } } })
      );
    });
  });

  describe('submitQuizAttempt', () => {
    it('creates attempt with calculated score', async () => {
      mocks.quizQuestionFindMany.mockResolvedValue([
        { id: 'q1', answers: [{ id: 'a1', isCorrect: true }, { id: 'a2', isCorrect: false }] },
        { id: 'q2', answers: [{ id: 'a3', isCorrect: false }, { id: 'a4', isCorrect: true }] },
      ]);
      mocks.quizAttemptCreate.mockImplementation((args: any) => Promise.resolve({ id: 'att1', ...args.data }));

      const result = await atlasService.submitQuizAttempt('user1', null, [
        { questionId: 'q1', selectedAnswerId: 'a1' },
        { questionId: 'q2', selectedAnswerId: 'a3' },
      ]);
      expect(result.score).toBe(1);
      expect(result.maxScore).toBe(2);
      expect(mocks.quizAttemptCreate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ score: 1, maxScore: 2 }) })
      );
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/server && pnpm vitest run src/modules/academy/skin-atlas/skin-atlas.service.test.ts
```
Expected: FAIL — module `./skin-atlas.service` not found

- [ ] **Step 3: Implement skin-atlas.service.ts**

Create `apps/server/src/modules/academy/skin-atlas/skin-atlas.service.ts`:

```ts
import { prisma } from '../../../config/prisma';
import { AppError } from '../../../middleware/error.middleware';

const RESERVED_SLUGS = ['quiz'];

// ── Public ──────────────────────────────────────────────────

export async function listPublishedRegions() {
  return prisma.skinAtlasRegion.findMany({
    where: { published: true },
    orderBy: { order: 'asc' },
    include: { _count: { select: { conditions: { where: { published: true } } } } },
  });
}

export async function getRegionBySlug(slug: string) {
  const region = await prisma.skinAtlasRegion.findUnique({
    where: { slug },
    include: {
      conditions: {
        where: { published: true },
        orderBy: { order: 'asc' },
        include: {
          images: { orderBy: { order: 'asc' }, take: 1 },
          _count: { select: { quizQuestions: true } },
        },
      },
    },
  });
  if (!region || !region.published) throw new AppError('Region nie znaleziony', 404);
  return region;
}

export async function getConditionBySlug(slug: string) {
  const condition = await prisma.skinAtlasCondition.findUnique({
    where: { slug },
    include: {
      region: { select: { slug: true, name: true } },
      images: { orderBy: { order: 'asc' } },
      relatedCourse: { select: { id: true, title: true, slug: true, price: true, status: true } },
      _count: { select: { quizQuestions: true } },
    },
  });
  if (!condition || !condition.published) throw new AppError('Problem skórny nie znaleziony', 404);
  return condition;
}

export async function getQuizQuestions(regionSlug: string | null) {
  const where = regionSlug
    ? { condition: { region: { slug: regionSlug, published: true }, published: true } }
    : { condition: { region: { published: true }, published: true } };

  return prisma.skinAtlasQuizQuestion.findMany({
    where,
    include: { answers: { orderBy: { order: 'asc' } }, condition: { select: { name: true, slug: true } } },
    orderBy: { order: 'asc' },
  });
}

export async function submitQuizAttempt(
  userId: string,
  regionSlug: string | null,
  answers: { questionId: string; selectedAnswerId: string }[]
) {
  const questionIds = answers.map(a => a.questionId);
  const questions = await prisma.skinAtlasQuizQuestion.findMany({
    where: { id: { in: questionIds } },
    include: { answers: true },
  });

  let score = 0;
  const detailedAnswers = answers.map(a => {
    const q = questions.find(q => q.id === a.questionId);
    const correctAnswer = q?.answers.find(ans => ans.isCorrect);
    const correct = correctAnswer?.id === a.selectedAnswerId;
    if (correct) score++;
    return { questionId: a.questionId, selectedAnswerId: a.selectedAnswerId, correct };
  });

  return prisma.skinAtlasQuizAttempt.create({
    data: {
      userId,
      regionSlug,
      score,
      maxScore: answers.length,
      answers: detailedAnswers,
    },
  });
}

// ── Admin ───────────────────────────────────────────────────

export async function adminListRegions() {
  return prisma.skinAtlasRegion.findMany({
    orderBy: { order: 'asc' },
    include: { _count: { select: { conditions: true } } },
  });
}

export async function adminCreateRegion(data: Record<string, any>) {
  if (!data.name?.trim()) throw new AppError('Uzupełnij nazwę regionu', 400);
  if (!data.slug?.trim()) throw new AppError('Uzupełnij slug', 400);
  if (RESERVED_SLUGS.includes(data.slug)) throw new AppError('Slug "quiz" jest zarezerwowany', 400);
  return prisma.skinAtlasRegion.create({
    data: {
      name: data.name.trim(),
      slug: data.slug.trim(),
      thumbnailUrl: data.thumbnailUrl || null,
      hotspotX: data.hotspotX ?? 50,
      hotspotY: data.hotspotY ?? 50,
      order: data.order ?? 0,
      published: data.published ?? false,
    },
  });
}

export async function adminUpdateRegion(id: string, data: Record<string, any>) {
  const existing = await prisma.skinAtlasRegion.findUnique({ where: { id } });
  if (!existing) throw new AppError('Region nie znaleziony', 404);
  if (data.slug && RESERVED_SLUGS.includes(data.slug)) throw new AppError('Slug "quiz" jest zarezerwowany', 400);
  return prisma.skinAtlasRegion.update({ where: { id }, data });
}

export async function adminDeleteRegion(id: string) {
  const existing = await prisma.skinAtlasRegion.findUnique({ where: { id } });
  if (!existing) throw new AppError('Region nie znaleziony', 404);
  return prisma.skinAtlasRegion.delete({ where: { id } });
}

export async function adminCreateCondition(data: Record<string, any>) {
  if (!data.name?.trim()) throw new AppError('Uzupełnij nazwę', 400);
  if (!data.slug?.trim()) throw new AppError('Uzupełnij slug', 400);
  if (!data.regionId) throw new AppError('Wybierz region', 400);
  if (!data.description?.trim() || data.description.trim().length < 10)
    throw new AppError('Opis musi mieć min. 10 znaków', 400);
  return prisma.skinAtlasCondition.create({
    data: {
      regionId: data.regionId,
      name: data.name.trim(),
      slug: data.slug.trim(),
      description: data.description.trim(),
      causes: data.causes?.trim() || '',
      treatments: data.treatments?.trim() || '',
      contraindications: data.contraindications?.trim() || '',
      order: data.order ?? 0,
      published: data.published ?? false,
      relatedCourseId: data.relatedCourseId || null,
    },
  });
}

export async function adminUpdateCondition(id: string, data: Record<string, any>) {
  const existing = await prisma.skinAtlasCondition.findUnique({ where: { id } });
  if (!existing) throw new AppError('Problem skórny nie znaleziony', 404);
  return prisma.skinAtlasCondition.update({ where: { id }, data });
}

export async function adminDeleteCondition(id: string) {
  const existing = await prisma.skinAtlasCondition.findUnique({ where: { id } });
  if (!existing) throw new AppError('Problem skórny nie znaleziony', 404);
  return prisma.skinAtlasCondition.delete({ where: { id } });
}

export async function adminCreateQuizQuestion(data: Record<string, any>) {
  if (!data.conditionId) throw new AppError('Wybierz problem skórny', 400);
  if (!data.questionText?.trim()) throw new AppError('Uzupełnij treść pytania', 400);
  if (!data.answers?.length || data.answers.length < 2) throw new AppError('Dodaj min. 2 odpowiedzi', 400);
  if (!data.answers.some((a: any) => a.isCorrect)) throw new AppError('Zaznacz poprawną odpowiedź', 400);

  return prisma.skinAtlasQuizQuestion.create({
    data: {
      conditionId: data.conditionId,
      questionText: data.questionText.trim(),
      questionImageUrl: data.questionImageUrl || null,
      explanation: data.explanation?.trim() || '',
      order: data.order ?? 0,
      answers: {
        create: data.answers.map((a: any, i: number) => ({
          text: a.text.trim(),
          isCorrect: a.isCorrect ?? false,
          order: i,
        })),
      },
    },
    include: { answers: { orderBy: { order: 'asc' } } },
  });
}

export async function adminDeleteQuizQuestion(id: string) {
  const existing = await prisma.skinAtlasQuizQuestion.findUnique({ where: { id } });
  if (!existing) throw new AppError('Pytanie nie znalezione', 404);
  return prisma.skinAtlasQuizQuestion.delete({ where: { id } });
}

export async function adminAddImage(data: Record<string, any>) {
  if (!data.conditionId) throw new AppError('Wybierz problem skórny', 400);
  if (!data.url) throw new AppError('Brak URL zdjęcia', 400);
  return prisma.skinAtlasImage.create({
    data: {
      conditionId: data.conditionId,
      url: data.url,
      alt: data.alt || '',
      severity: data.severity || 'MILD',
      order: data.order ?? 0,
    },
  });
}

export async function adminDeleteImage(id: string) {
  return prisma.skinAtlasImage.delete({ where: { id } });
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/server && pnpm vitest run src/modules/academy/skin-atlas/skin-atlas.service.test.ts
```
Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/modules/academy/skin-atlas/
git commit -m "feat(atlas): add skin atlas service with tests"
```

---

## Task 3: Skin Atlas Backend — Controller + Router

**Files:**
- Create: `apps/server/src/modules/academy/skin-atlas/skin-atlas.controller.ts`
- Create: `apps/server/src/modules/academy/skin-atlas/skin-atlas.router.ts`
- Modify: `apps/server/src/modules/academy/academy.router.ts`

- [ ] **Step 1: Create controller**

Create `apps/server/src/modules/academy/skin-atlas/skin-atlas.controller.ts`:

```ts
import { Request, Response, NextFunction } from 'express';
import * as atlasService from './skin-atlas.service';
import { processAndSaveImage } from '../../../utils/imageProcessor';
import { AppError } from '../../../middleware/error.middleware';

// ── Public ──────────────────────────────────────────────────

export const listRegions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const regions = await atlasService.listPublishedRegions();
    res.json({ data: regions });
  } catch (error) { next(error); }
};

export const getRegion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const region = await atlasService.getRegionBySlug(req.params.region);
    res.json({ data: region });
  } catch (error) { next(error); }
};

export const getCondition = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const condition = await atlasService.getConditionBySlug(req.params.condition);
    res.json({ data: condition });
  } catch (error) { next(error); }
};

export const getQuizQuestions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const questions = await atlasService.getQuizQuestions(req.params.region || null);
    res.json({ data: questions });
  } catch (error) { next(error); }
};

export const submitQuiz = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await atlasService.submitQuizAttempt(
      req.academyUser!.id,
      req.body.regionSlug || null,
      req.body.answers
    );
    res.status(201).json({ data: result });
  } catch (error) { next(error); }
};

// ── Admin ───────────────────────────────────────────────────

export const adminListRegions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const regions = await atlasService.adminListRegions();
    res.json({ data: regions });
  } catch (error) { next(error); }
};

export const adminCreateRegion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const region = await atlasService.adminCreateRegion(req.body);
    res.status(201).json({ data: region });
  } catch (error) { next(error); }
};

export const adminUpdateRegion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const region = await atlasService.adminUpdateRegion(req.params.id, req.body);
    res.json({ data: region });
  } catch (error) { next(error); }
};

export const adminDeleteRegion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await atlasService.adminDeleteRegion(req.params.id);
    res.json({ message: 'Region usunięty' });
  } catch (error) { next(error); }
};

export const adminCreateCondition = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const condition = await atlasService.adminCreateCondition(req.body);
    res.status(201).json({ data: condition });
  } catch (error) { next(error); }
};

export const adminUpdateCondition = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const condition = await atlasService.adminUpdateCondition(req.params.id, req.body);
    res.json({ data: condition });
  } catch (error) { next(error); }
};

export const adminDeleteCondition = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await atlasService.adminDeleteCondition(req.params.id);
    res.json({ message: 'Problem skórny usunięty' });
  } catch (error) { next(error); }
};

export const adminCreateQuizQuestion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const question = await atlasService.adminCreateQuizQuestion(req.body);
    res.status(201).json({ data: question });
  } catch (error) { next(error); }
};

export const adminDeleteQuizQuestion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await atlasService.adminDeleteQuizQuestion(req.params.id);
    res.json({ message: 'Pytanie usunięte' });
  } catch (error) { next(error); }
};

export const adminUploadImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new AppError('Brak pliku', 400);
    const url = await processAndSaveImage(req.file.buffer, 'academy-atlas');
    const image = await atlasService.adminAddImage({ ...req.body, url });
    res.status(201).json({ data: image });
  } catch (error) { next(error); }
};

export const adminDeleteImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await atlasService.adminDeleteImage(req.params.id);
    res.json({ message: 'Zdjęcie usunięte' });
  } catch (error) { next(error); }
};
```

- [ ] **Step 2: Create router**

Create `apps/server/src/modules/academy/skin-atlas/skin-atlas.router.ts`:

```ts
import { Router } from 'express';
import { academyAuthenticate, academyRequireAdmin, academyRequireAnyPurchase } from '../../../middleware/academy-auth.middleware';
import { upload } from '../../../config/multer';
import * as atlasController from './skin-atlas.controller';

const router = Router();

// Public — requires any course purchase
router.get('/atlas/regions', academyAuthenticate, academyRequireAnyPurchase, atlasController.listRegions);
router.get('/atlas/quiz', academyAuthenticate, academyRequireAnyPurchase, atlasController.getQuizQuestions);
router.get('/atlas/quiz/:region', academyAuthenticate, academyRequireAnyPurchase, atlasController.getQuizQuestions);
router.post('/atlas/quiz', academyAuthenticate, academyRequireAnyPurchase, atlasController.submitQuiz);
router.get('/atlas/:region', academyAuthenticate, academyRequireAnyPurchase, atlasController.getRegion);
router.get('/atlas/:region/:condition', academyAuthenticate, academyRequireAnyPurchase, atlasController.getCondition);

// Admin
router.get('/admin/atlas/regions', academyAuthenticate, academyRequireAdmin, atlasController.adminListRegions);
router.post('/admin/atlas/regions', academyAuthenticate, academyRequireAdmin, atlasController.adminCreateRegion);
router.patch('/admin/atlas/regions/:id', academyAuthenticate, academyRequireAdmin, atlasController.adminUpdateRegion);
router.delete('/admin/atlas/regions/:id', academyAuthenticate, academyRequireAdmin, atlasController.adminDeleteRegion);
router.post('/admin/atlas/conditions', academyAuthenticate, academyRequireAdmin, atlasController.adminCreateCondition);
router.patch('/admin/atlas/conditions/:id', academyAuthenticate, academyRequireAdmin, atlasController.adminUpdateCondition);
router.delete('/admin/atlas/conditions/:id', academyAuthenticate, academyRequireAdmin, atlasController.adminDeleteCondition);
router.post('/admin/atlas/questions', academyAuthenticate, academyRequireAdmin, atlasController.adminCreateQuizQuestion);
router.delete('/admin/atlas/questions/:id', academyAuthenticate, academyRequireAdmin, atlasController.adminDeleteQuizQuestion);
router.post('/admin/atlas/images', academyAuthenticate, academyRequireAdmin, upload.single('image'), atlasController.adminUploadImage);
router.delete('/admin/atlas/images/:id', academyAuthenticate, academyRequireAdmin, atlasController.adminDeleteImage);

export default router;
```

- [ ] **Step 3: Register router in academy.router.ts**

Add to `apps/server/src/modules/academy/academy.router.ts`:

```ts
import skinAtlasRouter from './skin-atlas/skin-atlas.router';
// ... existing imports ...

router.use('/', skinAtlasRouter);
```

- [ ] **Step 4: Verify backend compiles**

```bash
cd apps/server && pnpm build
```

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/modules/academy/skin-atlas/ apps/server/src/modules/academy/academy.router.ts
git commit -m "feat(atlas): add skin atlas controller and router"
```

---

## Task 4: Diagnostic Cases Backend — Service + Tests

**Files:**
- Create: `apps/server/src/modules/academy/diagnostic-cases/diagnostic-cases.service.ts`
- Create: `apps/server/src/modules/academy/diagnostic-cases/diagnostic-cases.service.test.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/server/src/modules/academy/diagnostic-cases/diagnostic-cases.service.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  caseStudyFindMany: vi.fn(),
  caseStudyFindUnique: vi.fn(),
  caseStudyCreate: vi.fn(),
  caseStudyUpdate: vi.fn(),
  caseStudyDelete: vi.fn(),
  attemptCreate: vi.fn(),
  enrollmentFindFirst: vi.fn(),
}));

vi.mock('../../../config/prisma', () => ({
  prisma: {
    diagnosticCaseStudy: {
      findMany: mocks.caseStudyFindMany,
      findUnique: mocks.caseStudyFindUnique,
      create: mocks.caseStudyCreate,
      update: mocks.caseStudyUpdate,
      delete: mocks.caseStudyDelete,
    },
    diagnosticCaseAttempt: { create: mocks.attemptCreate },
    academyEnrollment: { findFirst: mocks.enrollmentFindFirst },
  },
}));

import * as casesService from './diagnostic-cases.service';

describe('Diagnostic Cases Service', () => {
  beforeEach(() => Object.values(mocks).forEach(m => m.mockReset()));

  describe('listForCourse', () => {
    it('returns published case studies for a course the user owns', async () => {
      mocks.enrollmentFindFirst.mockResolvedValue({ id: 'e1' });
      mocks.caseStudyFindMany.mockResolvedValue([
        { id: 'cs1', title: 'Przebarwienia', published: true },
      ]);
      const result = await casesService.listForCourse('user1', 'kurs-slug');
      expect(result).toHaveLength(1);
    });

    it('throws 403 when user has no enrollment for this course', async () => {
      mocks.enrollmentFindFirst.mockResolvedValue(null);
      await expect(casesService.listForCourse('user1', 'kurs-slug'))
        .rejects.toMatchObject({ statusCode: 403 });
    });
  });

  describe('getCaseStudy', () => {
    it('returns case study with steps and images', async () => {
      mocks.enrollmentFindFirst.mockResolvedValue({ id: 'e1' });
      mocks.caseStudyFindUnique.mockResolvedValue({
        id: 'cs1', published: true,
        course: { slug: 'kurs-slug' },
        steps: [{ id: 's1', type: 'INTERVIEW', answers: [], images: [] }],
      });
      const result = await casesService.getCaseStudy('user1', 'cs1');
      expect(result.steps).toHaveLength(1);
    });

    it('throws 404 for unpublished case study', async () => {
      mocks.enrollmentFindFirst.mockResolvedValue({ id: 'e1' });
      mocks.caseStudyFindUnique.mockResolvedValue({ published: false, course: { slug: 'x' } });
      await expect(casesService.getCaseStudy('user1', 'cs1'))
        .rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('submitAttempt', () => {
    it('calculates score and saves attempt', async () => {
      mocks.caseStudyFindUnique.mockResolvedValue({
        id: 'cs1', published: true,
        course: { slug: 'kurs-slug' },
        steps: [
          { id: 's1', type: 'INTERVIEW', answers: [{ id: 'a1', isCorrect: true }, { id: 'a2', isCorrect: false }] },
          { id: 's2', type: 'DIAGNOSIS', answers: [{ id: 'a3', isCorrect: true }] },
          { id: 's3', type: 'RESULT', answers: [] },
        ],
      });
      mocks.enrollmentFindFirst.mockResolvedValue({ id: 'e1' });
      mocks.attemptCreate.mockImplementation((args: any) => Promise.resolve({ id: 'att1', ...args.data }));

      const result = await casesService.submitAttempt('user1', 'cs1', [
        { stepId: 's1', selectedAnswerIds: ['a1'] },
        { stepId: 's2', selectedAnswerIds: ['a3'] },
      ]);
      expect(result.score).toBe(2);
      expect(result.maxScore).toBe(2);
      expect(mocks.attemptCreate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ score: 2, maxScore: 2 }) })
      );
    });
  });

  describe('adminCreateCaseStudy', () => {
    it('rejects case study with less than 2 steps', async () => {
      await expect(casesService.adminCreateCaseStudy({
        title: 'Test', clientName: 'Anna', clientAge: 30,
        clientDescription: 'Opis', steps: [{ type: 'INTERVIEW', content: 'x' }],
      })).rejects.toMatchObject({ statusCode: 400 });
    });

    it('rejects when last step is not RESULT', async () => {
      await expect(casesService.adminCreateCaseStudy({
        title: 'Test', clientName: 'Anna', clientAge: 30,
        clientDescription: 'Opis',
        steps: [
          { type: 'INTERVIEW', content: 'x', answers: [] },
          { type: 'DIAGNOSIS', content: 'y', answers: [] },
        ],
      })).rejects.toMatchObject({ statusCode: 400 });
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/server && pnpm vitest run src/modules/academy/diagnostic-cases/diagnostic-cases.service.test.ts
```

- [ ] **Step 3: Implement diagnostic-cases.service.ts**

Create `apps/server/src/modules/academy/diagnostic-cases/diagnostic-cases.service.ts`:

```ts
import { prisma } from '../../../config/prisma';
import { AppError } from '../../../middleware/error.middleware';

// ── Access check ────────────────────────────────────────────

async function requireCourseAccess(userId: string, courseSlug: string) {
  const enrollment = await prisma.academyEnrollment.findFirst({
    where: { userId, course: { slug: courseSlug } },
  });
  if (!enrollment) throw new AppError('Brak dostępu do tego kursu', 403);
}

// ── Public ──────────────────────────────────────────────────

export async function listForCourse(userId: string, courseSlug: string) {
  await requireCourseAccess(userId, courseSlug);
  return prisma.diagnosticCaseStudy.findMany({
    where: { course: { slug: courseSlug }, published: true },
    orderBy: { order: 'asc' },
    select: {
      id: true, title: true, description: true, thumbnailUrl: true,
      difficulty: true, clientName: true, clientAge: true,
      _count: { select: { steps: true, attempts: true } },
    },
  });
}

export async function getCaseStudy(userId: string, id: string) {
  const caseStudy = await prisma.diagnosticCaseStudy.findUnique({
    where: { id },
    include: {
      course: { select: { slug: true } },
      steps: {
        orderBy: { order: 'asc' },
        include: {
          answers: { orderBy: { order: 'asc' } },
          images: { orderBy: { order: 'asc' } },
        },
      },
    },
  });
  if (!caseStudy || !caseStudy.published) throw new AppError('Case study nie znalezione', 404);
  if (caseStudy.course) await requireCourseAccess(userId, caseStudy.course.slug);
  return caseStudy;
}

export async function submitAttempt(
  userId: string,
  caseStudyId: string,
  stepAnswers: { stepId: string; selectedAnswerIds: string[] }[]
) {
  const caseStudy = await prisma.diagnosticCaseStudy.findUnique({
    where: { id: caseStudyId },
    include: {
      course: { select: { slug: true } },
      steps: { include: { answers: true } },
    },
  });
  if (!caseStudy || !caseStudy.published) throw new AppError('Case study nie znalezione', 404);
  if (caseStudy.course) await requireCourseAccess(userId, caseStudy.course.slug);

  const scorableSteps = caseStudy.steps.filter(s => s.type !== 'RESULT' && s.answers.length > 0);
  let score = 0;

  const detailedAnswers = stepAnswers.map(sa => {
    const step = scorableSteps.find(s => s.id === sa.stepId);
    if (!step) return { stepId: sa.stepId, selectedAnswerIds: sa.selectedAnswerIds, correct: false };
    const correctIds = step.answers.filter(a => a.isCorrect).map(a => a.id);
    const correct = correctIds.length === sa.selectedAnswerIds.length
      && correctIds.every(id => sa.selectedAnswerIds.includes(id));
    if (correct) score++;
    return { stepId: sa.stepId, selectedAnswerIds: sa.selectedAnswerIds, correct };
  });

  return prisma.diagnosticCaseAttempt.create({
    data: {
      caseStudyId,
      userId,
      score,
      maxScore: scorableSteps.length,
      completedAt: new Date(),
      answers: detailedAnswers,
    },
  });
}

// ── Admin ───────────────────────────────────────────────────

export async function adminList() {
  return prisma.diagnosticCaseStudy.findMany({
    orderBy: { order: 'asc' },
    include: {
      course: { select: { id: true, title: true } },
      _count: { select: { steps: true, attempts: true } },
    },
  });
}

export async function adminGet(id: string) {
  const cs = await prisma.diagnosticCaseStudy.findUnique({
    where: { id },
    include: {
      steps: {
        orderBy: { order: 'asc' },
        include: {
          answers: { orderBy: { order: 'asc' } },
          images: { orderBy: { order: 'asc' } },
        },
      },
    },
  });
  if (!cs) throw new AppError('Case study nie znalezione', 404);
  return cs;
}

export async function adminCreateCaseStudy(data: Record<string, any>) {
  if (!data.title?.trim()) throw new AppError('Uzupełnij tytuł', 400);
  if (!data.clientName?.trim()) throw new AppError('Uzupełnij imię klientki', 400);
  if (!data.steps?.length || data.steps.length < 2) throw new AppError('Dodaj min. 2 kroki', 400);
  if (data.steps[data.steps.length - 1].type !== 'RESULT')
    throw new AppError('Ostatni krok musi być typu WYNIK', 400);

  return prisma.diagnosticCaseStudy.create({
    data: {
      title: data.title.trim(),
      description: data.description?.trim() || '',
      thumbnailUrl: data.thumbnailUrl || null,
      difficulty: data.difficulty || 'MEDIUM',
      regionSlug: data.regionSlug || null,
      courseId: data.courseId || null,
      published: data.published ?? false,
      order: data.order ?? 0,
      clientName: data.clientName.trim(),
      clientAge: data.clientAge || 0,
      clientDescription: data.clientDescription?.trim() || '',
      steps: {
        create: data.steps.map((step: any, i: number) => ({
          type: step.type,
          content: step.content?.trim() || '',
          question: step.question?.trim() || null,
          multiSelect: step.multiSelect ?? false,
          order: i,
          answers: step.answers?.length ? {
            create: step.answers.map((a: any, j: number) => ({
              text: a.text.trim(),
              isCorrect: a.isCorrect ?? false,
              explanation: a.explanation?.trim() || null,
              order: j,
            })),
          } : undefined,
        })),
      },
    },
    include: {
      steps: {
        orderBy: { order: 'asc' },
        include: { answers: { orderBy: { order: 'asc' } }, images: { orderBy: { order: 'asc' } } },
      },
    },
  });
}

export async function adminUpdateCaseStudy(id: string, data: Record<string, any>) {
  const existing = await prisma.diagnosticCaseStudy.findUnique({ where: { id } });
  if (!existing) throw new AppError('Case study nie znalezione', 404);
  const { steps, ...rest } = data;
  return prisma.diagnosticCaseStudy.update({ where: { id }, data: rest });
}

export async function adminDeleteCaseStudy(id: string) {
  const existing = await prisma.diagnosticCaseStudy.findUnique({ where: { id } });
  if (!existing) throw new AppError('Case study nie znalezione', 404);
  return prisma.diagnosticCaseStudy.delete({ where: { id } });
}

export async function adminGetStats(id: string) {
  const attempts = await prisma.diagnosticCaseAttempt.findMany({
    where: { caseStudyId: id, completedAt: { not: null } },
    select: { score: true, maxScore: true },
  });
  const total = attempts.length;
  const avgScore = total > 0
    ? attempts.reduce((sum, a) => sum + (a.score / a.maxScore) * 100, 0) / total
    : 0;
  return { totalAttempts: total, averageScorePercent: Math.round(avgScore) };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/server && pnpm vitest run src/modules/academy/diagnostic-cases/diagnostic-cases.service.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/modules/academy/diagnostic-cases/
git commit -m "feat(cases): add diagnostic case studies service with tests"
```

---

## Task 5: Diagnostic Cases Backend — Controller + Router

**Files:**
- Create: `apps/server/src/modules/academy/diagnostic-cases/diagnostic-cases.controller.ts`
- Create: `apps/server/src/modules/academy/diagnostic-cases/diagnostic-cases.router.ts`
- Modify: `apps/server/src/modules/academy/academy.router.ts`

- [ ] **Step 1: Create controller**

Create `apps/server/src/modules/academy/diagnostic-cases/diagnostic-cases.controller.ts`:

```ts
import { Request, Response, NextFunction } from 'express';
import * as casesService from './diagnostic-cases.service';
import { processAndSaveImage } from '../../../utils/imageProcessor';
import { AppError } from '../../../middleware/error.middleware';

export const listForCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cases = await casesService.listForCourse(req.academyUser!.id, req.params.courseSlug);
    res.json({ data: cases });
  } catch (error) { next(error); }
};

export const getCaseStudy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cs = await casesService.getCaseStudy(req.academyUser!.id, req.params.id);
    res.json({ data: cs });
  } catch (error) { next(error); }
};

export const submitAttempt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await casesService.submitAttempt(
      req.academyUser!.id, req.params.id, req.body.stepAnswers
    );
    res.status(201).json({ data: result });
  } catch (error) { next(error); }
};

// ── Admin ───────────────────────────────────────────────────

export const adminList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cases = await casesService.adminList();
    res.json({ data: cases });
  } catch (error) { next(error); }
};

export const adminGet = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cs = await casesService.adminGet(req.params.id);
    res.json({ data: cs });
  } catch (error) { next(error); }
};

export const adminCreate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cs = await casesService.adminCreateCaseStudy(req.body);
    res.status(201).json({ data: cs });
  } catch (error) { next(error); }
};

export const adminUpdate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cs = await casesService.adminUpdateCaseStudy(req.params.id, req.body);
    res.json({ data: cs });
  } catch (error) { next(error); }
};

export const adminDelete = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await casesService.adminDeleteCaseStudy(req.params.id);
    res.json({ message: 'Case study usunięte' });
  } catch (error) { next(error); }
};

export const adminGetStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await casesService.adminGetStats(req.params.id);
    res.json({ data: stats });
  } catch (error) { next(error); }
};

export const adminUploadStepImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new AppError('Brak pliku', 400);
    const url = await processAndSaveImage(req.file.buffer, 'academy-cases');
    res.status(201).json({ data: { url } });
  } catch (error) { next(error); }
};
```

- [ ] **Step 2: Create router**

Create `apps/server/src/modules/academy/diagnostic-cases/diagnostic-cases.router.ts`:

```ts
import { Router } from 'express';
import { academyAuthenticate, academyRequireAdmin } from '../../../middleware/academy-auth.middleware';
import { upload } from '../../../config/multer';
import * as casesController from './diagnostic-cases.controller';

const router = Router();

// User — requires auth (course-level access checked in service)
router.get('/diagnostic-cases/course/:courseSlug', academyAuthenticate, casesController.listForCourse);
router.get('/diagnostic-cases/:id', academyAuthenticate, casesController.getCaseStudy);
router.post('/diagnostic-cases/:id/attempt', academyAuthenticate, casesController.submitAttempt);

// Admin — static routes before dynamic /:id routes
router.get('/admin/diagnostic-cases', academyAuthenticate, academyRequireAdmin, casesController.adminList);
router.post('/admin/diagnostic-cases', academyAuthenticate, academyRequireAdmin, casesController.adminCreate);
router.post('/admin/diagnostic-cases/images', academyAuthenticate, academyRequireAdmin, upload.single('image'), casesController.adminUploadStepImage);
router.get('/admin/diagnostic-cases/:id', academyAuthenticate, academyRequireAdmin, casesController.adminGet);
router.patch('/admin/diagnostic-cases/:id', academyAuthenticate, academyRequireAdmin, casesController.adminUpdate);
router.delete('/admin/diagnostic-cases/:id', academyAuthenticate, academyRequireAdmin, casesController.adminDelete);
router.get('/admin/diagnostic-cases/:id/stats', academyAuthenticate, academyRequireAdmin, casesController.adminGetStats);

export default router;
```

- [ ] **Step 3: Register in academy.router.ts**

Add to `apps/server/src/modules/academy/academy.router.ts`:

```ts
import diagnosticCasesRouter from './diagnostic-cases/diagnostic-cases.router';
// ...
router.use('/', diagnosticCasesRouter);
```

- [ ] **Step 4: Verify backend compiles**

```bash
cd apps/server && pnpm build
```

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/modules/academy/diagnostic-cases/ apps/server/src/modules/academy/academy.router.ts
git commit -m "feat(cases): add diagnostic cases controller and router"
```

---

## Task 6: Frontend API Layer

**Files:**
- Modify: `apps/academy-web/src/api/academy.api.ts`

- [ ] **Step 1: Add atlas API methods to academyApi object**

Add to the `academyApi` object in `apps/academy-web/src/api/academy.api.ts`:

```ts
  // ── Skin Atlas ──────────────────────────────────────────
  getAtlasRegions: () => api.get('/academy/atlas/regions').then(r => r.data.data),
  getAtlasRegion: (slug: string) => api.get(`/academy/atlas/${slug}`).then(r => r.data.data),
  getAtlasCondition: (region: string, condition: string) =>
    api.get(`/academy/atlas/${region}/${condition}`).then(r => r.data.data),
  getAtlasQuizQuestions: (region?: string) =>
    api.get(region ? `/academy/atlas/quiz/${region}` : '/academy/atlas/quiz').then(r => r.data.data),
  submitAtlasQuiz: (data: { regionSlug?: string; answers: { questionId: string; selectedAnswerId: string }[] }) =>
    api.post('/academy/atlas/quiz', data).then(r => r.data.data),

  // Atlas Admin
  adminGetAtlasRegions: () => api.get('/academy/admin/atlas/regions').then(r => r.data.data),
  adminCreateAtlasRegion: (data: any) => api.post('/academy/admin/atlas/regions', data).then(r => r.data.data),
  adminUpdateAtlasRegion: (id: string, data: any) => api.patch(`/academy/admin/atlas/regions/${id}`, data).then(r => r.data.data),
  adminDeleteAtlasRegion: (id: string) => api.delete(`/academy/admin/atlas/regions/${id}`),
  adminCreateAtlasCondition: (data: any) => api.post('/academy/admin/atlas/conditions', data).then(r => r.data.data),
  adminUpdateAtlasCondition: (id: string, data: any) => api.patch(`/academy/admin/atlas/conditions/${id}`, data).then(r => r.data.data),
  adminDeleteAtlasCondition: (id: string) => api.delete(`/academy/admin/atlas/conditions/${id}`),
  adminCreateAtlasQuizQuestion: (data: any) => api.post('/academy/admin/atlas/questions', data).then(r => r.data.data),
  adminDeleteAtlasQuizQuestion: (id: string) => api.delete(`/academy/admin/atlas/questions/${id}`),
  adminUploadAtlasImage: (formData: FormData) => api.post('/academy/admin/atlas/images', formData).then(r => r.data.data),
  adminDeleteAtlasImage: (id: string) => api.delete(`/academy/admin/atlas/images/${id}`),

  // ── Diagnostic Cases ────────────────────────────────────
  getCaseStudiesForCourse: (courseSlug: string) =>
    api.get(`/academy/diagnostic-cases/course/${courseSlug}`).then(r => r.data.data),
  getCaseStudy: (id: string) => api.get(`/academy/diagnostic-cases/${id}`).then(r => r.data.data),
  submitCaseStudyAttempt: (id: string, stepAnswers: any[]) =>
    api.post(`/academy/diagnostic-cases/${id}/attempt`, { stepAnswers }).then(r => r.data.data),

  // Cases Admin
  adminGetDiagnosticCases: () => api.get('/academy/admin/diagnostic-cases').then(r => r.data.data),
  adminGetDiagnosticCase: (id: string) => api.get(`/academy/admin/diagnostic-cases/${id}`).then(r => r.data.data),
  adminCreateDiagnosticCase: (data: any) => api.post('/academy/admin/diagnostic-cases', data).then(r => r.data.data),
  adminUpdateDiagnosticCase: (id: string, data: any) => api.patch(`/academy/admin/diagnostic-cases/${id}`, data).then(r => r.data.data),
  adminDeleteDiagnosticCase: (id: string) => api.delete(`/academy/admin/diagnostic-cases/${id}`),
  adminGetDiagnosticCaseStats: (id: string) => api.get(`/academy/admin/diagnostic-cases/${id}/stats`).then(r => r.data.data),
  adminUploadDiagnosticCaseImage: (formData: FormData) =>
    api.post('/academy/admin/diagnostic-cases/images', formData).then(r => r.data.data),
```

- [ ] **Step 2: Verify frontend compiles**

```bash
cd apps/academy-web && pnpm build
```

- [ ] **Step 3: Commit**

```bash
git add apps/academy-web/src/api/academy.api.ts
git commit -m "feat(api): add atlas and diagnostic cases API methods"
```

---

## Task 7: Frontend — Atlas Pages (SkinAtlasMap, SkinAtlasRegion, SkinAtlasCondition)

**Files:**
- Create: `apps/academy-web/src/pages/atlas/SkinAtlasMap.tsx`
- Create: `apps/academy-web/src/pages/atlas/SkinAtlasRegion.tsx`
- Create: `apps/academy-web/src/pages/atlas/SkinAtlasCondition.tsx`
- Modify: `apps/academy-web/src/router.tsx`
- Modify: `apps/academy-web/src/index.css`

- [ ] **Step 1: Create SkinAtlasMap page**

Create `apps/academy-web/src/pages/atlas/SkinAtlasMap.tsx`. This page shows:
- Desktop: body photo with positioned hotspot pins + sidebar region list
- Mobile (<768px): region cards with thumbnails
- "Quiz mode" link button to `/atlas/quiz`
- Uses `useQuery({ queryKey: ['academy', 'atlas', 'regions'], queryFn: academyApi.getAtlasRegions })`
- Each region shows name + condition count, links to `/atlas/{slug}`
- Hotspots rendered as `position: absolute` circles on the body image with `left: {hotspotX}%`, `top: {hotspotY}%`
- Hover on hotspot shows tooltip with region name
- Loading state: animate-pulse skeleton
- Error/empty state: message with retry

- [ ] **Step 2: Create SkinAtlasRegion page**

Create `apps/academy-web/src/pages/atlas/SkinAtlasRegion.tsx`. This page shows:
- Breadcrumb: Atlas > {region name}
- Grid of condition cards from `useQuery({ queryKey: ['academy', 'atlas', 'region', slug], queryFn: () => academyApi.getAtlasRegion(slug) })`
- Each card: first image thumbnail, condition name, quiz question count badge
- Cards link to `/atlas/{region}/{condition}`
- Back link to `/atlas`

- [ ] **Step 3: Create SkinAtlasCondition page**

Create `apps/academy-web/src/pages/atlas/SkinAtlasCondition.tsx`. This page shows:
- Breadcrumb: Atlas > {region} > {condition name}
- Severity gallery: tabs or row of images tagged MILD/MODERATE/SEVERE
- Rich text sections: description, causes, treatments, contraindications
- Cross-sell card: related course with title + price + "Naucz sie to leczyc" CTA
- "Sprawdz sie w quizie" link if condition has quiz questions
- Uses `useQuery({ queryKey: ['academy', 'atlas', 'condition', region, condition], queryFn: () => academyApi.getAtlasCondition(region, condition) })`

- [ ] **Step 4: Add atlas styles to index.css**

Add at end of `apps/academy-web/src/index.css`:

```css
/* ── Skin Atlas ──────────────────────────────────────────── */
.atlas-map { display: grid; grid-template-columns: 1fr 320px; gap: 2rem; }
.atlas-body-image { position: relative; border-radius: 12px; overflow: hidden; }
.atlas-body-image img { width: 100%; display: block; }
.atlas-hotspot {
  position: absolute; width: 28px; height: 28px; border-radius: 50%;
  background: rgba(46, 99, 70, 0.85); border: 3px solid #fff;
  transform: translate(-50%, -50%); cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}
.atlas-hotspot:hover { transform: translate(-50%, -50%) scale(1.3); box-shadow: 0 0 12px rgba(46, 99, 70, 0.4); }
.atlas-hotspot-tooltip {
  position: absolute; bottom: 110%; left: 50%; transform: translateX(-50%);
  background: var(--foreground); color: var(--background); padding: 4px 10px;
  border-radius: 6px; font-size: 12px; white-space: nowrap; pointer-events: none;
  opacity: 0; transition: opacity 0.15s;
}
.atlas-hotspot:hover .atlas-hotspot-tooltip { opacity: 1; }
.atlas-sidebar { display: flex; flex-direction: column; gap: 0.75rem; }
.atlas-region-card {
  display: flex; align-items: center; gap: 1rem; padding: 1rem;
  border: 1px solid hsl(var(--border)); border-radius: 10px;
  transition: border-color 0.2s, box-shadow 0.2s; cursor: pointer; text-decoration: none; color: inherit;
}
.atlas-region-card:hover { border-color: var(--primary); box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.atlas-region-thumb { width: 56px; height: 56px; border-radius: 8px; object-fit: cover; }
.atlas-severity-gallery { display: flex; gap: 1rem; overflow-x: auto; padding-bottom: 0.5rem; }
.atlas-severity-card { flex: 0 0 auto; text-align: center; }
.atlas-severity-card img { width: 200px; height: 150px; object-fit: cover; border-radius: 10px; }
.atlas-severity-label { font-size: 12px; font-weight: 600; margin-top: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em; }
.atlas-section { margin-top: 2rem; }
.atlas-section h3 { font-family: var(--font-heading); font-size: 1.1rem; margin-bottom: 0.75rem; }
.atlas-crosssell {
  margin-top: 2rem; padding: 1.5rem; border-radius: 12px;
  background: hsl(var(--accent)); border: 1px solid hsl(var(--border));
}

@media (max-width: 768px) {
  .atlas-map { grid-template-columns: 1fr; }
  .atlas-body-image { display: none; }
  .atlas-severity-card img { width: 140px; height: 105px; }
}
```

- [ ] **Step 5: Add routes to router.tsx**

Add lazy imports to `apps/academy-web/src/router.tsx`:
```ts
const SkinAtlasMap = lazy(() => import('./pages/atlas/SkinAtlasMap').then(m => ({ default: m.SkinAtlasMap })));
const SkinAtlasRegion = lazy(() => import('./pages/atlas/SkinAtlasRegion').then(m => ({ default: m.SkinAtlasRegion })));
const SkinAtlasCondition = lazy(() => import('./pages/atlas/SkinAtlasCondition').then(m => ({ default: m.SkinAtlasCondition })));
```

Add routes inside AcademyLayout children (BEFORE the `/:slug` catch-all route):
```tsx
{ path: 'atlas', element: <S><RequireAuth><SkinAtlasMap /></RequireAuth></S> },
{ path: 'atlas/:region', element: <S><RequireAuth><SkinAtlasRegion /></RequireAuth></S> },
{ path: 'atlas/:region/:condition', element: <S><RequireAuth><SkinAtlasCondition /></RequireAuth></S> },
```

- [ ] **Step 6: Add "Atlas" nav link to AcademyLayout.tsx**

Add a nav link in `apps/academy-web/src/pages/AcademyLayout.tsx` navigation array (alongside existing "Moje kursy", "Certyfikaty", etc.):
```ts
{ to: '/atlas', label: 'Atlas skory', icon: MapPin, requiresAuth: true },
```

- [ ] **Step 7: Verify frontend compiles**

```bash
cd apps/academy-web && pnpm build
```

- [ ] **Step 8: Commit**

```bash
git add apps/academy-web/src/pages/atlas/ apps/academy-web/src/router.tsx apps/academy-web/src/index.css apps/academy-web/src/pages/AcademyLayout.tsx
git commit -m "feat(atlas): add atlas map, region, and condition pages"
```

---

## Task 8: Frontend — Atlas Quiz Page

**Files:**
- Create: `apps/academy-web/src/pages/atlas/SkinAtlasQuiz.tsx`
- Modify: `apps/academy-web/src/router.tsx`

- [ ] **Step 1: Create SkinAtlasQuiz page**

Create `apps/academy-web/src/pages/atlas/SkinAtlasQuiz.tsx`. This page shows:
- Optional region param from URL (null = all regions)
- Fetches questions with `useQuery({ queryKey: ['academy', 'atlas', 'quiz', region], queryFn: () => academyApi.getAtlasQuizQuestions(region) })`
- Shuffles questions on load (Fisher-Yates)
- Shows one question at a time: question text, optional image, 4 answer buttons
- After selecting answer: highlight correct (green) and wrong (red), show explanation
- "Nastepne pytanie" button advances
- After all questions: summary screen with score (X/Y), per-question review, submit mutation
- Submit: `useMutation({ mutationFn: (data) => academyApi.submitAtlasQuiz(data) })`
- Region filter tabs at top if no region param: "Wszystkie", then each region name
- Link back to atlas map

- [ ] **Step 2: Add quiz routes to router.tsx**

Add lazy import:
```ts
const SkinAtlasQuiz = lazy(() => import('./pages/atlas/SkinAtlasQuiz').then(m => ({ default: m.SkinAtlasQuiz })));
```

Add routes — BEFORE the `atlas/:region` route (static before dynamic):
```tsx
{ path: 'atlas/quiz', element: <S><RequireAuth><SkinAtlasQuiz /></RequireAuth></S> },
{ path: 'atlas/quiz/:region', element: <S><RequireAuth><SkinAtlasQuiz /></RequireAuth></S> },
```

- [ ] **Step 3: Verify frontend compiles**

```bash
cd apps/academy-web && pnpm build
```

- [ ] **Step 4: Commit**

```bash
git add apps/academy-web/src/pages/atlas/SkinAtlasQuiz.tsx apps/academy-web/src/router.tsx
git commit -m "feat(atlas): add atlas quiz page with scoring"
```

---

## Task 9: Frontend — Case Study Pages

**Files:**
- Create: `apps/academy-web/src/pages/case-studies/CaseStudyList.tsx`
- Create: `apps/academy-web/src/pages/case-studies/CaseStudyPlayer.tsx`
- Modify: `apps/academy-web/src/router.tsx`
- Modify: `apps/academy-web/src/index.css`

- [ ] **Step 1: Create CaseStudyList page**

Create `apps/academy-web/src/pages/case-studies/CaseStudyList.tsx`. This page shows:
- Gets `courseSlug` from URL params
- Fetches case studies with `useQuery({ queryKey: ['academy', 'cases', courseSlug], queryFn: () => academyApi.getCaseStudiesForCourse(courseSlug) })`
- Grid of case study cards: thumbnail, title, difficulty badge (color-coded: green/yellow/red), client name + age, step count
- Each card links to `/kurs/{courseSlug}/przypadek/{id}`
- Empty state: "Ten kurs nie ma jeszcze case studies"
- Back link to course

- [ ] **Step 2: Create CaseStudyPlayer page**

Create `apps/academy-web/src/pages/case-studies/CaseStudyPlayer.tsx`. This page shows:
- Full interactive step-by-step flow, state in React `useState`:
  - `currentStep: number` (starts at 0)
  - `answers: Map<string, string[]>` (stepId -> selectedAnswerIds)
  - `feedback: Map<string, boolean>` (stepId -> shown)
  - `submitted: boolean`
- Fetches case study with `useQuery({ queryKey: ['academy', 'case', id], queryFn: () => academyApi.getCaseStudy(id) })`
- Progress bar at top: step X of Y with step type label
- Client info panel: name, age, description (shown on every step)
- Step images: rendered in a row, tagged BEFORE/DURING/AFTER
- For INTERVIEW/DIAGNOSIS/TREATMENT steps: question + answer options (radio for single, checkbox for multi)
- "Sprawdz odpowiedz" button: reveals correct/incorrect highlighting + explanation per answer
- "Nastepny krok" button: advances to next step
- For RESULT step: no question, shows after images + instructor explanation + score summary
- Score summary: "Twoj wynik: X/Y prawidlowych odpowiedzi" with color (green >= 70%, yellow >= 40%, red < 40%)
- Submit mutation on completion: `academyApi.submitCaseStudyAttempt(id, stepAnswers)`
- Cross-sell: link to course, link to atlas if regionSlug present
- Mobile: images full-width, answer buttons as large tap targets

- [ ] **Step 3: Add case study styles to index.css**

Add at end of `apps/academy-web/src/index.css`:

```css
/* ── Case Studies ────────────────────────────────────────── */
.case-player { max-width: 720px; margin: 0 auto; }
.case-progress { display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem; }
.case-progress-bar { flex: 1; height: 6px; background: hsl(var(--muted)); border-radius: 3px; overflow: hidden; }
.case-progress-fill { height: 100%; background: var(--primary); border-radius: 3px; transition: width 0.3s; }
.case-step-label { font-size: 13px; font-weight: 600; color: hsl(var(--muted-foreground)); text-transform: uppercase; letter-spacing: 0.05em; }
.case-client { padding: 1.25rem; background: hsl(var(--accent)); border-radius: 10px; margin-bottom: 1.5rem; }
.case-client-name { font-family: var(--font-heading); font-size: 1.2rem; }
.case-images { display: flex; gap: 0.75rem; margin: 1.5rem 0; overflow-x: auto; }
.case-images img { width: 220px; height: 165px; object-fit: cover; border-radius: 10px; }
.case-image-tag { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 4px; text-align: center; }
.case-question { font-family: var(--font-heading); font-size: 1.1rem; margin: 1.5rem 0 1rem; }
.case-answer-option {
  display: flex; align-items: center; gap: 0.75rem; padding: 1rem 1.25rem;
  border: 2px solid hsl(var(--border)); border-radius: 10px; cursor: pointer;
  transition: border-color 0.2s, background 0.15s; margin-bottom: 0.5rem;
}
.case-answer-option:hover { border-color: var(--primary); }
.case-answer-option.selected { border-color: var(--primary); background: rgba(46, 99, 70, 0.06); }
.case-answer-option.correct { border-color: #22c55e; background: rgba(34, 197, 94, 0.08); }
.case-answer-option.incorrect { border-color: #ef4444; background: rgba(239, 68, 68, 0.06); }
.case-feedback { padding: 1rem 1.25rem; border-radius: 10px; margin-top: 1rem; font-size: 0.9rem; }
.case-feedback.correct { background: rgba(34, 197, 94, 0.1); border-left: 4px solid #22c55e; }
.case-feedback.incorrect { background: rgba(239, 68, 68, 0.08); border-left: 4px solid #ef4444; }
.case-result-score { text-align: center; padding: 2rem; margin: 2rem 0; border-radius: 12px; }
.case-result-score.high { background: rgba(34, 197, 94, 0.1); }
.case-result-score.medium { background: rgba(234, 179, 8, 0.1); }
.case-result-score.low { background: rgba(239, 68, 68, 0.08); }
.case-difficulty { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 4px; text-transform: uppercase; }
.case-difficulty.easy { background: rgba(34, 197, 94, 0.15); color: #15803d; }
.case-difficulty.medium { background: rgba(234, 179, 8, 0.15); color: #a16207; }
.case-difficulty.hard { background: rgba(239, 68, 68, 0.12); color: #dc2626; }

@media (max-width: 768px) {
  .case-images { flex-direction: column; }
  .case-images img { width: 100%; height: auto; }
}
```

- [ ] **Step 4: Add routes to router.tsx**

Add lazy imports:
```ts
const CaseStudyList = lazy(() => import('./pages/case-studies/CaseStudyList').then(m => ({ default: m.CaseStudyList })));
const CaseStudyPlayer = lazy(() => import('./pages/case-studies/CaseStudyPlayer').then(m => ({ default: m.CaseStudyPlayer })));
```

Add routes inside AcademyLayout children:
```tsx
{ path: 'kurs/:slug/przypadki', element: <S><RequireAuth><CaseStudyList /></RequireAuth></S> },
{ path: 'kurs/:slug/przypadek/:id', element: <S><RequireAuth><CaseStudyPlayer /></RequireAuth></S> },
```

- [ ] **Step 5: Verify frontend compiles**

```bash
cd apps/academy-web && pnpm build
```

- [ ] **Step 6: Commit**

```bash
git add apps/academy-web/src/pages/case-studies/ apps/academy-web/src/router.tsx apps/academy-web/src/index.css
git commit -m "feat(cases): add case study list and interactive player pages"
```

---

## Task 10: Frontend — Admin Pages

**Files:**
- Create: `apps/academy-web/src/pages/admin/AdminSkinAtlas.tsx`
- Create: `apps/academy-web/src/pages/admin/AdminCaseStudies.tsx`
- Modify: `apps/academy-web/src/router.tsx`
- Modify: `apps/academy-web/src/pages/AcademyAdminLayout.tsx`

- [ ] **Step 1: Create AdminSkinAtlas page**

Create `apps/academy-web/src/pages/admin/AdminSkinAtlas.tsx`. Following the AcademyBundlesAdmin pattern:
- Two tabs: "Regiony" and "Problemy skorne"
- Regions tab: CRUD form (name, slug auto-generated, thumbnailUrl via image upload, hotspotX/Y sliders, order, published toggle), list with edit/delete
- Conditions tab: region dropdown filter, CRUD form (name, slug, description rich text, causes, treatments, contraindications, relatedCourseId dropdown, published toggle)
- Conditions form also has: image upload section (with severity tag selector), quiz question creator (question text, optional image, 4 answers with correct toggle, explanation)
- Hotspot preview: small image showing pin position as admin adjusts X/Y sliders
- Uses same mutation pattern as BundlesAdmin: single save mutation branching on `editing` truthy
- All queries: `['academy', 'admin', 'atlas', ...]`

- [ ] **Step 2: Create AdminCaseStudies page**

Create `apps/academy-web/src/pages/admin/AdminCaseStudies.tsx`. Features:
- List all case studies with title, difficulty badge, course name, step count, attempt stats
- Create/edit form: title, clientName, clientAge, clientDescription, difficulty dropdown, courseId dropdown, regionSlug, thumbnailUrl upload, published toggle
- Step builder: ordered list of steps, each with type selector, content rich text, image upload (tagged BEFORE/DURING/AFTER), question text + answers builder
- Add step / remove step buttons, drag-and-drop reorder
- Validation: min 2 steps, last must be RESULT
- Preview mode: renders CaseStudyPlayer in read-only
- Stats panel: totalAttempts, averageScorePercent (from adminGetCaseStudyStats)

- [ ] **Step 3: Add admin routes to router.tsx**

Add lazy imports:
```ts
const AdminSkinAtlas = lazy(() => import('./pages/admin/AdminSkinAtlas').then(m => ({ default: m.AdminSkinAtlas })));
const AdminCaseStudies = lazy(() => import('./pages/admin/AdminCaseStudies').then(m => ({ default: m.AdminCaseStudies })));
```

Add routes inside admin children:
```tsx
{ path: 'atlas', element: <S><AdminSkinAtlas /></S> },
{ path: 'przypadki', element: <S><AdminCaseStudies /></S> },
```

- [ ] **Step 4: Add nav items to AcademyAdminLayout.tsx**

Add to the navigation array in `apps/academy-web/src/pages/AcademyAdminLayout.tsx`:
```ts
{ to: '/admin/atlas', label: 'Atlas skory', icon: Map },
{ to: '/admin/przypadki', label: 'Case studies', icon: Stethoscope },
```

Import icons: `import { Map, Stethoscope } from 'lucide-react';`

- [ ] **Step 5: Verify frontend compiles**

```bash
cd apps/academy-web && pnpm build
```

- [ ] **Step 6: Commit**

```bash
git add apps/academy-web/src/pages/admin/ apps/academy-web/src/router.tsx apps/academy-web/src/pages/AcademyAdminLayout.tsx
git commit -m "feat(admin): add atlas and case studies admin pages"
```

---

## Task 11: Homepage Integration — "Ucz sie inaczej" Section + CourseCard Badge

**Files:**
- Modify: `apps/academy-web/src/pages/AcademyCatalog.tsx`
- Modify: `apps/academy-web/src/index.css`

- [ ] **Step 1: Add "Ucz sie inaczej" section to AcademyCatalog**

Add a new section in `apps/academy-web/src/pages/AcademyCatalog.tsx` between the existing instructor section and FAQ section. Three feature cards in a row:

1. Atlas Skory — Map icon, title, "Interaktywna encyklopedia problemow skornych z galeria zdjec i opisami klinicznymi"
2. Case Studies — Stethoscope icon, title, "Symulacje diagnostyczne krok po kroku — postaw diagnoze i zaplanuj zabieg"
3. Quizy diagnostyczne — Brain icon, title, "Sprawdz swoja wiedze rozpoznajac problemy skorne na zdjeciach"

Each card uses `academy-feature-card` CSS class. Section visible to everyone (marketing).

- [ ] **Step 2: Add case study count badge to CourseCard**

In the CourseCard component within AcademyCatalog, add a badge next to the existing lesson count: `{course.caseStudyCount} przypadkow` (only shown if > 0). This requires the backend `listPublic` endpoint to include `_count: { select: { diagnosticCaseStudies: true } }` — add this to the courses service `listPublicCourses` Prisma query.

- [ ] **Step 3: Add FAQ entry**

Add to the FAQ section in AcademyCatalog:
```
Q: "Czym jest Atlas Skory?"
A: "Atlas Skory to interaktywna encyklopedia problemow skornych dostepna dla kursantek. Zawiera opisy kliniczne, zdjecia roznych stopni nasilenia i quizy diagnostyczne. Dostep do Atlasu otrzymujesz wraz z zakupem dowolnego kursu."
```

- [ ] **Step 4: Add styles for feature cards**

Add to `apps/academy-web/src/index.css`:

```css
/* ── Feature cards section ───────────────────────────────── */
.academy-features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
.academy-feature-card {
  padding: 2rem; border-radius: 14px; border: 1px solid hsl(var(--border));
  background: hsl(var(--card)); text-align: center;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.academy-feature-card:hover { border-color: var(--primary); box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
.academy-feature-card svg { width: 40px; height: 40px; color: var(--primary); margin: 0 auto 1rem; }
.academy-feature-card h3 { font-family: var(--font-heading); font-size: 1.1rem; margin-bottom: 0.5rem; }
.academy-feature-card p { font-size: 0.9rem; color: hsl(var(--muted-foreground)); line-height: 1.5; }

@media (max-width: 768px) { .academy-features { grid-template-columns: 1fr; } }
```

- [ ] **Step 5: Modify backend to include case study count in public course listing**

In `apps/server/src/modules/academy/courses/courses.service.ts`, find the `listPublicCourses` function and add to its Prisma query's `include`:
```ts
_count: { select: { diagnosticCaseStudies: { where: { published: true } } } }
```

- [ ] **Step 6: Verify both frontend and backend compile**

```bash
cd apps/server && pnpm build && cd ../academy-web && pnpm build
```

- [ ] **Step 7: Commit**

```bash
git add apps/academy-web/src/pages/AcademyCatalog.tsx apps/academy-web/src/index.css apps/server/src/modules/academy/courses/courses.service.ts
git commit -m "feat(catalog): add feature cards section and case study badge"
```

---

## Task 12: Run All Tests + Deploy

**Files:** None new

- [ ] **Step 1: Run all backend tests**

```bash
cd apps/server && pnpm test
```
Expected: all tests pass including new atlas and diagnostic cases tests

- [ ] **Step 2: Build full project**

```bash
cd cosmo-app && pnpm build
```

- [ ] **Step 3: Commit any remaining changes**

```bash
cd cosmo-app && git status
```

- [ ] **Step 4: Run migration on VPS and deploy**

```bash
cd cosmo-app && ./deploy.sh
```

This runs: DB backup, git push/pull, prisma migrate deploy, backend build + PM2 restart, frontend build + rsync, academy-web build + rsync, nginx reload, Cloudflare cache purge, sitemap check.

- [ ] **Step 5: Verify atlas and case studies work on production**

Open `https://akademia.kosmetologwiktoriacwik.pl/atlas` in browser (logged in with course access) — confirm body map loads. Open admin at `/admin/atlas` — confirm CRUD works.
