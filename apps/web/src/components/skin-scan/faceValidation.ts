import type { FullAngleTarget } from './captureGuides';

export type HeadPose = { yaw: number; pitch: number; roll: number };

export type ValidationResult = {
  ready: boolean;
  hint: string | null;
  hintType: 'error' | 'warning' | 'success';
};

type Landmark = { x: number; y: number; z: number };

const NOSE_TIP = 1;
const LEFT_EYE = 33;
const RIGHT_EYE = 263;
const LEFT_CONTOUR = 234;
const RIGHT_CONTOUR = 454;

export const checkLighting = (
  brightness: number,
  contrast: number,
): { ok: boolean; hint: string | null } => {
  if (brightness < 55) return { ok: false, hint: 'Potrzeba więcej światła' };
  if (brightness > 210) return { ok: false, hint: 'Za jasno — odsuń się od światła' };
  if (contrast < 18) return { ok: false, hint: 'Oczyść obiektyw i popraw światło' };
  return { ok: true, hint: null };
};

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

export const computeHeadPose = (landmarks: Landmark[]): HeadPose => {
  const nose = landmarks[NOSE_TIP];
  const leftEye = landmarks[LEFT_EYE];
  const rightEye = landmarks[RIGHT_EYE];
  const leftContour = landmarks[LEFT_CONTOUR];
  const rightContour = landmarks[RIGHT_CONTOUR];

  const faceMidX = (leftContour.x + rightContour.x) / 2;
  const faceWidth = Math.abs(rightContour.x - leftContour.x);

  // Yaw: nose offset from face center, normalized by face width
  // When face turns left (in raw pixels), nose shifts left of face center
  const yawRatio = faceWidth > 0.01 ? (nose.x - faceMidX) / faceWidth : 0;
  const yaw = yawRatio * 90; // linear mapping: 0.5 offset = 45°

  // Pitch: vertical distance from nose to eye midpoint, normalized by face width
  const eyeMidY = (leftEye.y + rightEye.y) / 2;
  const pitchRatio = faceWidth > 0.01 ? (nose.y - eyeMidY) / faceWidth : 0;
  // Typical nose-to-eyemid ratio at 0° pitch is ~0.25 of face width
  const pitch = (pitchRatio - 0.25) * 180; // centered around neutral

  // Roll: angle of eye line
  const roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * (180 / Math.PI);

  return { yaw, pitch, roll };
};

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
