import crypto from 'crypto';
import { prisma } from '../../config/prisma';

export const ROTATION_GRACE_MS = 60_000;
const DEVICE_TOKEN_TTL_DAYS = 400;
export const DEVICE_TOKEN_TTL_MS = DEVICE_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

export const hashToken = (raw: string) =>
  crypto.createHash('sha256').update(raw).digest('hex');

export const generateRawToken = () => crypto.randomBytes(32).toString('hex');

type RotationResult =
  | { stale: false; token: string; expiresAt: Date }
  | { stale: true };

/**
 * Rotuje refresh token, zostawiając staremu 60-sekundowe okno karencji.
 *
 * Bez karencji dwa konteksty aplikacji (zainstalowana PWA i karta przeglądarki)
 * potrafią odświeżyć sesję jednocześnie: pierwszy skasowałby token, drugi
 * dostałby 401 i wylogował użytkownika. Zamiast kasować, skracamy staremu
 * termin ważności — przez minutę obsłuży drugi kontekst, po czym wygaśnie sam.
 *
 * Celowo nie wykrywamy tu ponownego użycia tokenu: PWA potrafi leżeć w tle
 * godzinami i wrócić ze starym tokenem, więc kasowanie sesji przy takim
 * zdarzeniu wylogowywałoby uczciwych użytkowników. Token po karencji dostaje
 * zwykłe 401, a token urządzenia odtwarza sesję.
 */
export const rotateRefreshToken = async (
  rawToken: string,
  userId: string,
  ttlMs: number,
): Promise<RotationResult> => {
  const tokenHash = hashToken(rawToken);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!stored || stored.expiresAt <= new Date()) return { stale: true };

  // Token istnieje, ale należy do innego konta niż przekazany userId — traktujemy
  // go jak nieznany, bez ujawniania wołającemu, że doszło do rozjazdu właściciela.
  // tokenHash jest unikalny globalnie (nie per-user), więc bez tego sprawdzenia
  // rozjazd cicho wystawiłby ważny refresh token powiązany z cudzym kontem.
  if (stored.userId !== userId) return { stale: true };

  const nextRaw = generateRawToken();
  const expiresAt = new Date(Date.now() + ttlMs);
  const graceExpiry = new Date(Date.now() + ROTATION_GRACE_MS);

  await prisma.$transaction([
    // Skracamy ważność tylko przy pierwszej rotacji — powtórne użycie w oknie
    // karencji nie przedłuża go w nieskończoność.
    prisma.refreshToken.updateMany({
      where: { tokenHash, rotatedAt: null },
      data: { rotatedAt: new Date(), expiresAt: graceExpiry },
    }),
    prisma.refreshToken.create({
      data: { tokenHash: hashToken(nextRaw), userId, expiresAt },
    }),
    prisma.refreshToken.deleteMany({
      where: { userId, rotatedAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    }),
  ]);

  return { stale: false, token: nextRaw, expiresAt };
};
