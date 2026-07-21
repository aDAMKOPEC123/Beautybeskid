import { describe, it, expect } from 'vitest';
import { computeSkinScore } from './skin-score';

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
      acne: metric('AVAILABLE', 2, 'stopień 1-4'),
      pigmentation: metric('AVAILABLE', 30, '%'),
      redness: metric('AVAILABLE', 20, '%'),
      wrinkles: metric('AVAILABLE', 50, '%'),
      pores: metric('MODEL_NOT_CONFIGURED', null),
      spfCoverage: metric('UNAVAILABLE_WITH_RGB', null),
    };
    const result = computeSkinScore(metrics as any);
    // 12.5 + 17.5 + 20 + 12.5 = 62.5 → rounded to 63
    expect(result.skinScore).toBe(63);
  });
});
