import type { SkinScanAnalysis } from './skin-scans.types';

const SCORE_METRICS = {
  acne: 6.25,
  pigmentation: 0.25,
  redness: 0.25,
  wrinkles: 0.25,
} as const;

type ScoreMetricKey = keyof typeof SCORE_METRICS;

export const computeSkinScore = (
  metrics: SkinScanAnalysis['metrics'],
): { skinScore: number | null; skinScoreBreakdown: Partial<Record<ScoreMetricKey, number>> } => {
  const entries = (Object.entries(SCORE_METRICS) as [ScoreMetricKey, number][])
    .filter(([key]) => metrics[key]?.status === 'AVAILABLE' && metrics[key]?.value != null);

  if (entries.length === 0) return { skinScore: null, skinScoreBreakdown: {} };

  const scaleFactor = 100 / (entries.length * 25);
  const breakdown: Partial<Record<ScoreMetricKey, number>> = {};

  for (const [key, factor] of entries) {
    const raw = 25 - Math.min(Math.max((metrics[key].value ?? 0) * factor, 0), 25);
    breakdown[key] = Math.round(raw * scaleFactor * 10) / 10;
  }

  const total = Object.values(breakdown).reduce((sum, v) => sum + (v ?? 0), 0);
  return { skinScore: Math.round(total), skinScoreBreakdown: breakdown };
};
