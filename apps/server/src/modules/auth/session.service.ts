import crypto from 'crypto';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { signToken } from '../../utils/jwt';

export const ROTATION_GRACE_MS = 60_000;
const DEVICE_TOKEN_TTL_DAYS = 400;
export const DEVICE_TOKEN_TTL_MS = DEVICE_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

/**
 * Jedyne źródło prawdy o długości życia refresh tokenu — kontroler importuje
 * te same stałe, żeby ciasteczko, wpis w bazie i `exp` w JWT nie rozjechały się.
 */
export const LONG_LIVED_REFRESH_TTL_DAYS = 400;
export const LONG_LIVED_REFRESH_TTL = `${LONG_LIVED_REFRESH_TTL_DAYS}d`;
export const LONG_LIVED_REFRESH_TTL_MS = LONG_LIVED_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000;

export const hashToken = (raw: string) =>
  crypto.createHash('sha256').update(raw).digest('hex');

export const generateRawToken = () => crypto.randomBytes(32).toString('hex');

/**
 * Podpisuje refresh token. `jti` gwarantuje unikalność: bez niego dwa podpisy
 * złożone w tej samej sekundzie dla tego samego użytkownika są bajt w bajt
 * identyczne, co kończy się kolizją na unikalnym `RefreshToken.tokenHash` —
 * a równoległe odświeżenie z PWA i z karty przeglądarki to przebieg, który
 * okno karencji ma właśnie obsługiwać.
 */
export const signRefreshToken = (userId: string) =>
  signToken({ id: userId, jti: crypto.randomUUID() }, env.JWT_REFRESH_SECRET, LONG_LIVED_REFRESH_TTL);

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
 *
 * Następca musi być **podpisanym JWT**, a nie losowym ciągiem: handler `refresh`
 * weryfikuje ciasteczko przez `verifyToken` i korzysta z `decoded.iat`, żeby odciąć
 * sesje starsze niż `passwordChangedAt`. Losowy token przechodziłby przez tę pętlę
 * jako nieprawidłowy (401 przy każdej drugiej rotacji) i pozbawiałby nas jedynego
 * mechanizmu unieważniania sesji po zmianie hasła.
 */
export const rotateRefreshToken = async (
  rawToken: string,
  userId: string,
): Promise<RotationResult> => {
  const tokenHash = hashToken(rawToken);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!stored || stored.expiresAt <= new Date()) return { stale: true };

  // Token istnieje, ale należy do innego konta niż przekazany userId — traktujemy
  // go jak nieznany, bez ujawniania wołającemu, że doszło do rozjazdu właściciela.
  // tokenHash jest unikalny globalnie (nie per-user), więc bez tego sprawdzenia
  // rozjazd cicho wystawiłby ważny refresh token powiązany z cudzym kontem.
  if (stored.userId !== userId) return { stale: true };

  const nextRaw = signRefreshToken(userId);
  const expiresAt = new Date(Date.now() + LONG_LIVED_REFRESH_TTL_MS);
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

export const issueDeviceToken = async (userId: string, label?: string) => {
  const raw = generateRawToken();
  await prisma.deviceToken.create({
    data: {
      tokenHash: hashToken(raw),
      userId,
      label: label ?? null,
      expiresAt: new Date(Date.now() + DEVICE_TOKEN_TTL_MS),
    },
  });
  return raw;
};

export const consumeDeviceToken = async (rawToken: string) => {
  const tokenHash = hashToken(rawToken);
  const stored = await prisma.deviceToken.findUnique({ where: { tokenHash } });

  if (!stored || stored.expiresAt <= new Date()) return null;

  // Sliding window: każde użycie przesuwa termin ważności.
  await prisma.deviceToken.update({
    where: { tokenHash },
    data: { lastUsedAt: new Date(), expiresAt: new Date(Date.now() + DEVICE_TOKEN_TTL_MS) },
  });

  return stored.userId;
};

export const revokeDeviceTokens = (userId: string) =>
  prisma.deviceToken.deleteMany({ where: { userId } });

/**
 * Sprząta wygasłe refresh tokeny użytkownika.
 *
 * Sprzątanie wewnątrz `rotateRefreshToken` filtruje po `rotatedAt`, a Prisma na
 * polu nullowalnym wyklucza NULL-e — wiersze zakładane przez `refresh-device`
 * (nigdy nierotowane) nie trafiłyby tam nigdy. Ten helper łapie je po `expiresAt`.
 */
export const deleteExpiredRefreshTokens = (userId: string) =>
  prisma.refreshToken.deleteMany({ where: { userId, expiresAt: { lt: new Date() } } });

/**
 * Unieważnia sesję przy świadomym wylogowaniu: kasuje refresh token z ciasteczka
 * i, jeśli żądanie niesie `X-Device-Token`, token **tylko tego jednego urządzenia**.
 *
 * Wylogowanie jest operacją lokalną dla urządzenia — nie kasujemy tokenów innych
 * urządzeń tego samego użytkownika, bo wylogowanie na komputerze nie może przerywać
 * trwałej sesji (i powiadomień push) w PWA na telefonie. Odcięcie wszystkich urządzeń
 * naraz nadal jest możliwe przez zmianę hasła (`revokeDeviceTokens`), która pozostaje
 * awaryjnym mechanizmem globalnego wylogowania.
 *
 * Brak nagłówka `X-Device-Token` nie jest błędem i nie kasuje żadnego wiersza
 * `DeviceToken` — nie wiadomo, którego urządzenia dotyczy wylogowanie, a zgadywanie
 * „wszystkie” jest właśnie tym, co ta funkcja ma przestać robić.
 */
export const revokeSessionOnLogout = async (
  refreshCookie?: string | null,
  deviceTokenRaw?: string | null,
): Promise<void> => {
  if (deviceTokenRaw) {
    await prisma.deviceToken.deleteMany({
      where: { tokenHash: hashToken(deviceTokenRaw) },
    });
  }

  if (refreshCookie) {
    const tokenHash = hashToken(refreshCookie);
    await prisma.refreshToken.deleteMany({ where: { tokenHash } });
  }
};
