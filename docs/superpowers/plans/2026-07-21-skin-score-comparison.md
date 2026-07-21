# Skin Score, Photo Retention & Comparison — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 0–100 skin score with classification labels, auto-delete photos after 7 days (keeping first + latest sessions), and provide a before/after comparison view.

**Architecture:** Backend computes skin score from 4 weighted metrics after ML analysis. A hourly cleanup scheduler deletes photos from intermediate sessions after 7 days. A new `/comparison` endpoint returns first + latest sessions. Frontend shows score in report header, handles deleted-image placeholders, and renders a side-by-side comparison view.

**Tech Stack:** Prisma + PostgreSQL (backend), Express routes, React + TanStack Query (frontend), Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-07-21-skin-score-comparison-design.md`

---

### Task 1: Add `skinScore` computation to backend provider

**Files:**
- Modify: `apps/server/src/modules/skin-scans/skin-scans.types.ts`
- Modify: `apps/server/src/modules/skin-scans/skin-scans.provider.ts`
- Test: `apps/server/src/modules/skin-scans/skin-score.test.ts`

**Context:** After ML analysis returns metrics, compute a 0–100 score. Each of 4 metrics (acne, pigmentation, redness, wrinkles) contributes up to 25 pts. Score = inverse of problem severity. If fewer than 4 metrics are available, scale proportionally. Store `skinScore` and `skinScoreBreakdown` in the analysis JSON.

- [ ] **Step 1: Add score types to `skin-scans.types.ts`**

At the end of `SkinScanAnalysis` type, add:

```typescript
  skinScore?: number | null;
  skinScoreBreakdown?: Partial<Record<'acne' | 'pigmentation' | 'redness' | 'wrinkles', number>>;
```

- [ ] **Step 2: Create `computeSkinScore` function and test file**

Create `apps/server/src/modules/skin-scans/skin-score.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { computeSkinScore } from './skin-scans.provider';

const metric = (status: string, value: number | null, unit: string | null = null) => ({
  status, value, unit, confidence: 0.9, modelVersion: 'v1', message: 'ok',
});

describe('computeSkinScore', () => {
  it('returns null when no metrics are AVAILABLE', () => {
    const metrics = {
      acne: metric('MODEL_NOT_CONFIGURED', null),
      pigmentation: metric('MODEL_NOT_CONFIGURED', null),
      redness: metric('MODEL_NOT_CONFIGURED', null),
      wrinkles: metric('MODEL_NOT_CONFIGURED', null),
      pores: metric('MODEL_NOT_CONFIGURED', null),
      spfCoverage: metric('UNAVAILABLE_WITH_RGB', null),
    };
    const result = computeSkinScore(metrics as any);
    expect(result.skinScore).toBeNull();
    expect(result.skinScoreBreakdown).toEqual({});
  });

  it('returns 100 when all 4 metrics are 0 (perfect skin)', () => {
    const metrics = {
      acne: metric('AVAILABLE', 0, 'stopień 1-4'),
      pigmentation: metric('AVAILABLE', 0, '%'),
      redness: metric('AVAILABLE', 0, '%'),
      wrinkles: metric('AVAILABLE', 0, '%'),
      pores: metric('MODEL_NOT_CONFIGURED', null),
      spfCoverage: metric('UNAVAILABLE_WITH_RGB', null),
    };
    const result = computeSkinScore(metrics as any);
    expect(result.skinScore).toBe(100);
  });

  it('returns 0 when all 4 metrics are maxed out', () => {
    const metrics = {
      acne: metric('AVAILABLE', 4, 'stopień 1-4'),
      pigmentation: metric('AVAILABLE', 100, '%'),
      redness: metric('AVAILABLE', 100, '%'),
      wrinkles: metric('AVAILABLE', 100, '%'),
      pores: metric('MODEL_NOT_CONFIGURED', null),
      spfCoverage: metric('UNAVAILABLE_WITH_RGB', null),
    };
    const result = computeSkinScore(metrics as any);
    expect(result.skinScore).toBe(0);
  });

  it('scales proportionally when only 2 metrics available', () => {
    const metrics = {
      acne: metric('AVAILABLE', 0, 'stopień 1-4'),
      pigmentation: metric('AVAILABLE', 0, '%'),
      redness: metric('MODEL_NOT_CONFIGURED', null),
      wrinkles: metric('MODEL_NOT_CONFIGURED', null),
      pores: metric('MODEL_NOT_CONFIGURED', null),
      spfCoverage: metric('UNAVAILABLE_WITH_RGB', null),
    };
    const result = computeSkinScore(metrics as any);
    expect(result.skinScore).toBe(100);
    expect(Object.keys(result.skinScoreBreakdown)).toHaveLength(2);
  });

  it('computes a mid-range score correctly', () => {
    const metrics = {
      acne: metric('AVAILABLE', 2, 'stopień 1-4'),   // 25 - 2*6.25 = 12.5
      pigmentation: metric('AVAILABLE', 30, '%'),      // 25 - 30*0.25 = 17.5
      redness: metric('AVAILABLE', 20, '%'),            // 25 - 20*0.25 = 20
      wrinkles: metric('AVAILABLE', 50, '%'),           // 25 - 50*0.25 = 12.5
      pores: metric('MODEL_NOT_CONFIGURED', null),
      spfCoverage: metric('UNAVAILABLE_WITH_RGB', null),
    };
    const result = computeSkinScore(metrics as any);
    // 12.5 + 17.5 + 20 + 12.5 = 62.5 → rounded to 63
    expect(result.skinScore).toBe(63);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd apps/server && pnpm vitest run src/modules/skin-scans/skin-score.test.ts`
Expected: FAIL — `computeSkinScore` not exported from provider

- [ ] **Step 4: Implement `computeSkinScore` in `skin-scans.provider.ts`**

Add this exported function (before `getConfiguredSkinScanProvider`):

```typescript
const SCORE_METRICS = {
  acne: 6.25,        // grade 0–4 → 0–25
  pigmentation: 0.25, // coverage 0–100% → 0–25
  redness: 0.25,
  wrinkles: 0.25,
} as const;

type ScoreMetricKey = keyof typeof SCORE_METRICS;

export const computeSkinScore = (
  metrics: SkinScanAnalysis['metrics'],
): { skinScore: number | null; skinScoreBreakdown: Partial<Record<ScoreMetricKey, number>> } => {
  const breakdown: Partial<Record<ScoreMetricKey, number>> = {};
  const entries = (Object.entries(SCORE_METRICS) as [ScoreMetricKey, number][])
    .filter(([key]) => metrics[key]?.status === 'AVAILABLE' && metrics[key]?.value != null);

  if (entries.length === 0) return { skinScore: null, skinScoreBreakdown: {} };

  const scaleFactor = 100 / (entries.length * 25);

  for (const [key, factor] of entries) {
    const raw = 25 - Math.min(Math.max((metrics[key].value ?? 0) * factor, 0), 25);
    breakdown[key] = Math.round(raw * scaleFactor * 10) / 10;
  }

  const total = Object.values(breakdown).reduce((sum, v) => sum + (v ?? 0), 0);
  return { skinScore: Math.round(total), skinScoreBreakdown: breakdown };
};
```

Import `SkinScanAnalysis` from `./skin-scans.types` if not already imported.

- [ ] **Step 5: Call `computeSkinScore` in `mlServiceProvider.analyze()`**

In `skin-scans.provider.ts`, at the end of `mlServiceProvider.analyze()` method, just before `return analysis;`:

```typescript
    const { skinScore, skinScoreBreakdown } = computeSkinScore(analysis.metrics);
    analysis.skinScore = skinScore;
    analysis.skinScoreBreakdown = skinScoreBreakdown;

    return analysis;
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd apps/server && pnpm vitest run src/modules/skin-scans/skin-score.test.ts`
Expected: all 5 tests PASS

- [ ] **Step 7: Commit**

```bash
git add apps/server/src/modules/skin-scans/skin-scans.types.ts apps/server/src/modules/skin-scans/skin-scans.provider.ts apps/server/src/modules/skin-scans/skin-score.test.ts
git commit -m "feat(skin-scan): add skin score computation (0-100) from 4 metrics"
```

---

### Task 2: Add `imagesDeletedAt` field + Prisma migration

**Files:**
- Modify: `apps/server/prisma/schema.prisma`
- Create: migration SQL via `prisma migrate dev`

- [ ] **Step 1: Add field to schema.prisma**

In the `SkinScanSession` model (around line 1299, after `updatedAt`):

```prisma
  imagesDeletedAt   DateTime?
```

- [ ] **Step 2: Create migration**

Run: `cd apps/server && npx prisma migrate dev --name add_skin_scan_images_deleted_at`

If non-interactive env fails, manually create:
```bash
mkdir -p prisma/migrations/20260721160000_add_skin_scan_images_deleted_at
```

Write `migration.sql`:
```sql
ALTER TABLE "SkinScanSession" ADD COLUMN "imagesDeletedAt" TIMESTAMP(3);
```

Then: `npx prisma migrate deploy && npx prisma generate`

- [ ] **Step 3: Commit**

```bash
git add apps/server/prisma/
git commit -m "feat(skin-scan): add imagesDeletedAt field for photo retention"
```

---

### Task 3: Image cleanup scheduler + shared overlay extraction

**Files:**
- Create: `apps/server/src/modules/skin-scans/skin-scans.cleanup.ts`
- Modify: `apps/server/src/modules/skin-scans/skin-scans.service.ts` (update `removeSessionOverlays` → use shared util)
- Modify: `apps/server/src/index.ts`

**Context:** The existing `removeSessionOverlays` in service.ts only deletes metric overlays, missing faceParsing paths. Create a shared utility, use it in both cleanup and deleteSession.

- [ ] **Step 1: Create `skin-scans.cleanup.ts`**

```typescript
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '../../config/prisma';

/**
 * Extract ALL file paths from a session's analysis JSON:
 * - metric overlays (per angle)
 * - faceParsing zone grid / skin changes overlays
 * - zone closeup thumbnails
 */
export const extractAnalysisFilePaths = (analysis: Record<string, unknown> | null): string[] => {
  if (!analysis) return [];
  const paths: string[] = [];

  // Metric overlays
  const metrics = analysis.metrics as Record<string, Record<string, unknown>> | undefined;
  if (metrics) {
    for (const metric of Object.values(metrics)) {
      const details = metric.details as Record<string, unknown> | undefined;
      const overlays = details?.overlays as Record<string, string> | undefined;
      if (overlays) paths.push(...Object.values(overlays));
    }
  }

  // faceParsing overlays & closeups
  const fp = analysis.faceParsing as Record<string, unknown> | undefined;
  if (fp) {
    for (const key of ['zoneGridOverlay', 'skinChangesOverlay'] as const) {
      const overlay = fp[key] as Record<string, string> | undefined;
      if (overlay) paths.push(...Object.values(overlay));
    }
    for (const section of ['zones', 'zoneCloseups'] as const) {
      const items = fp[section] as Record<string, Record<string, unknown>> | undefined;
      if (!items) continue;
      for (const zone of Object.values(items)) {
        if (typeof zone.closeup === 'string' && zone.closeup.length > 0) {
          paths.push(zone.closeup);
        }
      }
    }
  }

  return paths;
};

const removeFile = async (filePath: string) => {
  const uploadsRoot = path.resolve(process.cwd(), 'uploads', 'skin-scans');
  const absolutePath = path.resolve(process.cwd(), filePath.replace(/^[/\\]+/, ''));
  if (!absolutePath.startsWith(`${uploadsRoot}${path.sep}`)) return;
  await fs.unlink(absolutePath).catch(() => undefined);
};

const runCleanup = async () => {
  try {
    // Step 1: find all users with completed sessions
    const users = await prisma.skinScanSession.findMany({
      where: { status: 'COMPLETED' },
      select: { userId: true },
      distinct: ['userId'],
    });

    for (const { userId } of users) {
      // Step 2: get all completed sessions for this user, ordered oldest first
      const sessions = await prisma.skinScanSession.findMany({
        where: { userId, status: 'COMPLETED' },
        orderBy: { completedAt: 'asc' },
        include: { images: true },
      });

      if (sessions.length <= 1) continue; // nothing to clean

      const firstId = sessions[0].id;
      const latestId = sessions[sessions.length - 1].id;
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      for (const session of sessions) {
        // Skip protected sessions
        if (session.id === firstId || session.id === latestId) continue;
        // Skip already cleaned or too recent
        if (session.imagesDeletedAt) continue;
        if (!session.completedAt || session.completedAt > cutoff) continue;

        // Delete image files
        for (const image of session.images) {
          if (image.imagePath) await removeFile(image.imagePath);
        }

        // Delete overlay/closeup files
        const analysisPaths = extractAnalysisFilePaths(session.analysis as Record<string, unknown> | null);
        for (const p of analysisPaths) {
          await removeFile(p);
        }

        // Mark images as deleted + clear image paths
        await prisma.$transaction([
          prisma.skinScanSession.update({
            where: { id: session.id },
            data: { imagesDeletedAt: new Date() },
          }),
          ...session.images.map((img) =>
            prisma.skinScanImage.update({
              where: { id: img.id },
              data: { imagePath: '' },
            }),
          ),
        ]);

        console.log(`[skin-scan-cleanup] Deleted images for session ${session.id} (user ${userId})`);
      }
    }
  } catch (error) {
    console.error('[skin-scan-cleanup] Error during cleanup:', error);
  }
};

export const initializeSkinScanCleanup = () => {
  // Run once at startup, then every hour
  setTimeout(() => runCleanup(), 10_000);
  setInterval(runCleanup, 60 * 60 * 1000);
  console.log('Skin scan image cleanup scheduler initialized (hourly)');
};
```

- [ ] **Step 2: Update `removeSessionOverlays` in `skin-scans.service.ts`**

Replace the existing `removeSessionOverlays` function (lines 213–230) with:

```typescript
import { extractAnalysisFilePaths } from './skin-scans.cleanup';

const removeSessionOverlays = async (session: Awaited<ReturnType<typeof getOwnedSession>>) => {
  const paths = extractAnalysisFilePaths(session.analysis as Record<string, unknown> | null);
  await Promise.all(paths.map(removeStoredScanImage));
};
```

- [ ] **Step 3: Add `initializeSkinScanCleanup` to `index.ts`**

Add import at top:
```typescript
import { initializeSkinScanCleanup } from './modules/skin-scans/skin-scans.cleanup';
```

Add call after `initializeAcademyAutomationScheduler();` (around line 32):
```typescript
    initializeSkinScanCleanup();
```

- [ ] **Step 4: Verify backend compiles**

Run: `cd apps/server && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/modules/skin-scans/skin-scans.cleanup.ts apps/server/src/modules/skin-scans/skin-scans.service.ts apps/server/src/index.ts
git commit -m "feat(skin-scan): add image cleanup scheduler + shared overlay extraction"
```

---

### Task 4: Backend comparison endpoint

**Files:**
- Modify: `apps/server/src/modules/skin-scans/skin-scans.service.ts`
- Modify: `apps/server/src/modules/skin-scans/skin-scans.controller.ts`
- Modify: `apps/server/src/modules/skin-scans/skin-scans.router.ts`

- [ ] **Step 1: Add `getComparison` to service**

Add at the end of `skin-scans.service.ts`:

```typescript
export const getComparison = async (userId: string) => {
  const sessions = await prisma.skinScanSession.findMany({
    where: { userId, status: SkinScanStatus.COMPLETED },
    orderBy: { completedAt: 'asc' },
    include: sessionInclude,
  });
  if (sessions.length < 2) return { first: null, latest: null };
  return { first: sessions[0], latest: sessions[sessions.length - 1] };
};
```

- [ ] **Step 2: Add controller handler**

Add at the end of `skin-scans.controller.ts`:

```typescript
export const getComparison = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const comparison = await skinScansService.getComparison(req.user!.id);
    res.status(200).json({ status: 'success', data: { comparison } });
  } catch (error) {
    next(error);
  }
};
```

- [ ] **Step 3: Add route**

In `skin-scans.router.ts`, add before the `/:id` route (line 11, after `router.post('/', ...)`):

```typescript
router.get('/comparison', controller.getComparison);
```

Important: must be before `/:id` to avoid "comparison" being parsed as an ID param.

- [ ] **Step 4: Verify backend compiles**

Run: `cd apps/server && npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/modules/skin-scans/skin-scans.service.ts apps/server/src/modules/skin-scans/skin-scans.controller.ts apps/server/src/modules/skin-scans/skin-scans.router.ts
git commit -m "feat(skin-scan): add GET /comparison endpoint for first vs latest"
```

---

### Task 5: Frontend API types + comparison function

**Files:**
- Modify: `apps/web/src/api/skin-scans.api.ts`

- [ ] **Step 1: Add `skinScore` fields to `SkinScanAnalysis`**

In the `SkinScanAnalysis` type, add after `faceParsing?`:

```typescript
  skinScore?: number | null;
  skinScoreBreakdown?: Partial<Record<'acne' | 'pigmentation' | 'redness' | 'wrinkles', number>>;
```

- [ ] **Step 2: Add `imagesDeletedAt` to `SkinScanSession`**

In the `SkinScanSession` type, add after `updatedAt`:

```typescript
  imagesDeletedAt: string | null;
```

- [ ] **Step 3: Add comparison type and API function**

At the end of the file, before the closing of `skinScansApi`:

```typescript
export type SkinScanComparison = {
  first: SkinScanSession | null;
  latest: SkinScanSession | null;
};
```

Inside `skinScansApi` object, add:

```typescript
  comparison: async (): Promise<SkinScanComparison> => {
    const response = await api.get(`${BASE}/comparison`);
    return response.data.data.comparison;
  },
```

- [ ] **Step 4: Verify frontend compiles**

Run: `cd apps/web && npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/api/skin-scans.api.ts
git commit -m "feat(skin-scan): add frontend types for skinScore, imagesDeletedAt, comparison"
```

---

### Task 6: Display skin score in report header + handle deleted images

**Files:**
- Modify: `apps/web/src/pages/user/SkinScan.tsx`
- Modify: `apps/web/src/components/skin-scan/SkinScanOverlayViewer.tsx`
- Modify: `apps/web/src/components/skin-scan/SkinScanZoneMap.tsx`

**Context:** Replace the "jakość" quality circle with skin score. Add classification label. Show placeholder when images are deleted.

- [ ] **Step 1: Add score helpers to `SkinScan.tsx`**

Add after `METRIC_LABELS` constant (around line 53):

```typescript
const SCORE_CLASSIFICATION = [
  { min: 85, label: 'Skóra w świetnej kondycji', color: '#16a34a' },
  { min: 70, label: 'Dobra kondycja, drobne problemy', color: '#65a30d' },
  { min: 50, label: 'Wymaga uwagi', color: '#d97706' },
  { min: 30, label: 'Widoczne problemy', color: '#ea580c' },
  { min: 0, label: 'Wymaga intensywnej pielęgnacji', color: '#dc2626' },
] as const;

const getScoreClassification = (score: number) =>
  SCORE_CLASSIFICATION.find((c) => score >= c.min) ?? SCORE_CLASSIFICATION[SCORE_CLASSIFICATION.length - 1];
```

- [ ] **Step 2: Replace quality circle with skin score in `ResultReport`**

In `ResultReport`, replace the header circle (the `<div className="flex h-14 w-14...">` block showing `summary?.averageScore` and "jakość") with:

```tsx
{analysis?.skinScore != null ? (
  <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-full border-2 sm:h-16 sm:w-16"
    style={{ borderColor: getScoreClassification(analysis.skinScore).color }}>
    <span className="text-lg font-bold sm:text-xl">{analysis.skinScore}</span>
    <span className="text-[8px] uppercase tracking-wider text-white/50">pkt</span>
  </div>
) : (
  <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-full border border-white/20 bg-white/10 sm:h-16 sm:w-16">
    <span className="text-lg font-bold sm:text-xl">—</span>
  </div>
)}
```

Add classification label below the header gradient div (after the closing `</div>` of the gradient section, before the metrics grid):

```tsx
{analysis?.skinScore != null && (() => {
  const cls = getScoreClassification(analysis.skinScore);
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-white px-3 py-2 shadow-sm">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: cls.color }} />
      <span className="text-sm font-semibold text-[#1A3828]">{cls.label}</span>
    </div>
  );
})()}
```

- [ ] **Step 3: Handle deleted images placeholder in `SkinScanOverlayViewer.tsx`**

At the beginning of the component (after the `if (availableOverlays.size === 0) return null;` check), add:

```tsx
if (session.imagesDeletedAt) {
  return (
    <section className={`rounded-2xl border border-border bg-white shadow-sm ${className ?? ''}`}>
      <div className="flex flex-col items-center gap-2 p-6 text-center text-muted-foreground">
        <Camera className="h-8 w-8 opacity-40" />
        <p className="text-xs font-medium">Zdjęcia usunięte po 7 dniach od analizy</p>
      </div>
    </section>
  );
}
```

Add `Camera` to the lucide-react imports.

- [ ] **Step 4: Handle deleted images placeholder in `SkinScanZoneMap.tsx`**

At the top of the component, after analysis null-check, add:

```tsx
if (session.imagesDeletedAt) {
  // Show zone data without images
  // (existing zone metric cards still render, just no photos)
}
```

For the zone photo display section — wrap the `PrivateImg` for zone closeup in a check:

```tsx
{session.imagesDeletedAt ? (
  <div className="flex h-32 items-center justify-center rounded-xl bg-gray-50">
    <div className="flex flex-col items-center gap-1 text-muted-foreground">
      <Camera className="h-6 w-6 opacity-40" />
      <span className="text-[10px]">Zdjęcie usunięte</span>
    </div>
  </div>
) : (
  /* existing PrivateImg */
)}
```

- [ ] **Step 5: Verify frontend compiles**

Run: `cd apps/web && npx tsc --noEmit`

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/pages/user/SkinScan.tsx apps/web/src/components/skin-scan/SkinScanOverlayViewer.tsx apps/web/src/components/skin-scan/SkinScanZoneMap.tsx
git commit -m "feat(skin-scan): display skin score in report + deleted images placeholders"
```

---

### Task 7: Comparison view component + "Zobacz zmianę" button

**Files:**
- Create: `apps/web/src/components/skin-scan/SkinScanComparison.tsx`
- Modify: `apps/web/src/pages/user/SkinScan.tsx`

**Context:** New component showing first vs latest session side by side. Desktop: 2 columns. Mobile: stacked. Angle selector tabs, delta badge, score circles. Button in ResultReport triggers it.

- [ ] **Step 1: Create `SkinScanComparison.tsx`**

```tsx
import { useState } from 'react';
import { Camera } from 'lucide-react';
import type { SkinScanAngle, SkinScanComparison as ComparisonData } from '@/api/skin-scans.api';
import { usePrivateImage } from '@/hooks/usePrivateImage';

const ANGLE_LABELS: Record<SkinScanAngle, string> = {
  FRONT: 'Twarz', LEFT: 'Lewy profil', RIGHT: 'Prawy profil',
  FOREHEAD: 'Czoło', LEFT_CHEEK: 'L. policzek', RIGHT_CHEEK: 'P. policzek',
  CHIN: 'Broda', NECK: 'Szyja',
};

const SCORE_CLASSIFICATION = [
  { min: 85, label: 'Świetna', color: '#16a34a' },
  { min: 70, label: 'Dobra', color: '#65a30d' },
  { min: 50, label: 'Uwaga', color: '#d97706' },
  { min: 30, label: 'Widoczne problemy', color: '#ea580c' },
  { min: 0, label: 'Intensywna pielęgnacja', color: '#dc2626' },
] as const;

const getClass = (score: number) =>
  SCORE_CLASSIFICATION.find((c) => score >= c.min) ?? SCORE_CLASSIFICATION[SCORE_CLASSIFICATION.length - 1];

const formatDate = (date: string) => new Intl.DateTimeFormat('pl-PL', {
  day: 'numeric', month: 'short', year: 'numeric',
}).format(new Date(date));

const SessionPhoto = ({ path, alt }: { path: string; alt: string }) => {
  const src = usePrivateImage(path);
  if (!src) return null;
  return <img src={src} alt={alt} className="h-full w-full rounded-lg object-cover" />;
};

const PhotoPlaceholder = () => (
  <div className="flex h-full min-h-[160px] items-center justify-center rounded-lg bg-gray-50">
    <div className="flex flex-col items-center gap-1 text-muted-foreground">
      <Camera className="h-6 w-6 opacity-40" />
      <span className="text-[10px]">Zdjęcie usunięte</span>
    </div>
  </div>
);

type Props = {
  comparison: ComparisonData;
  onClose: () => void;
};

export const SkinScanComparison = ({ comparison, onClose }: Props) => {
  const { first, latest } = comparison;
  if (!first || !latest) return null;

  // Determine available angles from latest session (guaranteed to have images)
  const angles = latest.images
    .map((img) => img.angle)
    .filter((a): a is SkinScanAngle => a in ANGLE_LABELS);
  const [activeAngle, setActiveAngle] = useState<SkinScanAngle>(angles.includes('FRONT') ? 'FRONT' : angles[0]);

  const firstScore = first.analysis?.skinScore ?? null;
  const latestScore = latest.analysis?.skinScore ?? null;
  const delta = firstScore != null && latestScore != null ? latestScore - firstScore : null;

  const firstImage = first.images.find((img) => img.angle === activeAngle);
  const latestImage = latest.images.find((img) => img.angle === activeAngle);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#1A3828]">Porównanie: pierwsza vs ostatnia</h2>
        <button type="button" onClick={onClose}
          className="rounded-full px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-gray-100">
          Zamknij
        </button>
      </div>

      {/* Delta badge */}
      {delta !== null && (
        <div className="flex justify-center">
          <span className={`rounded-full px-3 py-1 text-sm font-bold ${
            delta > 0 ? 'bg-green-50 text-green-700' : delta < 0 ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-600'
          }`}>
            {delta > 0 ? '+' : ''}{delta} pkt
          </span>
        </div>
      )}

      {/* Angle tabs */}
      {angles.length > 1 && (
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6">
          {angles.map((angle) => (
            <button key={angle} type="button" onClick={() => setActiveAngle(angle)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                activeAngle === angle
                  ? 'bg-[#1A3828] text-white'
                  : 'bg-[#FAF9F6] text-muted-foreground hover:bg-[#F0EDE6]'
              }`}>
              {ANGLE_LABELS[angle]}
            </button>
          ))}
        </div>
      )}

      {/* Side by side */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* First session */}
        <div className="overflow-hidden rounded-xl border border-border/60 bg-white">
          <div className="aspect-[3/4] overflow-hidden">
            {first.imagesDeletedAt || !firstImage?.imagePath ? (
              <PhotoPlaceholder />
            ) : (
              <SessionPhoto path={firstImage.imagePath} alt="Pierwsza analiza" />
            )}
          </div>
          <div className="flex items-center justify-between px-3 py-2">
            <div>
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">Pierwsza</p>
              <p className="text-xs text-[#1A3828]">{formatDate(first.createdAt)}</p>
            </div>
            {firstScore != null && (
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getClass(firstScore).color }} />
                <span className="text-sm font-bold text-[#1A3828]">{firstScore}</span>
              </div>
            )}
          </div>
        </div>

        {/* Latest session */}
        <div className="overflow-hidden rounded-xl border border-border/60 bg-white">
          <div className="aspect-[3/4] overflow-hidden">
            {latest.imagesDeletedAt || !latestImage?.imagePath ? (
              <PhotoPlaceholder />
            ) : (
              <SessionPhoto path={latestImage.imagePath} alt="Ostatnia analiza" />
            )}
          </div>
          <div className="flex items-center justify-between px-3 py-2">
            <div>
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">Ostatnia</p>
              <p className="text-xs text-[#1A3828]">{formatDate(latest.createdAt)}</p>
            </div>
            {latestScore != null && (
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getClass(latestScore).color }} />
                <span className="text-sm font-bold text-[#1A3828]">{latestScore}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Add "Zobacz zmianę" button and comparison state to `SkinScan.tsx`**

In `ResultReport`, add comparison query and state. Add these imports at the top:

```typescript
import { SkinScanComparison } from '@/components/skin-scan/SkinScanComparison';
```

Inside `ResultReport` component, add query:

```typescript
const comparisonQuery = useQuery({
  queryKey: ['skin-scans', 'comparison'],
  queryFn: skinScansApi.comparison,
});
const [showComparison, setShowComparison] = useState(false);
const hasComparison = comparisonQuery.data?.first != null && comparisonQuery.data?.latest != null;
```

After the classification label div and before the metrics grid, add:

```tsx
{hasComparison && !showComparison && (
  <button type="button" onClick={() => setShowComparison(true)}
    className="w-full rounded-xl border border-[#C4965A]/30 bg-[#FAF9F6] px-4 py-3 text-sm font-semibold text-[#1A3828] transition-colors hover:bg-[#F0EDE6]">
    Zobacz zmianę
  </button>
)}

{showComparison && comparisonQuery.data && (
  <div className="rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-6">
    <SkinScanComparison comparison={comparisonQuery.data} onClose={() => setShowComparison(false)} />
  </div>
)}
```

- [ ] **Step 3: Verify frontend compiles**

Run: `cd apps/web && npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/skin-scan/SkinScanComparison.tsx apps/web/src/pages/user/SkinScan.tsx
git commit -m "feat(skin-scan): add comparison view (first vs latest) with Zobacz zmianę button"
```

---

### Task 8: Final verification + deploy

**Files:** none (verification only)

- [ ] **Step 1: Run backend tests**

Run: `cd apps/server && pnpm vitest run`

- [ ] **Step 2: Verify full TypeScript compilation**

Run: `cd apps/server && npx tsc --noEmit && cd ../web && npx tsc --noEmit`

- [ ] **Step 3: Commit any final fixes if needed**

- [ ] **Step 4: Deploy**

Run: `cd /c/Users/Adam/Desktop/strona1/cosmo-app && bash deploy.sh`
