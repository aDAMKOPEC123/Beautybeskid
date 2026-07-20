import sharp from 'sharp';
import type { SkinScanImageQuality, SkinScanQualityIssueCode } from './skin-scans.types';

const ANALYSIS_SIZE = 256;

type QualityIssue = SkinScanImageQuality['issues'][number];

const issue = (code: SkinScanQualityIssueCode, message: string): QualityIssue => ({ code, message });

const round = (value: number, digits = 1) => Number(value.toFixed(digits));

export const assessSkinScanImage = async (buffer: Buffer): Promise<{
  width: number;
  height: number;
  quality: SkinScanImageQuality;
}> => {
  const image = sharp(buffer, { failOn: 'error' }).rotate();
  const metadata = await image.metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  const { data, info } = await image
    .clone()
    .resize(ANALYSIS_SIZE, ANALYSIS_SIZE, { fit: 'inside', withoutEnlargement: true })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = info.width * info.height;
  let sum = 0;
  let sumSquared = 0;
  let clippedDark = 0;
  let clippedLight = 0;

  for (let index = 0; index < pixels; index += 1) {
    const value = data[index];
    sum += value;
    sumSquared += value * value;
    if (value <= 12) clippedDark += 1;
    if (value >= 243) clippedLight += 1;
  }

  const brightness = pixels > 0 ? sum / pixels : 0;
  const variance = pixels > 0 ? Math.max(0, sumSquared / pixels - brightness * brightness) : 0;
  const contrast = Math.sqrt(variance);

  let laplacianSum = 0;
  let laplacianSquaredSum = 0;
  let laplacianCount = 0;
  for (let y = 1; y < info.height - 1; y += 1) {
    for (let x = 1; x < info.width - 1; x += 1) {
      const index = y * info.width + x;
      const laplacian =
        4 * data[index]
        - data[index - 1]
        - data[index + 1]
        - data[index - info.width]
        - data[index + info.width];
      laplacianSum += laplacian;
      laplacianSquaredSum += laplacian * laplacian;
      laplacianCount += 1;
    }
  }
  const laplacianMean = laplacianCount > 0 ? laplacianSum / laplacianCount : 0;
  const sharpness = laplacianCount > 0
    ? Math.max(0, laplacianSquaredSum / laplacianCount - laplacianMean * laplacianMean)
    : 0;

  const clippedDarkPercent = pixels > 0 ? (clippedDark / pixels) * 100 : 100;
  const clippedLightPercent = pixels > 0 ? (clippedLight / pixels) * 100 : 100;
  const issues: QualityIssue[] = [];

  if (Math.min(width, height) < 640) {
    issues.push(issue('RESOLUTION_TOO_LOW', 'Użyj zdjęcia o rozdzielczości co najmniej 640 px na krótszym boku.'));
  }
  if (brightness < 55 || clippedDarkPercent > 18) {
    issues.push(issue('TOO_DARK', 'Twarz jest zbyt ciemna. Stań przodem do miękkiego, równomiernego światła.'));
  }
  if (brightness > 210 || clippedLightPercent > 18) {
    issues.push(issue('TOO_BRIGHT', 'Zdjęcie jest prześwietlone. Odsuń się od silnego źródła światła.'));
  }
  if (contrast < 22) {
    issues.push(issue('LOW_CONTRAST', 'Obraz ma zbyt mały kontrast. Oczyść obiektyw i popraw oświetlenie.'));
  }
  if (sharpness < 45) {
    issues.push(issue('POSSIBLY_BLURRED', 'Zdjęcie może być poruszone. Przytrzymaj telefon nieruchomo i spróbuj ponownie.'));
  }

  const resolutionScore = Math.min(1, Math.min(width, height) / 640);
  const brightnessScore = Math.max(0, 1 - Math.abs(brightness - 132) / 100);
  const contrastScore = Math.min(1, contrast / 45);
  const sharpnessScore = Math.min(1, sharpness / 180);
  const score = Math.round(
    100 * (resolutionScore * 0.2 + brightnessScore * 0.3 + contrastScore * 0.2 + sharpnessScore * 0.3),
  );

  return {
    width,
    height,
    quality: {
      passed: issues.length === 0,
      score: Math.max(0, Math.min(100, score)),
      brightness: round(brightness),
      contrast: round(contrast),
      sharpness: round(sharpness),
      clippedDarkPercent: round(clippedDarkPercent, 2),
      clippedLightPercent: round(clippedLightPercent, 2),
      issues,
    },
  };
};
