export const OVERVIEW_ANGLES = ['FRONT'] as const;
export const ZONE_ANGLES = ['FOREHEAD', 'LEFT_CHEEK', 'RIGHT_CHEEK', 'CHIN', 'NECK'] as const;
export const REQUIRED_SCAN_ANGLES = [...OVERVIEW_ANGLES, ...ZONE_ANGLES] as const;

export type SkinScanAngleValue = (typeof REQUIRED_SCAN_ANGLES)[number];

export type SkinScanQualityIssueCode =
  | 'RESOLUTION_TOO_LOW'
  | 'TOO_DARK'
  | 'TOO_BRIGHT'
  | 'LOW_CONTRAST'
  | 'POSSIBLY_BLURRED';

export type SkinScanImageQuality = {
  passed: boolean;
  score: number;
  brightness: number;
  contrast: number;
  sharpness: number;
  clippedDarkPercent: number;
  clippedLightPercent: number;
  issues: Array<{
    code: SkinScanQualityIssueCode;
    message: string;
  }>;
};

export type SkinScanCaptureContext = {
  makeup: boolean;
  spfApplied: boolean;
  spfAppliedAt?: string;
  recentTreatment: boolean;
  recentTreatmentNotes?: string;
};

export type SkinScanMetricStatus = 'AVAILABLE' | 'MODEL_NOT_CONFIGURED' | 'UNAVAILABLE_WITH_RGB' | 'INSUFFICIENT_QUALITY';

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

export type SkinScanAnalysis = {
  schemaVersion: '1.0';
  mode: 'QUALITY_ONLY' | 'COSMETOLOGY_RESEARCH';
  generatedAt: string;
  disclaimer: string;
  modelVersions: Record<string, string>;
  metrics: {
    acne: SkinScanAnalysisMetric;
    pigmentation: SkinScanAnalysisMetric;
    redness: SkinScanAnalysisMetric;
    wrinkles: SkinScanAnalysisMetric;
    pores: SkinScanAnalysisMetric;
    spfCoverage: SkinScanAnalysisMetric;
  };
  faceParsing?: Record<string, unknown>;
  fitzpatrick?: {
    detected: number | null;
    provided: number | null;
    effective: number | null;
  };
  skinScore?: number | null;
  skinScoreBreakdown?: Partial<Record<'acne' | 'pigmentation' | 'redness' | 'wrinkles', number>>;
};
