import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { prisma } from '../../../config/prisma';
import { AppError } from '../../../middleware/error.middleware';

const root = path.join(process.cwd(), 'uploads', 'academy');

const focalCrop = (
  buffer: Buffer,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  cropX: number,
  cropY: number,
) => {
  const scale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const resizedWidth = Math.max(targetWidth, Math.ceil(sourceWidth * scale));
  const resizedHeight = Math.max(targetHeight, Math.ceil(sourceHeight * scale));
  const left = Math.min(resizedWidth - targetWidth, Math.max(0, Math.round((resizedWidth - targetWidth) * cropX / 100)));
  const top = Math.min(resizedHeight - targetHeight, Math.max(0, Math.round((resizedHeight - targetHeight) * cropY / 100)));
  return sharp(buffer).rotate().resize(resizedWidth, resizedHeight, { fit: 'fill' }).extract({ left, top, width: targetWidth, height: targetHeight });
};

export const uploadAcademyMedia = async (file: Express.Multer.File | undefined, input: any) => {
  if (!file) throw new AppError('Wybierz obraz', 400);
  const alt = String(input.alt || '').trim().slice(0, 300);
  if (!alt) throw new AppError('Podaj tekst alternatywny', 400);

  const metadata = await sharp(file.buffer).metadata();
  if (!metadata.width || !metadata.height) throw new AppError('Nie udało się odczytać wymiarów obrazu', 400);
  const rotated = [5, 6, 7, 8].includes(metadata.orientation ?? 1);
  const sourceWidth = rotated ? metadata.height : metadata.width;
  const sourceHeight = rotated ? metadata.width : metadata.height;
  const cropX = Math.max(0, Math.min(100, Number(input.cropX) || 50));
  const cropY = Math.max(0, Math.min(100, Number(input.cropY) || 50));
  const id = crypto.randomUUID();
  const desktop = focalCrop(file.buffer, sourceWidth, sourceHeight, 1920, 1080, cropX, cropY);
  const mobile = focalCrop(file.buffer, sourceWidth, sourceHeight, 900, 1200, cropX, cropY);
  const thumbnail = focalCrop(file.buffer, sourceWidth, sourceHeight, 480, 270, cropX, cropY);

  await fs.mkdir(root, { recursive: true });
  await Promise.all([
    desktop.clone().webp({ quality: 80 }).toFile(path.join(root, `${id}-desktop.webp`)),
    desktop.clone().avif({ quality: 55 }).toFile(path.join(root, `${id}-desktop.avif`)),
    mobile.clone().webp({ quality: 80 }).toFile(path.join(root, `${id}-mobile.webp`)),
    mobile.clone().avif({ quality: 55 }).toFile(path.join(root, `${id}-mobile.avif`)),
    thumbnail.webp({ quality: 75 }).toFile(path.join(root, `${id}-thumb.webp`)),
  ]);

  return prisma.academyMedia.create({ data: {
    url: `/uploads/academy/${id}-desktop.webp`,
    avifUrl: `/uploads/academy/${id}-desktop.avif`,
    mobileUrl: `/uploads/academy/${id}-mobile.webp`,
    mobileAvifUrl: `/uploads/academy/${id}-mobile.avif`,
    thumbnailUrl: `/uploads/academy/${id}-thumb.webp`,
    alt,
    kind: String(input.kind || 'GENERAL').slice(0, 40),
    width: metadata.width,
    height: metadata.height,
    sizeBytes: file.size,
  } });
};

export const listAcademyMedia = () => prisma.academyMedia.findMany({ orderBy: { createdAt: 'desc' }, take: 300 });
