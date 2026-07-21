# Skin Score, Photo Retention & Comparison — Design Spec

> **Goal:** Give clients a clear 0–100 skin score with classification, auto-delete photos after 7 days (keeping first + latest), and provide a before/after comparison view.

## 1. Skin Score Calculation

### Formula

4 metrics contribute equally (max 25 pts each, total 100):

| Metric | Raw value range | Scale factor | Score formula |
|--------|----------------|--------------|---------------|
| acne | grade 0–4 | 6.25 | `25 - clamp(value * 6.25, 0, 25)` |
| pigmentation | coverage % 0–100 | 0.25 | `25 - clamp(value * 0.25, 0, 25)` |
| redness | coverage % 0–100 | 0.25 | `25 - clamp(value * 0.25, 0, 25)` |
| wrinkles | coverage % 0–100 | 0.25 | `25 - clamp(value * 0.25, 0, 25)` |

If a metric is unavailable (status !== `AVAILABLE`), it is excluded and the remaining metrics are scaled proportionally to fill 100 pts. Example: 3 available metrics → each contributes max ~33.3 pts.

**If 0 metrics are AVAILABLE:** `skinScore` is set to `null`. Frontend shows "Brak danych do obliczenia wyniku" instead of a number.

Result is rounded to nearest integer. Breakdown values are rounded to 1 decimal place.

### Storage

New fields in the `analysis` JSON (no Prisma schema migration needed — it's already a `Json` column):

```json
{
  "skinScore": 72,
  "skinScoreBreakdown": {
    "acne": 18.8,
    "pigmentation": 22.5,
    "redness": 20.0,
    "wrinkles": 11.3
  }
}
```

Computed in `skin-scans.provider.ts` after ML analysis completes, before returning the analysis object.

### TypeScript Types

`SkinScanAnalysis` in both `apps/server/src/modules/skin-scans/skin-scans.types.ts` and `apps/web/src/api/skin-scans.api.ts` gains:

```typescript
skinScore?: number | null;
skinScoreBreakdown?: Partial<Record<'acne' | 'pigmentation' | 'redness' | 'wrinkles', number>>;
```

### Classification Labels

| Range | Label (PL) | Color |
|-------|-----------|-------|
| 85–100 | Skóra w świetnej kondycji | `#16a34a` (green-600) |
| 70–84 | Dobra kondycja, drobne problemy | `#65a30d` (lime-600) |
| 50–69 | Wymaga uwagi | `#d97706` (amber-600) |
| 30–49 | Widoczne problemy | `#ea580c` (orange-600) |
| 0–29 | Wymaga intensywnej pielęgnacji | `#dc2626` (red-600) |

### Frontend Display

In `ResultReport` header (inside `apps/web/src/pages/user/SkinScan.tsx`): replace the "jakość" circle with the skin score:
- Large number (e.g. "72")
- Label "pkt" below the number
- Classification text + colored dot below the header
- Score breakdown visible in metric cards (each card shows its contribution)
- When `skinScore` is `null`: show "—" with text "Brak danych do obliczenia wyniku"

## 2. Photo Retention

### Rules

1. **First completed session** per user: images kept indefinitely (baseline).
2. **Latest completed session** per user: images kept indefinitely (until a newer session replaces it).
3. **All other completed sessions**: images + overlay files deleted after 7 days.
4. Analysis JSON (scores, metrics, zone data) is NEVER deleted.
5. User-initiated session deletion (`deleteSession`) is always allowed, including first/latest.

### Implementation

**New Prisma field:**

```prisma
model SkinScanSession {
  // ... existing fields
  imagesDeletedAt   DateTime?
}
```

Migration created via `prisma migrate dev`: `ALTER TABLE "SkinScanSession" ADD COLUMN "imagesDeletedAt" TIMESTAMP(3);`

**Cleanup scheduler** in `apps/server/src/modules/skin-scans/skin-scans.cleanup.ts`:

- Runs every hour via `setInterval` (initialized in `index.ts`, same pattern as `initializeTreatmentSeriesMaintenance`)
- Step 1: `SELECT DISTINCT "userId" FROM "SkinScanSession" WHERE status = 'COMPLETED'`
- Step 2: Per user — find all COMPLETED sessions ordered by `completedAt ASC`
  1. Identify first session (index 0) and latest session (last index) — these are protected
  2. For all other sessions where `completedAt < now() - 7 days` AND `imagesDeletedAt IS NULL`:
     - Delete image files from disk (`uploads/skin-scans/`)
     - Delete overlay files from disk (comprehensive path extraction — see below)
     - Set `imagesDeletedAt = now()` on the session
     - Clear `SkinScanImage.imagePath` to empty string (keep the record for angle/quality metadata)
- Protection status is re-evaluated on each scheduler run. A session may remain protected for up to 1 hour after it ceases to be the "latest."
- If a user deletes their first session, the next oldest becomes the new baseline. If that session already had images cleaned, comparison shows placeholder — this is acceptable.

**Comprehensive overlay path extraction** (shared utility used by both cleanup scheduler AND `deleteSession`):

Extract all file paths from analysis JSON:
- `analysis.metrics.*.details.overlays.*` (metric overlays per angle)
- `analysis.faceParsing.zoneGridOverlay.*` (zone grid overlays)
- `analysis.faceParsing.skinChangesOverlay.*` (skin changes overlays)
- `analysis.faceParsing.zones.*.closeup` (zone closeup thumbnails)
- `analysis.faceParsing.zoneCloseups.*.closeup` (zone closeup detail images)

**Exported function:** `initializeSkinScanCleanup()` called from `index.ts`.

### Frontend — Deleted Images Placeholder

When `session.imagesDeletedAt` is set:
- In overlay viewer and zone map: show a placeholder card instead of images
- Placeholder: camera icon + "Zdjęcia usunięte po 7 dniach od analizy"
- Metrics, score, zone analysis text data displayed normally

## 3. Comparison View

### Backend

New endpoint: `GET /api/skin-scans/comparison`

Response (200 OK):
```json
{
  "first": { /* SkinScanSession (first completed) */ },
  "latest": { /* SkinScanSession (latest completed) */ }
}
```

Returns `200` with `{ "first": null, "latest": null }` if user has fewer than 2 completed sessions.

Added to `skin-scans.router.ts`, implemented in `skin-scans.service.ts`.

### Frontend

**New component:** `SkinScanComparison.tsx` in `apps/web/src/components/skin-scan/`

**Entry point:** "Zobacz zmianę" button placed in `ResultReport` component (inside `SkinScan.tsx`), between the metrics grid and zone analysis. Only visible when the `comparison` query returns non-null first+latest.

**Layout:**
- **Desktop:** Two columns side by side, first on left, latest on right
- **Mobile:** First on top, latest below

**Per column:**
- Date of analysis
- Photo for selected angle (FRONT default)
- Skin score circle + classification label

**Above columns:**
- Angle selector tabs (driven by the latest session's available angles, since it is guaranteed to have images)
- Delta badge: e.g. "+12 pkt" (green) or "-5 pkt" (red)

**Loading/Error states:**
- Loading: spinner centered in comparison area
- Error: toast via `sonner` (same pattern as rest of app)

**Edge cases:**
- If first session has deleted images → show placeholder in first column, score still visible
- If first === latest (only 1 session) → button hidden (comparison returns null)
- If latest session images deleted → show placeholder (shouldn't happen since latest is protected, but defensive)

### API Type Addition

In `skin-scans.api.ts`:
```typescript
export type SkinScanComparison = {
  first: SkinScanSession | null;
  latest: SkinScanSession | null;
};
```

New function: `skinScansApi.comparison(): Promise<SkinScanComparison>`

## 4. Files to Create/Modify

### Create
- `apps/server/src/modules/skin-scans/skin-scans.cleanup.ts` — image cleanup scheduler + shared overlay path extraction utility
- `apps/server/prisma/migrations/<generated>/migration.sql` — add `imagesDeletedAt` (via `prisma migrate dev`)
- `apps/web/src/components/skin-scan/SkinScanComparison.tsx` — comparison view

### Modify
- `apps/server/src/modules/skin-scans/skin-scans.types.ts` — add `skinScore`, `skinScoreBreakdown` to `SkinScanAnalysis`
- `apps/server/src/modules/skin-scans/skin-scans.provider.ts` — compute `skinScore` + breakdown after analysis
- `apps/server/src/modules/skin-scans/skin-scans.service.ts` — add `getComparison()` method; update `deleteSession()` to use shared overlay path extraction
- `apps/server/src/modules/skin-scans/skin-scans.router.ts` — add `GET /comparison` route
- `apps/server/src/modules/skin-scans/skin-scans.controller.ts` — add `getComparison` handler
- `apps/server/src/index.ts` — call `initializeSkinScanCleanup()`
- `apps/server/prisma/schema.prisma` — add `imagesDeletedAt` field
- `apps/web/src/api/skin-scans.api.ts` — add `SkinScanComparison` type, `comparison()` function, `skinScore`/`skinScoreBreakdown` fields to `SkinScanAnalysis`
- `apps/web/src/pages/user/SkinScan.tsx` — replace quality circle with skin score, add "Zobacz zmianę" button in `ResultReport`, handle deleted images placeholder
- `apps/web/src/components/skin-scan/SkinScanOverlayViewer.tsx` — handle deleted images
- `apps/web/src/components/skin-scan/SkinScanZoneMap.tsx` — handle deleted images

## 5. Non-Goals

- No admin UI for adjusting score formula (hardcoded for now)
- No email/push notification about score
- No PDF export of comparison
- No trend chart across multiple sessions (only first vs latest)
- No prevention of deleting first/latest sessions (user can always delete; comparison degrades gracefully)
