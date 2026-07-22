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
