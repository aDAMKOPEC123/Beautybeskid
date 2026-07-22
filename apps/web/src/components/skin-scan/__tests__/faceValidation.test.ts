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

// ── checkStability ──

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
      1: { x: 0.5, y: 0.55, z: -0.05 },
      33: { x: 0.4, y: 0.45, z: 0 },
      263: { x: 0.6, y: 0.45, z: 0 },
      234: { x: 0.3, y: 0.5, z: 0.02 },
      454: { x: 0.7, y: 0.5, z: 0.02 },
    });
    const pose = computeHeadPose(lm);
    expect(Math.abs(pose.yaw)).toBeLessThan(5);
    expect(Math.abs(pose.pitch)).toBeLessThan(5);
  });

  it('returns negative yaw when face is turned left (nose left of face center)', () => {
    // Face turned left in raw pixels: nose shifts left, right contour more visible
    const lm = makeLandmarks({
      1: { x: 0.40, y: 0.55, z: -0.05 },    // nose shifted left
      33: { x: 0.35, y: 0.45, z: 0 },
      263: { x: 0.55, y: 0.45, z: 0.02 },
      234: { x: 0.30, y: 0.5, z: 0.01 },     // left contour
      454: { x: 0.70, y: 0.5, z: 0.05 },     // right contour far right
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
    const lm = Array.from({ length: 478 }, (_, i) => ({
      x: 0.495 + (i % 10) * 0.001,
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
