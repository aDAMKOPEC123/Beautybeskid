import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../../../config/prisma';
import { AppError } from '../../../middleware/error.middleware';
import { env } from '../../../config/env';
import { parseDurationMs, signToken } from '../../../utils/jwt';
import { sendEmail } from '../../../utils/email';
import { verifyGoogleToken } from '../../auth/google.strategy';
import { getCurrentVersions } from '../legal/legal.service';

const refreshTtl = '30d';
const academySecret = `${env.JWT_SECRET}:academy`;
const hash = (value: string) => crypto.createHash('sha256').update(value).digest('hex');
const toUser = (user: { id: string; email: string; name: string; role: string; emailVerifiedAt?: Date | null }) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  emailVerified: Boolean(user.emailVerifiedAt),
});

const issue = async (user: { id: string; email: string; name: string; role: string; emailVerifiedAt?: Date | null }) => {
  const accessToken = signToken({ id: user.id, role: user.role, scope: 'academy' }, academySecret, '30m');
  const rawRefreshToken = crypto.randomBytes(48).toString('hex');
  await prisma.academyRefreshToken.create({ data: { tokenHash: hash(rawRefreshToken), userId: user.id, expiresAt: new Date(Date.now() + parseDurationMs(refreshTtl)) } });
  return { accessToken, refreshToken: rawRefreshToken, user: toUser(user) };
};

type LegalAcceptance = { termsAccepted?: boolean; privacyAccepted?: boolean; termsVersion?: string; privacyVersion?: string };
const validateLegalAcceptance = async (input: LegalAcceptance) => {
  const versions = await getCurrentVersions();
  if (!input.termsAccepted || !input.privacyAccepted || input.termsVersion !== versions.termsVersion || input.privacyVersion !== versions.privacyVersion) {
    throw new AppError('Zaakceptuj aktualny Regulamin i Politykę prywatności', 400);
  }
  return versions;
};

const sendVerification = async (user: { id: string; email: string; name: string }) => {
  const raw = crypto.randomBytes(32).toString('hex');
  await prisma.academyUser.update({ where: { id: user.id }, data: { emailVerificationToken: hash(raw), emailVerificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } });
  const url = `${env.ACADEMY_URL ?? 'http://localhost:5174'}/potwierdz-email?token=${raw}`;
  await sendEmail(user.email, 'Potwierdź adres e-mail w Akademii', `<p>Dzień dobry ${user.name},</p><p>Potwierdź adres e-mail, klikając poniższy link:</p><p><a href="${url}">Potwierdź adres e-mail</a></p><p>Link jest ważny przez 24 godziny.</p>`);
};

export const register = async (input: { email: string; password: string; name: string } & LegalAcceptance) => {
  const email = input.email.trim().toLowerCase();
  if (!email || !input.password || !input.name.trim()) throw new AppError('Uzupełnij imię, email i hasło', 400);
  if (input.password.length < 8) throw new AppError('Hasło musi mieć co najmniej 8 znaków', 400);
  if (await prisma.academyUser.findUnique({ where: { email } })) throw new AppError('Konto Akademii z tym adresem email już istnieje', 409);
  const versions = await validateLegalAcceptance(input);
  const now = new Date();
  const user = await prisma.academyUser.create({ data: {
    email,
    name: input.name.trim(),
    passwordHash: await bcrypt.hash(input.password, 12),
    termsAcceptedAt: now,
    termsVersion: versions.termsVersion,
    privacyAcceptedAt: now,
    privacyVersion: versions.privacyVersion,
  } });
  void sendVerification(user).catch((error) => console.error('[academy-auth] verification email failed', error));
  return issue(user);
};

export const login = async (input: { email: string; password: string }) => {
  const user = await prisma.academyUser.findUnique({ where: { email: input.email.trim().toLowerCase() } });
  if (!user?.passwordHash || !(await bcrypt.compare(input.password, user.passwordHash))) throw new AppError('Nieprawidłowy email lub hasło', 401);
  return issue(user);
};

export const loginWithGoogle = async (input: { credential: string } & LegalAcceptance) => {
  if (!input.credential) throw new AppError('Brak tokenu Google', 400);
  const profile = await verifyGoogleToken(input.credential);
  const email = profile.email.trim().toLowerCase();
  const [byGoogleId, byEmail, salonUser] = await Promise.all([
    prisma.academyUser.findUnique({ where: { googleId: profile.googleId } }),
    prisma.academyUser.findUnique({ where: { email } }),
    prisma.user.findUnique({ where: { email }, select: { name: true } }),
  ]);
  if (byGoogleId && byEmail && byGoogleId.id !== byEmail.id) throw new AppError('To konto Google jest już połączone z innym kontem Akademii', 409);
  let user = byGoogleId ?? byEmail;
  if (user) {
    if (user.googleId && user.googleId !== profile.googleId) throw new AppError('Ten email jest połączony z innym kontem Google', 409);
    const needsLegalAcceptance = !user.termsAcceptedAt || !user.privacyAcceptedAt;
    const versions = needsLegalAcceptance ? await validateLegalAcceptance(input) : null;
    if (!user.googleId || !user.emailVerifiedAt || needsLegalAcceptance) user = await prisma.academyUser.update({ where: { id: user.id }, data: {
      googleId: profile.googleId,
      emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
      ...(versions ? { termsAcceptedAt: new Date(), termsVersion: versions.termsVersion, privacyAcceptedAt: new Date(), privacyVersion: versions.privacyVersion } : {}),
    } });
  } else {
    const versions = await validateLegalAcceptance(input);
    const now = new Date();
    user = await prisma.academyUser.create({ data: {
      email,
      name: salonUser?.name || profile.name,
      googleId: profile.googleId,
      emailVerifiedAt: now,
      termsAcceptedAt: now,
      termsVersion: versions.termsVersion,
      privacyAcceptedAt: now,
      privacyVersion: versions.privacyVersion,
    } });
  }
  return issue(user);
};

export const verifyEmail = async (rawToken: string) => {
  const user = await prisma.academyUser.findUnique({ where: { emailVerificationToken: hash(rawToken || '') } });
  if (!user || !user.emailVerificationExpiresAt || user.emailVerificationExpiresAt < new Date()) throw new AppError('Link potwierdzający jest nieprawidłowy lub wygasł', 400);
  await prisma.academyUser.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date(), emailVerificationToken: null, emailVerificationExpiresAt: null } });
};

export const resendVerification = async (userId: string) => {
  const user = await prisma.academyUser.findUnique({ where: { id: userId } });
  if (!user || user.emailVerifiedAt) return;
  if (user.emailVerificationToken && user.emailVerificationExpiresAt && user.emailVerificationExpiresAt > new Date(Date.now() + 23 * 60 * 60 * 1000)) {
    throw new AppError('Nowy link możesz wysłać po godzinie od poprzedniego', 429);
  }
  await sendVerification(user);
};

export const requestPasswordReset = async (emailInput: string) => {
  const user = await prisma.academyUser.findUnique({ where: { email: emailInput.trim().toLowerCase() } });
  if (!user?.passwordHash) return;
  const raw = crypto.randomBytes(32).toString('hex');
  await prisma.academyUser.update({ where: { id: user.id }, data: { passwordResetToken: hash(raw), passwordResetExpiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
  const url = `${env.ACADEMY_URL ?? 'http://localhost:5174'}/nowe-haslo?token=${raw}`;
  await sendEmail(user.email, 'Ustaw nowe hasło do Akademii', `<p>Dzień dobry ${user.name},</p><p><a href="${url}">Ustaw nowe hasło</a>.</p><p>Link jest ważny przez godzinę. Jeśli nie prosiłaś o zmianę, zignoruj tę wiadomość.</p>`);
};

export const resetPassword = async (rawToken: string, password: string) => {
  if (password.length < 8) throw new AppError('Hasło musi mieć co najmniej 8 znaków', 400);
  const user = await prisma.academyUser.findUnique({ where: { passwordResetToken: hash(rawToken || '') } });
  if (!user || !user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) throw new AppError('Link do zmiany hasła jest nieprawidłowy lub wygasł', 400);
  await prisma.$transaction([
    prisma.academyUser.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(password, 12), passwordResetToken: null, passwordResetExpiresAt: null } }),
    prisma.academyRefreshToken.deleteMany({ where: { userId: user.id } }),
  ]);
};

export const refresh = async (rawRefreshToken?: string) => {
  if (!rawRefreshToken) throw new AppError('Brak sesji Akademii', 401);
  const record = await prisma.academyRefreshToken.findUnique({ where: { tokenHash: hash(rawRefreshToken) }, include: { user: true } });
  if (!record || record.expiresAt <= new Date()) {
    if (record) await prisma.academyRefreshToken.delete({ where: { id: record.id } });
    throw new AppError('Sesja Akademii wygasła', 401);
  }
  await prisma.academyRefreshToken.delete({ where: { id: record.id } });
  return issue(record.user);
};

export const logout = async (rawRefreshToken?: string) => {
  if (rawRefreshToken) await prisma.academyRefreshToken.deleteMany({ where: { tokenHash: hash(rawRefreshToken) } });
};
