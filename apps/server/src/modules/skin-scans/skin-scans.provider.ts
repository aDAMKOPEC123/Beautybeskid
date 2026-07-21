import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { env } from '../../config/env';
import type { SkinScanAnalysis } from './skin-scans.types';

export type SkinScanProviderInput = {
  sessionId: string;
  images: Array<{ angle: string; imagePath: string }>;
};

export interface SkinScanAnalysisProvider {
  readonly name: string;
  readonly version: string;
  analyze(input: SkinScanProviderInput): Promise<SkinScanAnalysis>;
}

const metricSchema = z.object({
  status: z.enum(['AVAILABLE', 'MODEL_NOT_CONFIGURED', 'UNAVAILABLE_WITH_RGB', 'INSUFFICIENT_QUALITY']),
  value: z.number().nullable(),
  unit: z.string().nullable(),
  confidence: z.number().min(0).max(1).nullable(),
  modelVersion: z.string().nullable(),
  message: z.string().min(1),
  details: z.record(z.unknown()).optional(),
});

const analysisSchema = z.object({
  schemaVersion: z.literal('1.0'),
  mode: z.enum(['QUALITY_ONLY', 'COSMETOLOGY_RESEARCH']),
  generatedAt: z.string().datetime({ offset: true }),
  disclaimer: z.string().min(1),
  modelVersions: z.record(z.string()),
  metrics: z.object({
    acne: metricSchema,
    pigmentation: metricSchema,
    redness: metricSchema,
    wrinkles: metricSchema,
    pores: metricSchema,
    spfCoverage: metricSchema,
  }),
  faceParsing: z.record(z.unknown()).optional(),
});

const unavailableMetric = (message: string) => ({
  status: 'MODEL_NOT_CONFIGURED' as const,
  value: null,
  unit: null,
  confidence: null,
  modelVersion: null,
  message,
});

export const qualityOnlyProvider: SkinScanAnalysisProvider = {
  name: 'quality-only',
  version: 'quality-v1',
  async analyze() {
    return {
      schemaVersion: '1.0',
      mode: 'QUALITY_ONLY',
      generatedAt: new Date().toISOString(),
      disclaimer:
        'To nie jest diagnoza medyczna. Wersja MVP sprawdza wyłącznie jakość materiału zdjęciowego; metryki skóry wymagają zwalidowanych modeli.',
      modelVersions: {
        captureQuality: 'quality-v1',
      },
      metrics: {
        acne: unavailableMetric('Model trądziku nie został jeszcze skonfigurowany.'),
        pigmentation: unavailableMetric('Model przebarwień nie został jeszcze skonfigurowany.'),
        redness: unavailableMetric('Model rumienia nie został jeszcze skonfigurowany.'),
        wrinkles: unavailableMetric('Model zmarszczek nie został jeszcze skonfigurowany.'),
        pores: unavailableMetric('Model porów nie został jeszcze skonfigurowany.'),
        spfCoverage: {
          status: 'UNAVAILABLE_WITH_RGB',
          value: null,
          unit: null,
          confidence: null,
          modelVersion: null,
          message: 'Pokrycia SPF nie można wiarygodnie zmierzyć zwykłą kamerą RGB. Wymagany jest tor UV lub zgodne urządzenie pomiarowe.',
        },
      },
    };
  },
};

const getStoredImage = async (imagePath: string) => {
  const uploadsRoot = path.resolve(process.cwd(), 'uploads', 'skin-scans');
  const absolutePath = path.resolve(process.cwd(), imagePath.replace(/^[/\\]+/, ''));
  if (!absolutePath.startsWith(`${uploadsRoot}${path.sep}`)) {
    throw new Error('Skin scan image path is outside the private upload directory');
  }
  return fs.readFile(absolutePath);
};

type RawOverlays = Record<string, Record<string, string>>;

const saveOverlayFiles = async (
  sessionId: string,
  rawOverlays: RawOverlays,
): Promise<Record<string, Record<string, string>>> => {
  const uploadsDir = path.resolve(process.cwd(), 'uploads', 'skin-scans');
  await fs.mkdir(uploadsDir, { recursive: true });

  const savedPaths: Record<string, Record<string, string>> = {};

  for (const [metric, angles] of Object.entries(rawOverlays)) {
    savedPaths[metric] = {};
    for (const [angle, base64Data] of Object.entries(angles)) {
      const buffer = Buffer.from(base64Data, 'base64');
      const filename = `overlay-${sessionId}-${metric}-${angle.toLowerCase()}.png`;
      const filePath = path.join(uploadsDir, filename);
      await fs.writeFile(filePath, buffer);
      savedPaths[metric][angle] = `uploads/skin-scans/${filename}`;
    }
  }

  return savedPaths;
};

export const mlServiceProvider: SkinScanAnalysisProvider = {
  name: 'cosmo-skin-analysis',
  version: 'research-v1',
  async analyze(input) {
    if (!env.SKIN_ANALYSIS_URL) throw new Error('SKIN_ANALYSIS_URL is not configured');
    const formData = new FormData();
    for (const image of input.images) {
      const content = await getStoredImage(image.imagePath);
      const fieldName = image.angle.toLowerCase();
      formData.append(fieldName, new Blob([content], { type: 'image/webp' }), `${fieldName}.webp`);
    }

    const endpoint = new URL('/v1/analyze', env.SKIN_ANALYSIS_URL);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: env.SKIN_ANALYSIS_API_KEY ? { 'x-api-key': env.SKIN_ANALYSIS_API_KEY } : undefined,
      body: formData,
      signal: AbortSignal.timeout(env.SKIN_ANALYSIS_TIMEOUT_MS),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Skin analysis service returned ${response.status}${body ? `: ${body.slice(0, 300)}` : ''}`);
    }
    const raw = await response.json();
    const rawOverlays: RawOverlays | undefined = raw.overlays;
    const analysis = analysisSchema.parse(raw) as SkinScanAnalysis;

    if (rawOverlays && Object.keys(rawOverlays).length > 0) {
      const savedPaths = await saveOverlayFiles(input.sessionId, rawOverlays);
      for (const [metricKey, anglePaths] of Object.entries(savedPaths)) {
        if (metricKey === 'zoneGrid') {
          // Zone grid overlay goes into faceParsing
          if (analysis.faceParsing) {
            (analysis.faceParsing as Record<string, unknown>).zoneGridOverlay = anglePaths;
          }
          continue;
        }
        // All other overlays (pigmentation, redness, acne, wrinkles, skinChanges)
        // are keyed by metric name with angle sub-keys — store in metric details
        const metricObj = analysis.metrics[metricKey as keyof typeof analysis.metrics];
        if (metricObj) {
          // Merge with existing overlays (overview + close-up angles)
          const existing = (metricObj.details as Record<string, unknown> | undefined)?.overlays as Record<string, string> | undefined;
          metricObj.details = { ...metricObj.details, overlays: { ...existing, ...anglePaths } };
        } else if (metricKey === 'skinChanges' && analysis.faceParsing) {
          // skinChanges is not a metric — store in faceParsing
          (analysis.faceParsing as Record<string, unknown>).skinChangesOverlay = anglePaths;
        }
      }
    }

    // Save zone closeup images from base64 to files (from faceParsing.zones and faceParsing.zoneCloseups)
    const fp = analysis.faceParsing as Record<string, unknown> | undefined;
    if (fp) {
      const uploadsDir = path.resolve(process.cwd(), 'uploads', 'skin-scans');
      await fs.mkdir(uploadsDir, { recursive: true });
      for (const section of ['zones', 'zoneCloseups']) {
        const items = fp[section] as Record<string, Record<string, unknown>> | undefined;
        if (!items) continue;
        for (const [zoneName, zoneData] of Object.entries(items)) {
          if (typeof zoneData.closeup === 'string' && zoneData.closeup.length > 0) {
            const buffer = Buffer.from(zoneData.closeup, 'base64');
            const filename = `zone-${input.sessionId}-${section}-${zoneName}.jpg`;
            const filePath = path.join(uploadsDir, filename);
            await fs.writeFile(filePath, buffer);
            zoneData.closeup = `uploads/skin-scans/${filename}`;
          }
        }
      }
    }

    return analysis;
  },
};

export const getConfiguredSkinScanProvider = (): SkinScanAnalysisProvider =>
  env.SKIN_ANALYSIS_URL ? mlServiceProvider : qualityOnlyProvider;
