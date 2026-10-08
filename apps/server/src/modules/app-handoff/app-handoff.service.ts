import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { AppError } from '../../middleware/error.middleware';
import { buildMatchKey, normalizeHandoffPath } from './app-handoff.rules';

const HANDOFF_TTL_MS = 15 * 60_000;

export const saveHandoff = async (ip: string | undefined, device: string, rawPath: string) => {
  const path = normalizeHandoffPath(rawPath);
  if (!path) throw new AppError('Nieprawidłowy adres strony', 400);

  const matchKey = buildMatchKey(env.JWT_SECRET, ip, device);
  if (!matchKey) throw new AppError('Nie udało się zapamiętać strony', 400);

  const now = new Date();
  await prisma.$transaction([
    // Zostaje tylko najnowszy link z danego urządzenia; przy okazji sprzątamy przeterminowane.
    prisma.appHandoff.deleteMany({
      where: { OR: [{ matchKey }, { expiresAt: { lt: now } }] },
    }),
    prisma.appHandoff.create({
      data: { matchKey, path, expiresAt: new Date(now.getTime() + HANDOFF_TTL_MS) },
    }),
  ]);
};

// Link jest jednorazowy: odbiór usuwa go, żeby aplikacja nie skakała do niego przy każdym otwarciu.
export const claimHandoff = async (ip: string | undefined, device: string): Promise<string | null> => {
  const matchKey = buildMatchKey(env.JWT_SECRET, ip, device);
  if (!matchKey) return null;

  const pending = await prisma.appHandoff.findFirst({
    where: { matchKey, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
    select: { path: true },
  });
  if (!pending) return null;

  await prisma.appHandoff.deleteMany({ where: { matchKey } });
  return normalizeHandoffPath(pending.path);
};
