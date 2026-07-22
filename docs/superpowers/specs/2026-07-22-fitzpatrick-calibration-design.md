# Fitzpatrick Calibration — Design Spec

## Goal

Add Fitzpatrick skin phototype detection and calibration to the skin analysis pipeline so that pigmentation and redness metrics produce consistent, comparable results across all skin tones.

## Context

Current `color_indices()` in the Python skin-analysis service uses `robust_threshold()` with fixed `minimum_delta` and `mad_scale` parameters. These thresholds are relative to each image's median, but the fixed scaling causes:
- Darker skin (types IV-VI) to register disproportionately high pigmentation coverage (natural melanin variation flagged as anomaly)
- Redness detection on darker skin to be less sensitive (higher baseline a* values absorb the fixed delta)
- Severity labels on the frontend (OK/Lekkie/Srednie/Widoczne/Nasilone) to be misleading across skin tones

The system already has a cosmetic `SkinType` enum (SUCHA/TLUSTA/MIESZANA/NORMALNA/WRAZLIWA) in `SkinWeatherProfile`, but this describes skin behavior, not phototype.

## Architecture

Fitzpatrick phototype (I-VI) is stored on the `User` model as a persistent trait. Auto-detection runs during each skin scan in the Python service. Manual override in the user profile takes priority over auto-detection. The phototype is passed to `color_indices()` to adjust threshold parameters.

```
Python service (analysis.py):
  1. Preprocess (existing)
  2. BiSeNet face parsing (existing) -> skin_mask
  3. NEW: detect_fitzpatrick(bgr, skin_mask) -> int 1-6
  4. MODIFIED: color_indices(bgr, skin_mask, fitzpatrick_type) -> calibrated thresholds
  5. Return JSON + detectedFitzpatrick field

Node backend:
  1. Parse detectedFitzpatrick from Python response
  2. If user.fitzpatrickManual == false -> update user.fitzpatrickType
  3. Pass fitzpatrickType to Python service (future scans)

Frontend:
  1. Display current phototype in user profile
  2. Allow manual override via dropdown
```

No changes to the scan capture flow, preprocessing pipeline, or overlay generation.

## Auto-Detection

After BiSeNet produces a skin mask, compute the median L* (lightness) value from CIE Lab color space across all skin pixels. Map to Fitzpatrick type:

| Median L* | Fitzpatrick Type |
|-----------|-----------------|
| >= 75     | I               |
| 65-74     | II              |
| 55-64     | III             |
| 45-54     | IV              |
| 35-44     | V               |
| < 35      | VI              |

These thresholds apply to preprocessed images (after CLAHE and white balance normalization), so lighting variation is already reduced.

Implementation: new function `detect_fitzpatrick(bgr, skin_mask) -> int | None` in a new file `fitzpatrick.py`. Returns `None` if fewer than 5000 skin pixels available.

When multiple angles are analyzed in a single scan, compute fitzpatrick per angle and take the median across all angles as the session-level detection. If the median is non-integer (e.g. 2.5), round up with `math.ceil()` (conservative — assumes slightly darker phototype rather than lighter).

## Threshold Calibration

`color_indices()` currently uses fixed parameters:

```python
dark_threshold = robust_threshold(lightness, "below", minimum_delta=9.0, mad_scale=1.4)
brown_threshold = robust_threshold(blue_yellow, "above", minimum_delta=4.0, mad_scale=1.1)
red_threshold = robust_threshold(green_red, "above", minimum_delta=5.0, mad_scale=1.25)
```

With calibration, these become lookup-table driven by Fitzpatrick type:

| Fitzpatrick | dark min_delta | dark mad_scale | brown min_delta | brown mad_scale | red min_delta | red mad_scale |
|------------|----------------|----------------|-----------------|-----------------|---------------|---------------|
| I          | 7.0            | 1.3            | 4.0             | 1.1             | 4.0           | 1.15          |
| II         | 9.0            | 1.4            | 4.0             | 1.1             | 5.0           | 1.25          |
| III        | 11.0           | 1.5            | 5.0             | 1.1             | 6.0           | 1.35          |
| IV         | 14.0           | 1.6            | 6.0             | 1.1             | 7.5           | 1.5           |
| V          | 17.0           | 1.7            | 7.0             | 1.1             | 9.0           | 1.6           |
| VI         | 20.0           | 1.8            | 8.0             | 1.1             | 11.0          | 1.7           |

Design rationale:
- **Type II = current baseline** (existing values preserved for backward compatibility)
- **Darker skin -> higher minimum_delta**: natural melanin variation is larger, so the threshold for "anomalous darkness" must be wider to avoid false positives
- **Darker skin -> higher mad_scale**: statistical spread of skin values is greater in darker phototypes
- **brown_threshold mad_scale stays 1.1**: the b* (blue-yellow) axis is less affected by overall skin darkness
- **Lighter skin (I) -> lower red min_delta**: fair skin shows redness more readily, lower threshold captures subtle erythema

When `fitzpatrick_type` is `None` (unknown), use type II defaults (identical to current behavior).

## Function Signature Change

```python
# Before
def color_indices(bgr, skin_mask) -> tuple[dict, ndarray, ndarray]

# After
def color_indices(bgr, skin_mask, fitzpatrick_type=None) -> tuple[dict, ndarray, ndarray]
```

The `fitzpatrick_type` parameter is optional with `None` default, preserving backward compatibility.

## Database Changes

### Prisma Schema

```prisma
model User {
  // ... existing fields
  fitzpatrickType    Int?      // 1-6, null = not yet detected
  fitzpatrickManual  Boolean   @default(false)  // true = user set manually, skip auto-update
}
```

### Migration

Standard `prisma migrate dev` — adds two nullable/defaulted columns, no data migration needed.

## API Changes

### Python Service Response

Add to top-level response JSON from `POST /v1/analyze`:

```json
{
  "detectedFitzpatrick": 3,
  // ... existing fields unchanged
}
```

`detectedFitzpatrick` is `null` if detection failed (insufficient skin pixels).

### Node Backend

**Provider interface change** (`skin-scans.provider.ts`):

The `SkinScanProviderInput` type gains a new optional field:

```typescript
export type SkinScanProviderInput = {
  sessionId: string;
  images: Array<{ angle: string; imagePath: string }>;
  fitzpatrickType?: number | null;  // NEW: 1-6 from user record
};
```

The `mlServiceProvider.analyze()` return type changes to include `detectedFitzpatrick`:

```typescript
// analyze() extracts detectedFitzpatrick from raw JSON BEFORE Zod parsing
// (Zod's analysisSchema strips unknown keys, so detectedFitzpatrick would be lost)
const raw = await response.json();
const detectedFitzpatrick: number | null =
  typeof raw.detectedFitzpatrick === 'number' ? raw.detectedFitzpatrick : null;
const analysis = analysisSchema.parse(raw) as SkinScanAnalysis;
// ... existing overlay/score logic ...
analysis.detectedFitzpatrick = detectedFitzpatrick;  // attach to returned object
return analysis;
```

The `SkinScanAnalysis` type in `skin-scans.types.ts` gains `detectedFitzpatrick?: number | null`.

**Passing phototype to Python**: In `mlServiceProvider.analyze()`, if `input.fitzpatrickType` is set, append it to FormData as a text field:

```typescript
if (input.fitzpatrickType != null) {
  formData.append('fitzpatrick_type', String(input.fitzpatrickType));
}
```

The Python service reads this from the form data and passes to `color_indices()`. If not provided, defaults to `None` (type II behavior).

**Service layer changes** (`skin-scans.service.ts`):

In `completeSession()` (or equivalent function that calls `provider.analyze()`):
1. Before calling `provider.analyze()`: fetch `user.fitzpatrickType` from the database and include it in the input
2. After `provider.analyze()` returns: extract `analysis.detectedFitzpatrick` and auto-update user

```
// Auto-update logic (non-blocking, no throw on failure):
if analysis.detectedFitzpatrick != null AND user.fitzpatrickManual == false:
    prisma.user.update({ where: { id: userId }, data: { fitzpatrickType: detectedFitzpatrick } })
```

This update is fire-and-forget — if it fails, the scan result is still returned normally.

**Existing endpoint** `PATCH /api/users/profile`:
- Accept `fitzpatrickType` (integer 1-6) and `fitzpatrickManual` (boolean) in request body
- Validation: `fitzpatrickType` must be integer 1-6 if provided
- When `fitzpatrickManual` is set to `true`, `fitzpatrickType` must also be provided

### Frontend Profile

In the user profile page, add a section:
- Label: "Fototyp skory (Fitzpatrick)"
- Display current value with description (e.g., "Typ III — skora sredniojasna")
- Dropdown for manual selection (types I-VI with Polish descriptions)
- If manually set: show "(ustawiony recznie)" badge + "Przywroc automatyczna detekcje" button (sets `fitzpatrickManual=false` but keeps current `fitzpatrickType` value — next scan will overwrite it with auto-detected value; between reset and next scan, the existing value is used for calibration rather than falling back to type II defaults)
- If auto-detected: show "(wykryty automatycznie)" badge

Fitzpatrick type descriptions (Polish):
| Type | Description |
|------|-------------|
| I    | Bardzo jasna skora, zawsze sie parzy, nigdy sie nie opala |
| II   | Jasna skora, latwo sie parzy, opala sie minimalnie |
| III  | Sredniojasna skora, czasem sie parzy, stopniowo sie opala |
| IV   | Oliwkowa skora, rzadko sie parzy, latwo sie opala |
| V    | Ciemna skora, bardzo rzadko sie parzy, opala sie intensywnie |
| VI   | Bardzo ciemna skora, nigdy sie nie parzy |

## Files to Create/Modify

### Python service (VPS: `/home/ubuntu/cosmo-app/services/skin-analysis/`)

| File | Action | Purpose |
|------|--------|---------|
| `fitzpatrick.py` | Create | `detect_fitzpatrick(bgr, skin_mask)` + `FITZPATRICK_THRESHOLDS` lookup table + `get_color_thresholds(fitzpatrick_type)` |
| `analysis.py` | Modify | Import fitzpatrick module, call `detect_fitzpatrick()` after face parsing, pass type to `color_indices()`, add `detectedFitzpatrick` to response |
| `tests/test_fitzpatrick.py` | Create | Unit tests for detection and threshold lookup |

### Node backend (`apps/server/`)

| File | Action | Purpose |
|------|--------|---------|
| `prisma/schema.prisma` | Modify | Add `fitzpatrickType` and `fitzpatrickManual` to User |
| `src/modules/users/users.service.ts` | Modify | Accept fitzpatrick fields in profile update |
| `src/modules/skin-scans/skin-scans.provider.ts` | Modify | Add `fitzpatrickType` to `SkinScanProviderInput`, extract `detectedFitzpatrick` from raw JSON before Zod parse, append `fitzpatrick_type` to FormData |
| `src/modules/skin-scans/skin-scans.types.ts` | Modify | Add `detectedFitzpatrick?: number \| null` to `SkinScanAnalysis` |
| `src/modules/skin-scans/skin-scans.service.ts` | Modify | Fetch user `fitzpatrickType` before calling provider, auto-update user after analysis |

### Frontend (`apps/web/`)

| File | Action | Purpose |
|------|--------|---------|
| `src/pages/user/Profile.tsx` | Modify | Add Fitzpatrick section with dropdown |

## Error Handling

- If `detect_fitzpatrick()` fails (insufficient pixels, OpenCV error): return `None`, log warning, use type II defaults
- If `fitzpatrickType` is `None` when calling `color_indices()`: use type II defaults (backward compatible)
- If Node can't parse `detectedFitzpatrick` from response: skip auto-update, no error
- Pipeline must never fail due to Fitzpatrick-related code

## What Does NOT Change

- **Preprocessing pipeline**: CLAHE, white balance, alignment, resize unchanged
- **BiSeNet face parsing**: same model, same masks
- **Acne and wrinkle models**: not affected by Fitzpatrick calibration
- **Overlay generation**: overlays still generated from calibrated masks
- **Frontend severity labels**: same thresholds (1.5%, 4%, 8%, 15%) — the calibration happens in the Python service, so values arriving at the frontend are already adjusted
- **Scan capture flow**: no UI changes during photo capture
- **API response schema**: only additive change (new `detectedFitzpatrick` field)

## Success Criteria

- Type II skin produces identical results to current system (regression-safe)
- Type V skin pigmentation coverage drops by 30-60% compared to uncalibrated (fewer false positives)
- Type I skin redness detection improves (catches subtle erythema that was below old threshold)
- Auto-detection is consistent across multiple scans of the same person (within +/- 1 type)
- Manual override persists and is respected by subsequent scans
- No performance regression (detection adds <50ms per image)

## Tuning Notes

- L* thresholds for auto-detection (75/65/55/45/35) are starting values. May need adjustment after testing on real user photos across skin tones.
- Threshold calibration table values are theoretical starting points based on CIE Lab color space properties. Real-world tuning will likely be needed, especially for types IV-VI where we have fewer test subjects.
- If CLAHE `clipLimit` changes in the future, L* detection thresholds may need recalibration.
