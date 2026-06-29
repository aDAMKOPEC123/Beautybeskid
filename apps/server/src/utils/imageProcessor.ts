// filepath: apps/server/src/utils/imageProcessor.ts
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

export const processAndSaveImage = async (
  buffer: Buffer,
  folder: string = 'general',
  options?: { cropX?: number; cropY?: number }
): Promise<string> => {
  const targetDir = path.join(UPLOADS_DIR, folder);
  await fs.mkdir(targetDir, { recursive: true });

  const filename = `${crypto.randomUUID()}.webp`;
  const filepath = path.join(targetDir, filename);

  if (folder === 'hero' || folder === 'recommended') {
    const outputW = folder === 'hero' ? 1920 : 1200;
    const outputH = folder === 'hero' ? 1080 : 675;

    const meta = await sharp(buffer).metadata();
    const srcW = meta.width!;
    const srcH = meta.height!;

    const targetRatio = 16 / 9;
    let cropW: number, cropH: number, left: number, top: number;

    if (srcW / srcH > targetRatio) {
      // image wider than 16:9 — crop sides
      cropH = srcH;
      cropW = Math.round(srcH * targetRatio);
      const maxLeft = srcW - cropW;
      left = Math.round((maxLeft * (options?.cropX ?? 50)) / 100);
      top = 0;
    } else {
      // image taller than 16:9 — crop top/bottom
      cropW = srcW;
      cropH = Math.round(srcW / targetRatio);
      const maxTop = srcH - cropH;
      top = Math.round((maxTop * (options?.cropY ?? 50)) / 100);
      left = 0;
    }

    await sharp(buffer)
      .extract({ left, top, width: cropW, height: cropH })
      .resize(outputW, outputH, { fit: 'fill' })
      .webp({ quality: 75 })
      .toFile(filepath);
  } else {
    await sharp(buffer)
      .resize(1200, 1200, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toFile(filepath);
  }

  return `/uploads/${folder}/${filename}`;
};

export const processAndSaveThumbnail = async (
  buffer: Buffer,
  folder: string = 'thumbnails'
): Promise<string> => {
  const targetDir = path.join(UPLOADS_DIR, folder);
  await fs.mkdir(targetDir, { recursive: true });

  const filename = `${crypto.randomUUID()}.webp`;
  const filepath = path.join(targetDir, filename);

  await sharp(buffer)
    .resize(400, 400, {
      fit: 'cover',
    })
    .webp({ quality: 80 })
    .toFile(filepath);

  return `/uploads/${folder}/${filename}`;
};
