# Fitzpatrick Calibration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-detect Fitzpatrick skin phototype (I-VI) from scan images and calibrate pigmentation/redness thresholds per phototype to reduce false positives across skin tones.

**Architecture:** Python service detects phototype from median L* of skin pixels, applies per-type threshold corrections to `color_indices()`. Node backend auto-updates user record with detected type. Frontend shows phototype in profile with manual override.

**Tech Stack:** Python (OpenCV, NumPy, FastAPI), Node.js (Prisma, Express), React (TanStack Query)

**Spec:** `docs/superpowers/specs/2026-07-22-fitzpatrick-calibration-design.md`

---

### Task 1: Python — Fitzpatrick detection and threshold lookup module

**Files:**
- Create: `services/skin-analysis/fitzpatrick.py` (on VPS at `/home/ubuntu/cosmo-app/services/skin-analysis/`)
- Create: `services/skin-analysis/tests/test_fitzpatrick.py` (on VPS)

This task creates the core Python module with three components:
1. `FITZPATRICK_THRESHOLDS` — lookup table mapping type 1-6 to color_indices threshold parameters
2. `get_color_thresholds(fitzpatrick_type)` — returns threshold dict for a given type (or type II defaults for None)
3. `detect_fitzpatrick(bgr, skin_mask)` — computes median L* from skin pixels, maps to type 1-6
4. `aggregate_fitzpatrick(types)` — takes list of per-angle detections, returns median with `math.ceil()` rounding

**Context:** The module will be imported by `analysis.py` (Task 2). The threshold values must match the spec's calibration table exactly. Type II values must equal the current hardcoded values in `color_indices()`: dark(9.0, 1.4), brown(4.0, 1.1), red(5.0, 1.25).

- [ ] **Step 1: Write tests for `test_fitzpatrick.py`**

Write locally then SCP to VPS. Tests cover:
- `test_get_color_thresholds_none_returns_type2` — None input returns type II defaults
- `test_get_color_thresholds_type2_matches_current` — type 2 values match existing hardcoded thresholds
- `test_get_color_thresholds_all_types` — types 1-6 all return valid dicts with expected keys
- `test_detect_fitzpatrick_bright_skin` — synthetic image with L*=80 returns type 1
- `test_detect_fitzpatrick_medium_skin` — synthetic image with L*=60 returns type 3
- `test_detect_fitzpatrick_dark_skin` — synthetic image with L*=40 returns type 5
- `test_detect_fitzpatrick_insufficient_pixels` — mask with <5000 pixels returns None
- `test_detect_fitzpatrick_empty_mask` — all-False mask returns None
- `test_aggregate_fitzpatrick_median_ceil` — verifies multi-angle aggregation with ceil rounding
- `test_aggregate_fitzpatrick_empty_list` — empty list returns None
- `test_aggregate_fitzpatrick_single` — single detection returns that value

```python
import math
import numpy as np
import cv2
import pytest
from fitzpatrick import detect_fitzpatrick, get_color_thresholds, aggregate_fitzpatrick, FITZPATRICK_THRESHOLDS


class TestGetColorThresholds:
    def test_none_returns_type2(self):
        result = get_color_thresholds(None)
        expected = FITZPATRICK_THRESHOLDS[2]
        assert result == expected

    def test_type2_matches_current_hardcoded(self):
        t = get_color_thresholds(2)
        assert t["dark_min_delta"] == 9.0
        assert t["dark_mad_scale"] == 1.4
        assert t["brown_min_delta"] == 4.0
        assert t["brown_mad_scale"] == 1.1
        assert t["red_min_delta"] == 5.0
        assert t["red_mad_scale"] == 1.25

    def test_all_types_return_valid_dicts(self):
        keys = {"dark_min_delta", "dark_mad_scale", "brown_min_delta", "brown_mad_scale", "red_min_delta", "red_mad_scale"}
        for ftype in range(1, 7):
            t = get_color_thresholds(ftype)
            assert set(t.keys()) == keys
            for v in t.values():
                assert isinstance(v, (int, float))
                assert v > 0

    def test_darker_types_have_higher_dark_delta(self):
        for i in range(1, 6):
            assert get_color_thresholds(i)["dark_min_delta"] < get_color_thresholds(i + 1)["dark_min_delta"]


def _make_skin_image(target_l: float, width: int = 200, height: int = 200) -> tuple[np.ndarray, np.ndarray]:
    """Create a synthetic BGR image where skin pixels have approximately target_l lightness."""
    lab = np.zeros((height, width, 3), dtype=np.uint8)
    lab[:, :, 0] = int(np.clip(target_l * 255 / 100, 0, 255))  # L channel (0-255 in OpenCV)
    lab[:, :, 1] = 128  # a* neutral
    lab[:, :, 2] = 128  # b* neutral
    bgr = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
    mask = np.ones((height, width), dtype=bool)
    return bgr, mask


class TestDetectFitzpatrick:
    def test_bright_skin_type1(self):
        bgr, mask = _make_skin_image(80.0)
        assert detect_fitzpatrick(bgr, mask) == 1

    def test_medium_skin_type3(self):
        bgr, mask = _make_skin_image(60.0)
        assert detect_fitzpatrick(bgr, mask) == 3

    def test_dark_skin_type5(self):
        bgr, mask = _make_skin_image(40.0)
        assert detect_fitzpatrick(bgr, mask) == 5

    def test_very_dark_skin_type6(self):
        bgr, mask = _make_skin_image(25.0)
        assert detect_fitzpatrick(bgr, mask) == 6

    def test_insufficient_pixels_returns_none(self):
        bgr = np.zeros((100, 100, 3), dtype=np.uint8)
        mask = np.zeros((100, 100), dtype=bool)
        mask[:70, :70] = True  # 70*70 = 4900 < 5000
        assert detect_fitzpatrick(bgr, mask) is None

    def test_empty_mask_returns_none(self):
        bgr = np.zeros((100, 100, 3), dtype=np.uint8)
        mask = np.zeros((100, 100), dtype=bool)
        assert detect_fitzpatrick(bgr, mask) is None


class TestAggregateFitzpatrick:
    def test_median_with_ceil_rounding(self):
        # median of [2, 3] = 2.5, ceil = 3
        assert aggregate_fitzpatrick([2, 3]) == 3

    def test_odd_count_exact_median(self):
        # median of [1, 3, 5] = 3
        assert aggregate_fitzpatrick([1, 3, 5]) == 3

    def test_single_value(self):
        assert aggregate_fitzpatrick([4]) == 4

    def test_empty_list_returns_none(self):
        assert aggregate_fitzpatrick([]) is None

    def test_filters_none_values(self):
        # None values should be excluded before computing median
        assert aggregate_fitzpatrick([2, None, 4]) == 3
```

- [ ] **Step 2: SCP test file to VPS and verify tests fail**

```bash
scp tests/test_fitzpatrick.py ubuntu@51.83.160.253:/home/ubuntu/cosmo-app/services/skin-analysis/tests/
ssh ubuntu@51.83.160.253 "cd /home/ubuntu/cosmo-app/services/skin-analysis && source venv/bin/activate && python -m pytest tests/test_fitzpatrick.py -v"
```

Expected: FAIL — `ModuleNotFoundError: No module named 'fitzpatrick'`

- [ ] **Step 3: Implement `fitzpatrick.py`**

```python
from __future__ import annotations

import logging
import cv2
import numpy as np

logger = logging.getLogger(__name__)

FITZPATRICK_THRESHOLDS: dict[int, dict[str, float]] = {
    1: {"dark_min_delta": 7.0, "dark_mad_scale": 1.3, "brown_min_delta": 4.0, "brown_mad_scale": 1.1, "red_min_delta": 4.0, "red_mad_scale": 1.15},
    2: {"dark_min_delta": 9.0, "dark_mad_scale": 1.4, "brown_min_delta": 4.0, "brown_mad_scale": 1.1, "red_min_delta": 5.0, "red_mad_scale": 1.25},
    3: {"dark_min_delta": 11.0, "dark_mad_scale": 1.5, "brown_min_delta": 5.0, "brown_mad_scale": 1.1, "red_min_delta": 6.0, "red_mad_scale": 1.35},
    4: {"dark_min_delta": 14.0, "dark_mad_scale": 1.6, "brown_min_delta": 6.0, "brown_mad_scale": 1.1, "red_min_delta": 7.5, "red_mad_scale": 1.5},
    5: {"dark_min_delta": 17.0, "dark_mad_scale": 1.7, "brown_min_delta": 7.0, "brown_mad_scale": 1.1, "red_min_delta": 9.0, "red_mad_scale": 1.6},
    6: {"dark_min_delta": 20.0, "dark_mad_scale": 1.8, "brown_min_delta": 8.0, "brown_mad_scale": 1.1, "red_min_delta": 11.0, "red_mad_scale": 1.7},
}

_MIN_SKIN_PIXELS = 5_000


def get_color_thresholds(fitzpatrick_type: int | None) -> dict[str, float]:
    if fitzpatrick_type is None or fitzpatrick_type not in FITZPATRICK_THRESHOLDS:
        return FITZPATRICK_THRESHOLDS[2]
    return FITZPATRICK_THRESHOLDS[fitzpatrick_type]


def detect_fitzpatrick(bgr: np.ndarray, skin_mask: np.ndarray) -> int | None:
    pixels = bgr[skin_mask]
    if len(pixels) < _MIN_SKIN_PIXELS:
        logger.warning("Fitzpatrick detection: insufficient skin pixels (%d < %d)", len(pixels), _MIN_SKIN_PIXELS)
        return None

    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB).astype(np.float32)
    l_values = lab[skin_mask, 0]
    # OpenCV LAB L channel is 0-255, scale to 0-100
    median_l = float(np.median(l_values)) * 100.0 / 255.0

    if median_l >= 75:
        ftype = 1
    elif median_l >= 65:
        ftype = 2
    elif median_l >= 55:
        ftype = 3
    elif median_l >= 45:
        ftype = 4
    elif median_l >= 35:
        ftype = 5
    else:
        ftype = 6

    logger.info("Fitzpatrick detection: median_L=%.1f -> type %d (%d skin pixels)", median_l, ftype, len(pixels))
    return ftype


def aggregate_fitzpatrick(types: list[int | None]) -> int | None:
    valid = [t for t in types if t is not None]
    if not valid:
        return None
    import math
    median = float(np.median(valid))
    return int(math.ceil(median))
```

- [ ] **Step 4: SCP implementation to VPS and run tests**

```bash
scp fitzpatrick.py ubuntu@51.83.160.253:/home/ubuntu/cosmo-app/services/skin-analysis/
ssh ubuntu@51.83.160.253 "cd /home/ubuntu/cosmo-app/services/skin-analysis && source venv/bin/activate && python -m pytest tests/test_fitzpatrick.py -v"
```

Expected: all tests PASS

- [ ] **Step 5: Commit (local docs only — Python files are VPS-only)**

No git commit for this task — Python files live on VPS only. Verify tests pass and move on.

---

### Task 2: Python — Integrate Fitzpatrick into `color_indices()` and `analyze()`

**Files:**
- Modify: `services/skin-analysis/analysis.py` (on VPS)
- Modify: `services/skin-analysis/app.py` (on VPS)

This task wires the fitzpatrick module into the analysis pipeline:
1. `color_indices()` gains `fitzpatrick_type` parameter, uses `get_color_thresholds()` for threshold lookup
2. `analyze()` calls `detect_fitzpatrick()` after face parsing, passes result to `color_indices()`, adds `detectedFitzpatrick` to response
3. `app.py` endpoint gains optional `fitzpatrick_type` Form field

**Context:** Current `color_indices()` is at line ~445 of analysis.py. Current `analyze()` is at line ~582. The `_result()` method returns the final dict at line ~942. The `app.py` endpoint is at line ~64.

- [ ] **Step 1: Modify `color_indices()` to accept `fitzpatrick_type`**

In `analysis.py`, add import at the top:

```python
from fitzpatrick import detect_fitzpatrick, get_color_thresholds
```

Change the `color_indices` function signature and body (around line 445):

```python
def color_indices(bgr: np.ndarray, skin_mask: np.ndarray, fitzpatrick_type: int | None = None) -> tuple[dict[str, float | int], np.ndarray, np.ndarray]:
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB).astype(np.float32)
    pixels = lab[skin_mask]
    if len(pixels) < 5_000:
        raise ValueError("Za malo widocznej skory do analizy koloru")

    thresholds = get_color_thresholds(fitzpatrick_type)
    lightness, green_red, blue_yellow = pixels[:, 0], pixels[:, 1], pixels[:, 2]
    dark_threshold = robust_threshold(lightness, "below", minimum_delta=thresholds["dark_min_delta"], mad_scale=thresholds["dark_mad_scale"])
    brown_threshold = robust_threshold(blue_yellow, "above", minimum_delta=thresholds["brown_min_delta"], mad_scale=thresholds["brown_mad_scale"])
    red_threshold = robust_threshold(green_red, "above", minimum_delta=thresholds["red_min_delta"], mad_scale=thresholds["red_mad_scale"])
    pigmentation = (lightness < dark_threshold) & (blue_yellow > brown_threshold)
    redness = green_red > red_threshold
    # ... rest unchanged
```

- [ ] **Step 2: Modify `analyze()` to detect fitzpatrick per angle and aggregate**

In the `analyze()` method of `SkinAnalyzer` class, detect fitzpatrick from every angle that has a skin mask, then aggregate with `aggregate_fitzpatrick()`.

Update import at top of `analysis.py`:

```python
from fitzpatrick import detect_fitzpatrick, get_color_thresholds, aggregate_fitzpatrick
```

After face parsing produces skin masks for all angles, collect per-angle detections:

```python
# Detect fitzpatrick per angle and aggregate
per_angle_fitz: list[int | None] = []
for angle, bgr in decoded.items():
    skin_mask_for_angle = ...  # the skin mask produced by BiSeNet for this angle
    per_angle_fitz.append(detect_fitzpatrick(bgr, skin_mask_for_angle))
detected_fitzpatrick = aggregate_fitzpatrick(per_angle_fitz)
```

Determine which fitzpatrick type to use for `color_indices()` threshold calibration:
- If `fitzpatrick_type` parameter was provided by Node (user has a stored value), use that
- Otherwise, use `detected_fitzpatrick` (auto-detected from this scan)
- If neither is available, `get_color_thresholds(None)` returns type II defaults

```python
effective_fitzpatrick = fitzpatrick_type if fitzpatrick_type is not None else detected_fitzpatrick
```

Pass `fitzpatrick_type=effective_fitzpatrick` to all `color_indices()` calls (around lines 517-526 for zone analysis, and lines 727-731 for overview analysis).

Add `detectedFitzpatrick` to the response dict at the end of `analyze()`, just before returning:

```python
result = self._result(...)
result["detectedFitzpatrick"] = detected_fitzpatrick
return result
```

The `detectedFitzpatrick` field is always the auto-detected value (not the stored one), so Node can update the user record.

- [ ] **Step 3: Modify `app.py` to accept optional `fitzpatrick_type` Form field**

In `app.py`, add `Form` to imports:

```python
from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
```

Add parameter to the `analyze` endpoint:

```python
@app.post("/v1/analyze")
async def analyze(
    front: UploadFile = File(...),
    left: UploadFile = File(None),
    right: UploadFile = File(None),
    forehead: UploadFile = File(None),
    left_cheek: UploadFile = File(None),
    right_cheek: UploadFile = File(None),
    chin: UploadFile = File(None),
    neck: UploadFile = File(None),
    fitzpatrick_type: int | None = Form(None),
    x_api_key: str | None = Header(default=None),
) -> dict[str, object]:
```

Pass `fitzpatrick_type` to `analyzer.analyze()`:

```python
return await run_in_threadpool(analyzer.analyze, images, fitzpatrick_type)
```

Update `SkinAnalyzer.analyze()` signature:

```python
def analyze(self, images: dict[str, bytes], fitzpatrick_type: int | None = None) -> dict[str, object]:
```

The `fitzpatrick_type` parameter is the user's stored type from Node. Inside the method, this is used to compute `effective_fitzpatrick` (see Step 2):
- If `fitzpatrick_type` is provided (user has stored value): use it for `color_indices()` thresholds
- If not provided: use the auto-detected value from this scan
- Auto-detection always runs regardless, and the detected value goes into `detectedFitzpatrick` in the response — Node uses this to potentially update the user record

- [ ] **Step 4: SCP modified files to VPS and run all tests**

```bash
scp analysis.py app.py ubuntu@51.83.160.253:/home/ubuntu/cosmo-app/services/skin-analysis/
ssh ubuntu@51.83.160.253 "cd /home/ubuntu/cosmo-app/services/skin-analysis && source venv/bin/activate && python -m pytest tests/ -v"
```

Expected: all existing tests + fitzpatrick tests PASS

- [ ] **Step 5: Restart the service and verify the endpoint works**

```bash
ssh ubuntu@51.83.160.253 "sudo systemctl restart cosmo-skin-analysis && sleep 2 && sudo systemctl status cosmo-skin-analysis"
```

Expected: service running, no import errors in logs

---

### Task 3: Prisma schema — Add Fitzpatrick fields to User model

**Files:**
- Modify: `apps/server/prisma/schema.prisma:209-248` (User model)

- [ ] **Step 1: Add fitzpatrick fields to User model**

After the `cardStaffNotes` field (line 241), add:

```prisma
  fitzpatrickType    Int?      // Fitzpatrick phototype 1-6, null = not yet detected
  fitzpatrickManual  Boolean   @default(false)
```

- [ ] **Step 2: Run migration**

```bash
cd apps/server && npx prisma migrate dev --name add-fitzpatrick-to-user
```

Expected: migration created successfully

- [ ] **Step 3: Generate Prisma client**

```bash
cd apps/server && npx prisma generate
```

- [ ] **Step 4: Commit**

```bash
git add apps/server/prisma/schema.prisma apps/server/prisma/migrations/
git commit -m "feat(db): add fitzpatrickType and fitzpatrickManual to User model"
```

---

### Task 4: Node backend — Pass fitzpatrickType to Python and handle detectedFitzpatrick

**Depends on:** Task 3 (Prisma migration must be complete and client generated before this task can build)

**Files:**
- Modify: `apps/server/src/modules/skin-scans/skin-scans.types.ts:50-67`
- Modify: `apps/server/src/modules/skin-scans/skin-scans.provider.ts:8-11,124-146`
- Modify: `apps/server/src/modules/skin-scans/skin-scans.service.ts:146-212`

- [ ] **Step 1: Add `detectedFitzpatrick` to `SkinScanAnalysis` type**

In `skin-scans.types.ts`, add to the `SkinScanAnalysis` type (after `skinScoreBreakdown`):

```typescript
  detectedFitzpatrick?: number | null;
```

- [ ] **Step 2: Add `fitzpatrickType` to `SkinScanProviderInput`**

In `skin-scans.provider.ts`, modify the type (line 8-11):

```typescript
export type SkinScanProviderInput = {
  sessionId: string;
  images: Array<{ angle: string; imagePath: string }>;
  fitzpatrickType?: number | null;
};
```

- [ ] **Step 3: Modify `mlServiceProvider.analyze()` to send and receive fitzpatrick data**

In `skin-scans.provider.ts`, inside `mlServiceProvider.analyze()`:

After the FormData loop (after line 131), add:

```typescript
    if (input.fitzpatrickType != null) {
      formData.append('fitzpatrick_type', String(input.fitzpatrickType));
    }
```

After `const raw = await response.json();` (line 144), extract `detectedFitzpatrick` BEFORE Zod parsing:

```typescript
    const raw = await response.json();
    const detectedFitzpatrick: number | null =
      typeof raw.detectedFitzpatrick === 'number' ? raw.detectedFitzpatrick : null;
    const rawOverlays: RawOverlays | undefined = raw.overlays;
    const analysis = analysisSchema.parse(raw) as SkinScanAnalysis;
    analysis.detectedFitzpatrick = detectedFitzpatrick;
```

This must happen before Zod parsing because `analysisSchema` strips unknown keys.

- [ ] **Step 4: Modify `completeSession()` to pass fitzpatrickType and auto-update user**

In `skin-scans.service.ts`, modify `completeSession()`:

Add Prisma import for user lookup (already have `prisma` imported).

Before the `provider.analyze()` call (around line 188-191), fetch user's fitzpatrick type:

```typescript
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fitzpatrickType: true, fitzpatrickManual: true },
    });

    const provider = getConfiguredSkinScanProvider();
    const analysis = await provider.analyze({
      sessionId,
      images: session.images.map(({ angle, imagePath }) => ({ angle, imagePath })),
      fitzpatrickType: user?.fitzpatrickType,
    });

    // Auto-update fitzpatrick type if not manually set
    if (analysis.detectedFitzpatrick != null && user && !user.fitzpatrickManual) {
      prisma.user.update({
        where: { id: userId },
        data: { fitzpatrickType: analysis.detectedFitzpatrick },
      }).catch(() => { /* non-blocking */ });
    }
```

- [ ] **Step 5: Verify build**

```bash
cd apps/server && pnpm build
```

Expected: no TypeScript errors

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/modules/skin-scans/
git commit -m "feat(skin-scans): pass fitzpatrick type to Python service and auto-update user"
```

---

### Task 5: Node backend — Profile endpoint for manual fitzpatrick override

**Depends on:** Task 3 (Prisma migration must be complete and client generated)

**Files:**
- Modify: `apps/server/src/modules/users/users.controller.ts:17-29`
- Modify: `apps/server/src/modules/users/users.service.ts:433-447,449-471`

- [ ] **Step 1: Add fitzpatrick fields to `UpdateUserData` type**

In `users.service.ts`, add to the `UpdateUserData` type (line 433-447):

```typescript
type UpdateUserData = Partial<{
  name: string;
  phone: string | null;
  avatarPath: string | null;
  onboardingCompleted: boolean;
  marketingConsent: boolean;
  photoConsent: boolean;
  cardAllergies: string | null;
  cardConditions: string | null;
  cardPreferences: string | null;
  cardStaffNotes: string | null;
  passwordHash: string;
  mustChangePassword: boolean;
  passwordChangedAt: Date;
  fitzpatrickType: number | null;
  fitzpatrickManual: boolean;
}>;
```

- [ ] **Step 2: Add fitzpatrick fields to `updateUser` select and `getUserById` select**

In `users.service.ts`, add `fitzpatrickType: true` and `fitzpatrickManual: true` to the `select` objects in both `getUserById()` (line 84-112) and `updateUser()` (line 449-471).

In `getUserById()` select (after `mustChangePassword`):

```typescript
      fitzpatrickType: true,
      fitzpatrickManual: true,
```

In `updateUser()` select (after `onboardingCompleted`):

```typescript
      fitzpatrickType: true,
      fitzpatrickManual: true,
```

- [ ] **Step 3: Handle fitzpatrick fields in `updateMe` controller**

In `users.controller.ts`, modify the `updateMe` handler (line 17-29) to accept fitzpatrick fields:

```typescript
export const updateMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, phone, onboardingCompleted, fitzpatrickType, fitzpatrickManual } = req.body;
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (phone !== undefined) data.phone = phone;
    if (typeof onboardingCompleted === 'boolean') data.onboardingCompleted = onboardingCompleted;
    if (fitzpatrickType !== undefined) {
      if (fitzpatrickType !== null && (typeof fitzpatrickType !== 'number' || fitzpatrickType < 1 || fitzpatrickType > 6)) {
        return res.status(400).json({ status: 'error', message: 'fitzpatrickType must be 1-6 or null' });
      }
      data.fitzpatrickType = fitzpatrickType;
    }
    if (typeof fitzpatrickManual === 'boolean') {
      if (fitzpatrickManual && !fitzpatrickType) {
        return res.status(400).json({ status: 'error', message: 'fitzpatrickType is required when setting fitzpatrickManual to true' });
      }
      data.fitzpatrickManual = fitzpatrickManual;
    }
    const user = await usersService.updateUser(req.user!.id, data);
    res.status(200).json({ status: 'success', data: { user } });
  } catch (error) {
    next(error);
  }
};
```

- [ ] **Step 4: Verify build**

```bash
cd apps/server && pnpm build
```

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/modules/users/
git commit -m "feat(users): add fitzpatrick type to profile endpoint"
```

---

### Task 6: Frontend — Fitzpatrick section in user profile

**Files:**
- Modify: `apps/web/src/api/users.api.ts`
- Modify: `apps/web/src/pages/user/Profile.tsx`

- [ ] **Step 1: Add fitzpatrick API methods to `users.api.ts`**

Add `updateFitzpatrick` method to the `usersApi` object:

```typescript
  updateFitzpatrick: async (data: { fitzpatrickType: number | null; fitzpatrickManual: boolean }): Promise<User> => {
    const res = await api.patch('/users/me', data);
    return res.data.data.user;
  },
```

- [ ] **Step 2: Add Fitzpatrick section to Profile.tsx**

In `Profile.tsx`, add the Fitzpatrick UI section in the appropriate tab (likely `'account'` or `'preferences'` tab). The section shows:

- Current detected/manual type with Polish description
- Dropdown to select type 1-6
- "Przywroc automatyczna detekcje" button when manually set

Fitzpatrick type labels (Polish):

```typescript
const FITZPATRICK_LABELS: Record<number, string> = {
  1: 'Typ I — Bardzo jasna skora, zawsze sie parzy',
  2: 'Typ II — Jasna skora, latwo sie parzy',
  3: 'Typ III — Sredniojasna skora, czasem sie parzy',
  4: 'Typ IV — Oliwkowa skora, rzadko sie parzy',
  5: 'Typ V — Ciemna skora, bardzo rzadko sie parzy',
  6: 'Typ VI — Bardzo ciemna skora, nigdy sie nie parzy',
};
```

Add a section within the profile page (after existing profile info, inside the `'preferences'` or `'account'` tab area):

```tsx
{/* Fitzpatrick phototype section */}
<div className="rounded-xl border border-gray-100 bg-white p-4 space-y-3">
  <h3 className="text-sm font-semibold text-gray-900">Fototyp skory (Fitzpatrick)</h3>
  {profile?.fitzpatrickType ? (
    <p className="text-sm text-gray-600">
      {FITZPATRICK_LABELS[profile.fitzpatrickType]}
      <span className="ml-2 text-xs text-gray-400">
        {profile.fitzpatrickManual ? '(ustawiony recznie)' : '(wykryty automatycznie)'}
      </span>
    </p>
  ) : (
    <p className="text-sm text-gray-400">Nie wykryto jeszcze — wykonaj skan skory</p>
  )}
  <select
    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
    value={profile?.fitzpatrickType ?? ''}
    onChange={(e) => {
      const val = e.target.value ? Number(e.target.value) : null;
      fitzpatrickMutation.mutate({ fitzpatrickType: val, fitzpatrickManual: val !== null });
    }}
  >
    <option value="">Automatyczna detekcja</option>
    {[1, 2, 3, 4, 5, 6].map((t) => (
      <option key={t} value={t}>{FITZPATRICK_LABELS[t]}</option>
    ))}
  </select>
  {profile?.fitzpatrickManual && (
    <button
      className="text-xs text-blue-600 hover:underline"
      onClick={() => fitzpatrickMutation.mutate({ fitzpatrickType: profile.fitzpatrickType, fitzpatrickManual: false })}
    >
      Przywroc automatyczna detekcje
    </button>
  )}
</div>
```

Add the mutation:

```typescript
const fitzpatrickMutation = useMutation({
  mutationFn: usersApi.updateFitzpatrick,
  onSuccess: (user) => {
    setUser(user);
    queryClient.invalidateQueries({ queryKey: ['profile-consents'] });
    toast.success('Fototyp zaktualizowany');
  },
  onError: () => toast.error('Nie udalo sie zaktualizowac fototypu'),
});
```

- [ ] **Step 3: Verify build**

```bash
cd apps/web && pnpm build
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/api/users.api.ts apps/web/src/pages/user/Profile.tsx
git commit -m "feat(frontend): add Fitzpatrick phototype section to user profile"
```

---

### Task 7: End-to-end verification and deploy

**Files:** No new files — verification only.

- [ ] **Step 1: Verify Python service is running with fitzpatrick support**

```bash
ssh ubuntu@51.83.160.253 "sudo systemctl restart cosmo-skin-analysis && sleep 2 && curl -s http://localhost:8000/health | python3 -m json.tool"
```

- [ ] **Step 2: Deploy backend to VPS**

```bash
./deploy.sh backend
```

- [ ] **Step 3: Run Prisma migration on VPS**

```bash
ssh ubuntu@51.83.160.253 "cd /home/ubuntu/cosmo-app/apps/server && npx prisma migrate deploy"
```

- [ ] **Step 4: Deploy frontend to VPS**

```bash
./deploy.sh frontend
```

- [ ] **Step 5: Verify end-to-end**

Test the full flow:
1. Open the app, go to profile — should show "Nie wykryto jeszcze"
2. Run a skin scan — after completion, check profile again, should show detected type
3. Change type manually via dropdown — should show "(ustawiony recznie)"
4. Click "Przywroc automatyczna detekcje" — should flip back to auto mode
5. Run another scan — detected type should update (since manual flag is false)

- [ ] **Step 6: Commit any fixes**

```bash
git add -A && git commit -m "fix: fitzpatrick end-to-end fixes"
```
