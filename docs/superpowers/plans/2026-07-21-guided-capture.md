# Guided Capture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real-time face detection (MediaPipe Face Mesh) to SkinScanCamera with validation-gated capture button and contextual hints.

**Architecture:** Camera stays a controlled component. New `useFaceMesh` hook provides landmarks. Pure-function `faceValidation.ts` computes head pose, face size, stability, lighting. `captureGuides.ts` defines per-angle targets. Two validation modes: 'full' (face-mesh + lighting for FRONT/LEFT/RIGHT) and 'closeup' (lighting + frame-diff for close-up angles).

**Tech Stack:** React 19, TypeScript, `@mediapipe/tasks-vision` (CDN-loaded WASM), Vitest

**Spec:** `docs/superpowers/specs/2026-07-21-guided-capture-design.md`

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `apps/web/src/components/skin-scan/captureGuides.ts` | Per-angle target config (types + data) |
| Create | `apps/web/src/components/skin-scan/faceValidation.ts` | Pure validation functions |
| Create | `apps/web/src/components/skin-scan/useFaceMesh.ts` | Hook: load MediaPipe, run detection loop |
| Create | `apps/web/src/components/skin-scan/__tests__/captureGuides.test.ts` | Config validation tests |
| Create | `apps/web/src/components/skin-scan/__tests__/faceValidation.test.ts` | Pure function unit tests |
| Modify | `apps/web/src/components/skin-scan/SkinScanCamera.tsx` | Integrate validation into camera UI |
| Modify | `apps/web/package.json` | Add `@mediapipe/tasks-vision`, `vitest` |

---

### Task 1: Add vitest to web app + install mediapipe dependency

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/vitest.config.ts`

- [ ] **Step 1: Install dependencies**

```bash
cd C:/Users/Adam/Desktop/strona1/cosmo-app && pnpm add -D vitest @mediapipe/tasks-vision --filter web
```

- [ ] **Step 2: Create vitest config**

Create `apps/web/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
```

- [ ] **Step 3: Add test script to package.json**

In `apps/web/package.json`, add to `"scripts"`:
```json
"test": "vitest run"
```

- [ ] **Step 4: Commit**

```bash
cd C:/Users/Adam/Desktop/strona1/cosmo-app && git add apps/web/package.json apps/web/vitest.config.ts pnpm-lock.yaml && git commit -m "chore(web): add vitest and @mediapipe/tasks-vision dependencies"
```

---

### Task 2: Create `captureGuides.ts` with types and angle config

**Files:**
- Create: `apps/web/src/components/skin-scan/captureGuides.ts`
- Create: `apps/web/src/components/skin-scan/__tests__/captureGuides.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/components/skin-scan/__tests__/captureGuides.test.ts`:

Note: We define `SkinScanAngle` inline to avoid importing from `@/api/skin-scans.api` which pulls in axios (incompatible with node test environment).

```typescript
import { describe, it, expect } from 'vitest';
import { ANGLE_TARGETS, type AngleTarget } from '../captureGuides';

// Inline type to avoid importing from skin-scans.api (which imports axios)
type SkinScanAngle = 'FRONT' | 'LEFT' | 'RIGHT' | 'FOREHEAD' | 'LEFT_CHEEK' | 'RIGHT_CHEEK' | 'CHIN' | 'NECK';

const ALL_ANGLES: SkinScanAngle[] = [
  'FRONT', 'LEFT', 'RIGHT', 'FOREHEAD', 'LEFT_CHEEK', 'RIGHT_CHEEK', 'CHIN', 'NECK',
];

describe('captureGuides', () => {
  it('has a target for every SkinScanAngle', () => {
    for (const angle of ALL_ANGLES) {
      expect(ANGLE_TARGETS[angle]).toBeDefined();
      expect(ANGLE_TARGETS[angle].angle).toBe(angle);
    }
  });

  it('full-mode targets have positive tolerances and non-empty hints', () => {
    for (const target of Object.values(ANGLE_TARGETS)) {
      if (target.mode !== 'full') continue;
      expect(target.yawTolerance).toBeGreaterThan(0);
      expect(target.pitchTolerance).toBeGreaterThan(0);
      expect(target.hintTooLeft.length).toBeGreaterThan(0);
      expect(target.hintTooRight.length).toBeGreaterThan(0);
      expect(target.hintTooUp.length).toBeGreaterThan(0);
      expect(target.hintTooDown.length).toBeGreaterThan(0);
    }
  });

  it('every target has mode full or closeup', () => {
    for (const target of Object.values(ANGLE_TARGETS)) {
      expect(['full', 'closeup']).toContain(target.mode);
    }
  });

  it('FRONT is full mode', () => {
    expect(ANGLE_TARGETS.FRONT.mode).toBe('full');
  });

  it('closeup angles have no yaw/pitch fields', () => {
    const closeups = Object.values(ANGLE_TARGETS).filter((t): t is AngleTarget & { mode: 'closeup' } => t.mode === 'closeup');
    expect(closeups.length).toBeGreaterThan(0);
    for (const t of closeups) {
      expect('targetYaw' in t).toBe(false);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd C:/Users/Adam/Desktop/strona1/cosmo-app/apps/web && pnpm vitest run src/components/skin-scan/__tests__/captureGuides.test.ts
```

Expected: FAIL — cannot find module `../captureGuides`

- [ ] **Step 3: Write implementation**

Create `apps/web/src/components/skin-scan/captureGuides.ts`:

```typescript
import type { SkinScanAngle } from '@/api/skin-scans.api';

export type FullAngleTarget = {
  angle: SkinScanAngle;
  mode: 'full';
  targetYaw: number;
  targetPitch: number;
  yawTolerance: number;
  pitchTolerance: number;
  hintTooLeft: string;
  hintTooRight: string;
  hintTooUp: string;
  hintTooDown: string;
};

export type CloseupAngleTarget = {
  angle: SkinScanAngle;
  mode: 'closeup';
};

export type AngleTarget = FullAngleTarget | CloseupAngleTarget;

export const ANGLE_TARGETS: Record<SkinScanAngle, AngleTarget> = {
  FRONT: {
    angle: 'FRONT',
    mode: 'full',
    targetYaw: 0,
    targetPitch: 0,
    yawTolerance: 10,
    pitchTolerance: 10,
    hintTooLeft: 'Obróć głowę w prawo',
    hintTooRight: 'Obróć głowę w lewo',
    hintTooUp: 'Opuść brodę',
    hintTooDown: 'Podnieś brodę',
  },
  LEFT: {
    angle: 'LEFT',
    mode: 'full',
    targetYaw: -30,
    targetPitch: 0,
    yawTolerance: 12,
    pitchTolerance: 10,
    hintTooLeft: 'Jeszcze trochę w prawo',
    hintTooRight: 'Obróć głowę bardziej w lewo',
    hintTooUp: 'Opuść brodę',
    hintTooDown: 'Podnieś brodę',
  },
  RIGHT: {
    angle: 'RIGHT',
    mode: 'full',
    targetYaw: 30,
    targetPitch: 0,
    yawTolerance: 12,
    pitchTolerance: 10,
    hintTooLeft: 'Obróć głowę bardziej w prawo',
    hintTooRight: 'Jeszcze trochę w lewo',
    hintTooUp: 'Opuść brodę',
    hintTooDown: 'Podnieś brodę',
  },
  FOREHEAD: { angle: 'FOREHEAD', mode: 'closeup' },
  LEFT_CHEEK: { angle: 'LEFT_CHEEK', mode: 'closeup' },
  RIGHT_CHEEK: { angle: 'RIGHT_CHEEK', mode: 'closeup' },
  CHIN: { angle: 'CHIN', mode: 'closeup' },
  NECK: { angle: 'NECK', mode: 'closeup' },
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd C:/Users/Adam/Desktop/strona1/cosmo-app/apps/web && pnpm vitest run src/components/skin-scan/__tests__/captureGuides.test.ts
```

Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd C:/Users/Adam/Desktop/strona1/cosmo-app && git add apps/web/src/components/skin-scan/captureGuides.ts apps/web/src/components/skin-scan/__tests__/captureGuides.test.ts && git commit -m "feat(skin-scan): add capture guides config with per-angle targets"
```

---

### Task 3: Create `faceValidation.ts` — all pure functions

**Files:**
- Create: `apps/web/src/components/skin-scan/faceValidation.ts`
- Create: `apps/web/src/components/skin-scan/__tests__/faceValidation.test.ts`

This task implements ALL validation functions in one go: `checkLighting`, `checkFrameStability`, `checkStability`, `validateCloseupMode`, `computeHeadPose`, `checkFaceSize`, `validateFullMode`.

- [ ] **Step 1: Write the complete test file**

Create `apps/web/src/components/skin-scan/__tests__/faceValidation.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  checkLighting,
  checkFrameStability,
  checkStability,
  validateCloseupMode,
  computeHeadPose,
  checkFaceSize,
  validateFullMode,
  type HeadPose,
} from '../faceValidation';
import type { FullAngleTarget } from '../captureGuides';

// ── checkLighting ──

describe('checkLighting', () => {
  it('returns ok for good lighting', () => {
    expect(checkLighting(120, 30).ok).toBe(true);
  });

  it('rejects too dark', () => {
    const result = checkLighting(40, 30);
    expect(result.ok).toBe(false);
    expect(result.hint).toContain('światła');
  });

  it('rejects too bright', () => {
    const result = checkLighting(220, 30);
    expect(result.ok).toBe(false);
    expect(result.hint).toContain('jasno');
  });

  it('rejects low contrast', () => {
    const result = checkLighting(120, 10);
    expect(result.ok).toBe(false);
    expect(result.hint).toContain('obiektyw');
  });

  it('returns null hint when ok', () => {
    expect(checkLighting(120, 30).hint).toBeNull();
  });
});

// ── checkFrameStability ──

describe('checkFrameStability', () => {
  it('returns true for identical frames', () => {
    const frame = new Uint8ClampedArray(96 * 72 * 4).fill(128);
    expect(checkFrameStability(frame, frame)).toBe(true);
  });

  it('returns false for very different frames', () => {
    const a = new Uint8ClampedArray(96 * 72 * 4).fill(50);
    const b = new Uint8ClampedArray(96 * 72 * 4).fill(200);
    expect(checkFrameStability(a, b)).toBe(false);
  });

  it('returns true for small differences (MAD < 8)', () => {
    const a = new Uint8ClampedArray(96 * 72 * 4);
    const b = new Uint8ClampedArray(96 * 72 * 4);
    for (let i = 0; i < a.length; i += 4) {
      a[i] = 100; a[i + 1] = 100; a[i + 2] = 100; a[i + 3] = 255;
      b[i] = 105; b[i + 1] = 105; b[i + 2] = 105; b[i + 3] = 255;
    }
    expect(checkFrameStability(a, b)).toBe(true);
  });
});

// ── checkStability (pose-based) ──

describe('checkStability', () => {
  const pose = (yaw: number, pitch: number): HeadPose => ({ yaw, pitch, roll: 0 });

  it('returns true for fewer than 2 entries', () => {
    expect(checkStability([pose(0, 0)])).toBe(true);
    expect(checkStability([])).toBe(true);
  });

  it('returns true for stable poses (delta < 3°)', () => {
    expect(checkStability([
      pose(10, 5), pose(10.5, 5.2), pose(11, 5.5), pose(11.2, 5.8), pose(11.5, 6),
    ])).toBe(true);
  });

  it('returns false for unstable poses (delta > 3°)', () => {
    expect(checkStability([
      pose(0, 0), pose(5, 0), pose(10, 0), pose(15, 0), pose(20, 0),
    ])).toBe(false);
  });
});

// ── validateCloseupMode ──

describe('validateCloseupMode', () => {
  it('returns ready when lighting ok and stable', () => {
    const result = validateCloseupMode(120, 30, true);
    expect(result.ready).toBe(true);
    expect(result.hint).toBeNull();
    expect(result.hintType).toBe('success');
  });

  it('returns not ready when dark', () => {
    const result = validateCloseupMode(30, 30, true);
    expect(result.ready).toBe(false);
    expect(result.hintType).toBe('error');
  });

  it('prioritizes lighting over stability', () => {
    const result = validateCloseupMode(30, 30, false);
    expect(result.hint).toContain('światła');
  });

  it('shows stability hint when lighting ok but unstable', () => {
    const result = validateCloseupMode(120, 30, false);
    expect(result.ready).toBe(false);
    expect(result.hint).toContain('ruszaj');
  });
});

// ── computeHeadPose ──

// Helper: create 468-landmark array with overrides at specific indices
const makeLandmarks = (overrides: Record<number, { x: number; y: number; z: number }> = {}) => {
  const lm = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  for (const [idx, val] of Object.entries(overrides)) {
    lm[Number(idx)] = val;
  }
  return lm;
};

describe('computeHeadPose', () => {
  it('returns ~0 yaw/pitch for centered symmetric face', () => {
    const lm = makeLandmarks({
      1: { x: 0.5, y: 0.55, z: -0.05 },   // nose tip
      33: { x: 0.4, y: 0.45, z: 0 },       // left eye
      263: { x: 0.6, y: 0.45, z: 0 },       // right eye
      234: { x: 0.3, y: 0.5, z: 0.02 },     // left contour
      454: { x: 0.7, y: 0.5, z: 0.02 },     // right contour
    });
    const pose = computeHeadPose(lm);
    expect(Math.abs(pose.yaw)).toBeLessThan(5);
    expect(Math.abs(pose.pitch)).toBeLessThan(5);
  });

  it('returns negative yaw when face is turned left', () => {
    const lm = makeLandmarks({
      1: { x: 0.45, y: 0.55, z: -0.05 },
      33: { x: 0.35, y: 0.45, z: 0 },
      263: { x: 0.55, y: 0.45, z: 0.02 },
      234: { x: 0.25, y: 0.5, z: 0.01 },
      454: { x: 0.62, y: 0.5, z: 0.05 },
    });
    const pose = computeHeadPose(lm);
    expect(pose.yaw).toBeLessThan(-3);
  });
});

// ── checkFaceSize ──

describe('checkFaceSize', () => {
  it('returns ok for face covering ~40% of frame', () => {
    const lm = makeLandmarks();
    lm[0] = { x: 0.3, y: 0.3, z: 0 };
    lm[1] = { x: 0.7, y: 0.7, z: 0 };
    const result = checkFaceSize(lm);
    expect(result.ok).toBe(true);
    expect(result.ratio).toBeCloseTo(0.4, 1);
  });

  it('returns not ok for tiny face', () => {
    // All 478 landmarks clustered at center — deterministic, no Math.random
    const lm = Array.from({ length: 478 }, (_, i) => ({
      x: 0.495 + (i % 10) * 0.001,   // spread 0.495–0.504 = width 0.009
      y: 0.495 + (i % 10) * 0.001,
      z: 0,
    }));
    const result = checkFaceSize(lm);
    expect(result.ok).toBe(false);
    expect(result.ratio).toBeLessThan(0.3);
  });

  it('returns not ok for too large face', () => {
    const lm = makeLandmarks();
    lm[0] = { x: 0.0, y: 0.0, z: 0 };
    lm[1] = { x: 1.0, y: 1.0, z: 0 };
    const result = checkFaceSize(lm);
    expect(result.ok).toBe(false);
    expect(result.ratio).toBeGreaterThan(0.6);
  });
});

// ── validateFullMode ──

describe('validateFullMode', () => {
  const frontTarget: FullAngleTarget = {
    angle: 'FRONT',
    mode: 'full',
    targetYaw: 0,
    targetPitch: 0,
    yawTolerance: 10,
    pitchTolerance: 10,
    hintTooLeft: 'Obróć w prawo',
    hintTooRight: 'Obróć w lewo',
    hintTooUp: 'Opuść brodę',
    hintTooDown: 'Podnieś brodę',
  };

  it('returns not ready when no landmarks', () => {
    const result = validateFullMode(null, frontTarget, 120, 30, []);
    expect(result.ready).toBe(false);
    expect(result.hint).toContain('twarz');
  });

  it('prioritizes face detection over lighting', () => {
    const result = validateFullMode(null, frontTarget, 30, 30, []);
    expect(result.hint).toContain('twarz');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd C:/Users/Adam/Desktop/strona1/cosmo-app/apps/web && pnpm vitest run src/components/skin-scan/__tests__/faceValidation.test.ts
```

Expected: FAIL — cannot find module `../faceValidation`

- [ ] **Step 3: Write the complete implementation**

Create `apps/web/src/components/skin-scan/faceValidation.ts`:

```typescript
import type { FullAngleTarget } from './captureGuides';

export type HeadPose = { yaw: number; pitch: number; roll: number };

export type ValidationResult = {
  ready: boolean;
  hint: string | null;
  hintType: 'error' | 'warning' | 'success';
};

type Landmark = { x: number; y: number; z: number };

// Key landmark indices (face_landmarker model, 478 points — indices 0-467 same as legacy 468-point model)
const NOSE_TIP = 1;
const LEFT_EYE = 33;
const RIGHT_EYE = 263;
const LEFT_CONTOUR = 234;
const RIGHT_CONTOUR = 454;

/** Check brightness (55-210) and contrast (>18). Same thresholds as original inspectFrame. */
export const checkLighting = (
  brightness: number,
  contrast: number,
): { ok: boolean; hint: string | null } => {
  if (brightness < 55) return { ok: false, hint: 'Potrzeba więcej światła' };
  if (brightness > 210) return { ok: false, hint: 'Za jasno — odsuń się od światła' };
  if (contrast < 18) return { ok: false, hint: 'Oczyść obiektyw i popraw światło' };
  return { ok: true, hint: null };
};

/**
 * Frame-diff stability for closeup mode.
 * Compares two RGBA pixel arrays (96x72) — mean absolute difference of RGB channels.
 * Stable when MAD < 8 on 0-255 scale.
 */
export const checkFrameStability = (
  prevFrame: Uint8ClampedArray,
  currFrame: Uint8ClampedArray,
): boolean => {
  const pixelCount = prevFrame.length / 4;
  if (pixelCount === 0) return true;
  let totalDiff = 0;
  for (let i = 0; i < prevFrame.length; i += 4) {
    totalDiff += Math.abs(prevFrame[i] - currFrame[i]);
    totalDiff += Math.abs(prevFrame[i + 1] - currFrame[i + 1]);
    totalDiff += Math.abs(prevFrame[i + 2] - currFrame[i + 2]);
  }
  const mad = totalDiff / (pixelCount * 3);
  return mad < 8;
};

/**
 * Pose-based stability for full mode.
 * Checks that max yaw/pitch delta across last N poses is < 3°.
 */
export const checkStability = (poseHistory: HeadPose[]): boolean => {
  if (poseHistory.length < 2) return true;
  let minYaw = Infinity, maxYaw = -Infinity;
  let minPitch = Infinity, maxPitch = -Infinity;
  for (const p of poseHistory) {
    if (p.yaw < minYaw) minYaw = p.yaw;
    if (p.yaw > maxYaw) maxYaw = p.yaw;
    if (p.pitch < minPitch) minPitch = p.pitch;
    if (p.pitch > maxPitch) maxPitch = p.pitch;
  }
  return (maxYaw - minYaw) < 3 && (maxPitch - minPitch) < 3;
};

/** Validate closeup mode: only lighting + frame stability. */
export const validateCloseupMode = (
  brightness: number,
  contrast: number,
  frameStable: boolean,
): ValidationResult => {
  const lighting = checkLighting(brightness, contrast);
  if (!lighting.ok) return { ready: false, hint: lighting.hint, hintType: 'error' };
  if (!frameStable) return { ready: false, hint: 'Nie ruszaj się', hintType: 'warning' };
  return { ready: true, hint: null, hintType: 'success' };
};

/**
 * Compute head pose (yaw, pitch, roll) from face landmarks.
 * Coordinates: x/y are normalized [0,1] in raw pixel space (not CSS mirror).
 * Yaw: positive = face turned to right in raw pixels.
 * Pitch: negative = chin down (forehead exposed).
 */
export const computeHeadPose = (landmarks: Landmark[]): HeadPose => {
  const nose = landmarks[NOSE_TIP];
  const leftEye = landmarks[LEFT_EYE];
  const rightEye = landmarks[RIGHT_EYE];
  const leftContour = landmarks[LEFT_CONTOUR];
  const rightContour = landmarks[RIGHT_CONTOUR];

  const eyeMidX = (leftEye.x + rightEye.x) / 2;
  const eyeMidY = (leftEye.y + rightEye.y) / 2;
  const eyeMidZ = (leftEye.z + rightEye.z) / 2;

  // Yaw: nose offset from eye midpoint in X, scaled by face width
  const faceWidth = Math.abs(rightContour.x - leftContour.x);
  const yawRatio = faceWidth > 0.01 ? (nose.x - eyeMidX) / faceWidth : 0;
  const yaw = Math.atan2(yawRatio, 1) * (180 / Math.PI) * 3;

  // Pitch: nose offset from eye midpoint in Y, relative to z depth
  const pitchRatio = (nose.y - eyeMidY) * 2;
  const zDiff = eyeMidZ - nose.z;
  const pitch = Math.atan2(pitchRatio, Math.max(0.01, Math.abs(zDiff) + 0.1)) * (180 / Math.PI);

  // Roll: angle of eye line
  const roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * (180 / Math.PI);

  return { yaw, pitch, roll };
};

/**
 * Check face size as ratio of frame (0-1).
 * Uses bounding box of all landmarks — max(width, height) as ratio.
 * OK when 0.30-0.60.
 */
export const checkFaceSize = (landmarks: Landmark[]): { ratio: number; ok: boolean } => {
  let minX = 1, maxX = 0, minY = 1, maxY = 0;
  for (const lm of landmarks) {
    if (lm.x < minX) minX = lm.x;
    if (lm.x > maxX) maxX = lm.x;
    if (lm.y < minY) minY = lm.y;
    if (lm.y > maxY) maxY = lm.y;
  }
  const ratio = Math.max(maxX - minX, maxY - minY);
  return { ratio, ok: ratio >= 0.30 && ratio <= 0.60 };
};

/**
 * Full validation mode: all 5 conditions.
 * Priority: 1.face 2.position 3.size 4.lighting 5.stability
 */
export const validateFullMode = (
  landmarks: Landmark[] | null,
  target: FullAngleTarget,
  brightness: number,
  contrast: number,
  poseHistory: HeadPose[],
): ValidationResult => {
  if (!landmarks || landmarks.length === 0) {
    return { ready: false, hint: 'Umieść twarz w owalu', hintType: 'error' };
  }

  const pose = computeHeadPose(landmarks);
  const yawDelta = pose.yaw - target.targetYaw;
  const pitchDelta = pose.pitch - target.targetPitch;

  if (Math.abs(yawDelta) > target.yawTolerance) {
    const hint = yawDelta > 0 ? target.hintTooRight : target.hintTooLeft;
    return { ready: false, hint, hintType: 'warning' };
  }
  if (Math.abs(pitchDelta) > target.pitchTolerance) {
    const hint = pitchDelta > 0 ? target.hintTooDown : target.hintTooUp;
    return { ready: false, hint, hintType: 'warning' };
  }

  const size = checkFaceSize(landmarks);
  if (!size.ok) {
    const hint = size.ratio < 0.30 ? 'Przesuń bliżej' : 'Odsuń się trochę';
    return { ready: false, hint, hintType: 'warning' };
  }

  const lighting = checkLighting(brightness, contrast);
  if (!lighting.ok) {
    return { ready: false, hint: lighting.hint, hintType: 'error' };
  }

  if (!checkStability(poseHistory)) {
    return { ready: false, hint: 'Nie ruszaj się', hintType: 'warning' };
  }

  return { ready: true, hint: null, hintType: 'success' };
};
```

- [ ] **Step 4: Run all tests to verify they pass**

```bash
cd C:/Users/Adam/Desktop/strona1/cosmo-app/apps/web && pnpm vitest run src/components/skin-scan/__tests__/faceValidation.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
cd C:/Users/Adam/Desktop/strona1/cosmo-app && git add apps/web/src/components/skin-scan/faceValidation.ts apps/web/src/components/skin-scan/__tests__/faceValidation.test.ts && git commit -m "feat(skin-scan): add face validation pure functions with tests"
```

---

### Task 4: Create `useFaceMesh.ts` hook

**Files:**
- Create: `apps/web/src/components/skin-scan/useFaceMesh.ts`

No unit tests for this hook — it wraps MediaPipe APIs with browser-only APIs (WebGL, video, RAF). Tested manually.

- [ ] **Step 1: Create the hook**

Create `apps/web/src/components/skin-scan/useFaceMesh.ts`:

```typescript
import { useEffect, useRef, useState, type RefObject } from 'react';

type Landmark = { x: number; y: number; z: number };

type UseFaceMeshResult = {
  landmarks: Landmark[] | null;
  isLoading: boolean;
  error: string | null;
};

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

const LOAD_TIMEOUT_MS = 10_000;
const THROTTLE_MS = 100;

export const useFaceMesh = (
  videoRef: RefObject<HTMLVideoElement | null>,
  enabled: boolean,
): UseFaceMeshResult => {
  const [landmarks, setLandmarks] = useState<Landmark[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const landmarkerRef = useRef<unknown>(null);
  const rafIdRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!enabled) {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = 0;
      }
      setLandmarks(null);
      return;
    }

    let cancelled = false;

    const init = async () => {
      if (landmarkerRef.current) {
        startLoop();
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await Promise.race([
          loadFaceLandmarker(),
          new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), LOAD_TIMEOUT_MS),
          ),
        ]);

        if (cancelled || !mountedRef.current) return;

        landmarkerRef.current = result;
        setIsLoading(false);
        startLoop();
      } catch (err) {
        if (cancelled || !mountedRef.current) return;
        setIsLoading(false);
        setError(err instanceof Error ? err.message : 'Nie udało się załadować detekcji twarzy');
      }
    };

    const loadFaceLandmarker = async () => {
      const vision = await import('@mediapipe/tasks-vision');
      const { FaceLandmarker, FilesetResolver } = vision;
      const filesetResolver = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm',
      );
      return FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFacialTransformationMatrixes: false,
        outputFaceBlendshapes: false,
      });
    };

    const startLoop = () => {
      const detect = () => {
        if (cancelled || !mountedRef.current) return;

        const now = performance.now();
        if (now - lastTimeRef.current >= THROTTLE_MS) {
          lastTimeRef.current = now;
          const video = videoRef.current;
          const fl = landmarkerRef.current as {
            detectForVideo: (v: HTMLVideoElement, t: number) => { faceLandmarks: Array<Landmark[]> };
          } | null;
          if (video && fl && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            try {
              const result = fl.detectForVideo(video, now);
              const lm = result.faceLandmarks?.[0] ?? null;
              setLandmarks(lm);
            } catch {
              setLandmarks(null);
            }
          }
        }
        rafIdRef.current = requestAnimationFrame(detect);
      };
      rafIdRef.current = requestAnimationFrame(detect);
    };

    void init();

    return () => {
      cancelled = true;
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = 0;
      }
    };
  }, [enabled, videoRef]);

  useEffect(() => {
    return () => {
      const fl = landmarkerRef.current as { close?: () => void } | null;
      fl?.close?.();
      landmarkerRef.current = null;
    };
  }, []);

  return { landmarks, isLoading, error };
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd C:/Users/Adam/Desktop/strona1/cosmo-app/apps/web && npx tsc --noEmit --skipLibCheck 2>&1 | head -20
```

Expected: no errors from `useFaceMesh.ts`.

- [ ] **Step 3: Commit**

```bash
cd C:/Users/Adam/Desktop/strona1/cosmo-app && git add apps/web/src/components/skin-scan/useFaceMesh.ts && git commit -m "feat(skin-scan): add useFaceMesh hook with CDN-loaded MediaPipe"
```

---

### Task 5: Integrate validation into `SkinScanCamera.tsx`

**Files:**
- Modify: `apps/web/src/components/skin-scan/SkinScanCamera.tsx`

This is the main integration task. The camera component gets:
- Face mesh integration via `useFaceMesh` hook
- Validation loop replacing `inspectFrame` interval
- Button gating with 300ms debounce (stored in ref, not re-created by effect)
- Dynamic oval color
- Contextual hints

- [ ] **Step 1: Rewrite SkinScanCamera.tsx with face mesh integration**

Replace the full content of `apps/web/src/components/skin-scan/SkinScanCamera.tsx`:

```typescript
import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Check, ImagePlus, Loader2, RefreshCw, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SkinScanAngle } from '@/api/skin-scans.api';
import { useFaceMesh } from './useFaceMesh';
import { ANGLE_TARGETS, type FullAngleTarget } from './captureGuides';
import {
  checkLighting,
  checkFrameStability,
  computeHeadPose,
  validateCloseupMode,
  validateFullMode,
  type HeadPose,
  type ValidationResult,
} from './faceValidation';

const ANGLE_COPY: Record<SkinScanAngle, { eyebrow: string; title: string; instruction: string }> = {
  FRONT: {
    eyebrow: 'Zdjęcie 1 z 6',
    title: 'Twarz na wprost',
    instruction: 'Spójrz prosto w obiektyw. Trzymaj neutralny wyraz twarzy i schowaj włosy.',
  },
  LEFT: {
    eyebrow: 'Półprofil',
    title: 'Lewy półprofil',
    instruction: 'Powoli obróć głowę około 30° w lewo. Oba oczy powinny pozostać widoczne.',
  },
  RIGHT: {
    eyebrow: 'Półprofil',
    title: 'Prawy półprofil',
    instruction: 'Powoli obróć głowę około 30° w prawo. Oba oczy powinny pozostać widoczne.',
  },
  FOREHEAD: {
    eyebrow: 'Zbliżenie 1 z 5',
    title: 'Czoło — zbliżenie',
    instruction: 'Zbliż aparat na ok. 15 cm do czoła. Odsuń włosy, aby czoło było widoczne.',
  },
  LEFT_CHEEK: {
    eyebrow: 'Zbliżenie 2 z 5',
    title: 'Lewy policzek — zbliżenie',
    instruction: 'Zbliż aparat na ok. 15 cm do lewego policzka. Policzek powinien wypełnić kadr.',
  },
  RIGHT_CHEEK: {
    eyebrow: 'Zbliżenie 3 z 5',
    title: 'Prawy policzek — zbliżenie',
    instruction: 'Zbliż aparat na ok. 15 cm do prawego policzka. Policzek powinien wypełnić kadr.',
  },
  CHIN: {
    eyebrow: 'Zbliżenie 4 z 5',
    title: 'Broda — zbliżenie',
    instruction: 'Zbliż aparat na ok. 15 cm do brody i okolic ust.',
  },
  NECK: {
    eyebrow: 'Zbliżenie 5 z 5',
    title: 'Szyja — zbliżenie',
    instruction: 'Zbliż aparat na ok. 15 cm do szyi. Odchyl lekko głowę do tyłu.',
  },
};

const ANALYSIS_W = 96;
const ANALYSIS_H = 72;
const DEBOUNCE_MS = 300;

type Props = {
  angle: SkinScanAngle;
  previewUrl?: string;
  onCapture: (file: File) => void;
};

export const SkinScanCamera = ({ angle, previewUrl, onCapture }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const analysisCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState<'loading' | 'ready' | 'unavailable'>('loading');

  // Validation state
  const [validation, setValidation] = useState<ValidationResult>({
    ready: false, hint: 'Uruchamiam kamerę…', hintType: 'error',
  });
  const [buttonReady, setButtonReady] = useState(false);

  // Refs for validation
  const poseHistoryRef = useRef<HeadPose[]>([]);
  const prevFrameRef = useRef<Uint8ClampedArray | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const target = ANGLE_TARGETS[angle];
  const isFullMode = target.mode === 'full';

  // Face mesh — only enabled for full mode
  const { landmarks, isLoading: meshLoading, error: meshError } = useFaceMesh(videoRef, isFullMode);
  const isFallback = isFullMode && meshError != null;

  // Reset state on angle change
  useEffect(() => {
    poseHistoryRef.current = [];
    prevFrameRef.current = null;
    setButtonReady(false);
    setValidation({ ready: false, hint: null, hintType: 'error' });
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, [angle]);

  // Camera setup
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraState('unavailable');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraState('ready');
      } catch {
        setCameraState('unavailable');
        setValidation({
          ready: false,
          hint: 'Kamera niedostępna. Wybierz zdjęcie z urządzenia.',
          hintType: 'error',
        });
      }
    };
    void startCamera();
    return () => { cancelled = true; stopCamera(); };
  }, [stopCamera]);

  // Compute brightness/contrast from analysis canvas
  const computeLC = useCallback((): {
    brightness: number; contrast: number; frameData: Uint8ClampedArray;
  } | null => {
    const video = videoRef.current;
    const canvas = analysisCanvasRef.current;
    if (!video || !canvas || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return null;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    canvas.width = ANALYSIS_W;
    canvas.height = ANALYSIS_H;
    ctx.drawImage(video, 0, 0, ANALYSIS_W, ANALYSIS_H);
    const pixels = ctx.getImageData(0, 0, ANALYSIS_W, ANALYSIS_H).data;
    let bSum = 0;
    let bSqSum = 0;
    const count = pixels.length / 4;
    for (let i = 0; i < pixels.length; i += 4) {
      const b = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
      bSum += b;
      bSqSum += b * b;
    }
    const mean = bSum / count;
    const contrast = Math.sqrt(Math.max(0, bSqSum / count - mean * mean));
    return { brightness: mean, contrast, frameData: pixels };
  }, []);

  // Helper: apply debounce logic to a validation result
  const applyDebounce = useCallback((result: ValidationResult) => {
    setValidation(result);
    if (result.ready) {
      // Don't re-create timer if one is already running
      if (!debounceTimerRef.current) {
        debounceTimerRef.current = setTimeout(() => {
          debounceTimerRef.current = null;
          setButtonReady(true);
        }, DEBOUNCE_MS);
      }
    } else {
      // Instant deactivation
      setButtonReady(false);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    }
  }, []);

  // ── Fallback validation loop (no face mesh) ──
  useEffect(() => {
    if (cameraState !== 'ready' || previewUrl || !isFallback) return;
    const timer = setInterval(() => {
      const lc = computeLC();
      if (!lc) return;
      const result = checkLighting(lc.brightness, lc.contrast);
      setValidation({
        ready: result.ok,
        hint: result.ok ? 'Oświetlenie OK. Trzymaj nieruchomo.' : result.hint,
        hintType: result.ok ? 'success' : 'error',
      });
      setButtonReady(result.ok);
    }, 700);
    return () => clearInterval(timer);
  }, [cameraState, previewUrl, isFallback, computeLC]);

  // ── Full-mode validation (driven by landmarks updates from useFaceMesh) ──
  useEffect(() => {
    if (cameraState !== 'ready' || previewUrl || !isFullMode || isFallback || meshLoading) return;
    const lc = computeLC();
    if (!lc) return;

    // Update pose history
    if (landmarks) {
      const pose = computeHeadPose(landmarks);
      const h = poseHistoryRef.current;
      h.push(pose);
      if (h.length > 5) h.shift();
    }

    const result = validateFullMode(
      landmarks,
      target as FullAngleTarget,
      lc.brightness,
      lc.contrast,
      poseHistoryRef.current,
    );
    applyDebounce(result);
  }, [cameraState, previewUrl, isFullMode, isFallback, meshLoading, landmarks, target, computeLC, applyDebounce]);

  // ── Closeup-mode validation loop ──
  useEffect(() => {
    if (cameraState !== 'ready' || previewUrl || isFullMode) return;
    const timer = setInterval(() => {
      const lc = computeLC();
      if (!lc) return;
      const frameStable = prevFrameRef.current
        ? checkFrameStability(prevFrameRef.current, lc.frameData)
        : true;
      prevFrameRef.current = lc.frameData;
      const result = validateCloseupMode(lc.brightness, lc.contrast, frameStable);
      applyDebounce(result);
    }, 200);
    return () => clearInterval(timer);
  }, [cameraState, previewUrl, isFullMode, computeLC, applyDebounce]);

  const captureFrame = async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;
    const maxWidth = 1280;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext('2d');
    if (!context) return;
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.9),
    );
    if (blob) onCapture(new File([blob], `${angle.toLowerCase()}.jpg`, { type: 'image/jpeg' }));
  };

  const handleFile = (file?: File) => {
    if (file) onCapture(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const copy = ANGLE_COPY[angle];

  // Oval color (only for full mode with active face mesh)
  const ovalBorderClass = (() => {
    if (!isFullMode || isFallback) return 'border-white/75';
    if (validation.hintType === 'success') return 'border-emerald-400';
    if (validation.hintType === 'warning') return 'border-amber-400';
    return 'border-red-400';
  })();

  const canCapture = isFallback ? cameraState === 'ready' : buttonReady;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9A6C32]">{copy.eyebrow}</p>
        <h2 className="mt-1 font-heading text-xl font-semibold text-[#1A3828]">{copy.title}</h2>
        <p className="mx-auto mt-1 max-w-xl text-sm text-muted-foreground">{copy.instruction}</p>
      </div>

      <div className="relative mx-auto aspect-[4/3] w-full max-w-2xl overflow-hidden rounded-3xl bg-[#102219] shadow-xl">
        <video
          ref={videoRef}
          playsInline
          muted
          className={`h-full w-full object-cover [transform:scaleX(-1)] ${previewUrl ? 'opacity-0' : 'opacity-100'}`}
          aria-label="Podgląd z przedniej kamery"
          aria-hidden={Boolean(previewUrl)}
        />
        {previewUrl && (
          <img
            src={previewUrl}
            alt={`Podgląd: ${copy.title}`}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}

        {!previewUrl && cameraState === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-white/75">
            Uruchamiam kamerę…
          </div>
        )}

        {!previewUrl && cameraState === 'unavailable' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center text-white/80">
            <ShieldAlert className="h-8 w-8 text-[#D9B57B]" />
            <p className="text-sm">
              Nie udało się uruchomić kamery. Sprawdź uprawnienia lub wybierz zdjęcie z urządzenia.
            </p>
          </div>
        )}

        {!previewUrl && cameraState === 'ready' && (
          <div
            className={`pointer-events-none absolute left-1/2 top-1/2 h-[78%] w-[56%] -translate-x-1/2 -translate-y-1/2 rounded-[48%] border-2 shadow-[0_0_0_999px_rgba(0,0,0,0.18)] transition-colors duration-300 ${ovalBorderClass}`}
            aria-hidden="true"
          />
        )}

        {/* Face mesh loading badge */}
        {!previewUrl && isFullMode && meshLoading && (
          <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1.5 text-[10px] text-white backdrop-blur">
            <Loader2 className="h-3 w-3 animate-spin" />
            Ładowanie detekcji…
          </div>
        )}

        <div className="absolute inset-x-3 bottom-3 flex justify-center">
          <div
            className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium backdrop-blur ${
              validation.hintType === 'success'
                ? 'bg-emerald-950/70 text-emerald-50'
                : validation.hintType === 'warning'
                  ? 'bg-amber-950/70 text-amber-50'
                  : 'bg-black/65 text-white'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                validation.hintType === 'success'
                  ? 'bg-emerald-400'
                  : validation.hintType === 'warning'
                    ? 'bg-amber-400'
                    : 'bg-red-400'
              }`}
            />
            {previewUrl
              ? 'Zdjęcie zapisane — możesz przejść dalej lub powtórzyć.'
              : validation.hint ?? 'Gotowe — zrób zdjęcie!'}
          </div>
        </div>
      </div>

      <canvas ref={analysisCanvasRef} className="hidden" aria-hidden="true" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        capture="user"
        className="hidden"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />

      <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
        {previewUrl ? (
          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Powtórz ujęcie
          </Button>
        ) : (
          <Button
            type="button"
            onClick={() => void captureFrame()}
            disabled={!canCapture}
            className={canCapture ? 'animate-pulse bg-emerald-600 hover:bg-emerald-700' : ''}
          >
            <Camera className="mr-2 h-4 w-4" /> Zrób zdjęcie
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={() => fileInputRef.current?.click()}>
          {previewUrl ? <Check className="mr-2 h-4 w-4" /> : <ImagePlus className="mr-2 h-4 w-4" />}
          {previewUrl ? 'Wybierz inne zdjęcie' : 'Wybierz z urządzenia'}
        </Button>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd C:/Users/Adam/Desktop/strona1/cosmo-app/apps/web && npx tsc --noEmit --skipLibCheck 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Run all tests**

```bash
cd C:/Users/Adam/Desktop/strona1/cosmo-app/apps/web && pnpm vitest run
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
cd C:/Users/Adam/Desktop/strona1/cosmo-app && git add apps/web/src/components/skin-scan/SkinScanCamera.tsx && git commit -m "feat(skin-scan): integrate face mesh validation into camera with guided capture"
```

---

### Task 6: Manual testing and tuning

This task is not code — it's a checklist for manual verification on a phone.

- [ ] **Step 1: Start dev server**

```bash
cd C:/Users/Adam/Desktop/strona1/cosmo-app && pnpm dev
```

- [ ] **Step 2: Test FRONT angle on phone**

Open `https://<dev-ip>:5173/user` → Skin Scan → start capture.
Verify:
- Face mesh loading badge appears briefly
- Oval turns red → amber → green as you position face
- Hints update in real-time ("Obróć głowę w prawo", "Przesuń bliżej", etc.)
- Button disabled until green → then pulsing green
- After 300ms of green → button becomes clickable
- Capture works, preview shows

- [ ] **Step 3: Test closeup angles**

Navigate to FOREHEAD, LEFT_CHEEK, etc.
Verify:
- No face mesh loading (instant)
- Only lighting hints show
- "Nie ruszaj się" appears when moving phone
- Button activates when still + good lighting
- Oval stays white (no color changes)

- [ ] **Step 4: Test fallback**

Simulate fallback by temporarily breaking WebGL or using a very old phone.
Verify: button always active, only brightness/contrast hints, no crashes.

- [ ] **Step 5: Test file input**

"Wybierz z urządzenia" should always work regardless of validation state.

- [ ] **Step 6: Tune thresholds if needed**

If yaw/pitch values feel off, adjust values in `captureGuides.ts` and `faceValidation.ts` (`computeHeadPose` scale factors).

- [ ] **Step 7: Final commit with any tuning changes**

```bash
cd C:/Users/Adam/Desktop/strona1/cosmo-app && git add -A && git commit -m "fix(skin-scan): tune guided capture thresholds after manual testing"
```
