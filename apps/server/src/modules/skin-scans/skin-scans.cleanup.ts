import fs from 'fs/promises';
import path from 'path';
import { prisma } from '../../config/prisma';

/**
 * Extract ALL file paths from a session's analysis JSON:
 * - metric overlays (per angle)
 * - faceParsing zone grid / skin changes overlays
 * - zone closeup thumbnails
 */
export const extractAnalysisFilePaths = (analysis: Record<string, unknown> | null): string[] => {
  if (!analysis) return [];
  const paths: string[] = [];

  const metrics = analysis.metrics as Record<string, Record<string, unknown>> | undefined;
  if (metrics) {
    for (const metric of Object.values(metrics)) {
      const details = metric.details as Record<string, unknown> | undefined;
      const overlays = details?.overlays as Record<string, string> | undefined;
      if (overlays) paths.push(...Object.values(overlays));
    }
  }

  const fp = analysis.faceParsing as Record<string, unknown> | undefined;
  if (fp) {
    for (const key of ['zoneGridOverlay', 'skinChangesOverlay'] as const) {
      const overlay = fp[key] as Record<string, string> | undefined;
      if (overlay) paths.push(...Object.values(overlay));
    }
    for (const section of ['zones', 'zoneCloseups'] as const) {
      const items = fp[section] as Record<string, Record<string, unknown>> | undefined;
      if (!items) continue;
      for (const zone of Object.values(items)) {
        if (typeof zone.closeup === 'string' && zone.closeup.length > 0) {
          paths.push(zone.closeup);
        }
      }
    }
  }

  return paths;
};

const removeFile = async (filePath: string) => {
  const uploadsRoot = path.resolve(process.cwd(), 'uploads', 'skin-scans');
  const absolutePath = path.resolve(process.cwd(), filePath.replace(/^[/\\]+/, ''));
  if (!absolutePath.startsWith(`${uploadsRoot}${path.sep}`)) return;
  await fs.unlink(absolutePath).catch(() => undefined);
};

const runCleanup = async () => {
  try {
    const users = await prisma.skinScanSession.findMany({
      where: { status: 'COMPLETED' },
      select: { userId: true },
      distinct: ['userId'],
    });

    for (const { userId } of users) {
      const sessions = await prisma.skinScanSession.findMany({
        where: { userId, status: 'COMPLETED' },
        orderBy: { completedAt: 'asc' },
        include: { images: true },
      });

      if (sessions.length <= 1) continue;

      const firstId = sessions[0].id;
      const latestId = sessions[sessions.length - 1].id;
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      for (const session of sessions) {
        if (session.id === firstId || session.id === latestId) continue;
        if (session.imagesDeletedAt) continue;
        if (!session.completedAt || session.completedAt > cutoff) continue;

        for (const image of session.images) {
          if (image.imagePath) await removeFile(image.imagePath);
        }

        const analysisPaths = extractAnalysisFilePaths(session.analysis as Record<string, unknown> | null);
        for (const p of analysisPaths) {
          await removeFile(p);
        }

        await prisma.$transaction([
          prisma.skinScanSession.update({
            where: { id: session.id },
            data: { imagesDeletedAt: new Date() },
          }),
          ...session.images.map((img) =>
            prisma.skinScanImage.update({
              where: { id: img.id },
              data: { imagePath: '' },
            }),
          ),
        ]);

        console.log(`[skin-scan-cleanup] Deleted images for session ${session.id} (user ${userId})`);
      }
    }
  } catch (error) {
    console.error('[skin-scan-cleanup] Error during cleanup:', error);
  }
};

export const initializeSkinScanCleanup = () => {
  setTimeout(() => runCleanup(), 10_000);
  setInterval(runCleanup, 60 * 60 * 1000);
  console.log('Skin scan image cleanup scheduler initialized (hourly)');
};
