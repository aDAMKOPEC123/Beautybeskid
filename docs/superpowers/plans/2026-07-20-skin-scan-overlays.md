# Skin Scan Overlay Visualization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add visual overlay annotations on skin scan photos showing where wrinkles, pigmentation, and redness occur.

**Architecture:** Python service generates colored PNG overlays from existing analysis masks, returns them as base64 in JSON response. Node.js provider extracts overlays before Zod validation, saves as flat files in uploads/skin-scans/, and merges paths into metric details. Frontend displays overlays with per-metric toggles and opacity slider.

**Tech Stack:** Python (cv2, numpy, base64), Node.js/Express (Buffer, fs), React (CSS opacity, range input)

**Spec:** `docs/superpowers/specs/2026-07-20-skin-scan-overlays-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `services/skin-analysis/analysis.py` | Modify | `encode_overlay()`, `color_indices()` tuple return, overlay generation in `analyze()` |
| `services/skin-analysis/models.py` | Modify | `WrinkleModel.predict()` returns `wrinkle_mask` |
| `services/skin-analysis/tests/test_analysis.py` | Modify | Tests for `encode_overlay()` and updated `color_indices()` |
| `apps/server/src/modules/skin-scans/skin-scans.types.ts` | Modify | Add `overlays` to metric details type |
| `apps/server/src/modules/skin-scans/skin-scans.provider.ts` | Modify | Extract overlays before Zod, decode base64 to files, merge paths |
| `apps/server/src/modules/skin-scans/skin-scans.service.ts` | Modify | Overlay cleanup in `deleteSession()` |
| `apps/server/src/middleware/privateUpload.middleware.ts` | Modify | Overlay ownership check |
| `apps/web/src/api/skin-scans.api.ts` | Modify | `getMetricOverlays()` helper |
| `apps/web/src/components/skin-scan/SkinScanOverlayViewer.tsx` | Create | Overlay viewer with toggles + opacity slider |
| `apps/web/src/pages/user/SkinScan.tsx` | Modify | Add "Mapa zmian" section to ResultReport |

---

### Task 1: Python — `encode_overlay()` function + test

**Files:**
- Modify: `services/skin-analysis/analysis.py` (add function after `decode_image`, around line 50)
- Modify: `services/skin-analysis/tests/test_analysis.py` (add test)

- [ ] **Step 1: Write the test**

In `services/skin-analysis/tests/test_analysis.py`, add import and test:

```python
# Add to imports at top:
from analysis import color_indices, robust_threshold, weighted_coverage, encode_overlay  # noqa: E402
import base64

def test_encode_overlay_produces_valid_png_with_correct_dimensions():
    mask = np.zeros((64, 64), dtype=bool)
    mask[10:30, 10:30] = True  # 20x20 block
    color = (147, 51, 234, 128)  # purple RGBA
    original_shape = (480, 640)  # h, w

    result = encode_overlay(mask, color, original_shape)

    # Should be valid base64
    decoded = base64.b64decode(result)
    # Should be valid PNG (starts with PNG signature)
    assert decoded[:4] == b'\x89PNG'
    # Decode and check dimensions
    arr = np.frombuffer(decoded, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_UNCHANGED)
    assert img.shape == (480, 640, 4)  # RGBA at original size
    # Masked area should have the color, non-masked should be transparent
    assert img[0, 0, 3] == 0  # outside mask → transparent


def test_encode_overlay_empty_mask_produces_fully_transparent():
    mask = np.zeros((32, 32), dtype=bool)
    color = (220, 38, 38, 128)
    result = encode_overlay(mask, color, (100, 100))
    decoded = base64.b64decode(result)
    arr = np.frombuffer(decoded, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_UNCHANGED)
    assert img[:, :, 3].sum() == 0  # fully transparent
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd services/skin-analysis && .venv/Scripts/python.exe -m pytest tests/test_analysis.py::test_encode_overlay_produces_valid_png_with_correct_dimensions -v`
Expected: FAIL — `ImportError: cannot import name 'encode_overlay'`

- [ ] **Step 3: Implement `encode_overlay()` in `analysis.py`**

Add after the `decode_image` function (around line 50), before `robust_threshold`:

```python
OVERLAY_COLORS = {
    "wrinkles": (147, 51, 234, 128),      # purple
    "pigmentation": (180, 120, 50, 128),   # brown/orange
    "redness": (220, 38, 38, 128),         # red
    "acne": (234, 179, 8, 200),            # yellow (phase 2)
}


def encode_overlay(mask: np.ndarray, color: tuple[int, int, int, int], original_shape: tuple[int, int]) -> str:
    """Encode a boolean mask as a semi-transparent RGBA PNG, returned as base64.

    Args:
        mask: boolean numpy array (any resolution)
        color: (R, G, B, A) tuple, 0-255
        original_shape: (height, width) of the original image to scale to
    """
    h, w = original_shape
    if mask.shape[:2] != (h, w):
        mask_u8 = mask.astype(np.uint8) * 255
        mask_u8 = cv2.resize(mask_u8, (w, h), interpolation=cv2.INTER_NEAREST)
        mask = mask_u8 > 127

    overlay = np.zeros((h, w, 4), dtype=np.uint8)
    overlay[mask] = color

    ok, encoded = cv2.imencode(".png", overlay)
    if not ok:
        raise RuntimeError("Failed to encode overlay PNG")

    import base64
    return base64.b64encode(encoded.tobytes()).decode("ascii")
```

Also add `import base64` to the top-level imports of `analysis.py`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd services/skin-analysis && .venv/Scripts/python.exe -m pytest tests/test_analysis.py -v`
Expected: ALL PASS (including existing tests)

- [ ] **Step 5: Commit**

```bash
git add services/skin-analysis/analysis.py services/skin-analysis/tests/test_analysis.py
git commit -m "feat(skin-scan): add encode_overlay() for mask-to-PNG conversion"
```

---

### Task 2: Python — `color_indices()` returns tuple with masks

**Files:**
- Modify: `services/skin-analysis/analysis.py` (function `color_indices` ~line 67)
- Modify: `services/skin-analysis/tests/test_analysis.py` (update existing test)

- [ ] **Step 1: Update existing test and add mask test**

In `tests/test_analysis.py`, update `test_color_indices_measure_only_the_face_mask`:

```python
def test_color_indices_measure_only_the_face_mask():
    image = np.full((100, 100, 3), 160, dtype=np.uint8)
    image[20:30, 20:30] = (60, 60, 115)
    skin_mask = np.zeros((100, 100), dtype=bool)
    skin_mask[10:90, 10:90] = True
    stats, pig_mask, red_mask = color_indices(image, skin_mask)
    assert stats["skinPixels"] == 6_400
    assert 0 <= float(stats["pigmentationCoverage"]) <= 100
    assert 0 <= float(stats["rednessCoverage"]) <= 100
    # Masks should be boolean arrays with same shape as input
    assert pig_mask.dtype == bool
    assert red_mask.dtype == bool
    assert pig_mask.shape == (100, 100)
    assert red_mask.shape == (100, 100)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd services/skin-analysis && .venv/Scripts/python.exe -m pytest tests/test_analysis.py::test_color_indices_measure_only_the_face_mask -v`
Expected: FAIL — `ValueError: not enough values to unpack`

- [ ] **Step 3: Update `color_indices()` to return tuple**

In `analysis.py`, change `color_indices` return. Current end of function (around line 85):

```python
    return {
        "skinPixels": int(len(pixels)),
        "pigmentationCoverage": float(pigmentation.mean() * 100.0),
        "rednessCoverage": float(redness.mean() * 100.0),
    }
```

Replace with:

```python
    stats = {
        "skinPixels": int(len(pixels)),
        "pigmentationCoverage": float(pigmentation.mean() * 100.0),
        "rednessCoverage": float(redness.mean() * 100.0),
    }

    # Build full-image masks for overlay generation
    pigmentation_full = np.zeros(skin_mask.shape, dtype=bool)
    redness_full = np.zeros(skin_mask.shape, dtype=bool)
    pigmentation_full[skin_mask] = pigmentation
    redness_full[skin_mask] = redness

    return stats, pigmentation_full, redness_full
```

Also update the type hint of `color_indices`:

```python
def color_indices(bgr: np.ndarray, skin_mask: np.ndarray) -> tuple[dict[str, float | int], np.ndarray, np.ndarray]:
```

- [ ] **Step 4: Update callers in `analyze()`**

In `SkinAnalyzer.analyze()`, find the loop (around line 120):

```python
        for angle in usable_angles:
            try:
                row = color_indices(decoded[angle], face_masks[angle])
            except ValueError:
                continue
            color_rows.append(row)
            color_by_angle[angle] = {
```

Replace with:

```python
        pig_masks: dict[str, np.ndarray] = {}
        red_masks: dict[str, np.ndarray] = {}
        for angle in usable_angles:
            try:
                row, pig_mask, red_mask = color_indices(decoded[angle], face_masks[angle])
            except ValueError:
                continue
            color_rows.append(row)
            pig_masks[angle] = pig_mask
            red_masks[angle] = red_mask
            color_by_angle[angle] = {
```

- [ ] **Step 5: Run all tests**

Run: `cd services/skin-analysis && .venv/Scripts/python.exe -m pytest tests/test_analysis.py -v`
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git add services/skin-analysis/analysis.py services/skin-analysis/tests/test_analysis.py
git commit -m "feat(skin-scan): color_indices returns pigmentation and redness masks"
```

---

### Task 3: Python — `WrinkleModel.predict()` returns mask

**Files:**
- Modify: `services/skin-analysis/models.py` (WrinkleModel.predict, around line 112)

- [ ] **Step 1: Add `wrinkle_mask` to return dict**

In `models.py`, `WrinkleModel.predict()`, find the return statement (around line 130):

```python
        return {
            "coverage": wrinkle_pixels / skin_pixels * 100.0,
            "wrinkle_pixels": wrinkle_pixels,
            "skin_pixels": skin_pixels,
            "confidence": confidence,
        }
```

Replace with:

```python
        return {
            "coverage": wrinkle_pixels / skin_pixels * 100.0,
            "wrinkle_pixels": wrinkle_pixels,
            "skin_pixels": skin_pixels,
            "confidence": confidence,
            "wrinkle_mask": prediction,
        }
```

The variable `prediction` already exists in the method — it's a boolean array at model resolution (`self.image_size x self.image_size`), masked to `resized_mask`. No new computation needed.

- [ ] **Step 2: Run existing tests to verify nothing breaks**

Run: `cd services/skin-analysis && .venv/Scripts/python.exe -m pytest tests/ -v`
Expected: ALL PASS

- [ ] **Step 3: Commit**

```bash
git add services/skin-analysis/models.py
git commit -m "feat(skin-scan): WrinkleModel.predict returns wrinkle_mask"
```

---

### Task 4: Python — Generate overlays in `analyze()`

**Files:**
- Modify: `services/skin-analysis/analysis.py` (SkinAnalyzer.analyze and _result methods)

- [ ] **Step 1: Add overlay generation to `analyze()`**

After the wrinkle metric computation (after the `wrinkle_metric = metric(...)` block, around line 175), add:

```python
        # --- Generate overlay images ---
        overlays: dict[str, dict[str, str]] = {}

        # Wrinkles overlay (single angle)
        wrinkle_mask = wrinkle.get("wrinkle_mask")
        if wrinkle_mask is not None and wrinkle_coverage > 0:
            overlays["wrinkles"] = {
                wrinkle_angle: encode_overlay(
                    wrinkle_mask, OVERLAY_COLORS["wrinkles"], decoded[wrinkle_angle].shape[:2],
                ),
            }

        # Pigmentation and redness overlays (per usable angle)
        if color_rows:
            pig_overlays: dict[str, str] = {}
            red_overlays: dict[str, str] = {}
            for angle in pig_masks:
                shape = decoded[angle].shape[:2]
                if pig_masks[angle].any():
                    pig_overlays[angle] = encode_overlay(pig_masks[angle], OVERLAY_COLORS["pigmentation"], shape)
                if red_masks[angle].any():
                    red_overlays[angle] = encode_overlay(red_masks[angle], OVERLAY_COLORS["redness"], shape)
            if pig_overlays:
                overlays["pigmentation"] = pig_overlays
            if red_overlays:
                overlays["redness"] = red_overlays
```

- [ ] **Step 2: Pass overlays to `_result()`**

Update the `return self._result(...)` call at the end of `analyze()` — add `overlays=overlays`:

```python
        return self._result(
            acne=acne_metric,
            pigmentation=pigmentation_metric,
            redness=redness_metric,
            wrinkles=wrinkle_metric,
            face_details={"skinRatioByAngle": skin_ratios, "usableAngles": usable_angles},
            overlays=overlays,
        )
```

Also update the insufficient quality early return (around line 105) to pass `overlays={}`.

- [ ] **Step 3: Update `_result()` to include overlays**

Change the `_result` method signature and body:

```python
    def _result(
        self,
        *,
        acne: dict[str, object],
        pigmentation: dict[str, object],
        redness: dict[str, object],
        wrinkles: dict[str, object],
        face_details: dict[str, object],
        overlays: dict[str, dict[str, str]] | None = None,
    ) -> dict[str, object]:
        versions = {"captureQuality": "quality-v1", **self.models.versions}
        result: dict[str, object] = {
            "schemaVersion": "1.0",
            "mode": "COSMETOLOGY_RESEARCH",
            "generatedAt": datetime.now(UTC).isoformat(),
            "disclaimer": (
                "To jest badawcza ocena kosmetologiczna obrazu, a nie diagnoza medyczna. "
                "Wynik zalezy od swiatla, aparatu, makijazu i ulozenia twarzy."
            ),
            "modelVersions": versions,
            "metrics": {
                "acne": acne,
                "pigmentation": pigmentation,
                "redness": redness,
                "wrinkles": wrinkles,
                "pores": unavailable("Model porow nie zostal jeszcze wytrenowany i zwalidowany."),
                "spfCoverage": unavailable(
                    "Pokrycia SPF nie mozna wiarygodnie zmierzyc zwykla kamera RGB. Wymagany jest tor UV.",
                    status="UNAVAILABLE_WITH_RGB",
                ),
            },
            "faceParsing": face_details,
        }
        if overlays:
            result["overlays"] = overlays
        return result
```

- [ ] **Step 4: Run all tests**

Run: `cd services/skin-analysis && .venv/Scripts/python.exe -m pytest tests/ -v`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add services/skin-analysis/analysis.py
git commit -m "feat(skin-scan): generate overlay PNGs from analysis masks"
```

---

### Task 5: Node.js — Update types

**Files:**
- Modify: `apps/server/src/modules/skin-scans/skin-scans.types.ts`

- [ ] **Step 1: Add overlays to metric details type**

Read the current file, then update `SkinScanAnalysisMetric`:

```ts
export type SkinScanAnalysisMetric = {
  status: SkinScanMetricStatus;
  value: number | null;
  unit: string | null;
  confidence: number | null;
  modelVersion: string | null;
  message: string;
  details?: Record<string, unknown> & {
    overlays?: Partial<Record<string, string>>;
  };
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd cosmo-app/apps/server && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/modules/skin-scans/skin-scans.types.ts
git commit -m "feat(skin-scan): add overlays to SkinScanAnalysisMetric type"
```

---

### Task 6: Node.js — Provider extracts overlays, saves as files

**Files:**
- Modify: `apps/server/src/modules/skin-scans/skin-scans.provider.ts`

This is the most complex backend change. The `mlServiceProvider.analyze()` method needs to:
1. Extract `overlays` from raw JSON before Zod parse
2. Save each overlay as a PNG file
3. Merge file paths into `analysis.metrics.*.details.overlays`

- [ ] **Step 1: Add overlay file saving helper**

At the top of `skin-scans.provider.ts`, add imports and helper:

```ts
import path from 'path';
import fs from 'fs/promises';
```

Add helper function after `getStoredImage`:

```ts
type RawOverlays = Record<string, Record<string, string>>;

const saveOverlayFiles = async (
  sessionId: string,
  rawOverlays: RawOverlays,
): Promise<Record<string, Record<string, string>>> => {
  const uploadsDir = path.resolve(process.cwd(), 'uploads', 'skin-scans');
  await fs.mkdir(uploadsDir, { recursive: true });

  const savedPaths: Record<string, Record<string, string>> = {};

  for (const [metric, angles] of Object.entries(rawOverlays)) {
    savedPaths[metric] = {};
    for (const [angle, base64Data] of Object.entries(angles)) {
      const buffer = Buffer.from(base64Data, 'base64');
      const filename = `overlay-${sessionId}-${metric}-${angle.toLowerCase()}.png`;
      const filePath = path.join(uploadsDir, filename);
      await fs.writeFile(filePath, buffer);
      savedPaths[metric][angle] = `uploads/skin-scans/${filename}`;
    }
  }

  return savedPaths;
};
```

- [ ] **Step 2: Update `mlServiceProvider.analyze()`**

Replace the current response handling in `mlServiceProvider`:

```ts
    const raw = await response.json();

    // Extract overlays before Zod parse (parse strips unknown keys)
    const rawOverlays: RawOverlays | undefined = raw.overlays;

    const analysis = analysisSchema.parse(raw) as SkinScanAnalysis;

    // Save overlay files and merge paths into metric details
    if (rawOverlays && Object.keys(rawOverlays).length > 0) {
      const savedPaths = await saveOverlayFiles(input.sessionId, rawOverlays);
      for (const [metricKey, anglePaths] of Object.entries(savedPaths)) {
        const metricObj = analysis.metrics[metricKey as keyof typeof analysis.metrics];
        if (metricObj) {
          metricObj.details = { ...metricObj.details, overlays: anglePaths };
        }
      }
    }

    return analysis;
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd cosmo-app/apps/server && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/modules/skin-scans/skin-scans.provider.ts
git commit -m "feat(skin-scan): provider extracts overlays and saves as PNG files"
```

---

### Task 7: Node.js — Overlay cleanup in `deleteSession()`

**Files:**
- Modify: `apps/server/src/modules/skin-scans/skin-scans.service.ts`

- [ ] **Step 1: Add overlay cleanup helper**

Add after `removeStoredScanImage`:

```ts
const removeSessionOverlays = async (session: Awaited<ReturnType<typeof getOwnedSession>>) => {
  const analysis = session.analysis as Record<string, unknown> | null;
  if (!analysis) return;

  const metrics = analysis.metrics as Record<string, Record<string, unknown>> | undefined;
  if (!metrics) return;

  const paths: string[] = [];
  for (const metric of Object.values(metrics)) {
    const details = metric.details as Record<string, unknown> | undefined;
    const overlays = details?.overlays as Record<string, string> | undefined;
    if (overlays) {
      paths.push(...Object.values(overlays));
    }
  }

  await Promise.all(paths.map(removeStoredScanImage));
};
```

- [ ] **Step 2: Call it in `deleteSession()`**

In `deleteSession`, after `prisma.skinScanSession.delete`, add the overlay cleanup. Current code:

```ts
export const deleteSession = async (userId: string, sessionId: string) => {
  const session = await getOwnedSession(userId, sessionId);
  await prisma.skinScanSession.delete({ where: { id: session.id } });
  await Promise.all(session.images.map((image) => removeStoredScanImage(image.imagePath)));
};
```

Replace with:

```ts
export const deleteSession = async (userId: string, sessionId: string) => {
  const session = await getOwnedSession(userId, sessionId);
  await removeSessionOverlays(session);
  await prisma.skinScanSession.delete({ where: { id: session.id } });
  await Promise.all(session.images.map((image) => removeStoredScanImage(image.imagePath)));
};
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd cosmo-app/apps/server && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/modules/skin-scans/skin-scans.service.ts
git commit -m "feat(skin-scan): clean up overlay files when deleting session"
```

---

### Task 8: Node.js — `privateUpload` middleware overlay check

**Files:**
- Modify: `apps/server/src/middleware/privateUpload.middleware.ts` (lines 80-88)

- [ ] **Step 1: Update the skin-scans branch**

Replace the current `skin-scans` block (lines 80-87):

```ts
    } else if (folder === 'skin-scans') {
      const image = await prisma.skinScanImage.findFirst({
        where: { imagePath: { endsWith: filename }, session: { userId: decoded.id } },
      });
      if (!image) {
        res.status(403).json({ status: 'error', message: 'Brak dostepu do pliku' });
        return;
      }
```

With:

```ts
    } else if (folder === 'skin-scans') {
      // Regular scan images
      const image = await prisma.skinScanImage.findFirst({
        where: { imagePath: { endsWith: filename }, session: { userId: decoded.id } },
      });
      if (!image) {
        // Overlay files: overlay-{sessionId}-{metric}-{angle}.png
        const overlayMatch = filename.match(/^overlay-([a-f0-9-]+)-/i);
        if (overlayMatch) {
          const session = await prisma.skinScanSession.findFirst({
            where: { id: overlayMatch[1], userId: decoded.id },
          });
          if (!session) {
            res.status(403).json({ status: 'error', message: 'Brak dostepu do pliku' });
            return;
          }
        } else {
          res.status(403).json({ status: 'error', message: 'Brak dostepu do pliku' });
          return;
        }
      }
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd cosmo-app/apps/server && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/middleware/privateUpload.middleware.ts
git commit -m "feat(skin-scan): allow overlay file access in privateUpload middleware"
```

---

### Task 9: Frontend — API types helper

**Files:**
- Modify: `apps/web/src/api/skin-scans.api.ts`

- [ ] **Step 1: Add `getMetricOverlays` helper**

At the bottom of the file, before the closing, add:

```ts
export const getMetricOverlays = (
  metric: SkinScanMetric,
): Partial<Record<SkinScanAngle, string>> | null => {
  const overlays = (metric.details as Record<string, unknown> | undefined)
    ?.overlays;
  if (!overlays || typeof overlays !== 'object') return null;
  return overlays as Partial<Record<SkinScanAngle, string>>;
};
```

- [ ] **Step 2: Verify frontend compiles**

Run: `cd cosmo-app/apps/web && npx tsc --noEmit`
Expected: No errors (or only pre-existing errors)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/api/skin-scans.api.ts
git commit -m "feat(skin-scan): add getMetricOverlays helper for overlay paths"
```

---

### Task 10: Frontend — `SkinScanOverlayViewer` component

**Files:**
- Create: `apps/web/src/components/skin-scan/SkinScanOverlayViewer.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import {
  getMetricOverlays,
  type SkinScanAngle,
  type SkinScanSession,
} from '@/api/skin-scans.api';

const ANGLES: SkinScanAngle[] = ['FRONT', 'LEFT', 'RIGHT'];

const ANGLE_LABELS: Record<SkinScanAngle, string> = {
  FRONT: 'Na wprost',
  LEFT: 'Lewy polprofil',
  RIGHT: 'Prawy polprofil',
};

const METRIC_CONFIG = {
  wrinkles: { label: 'Zmarszczki', color: '#9333EA' },
  pigmentation: { label: 'Przebarwienia', color: '#B47832' },
  redness: { label: 'Rumien', color: '#DC2626' },
  acne: { label: 'Tradzik', color: '#EAB308' },
} as const;

type MetricKey = keyof typeof METRIC_CONFIG;

type Props = {
  session: SkinScanSession;
  className?: string;
};

export const SkinScanOverlayViewer = ({ session, className }: Props) => {
  const [activeAngle, setActiveAngle] = useState<SkinScanAngle>('FRONT');
  const [activeMetrics, setActiveMetrics] = useState<Set<MetricKey>>(new Set());
  const [opacity, setOpacity] = useState(40);
  const [loadingOverlays, setLoadingOverlays] = useState<Set<string>>(new Set());

  const analysis = session.analysis;
  if (!analysis) return null;

  // Collect available overlays per metric
  const availableOverlays = new Map<MetricKey, Partial<Record<SkinScanAngle, string>>>();
  for (const [key, metric] of Object.entries(analysis.metrics)) {
    if (metric.status !== 'AVAILABLE') continue;
    const overlays = getMetricOverlays(metric);
    if (overlays && Object.keys(overlays).length > 0) {
      availableOverlays.set(key as MetricKey, overlays);
    }
  }

  if (availableOverlays.size === 0) return null;

  // Find angles that have at least one overlay
  const anglesWithOverlays = ANGLES.filter((angle) =>
    Array.from(availableOverlays.values()).some((overlays) => overlays[angle]),
  );

  if (anglesWithOverlays.length === 0) return null;

  const currentImage = session.images.find((img) => img.angle === activeAngle);

  const toggleMetric = (key: MetricKey) => {
    setActiveMetrics((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleOverlayLoad = (key: string) => {
    setLoadingOverlays((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  const handleOverlayLoadStart = (key: string) => {
    setLoadingOverlays((prev) => new Set(prev).add(key));
  };

  return (
    <section className={`rounded-3xl border border-border bg-white shadow-sm ${className ?? ''}`}>
      <div className="p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-[#9333EA]/10 p-3 text-[#7C22CE]">
            <Eye className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-heading text-xl font-semibold text-[#1A3828]">Mapa zmian</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Wlacz warstwe, aby zobaczyc gdzie na twarzy wykryto zmiany.
            </p>
          </div>
        </div>

        {/* Angle tabs */}
        {anglesWithOverlays.length > 1 && (
          <div className="mt-5 flex gap-2">
            {anglesWithOverlays.map((angle) => (
              <button
                key={angle}
                type="button"
                onClick={() => setActiveAngle(angle)}
                className={`rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
                  activeAngle === angle
                    ? 'bg-[#1A3828] text-white'
                    : 'bg-[#FAF9F6] text-muted-foreground hover:bg-[#F0EDE6]'
                }`}
              >
                {ANGLE_LABELS[angle]}
              </button>
            ))}
          </div>
        )}

        {/* Image with overlays */}
        <div className="relative mt-4 overflow-hidden rounded-2xl bg-[#102219]">
          {currentImage && (
            <img
              src={`/${currentImage.imagePath}`}
              alt={`Skan: ${ANGLE_LABELS[activeAngle]}`}
              className="block w-full"
            />
          )}
          {/* Overlay layers */}
          {Array.from(activeMetrics).map((metricKey) => {
            const overlays = availableOverlays.get(metricKey);
            const overlayPath = overlays?.[activeAngle];
            if (!overlayPath) return null;
            const loadKey = `${metricKey}-${activeAngle}`;
            return (
              <img
                key={loadKey}
                src={`/${overlayPath}`}
                alt={`Overlay: ${METRIC_CONFIG[metricKey].label}`}
                className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                style={{ opacity: opacity / 100 }}
                onLoadStart={() => handleOverlayLoadStart(loadKey)}
                onLoad={() => handleOverlayLoad(loadKey)}
              />
            );
          })}
          {loadingOverlays.size > 0 && (
            <div className="absolute right-3 top-3 rounded-full bg-black/50 p-2">
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            </div>
          )}
        </div>

        {/* Metric toggles */}
        <div className="mt-4 flex flex-wrap gap-2">
          {Array.from(availableOverlays.keys()).map((metricKey) => {
            const config = METRIC_CONFIG[metricKey];
            const isActive = activeMetrics.has(metricKey);
            const hasOverlayForAngle = availableOverlays.get(metricKey)?.[activeAngle];
            return (
              <button
                key={metricKey}
                type="button"
                onClick={() => toggleMetric(metricKey)}
                disabled={!hasOverlayForAngle}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-40 ${
                  isActive
                    ? 'border-[#1A3828] bg-[#1A3828] text-white'
                    : 'border-border bg-white text-[#30483A] hover:bg-[#FAF9F6]'
                }`}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: config.color }}
                />
                {config.label}
                {isActive ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </button>
            );
          })}
        </div>

        {/* Opacity slider */}
        {activeMetrics.size > 0 && (
          <div className="mt-4 flex items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground">Przezroczystosc</span>
            <input
              type="range"
              min={0}
              max={100}
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-gray-200 accent-[#1A3828]"
            />
            <span className="w-8 text-right text-xs font-semibold text-[#1A3828]">{opacity}%</span>
          </div>
        )}
      </div>
    </section>
  );
};
```

- [ ] **Step 2: Verify frontend compiles**

Run: `cd cosmo-app/apps/web && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/skin-scan/SkinScanOverlayViewer.tsx
git commit -m "feat(skin-scan): add SkinScanOverlayViewer component with toggles and opacity slider"
```

---

### Task 11: Frontend — Integrate overlay viewer into ResultReport

**Files:**
- Modify: `apps/web/src/pages/user/SkinScan.tsx`

- [ ] **Step 1: Add import**

At the top of `SkinScan.tsx`, add:

```ts
import { SkinScanOverlayViewer } from '@/components/skin-scan/SkinScanOverlayViewer';
```

- [ ] **Step 2: Add overlay viewer to ResultReport**

In the `ResultReport` component, find the closing `</section>` of the "Analiza skory" section (the one with the disclaimer). After it, before the "Nowy skan" button div, add:

```tsx
      <SkinScanOverlayViewer session={session} />
```

This goes between the analysis section and `<div className="flex justify-center"><Button ... Nowy skan</Button></div>`.

- [ ] **Step 3: Verify frontend compiles**

Run: `cd cosmo-app/apps/web && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/user/SkinScan.tsx
git commit -m "feat(skin-scan): add overlay map section to skin scan report"
```

---

### Task 12: Integration verification

- [ ] **Step 1: Run all Python tests**

Run: `cd cosmo-app/services/skin-analysis && .venv/Scripts/python.exe -m pytest tests/ -v`
Expected: ALL PASS

- [ ] **Step 2: Run backend TypeScript check**

Run: `cd cosmo-app/apps/server && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run backend quality test**

Run: `cd cosmo-app/apps/server && pnpm vitest run src/modules/skin-scans/skin-scans.quality.test.ts`
Expected: PASS

- [ ] **Step 4: Run frontend build**

Run: `cd cosmo-app/apps/web && pnpm build`
Expected: Build succeeds

- [ ] **Step 5: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(skin-scan): integration fixes for overlay feature"
```
