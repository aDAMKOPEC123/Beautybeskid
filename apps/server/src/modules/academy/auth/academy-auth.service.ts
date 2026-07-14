import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../../../config/prisma';
import { AppError } from '../../../middleware/error.middleware';
import { env } from '../../../config/env';
import { parseDurationMs, signToken } from '../../../utils/jwt';
import { verifyGoogleToken } from '../../auth/google.strategy';

const refreshTtl = '30d';
const academySecret = `${env.JWT_SECRET}:academy`;
const toUser = (user: { id: string; email: string; name: string; role: string }) => ({ id: user.id, email: user.email, name: user.name, role: user.role });
const hash = (value: string) => crypto.createHash('sha256').update(value).digest('hex');
const issue = async (user: { id: string; email: string; name: string; role: string }) => {
  const accessToken = signToken({ id: user.id, role: user.role, scope: 'academy' }, academySecret, '30m');
  const rawRefreshToken = crypto.randomBytes(48).toString('hex');
  await prisma.academyRefreshToken.create({ data: { tokenHash: hash(rawRefreshToken), userId: user.id, expiresAt: new Date(Date.now() + parseDurationMs(refreshTtl)) } });
  return { accessToken, refreshToken: rawRefreshToken, user: toUser(user) };
};

export const register = async (input: { email: string; password: string; name: string }) => {
  const email = input.email.trim().toLowerCase();
  if (!email || !input.password || !input.name.trim()) throw new AppError('Uzupełnij imię, email i hasło', 400);
  if (input.password.length < 8) throw new AppError('Hasło musi mieć co najmniej 8 znaków', 400);
  if (await prisma.academyUser.findUnique({ where: { email } })) throw new AppError('Konto Akademii z tym adresem email już istnieje', 409);
  const user = await prisma.academyUser.create({ data: { email, name: input.name.trim(), passwordHash: await bcrypt.hash(input.password, 12) } });
  return issue(user);
};

export const login = async (input: { email: string; password: string }) => {
  const user = await prisma.academyUser.findUnique({ where: { email: input.email.trim().toLowerCase() } });
  if (!user?.passwordHash || !(await bcrypt.compare(input.password, user.passwordHash))) throw new AppError('Nieprawidłowy email lub hasło', 401);
  return issue(user);
};

export const loginWithGoogle = async (credential: string) => {
  if (!credential) throw new AppError('Brak tokenu Google', 400);
  const profile = await verifyGoogleToken(credential);
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
    if (!user.googleId) user = await prisma.academyUser.update({ where: { id: user.id }, data: { googleId: profile.googleId } });
  } else {
    user = await prisma.academyUser.create({ data: { email, name: salonUser?.name || profile.name, googleId: profile.googleId } });
  }
  return issue(user);
};

export const refresh = async (rawRefreshToken?: string) => {
  if (!rawRefreshToken) throw new AppError('Brak sesji Akademii', 401);
  const record = await prisma.academyRefreshToken.findUnique({ where: { tokenHash: hash(rawRefreshToken) }, include: { user: true } });
  if (!record || record.expiresAt <= new Date()) { if (record) await prisma.academyRefreshToken.delete({ where: { id: record.id } }); throw new AppError('Sesja Akademii wygasła', 401); }
  await prisma.academyRefreshToken.delete({ where: { id: record.id } });
  return issue(record.user);
};

export const logout = async (rawRefreshToken?: string) => { if (rawRefreshToken) await prisma.academyRefreshToken.deleteMany({ where: { tokenHash: hash(rawRefreshToken) } }); };
