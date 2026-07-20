import path from 'path';
import fs from 'fs/promises';
import { Prisma, SkinScanAngle, SkinScanStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/error.middleware';
import { processAndSaveImage } from '../../utils/imageProcessor';
import { assessSkinScanImage } from './skin-scans.quality';
import { getConfiguredSkinScanProvider } from './skin-scans.provider';
import {
  REQUIRED_SCAN_ANGLES,
  type SkinScanCaptureContext,
  type SkinScanImageQuality,
} from './skin-scans.types';

type UploadedScanFile = Express.Multer.File & { fieldname: string };

const fieldToAngle: Record<string, SkinScanAngle> = {
  front: SkinScanAngle.FRONT,
  left: SkinScanAngle.LEFT,
  right: SkinScanAngle.RIGHT,
};

const sessionInclude = {
  images: {
    orderBy: { angle: 'asc' as const },
  },
} satisfies Prisma.SkinScanSessionInclude;

const removeStoredScanImage = async (imagePath: string) => {
  const uploadsRoot = path.resolve(process.cwd(), 'uploads', 'skin-scans');
  const absolutePath = path.resolve(process.cwd(), imagePath.replace(/^[/\\]+/, ''));
  if (!absolutePath.startsWith(`${uploadsRoot}${path.sep}`)) return;
  await fs.unlink(absolutePath).catch(() => undefined);
};

const getOwnedSession = async (userId: string, sessionId: string) => {
  const session = await prisma.skinScanSession.findFirst({
    where: { id: sessionId, userId },
    include: sessionInclude,
  });
  if (!session) throw new AppError('Nie znaleziono sesji skanowania', 404);
  return session;
};

export const createSession = async (userId: string, captureContext: SkinScanCaptureContext) => {
  const provider = getConfiguredSkinScanProvider();
  return prisma.skinScanSession.create({
    data: {
      userId,
      consentAcceptedAt: new Date(),
      captureContext: captureContext as Prisma.InputJsonValue,
      analysisProvider: provider.name,
      analysisVersion: provider.version,
    },
    include: sessionInclude,
  });
};

export const listSessions = async (userId: string) => {
  return prisma.skinScanSession.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: sessionInclude,
  });
};

export const getSession = async (userId: string, sessionId: string) => getOwnedSession(userId, sessionId);

export const uploadImages = async (userId: string, sessionId: string, files: UploadedScanFile[]) => {
  const session = await getOwnedSession(userId, sessionId);
  if (session.status === SkinScanStatus.COMPLETED) {
    throw new AppError('Zakończonego skanu nie można nadpisać. Rozpocznij nową sesję.', 409);
  }
  if (files.length === 0) throw new AppError('Nie przesłano żadnego zdjęcia', 400);

  const uniqueAngles = new Set<SkinScanAngle>();
  const prepared: Array<{
    angle: SkinScanAngle;
    imagePath: string;
    width: number;
    height: number;
    quality: SkinScanImageQuality;
  }> = [];

  try {
    for (const file of files) {
      const angle = fieldToAngle[file.fieldname];
      if (!angle || uniqueAngles.has(angle)) throw new AppError('Każdy kąt może zawierać tylko jedno zdjęcie', 400);
      uniqueAngles.add(angle);
      const assessed = await assessSkinScanImage(file.buffer);
      const imagePath = await processAndSaveImage(file.buffer, 'skin-scans');
      prepared.push({ angle, imagePath, ...assessed });
    }

    const previousPaths = session.images
      .filter((image) => uniqueAngles.has(image.angle))
      .map((image) => image.imagePath);

    await prisma.$transaction(async (tx) => {
      for (const image of prepared) {
        await tx.skinScanImage.upsert({
          where: { sessionId_angle: { sessionId, angle: image.angle } },
          create: {
            sessionId,
            angle: image.angle,
            imagePath: image.imagePath,
            width: image.width,
            height: image.height,
            quality: image.quality as unknown as Prisma.InputJsonValue,
          },
          update: {
            imagePath: image.imagePath,
            width: image.width,
            height: image.height,
            quality: image.quality as unknown as Prisma.InputJsonValue,
            capturedAt: new Date(),
          },
        });
      }
      await tx.skinScanSession.update({
        where: { id: sessionId },
        data: {
          status: SkinScanStatus.CAPTURING,
          qualitySummary: Prisma.JsonNull,
          analysis: Prisma.JsonNull,
          completedAt: null,
        },
      });
    });

    await Promise.all(previousPaths.map(removeStoredScanImage));
    return getOwnedSession(userId, sessionId);
  } catch (error) {
    await Promise.all(prepared.map((image) => removeStoredScanImage(image.imagePath)));
    throw error;
  }
};

export const completeSession = async (userId: string, sessionId: string) => {
  const session = await getOwnedSession(userId, sessionId);
  if (session.status === SkinScanStatus.COMPLETED) return session;
  const availableAngles = new Set(session.images.map((image) => image.angle));
  const missingAngles = REQUIRED_SCAN_ANGLES.filter((angle) => !availableAngles.has(angle as SkinScanAngle));
  if (missingAngles.length > 0) {
    throw new AppError(`Brakuje zdjęć: ${missingAngles.join(', ')}`, 400);
  }

  const images = session.images.map((image) => ({
    angle: image.angle,
    quality: image.quality as unknown as SkinScanImageQuality,
  }));
  const failedAngles = images.filter((image) => !image.quality.passed).map((image) => image.angle);
  const averageScore = Math.round(
    images.reduce((sum, image) => sum + image.quality.score, 0) / Math.max(1, images.length),
  );
  const qualitySummary = {
    schemaVersion: '1.0',
    passed: failedAngles.length === 0,
    averageScore,
    failedAngles,
  };

  if (failedAngles.length > 0) {
    return prisma.skinScanSession.update({
      where: { id: sessionId },
      data: {
        status: SkinScanStatus.NEEDS_RETAKE,
        qualitySummary: qualitySummary as Prisma.InputJsonValue,
        analysis: Prisma.JsonNull,
        completedAt: null,
      },
      include: sessionInclude,
    });
  }

  try {
    const provider = getConfiguredSkinScanProvider();
    const analysis = await provider.analyze({
      sessionId,
      images: session.images.map(({ angle, imagePath }) => ({ angle, imagePath })),
    });
    return prisma.skinScanSession.update({
      where: { id: sessionId },
      data: {
        status: SkinScanStatus.COMPLETED,
        qualitySummary: qualitySummary as Prisma.InputJsonValue,
        analysis: analysis as unknown as Prisma.InputJsonValue,
        analysisProvider: provider.name,
        analysisVersion: provider.version,
        completedAt: new Date(),
      },
      include: sessionInclude,
    });
  } catch (error) {
    await prisma.skinScanSession.update({
      where: { id: sessionId },
      data: { status: SkinScanStatus.FAILED },
    });
    throw error;
  }
};

const removeSessionOverlays = async (session: Awaited<ReturnType<typeof getOwnedSession>>) => {
  const analysis = session.analysis as Record<string, unknown> | null;
  if (!analysis) return;

  const metrics = analysis.metrics as Record<string, Record<string, unknown>> | undefined;
  if (!metrics) return;

  const paths: string[] = [];
  for (const metric of Object.values(metrics)) {
    const details = metric.details as Record<string, unknown> | undefined;
    const overlays = details?.overlays as Record<string, string> | undefined;
    if (overlays) {
      paths.push(...Object.values(overlays));
    }
  }

  await Promise.all(paths.map(removeStoredScanImage));
};

export const deleteSession = async (userId: string, sessionId: string) => {
  const session = await getOwnedSession(userId, sessionId);
  await removeSessionOverlays(session);
  await prisma.skinScanSession.delete({ where: { id: session.id } });
  await Promise.all(session.images.map((image) => removeStoredScanImage(image.imagePath)));
};
