import { api } from '@/lib/axios';

export type SkinScanAngle = 'FRONT' | 'LEFT' | 'RIGHT' | 'FOREHEAD' | 'LEFT_CHEEK' | 'RIGHT_CHEEK' | 'CHIN' | 'NECK';
export type SkinScanStatus = 'DRAFT' | 'CAPTURING' | 'NEEDS_RETAKE' | 'COMPLETED' | 'FAILED';

export type SkinScanQualityIssue = {
  code: string;
  message: string;
};

export type SkinScanImageQuality = {
  passed: boolean;
  score: number;
  brightness: number;
  contrast: number;
  sharpness: number;
  clippedDarkPercent: number;
  clippedLightPercent: number;
  issues: SkinScanQualityIssue[];
};

export type SkinScanImage = {
  id: string;
  angle: SkinScanAngle;
  imagePath: string;
  width: number;
  height: number;
  quality: SkinScanImageQuality;
  capturedAt: string;
};

export type SkinScanMetric = {
  status: 'AVAILABLE' | 'MODEL_NOT_CONFIGURED' | 'UNAVAILABLE_WITH_RGB' | 'INSUFFICIENT_QUALITY';
  value: number | null;
  unit: string | null;
  confidence: number | null;
  modelVersion: string | null;
  message: string;
  details?: Record<string, unknown>;
};

export type SkinScanZone = {
  label: string;
  skinPixels: number;
  pigmentationCoverage: number;
  rednessCoverage: number;
  closeup?: string;
};

export type SkinScanFaceParsing = {
  skinRatioByAngle: Record<string, number>;
  usableAngles: SkinScanAngle[];
  zones?: Record<string, SkinScanZone>;
  zoneGridOverlay?: Partial<Record<SkinScanAngle, string>>;
};

export type SkinScanAnalysis = {
  schemaVersion: '1.0';
  mode: 'QUALITY_ONLY' | 'COSMETOLOGY_RESEARCH';
  generatedAt: string;
  disclaimer: string;
  modelVersions: Record<string, string>;
  metrics: Record<'acne' | 'pigmentation' | 'redness' | 'wrinkles' | 'pores' | 'spfCoverage', SkinScanMetric>;
  faceParsing?: SkinScanFaceParsing;
};

export type SkinScanSession = {
  id: string;
  status: SkinScanStatus;
  consentAcceptedAt: string;
  consentVersion: string;
  captureContext: {
    makeup: boolean;
    spfApplied: boolean;
    spfAppliedAt?: string;
    recentTreatment: boolean;
    recentTreatmentNotes?: string;
  };
  qualitySummary: {
    schemaVersion: string;
    passed: boolean;
    averageScore: number;
    failedAngles: SkinScanAngle[];
  } | null;
  analysis: SkinScanAnalysis | null;
  analysisProvider: string;
  analysisVersion: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  images: SkinScanImage[];
};

type CaptureContext = SkinScanSession['captureContext'];

const BASE = '/skin-scans';

export const skinScansApi = {
  list: async (): Promise<SkinScanSession[]> => {
    const response = await api.get(BASE);
    return response.data.data.sessions;
  },

  create: async (captureContext: CaptureContext): Promise<SkinScanSession> => {
    const response = await api.post(BASE, { consentAccepted: true, captureContext });
    return response.data.data.session;
  },

  get: async (sessionId: string): Promise<SkinScanSession> => {
    const response = await api.get(`${BASE}/${sessionId}`);
    return response.data.data.session;
  },

  uploadImages: async (
    sessionId: string,
    captures: Partial<Record<SkinScanAngle, File>>,
  ): Promise<SkinScanSession> => {
    const formData = new FormData();
    const fields: Record<SkinScanAngle, string> = {
      FRONT: 'front', LEFT: 'left', RIGHT: 'right',
      FOREHEAD: 'forehead', LEFT_CHEEK: 'left_cheek', RIGHT_CHEEK: 'right_cheek',
      CHIN: 'chin', NECK: 'neck',
    };
    (Object.keys(captures) as SkinScanAngle[]).forEach((angle) => {
      const file = captures[angle];
      if (file) formData.append(fields[angle], file, `${fields[angle]}.jpg`);
    });
    const response = await api.post(`${BASE}/${sessionId}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 90_000,
    });
    return response.data.data.session;
  },

  complete: async (sessionId: string): Promise<SkinScanSession> => {
    const response = await api.post(`${BASE}/${sessionId}/complete`, {}, { timeout: 120_000 });
    return response.data.data.session;
  },

  delete: async (sessionId: string): Promise<void> => {
    await api.delete(`${BASE}/${sessionId}`);
  },
};

export const getMetricOverlays = (
  metric: SkinScanMetric,
): Partial<Record<SkinScanAngle, string>> | null => {
  const overlays = (metric.details as Record<string, unknown> | undefined)
    ?.overlays;
  if (!overlays || typeof overlays !== 'object') return null;
  return overlays as Partial<Record<SkinScanAngle, string>>;
};
