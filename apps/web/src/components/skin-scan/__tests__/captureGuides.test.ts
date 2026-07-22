import { describe, it, expect } from 'vitest';
import { ANGLE_TARGETS, type AngleTarget } from '../captureGuides';

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
    const closeups = Object.values(ANGLE_TARGETS).filter(
      (t): t is AngleTarget & { mode: 'closeup' } => t.mode === 'closeup',
    );
    expect(closeups.length).toBeGreaterThan(0);
    for (const t of closeups) {
      expect('targetYaw' in t).toBe(false);
    }
  });
});
