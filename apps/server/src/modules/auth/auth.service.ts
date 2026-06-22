// filepath: apps/server/src/modules/auth/auth.service.ts
import { prisma } from '../../config/prisma';
import bcrypt from 'bcryptjs';
import { AppError } from '../../middleware/error.middleware';
import { signToken } from '../../utils/jwt';
import { env } from '../../config/env';
import { RegisterInput, LoginInput } from '@cosmo/shared';
import { generateCode } from '../../utils/generateCode';
import { createWelcomeCodeForUser } from '../discount-codes/discount-codes.service';
import { verifyGoogleToken } from './google.strategy';
import crypto from 'crypto';
import { sendEmail } from '../../utils/email';

export const registerUser = async (data: RegisterInput & {
  ambassadorCode?: string;
  avatarPath?: string;
  termsAcceptedAt?: Date;
  marketingConsent?: boolean;
  photoConsent?: boolean;
}) => {
  const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
  if (existingUser) {
    throw new AppError('Użytkownik z tym adresem email już istnieje', 400);
  }

  // Generate unique ambassador code
  let ambassadorCode = '';
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = generateCode(8);
    const existing = await prisma.user.findUnique({ where: { ambassadorCode: candidate } });
    if (!existing) { ambassadorCode = candidate; break; }
  }
  if (!ambassadorCode) throw new AppError('Nie udało się wygenerować kodu ambasadora', 500);

  // Find referrer by ambassador code (silently ignore invalid code)
  let referrer = null;
  if (data.ambassadorCode) {
    referrer = await prisma.user.findUnique({ where: { ambassadorCode: data.ambassadorCode.trim().toUpperCase() } });
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email: data.email,
        passwordHash: hashedPassword,
        name: data.name,
        phone: data.phone,
        ambassadorCode,
        referredById: referrer?.id ?? null,
        avatarPath: data.avatarPath ?? null,
        termsAcceptedAt: data.termsAcceptedAt ?? new Date(),
        marketingConsent: data.marketingConsent ?? false,
        photoConsent: data.photoConsent ?? false,
        accountStatus: 'PENDING',
        emailVerificationToken: crypto.randomBytes(32).toString('hex'),
      },
    });

    if (referrer) {
      await createWelcomeCodeForUser(tx, newUser.id, referrer.id);
    }

    return newUser;
  });

  // Fire-and-forget: notify all admins of new registration
  prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } })
    .then(admins => {
      if (admins.length === 0) return;
      return prisma.notification.createMany({
        data: admins.map(admin => ({
          userId: admin.id,
          type: 'GENERIC' as const,
          title: 'Nowa rejestracja',
          body: `Nowa rejestracja: ${user.name} (${user.email})`,
        })),
      });
    })
    .catch(() => {/* ignore — don't fail registration */});

  // Send verification email (fire-and-forget — don't fail registration if email fails)
  if (user.emailVerificationToken) {
    if (!env.SERVER_URL && env.NODE_ENV === 'production') {
      console.error('[AUTH] SERVER_URL nie jest ustawione w produkcji — linki weryfikacyjne będą wskazywać na localhost!');
    }
    const verifyUrl = `${env.SERVER_URL ?? `http://localhost:${env.PORT || 3001}`}/api/auth/verify-email?token=${user.emailVerificationToken}`;
    sendEmail(
      user.email,
      'Aktywuj swoje konto w BeautyBeskid',
      `<p>Witaj ${user.name},</p>
       <p>Kliknij poniższy link, aby aktywować swoje konto:</p>
       <p><a href="${verifyUrl}" style="background:#1A3828;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Aktywuj konto</a></p>
       <p>Lub skopiuj link: ${verifyUrl}</p>`
    ).catch((err) => console.error('[registerUser] Failed to send verification email:', err));
  }

  return { id: user.id, email: user.email, name: user.name, role: user.role };
};

export const loginUser = async (data: LoginInput, refreshTokenTtl?: string) => {
  const raw = await prisma.user.findUnique({
    where: { email: data.email }
  });

  if (!raw) {
    throw new AppError('Nieprawidłowy email lub hasło', 401);
  }
  if (!raw.passwordHash) {
    throw new AppError('To konto używa logowania przez Google. Zaloguj się przyciskiem "Zaloguj z Google".', 401);
  }
  if (!(await bcrypt.compare(data.password, raw.passwordHash))) {
    throw new AppError('Nieprawidłowy email lub hasło', 401);
  }

  if (raw.accountStatus === 'PENDING') {
    if (raw.emailVerificationToken) {
      throw new AppError('Potwierdź swój adres email. Sprawdź skrzynkę pocztową i kliknij link aktywacyjny.', 403);
    }
    throw new AppError('Konto oczekuje na zatwierdzenie przez administratora', 403);
  }
  if (raw.accountStatus === 'REJECTED') {
    throw new AppError('Konto zostało odrzucone. Skontaktuj się z salonem.', 403);
  }

  // Ensures ambassadorCode exists (auto-generates for legacy users without extra getUserById round-trip)
  let loginUser = raw;
  if (!raw.ambassadorCode) {
    let newCode = '';
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = generateCode(8);
      const existing = await prisma.user.findUnique({ where: { ambassadorCode: candidate } });
      if (!existing) { newCode = candidate; break; }
    }
    if (newCode) {
      loginUser = await prisma.user.update({ where: { id: raw.id }, data: { ambassadorCode: newCode } });
    }
  }

  const accessToken = signToken({ id: raw.id, role: raw.role }, env.JWT_SECRET, env.JWT_EXPIRES_IN);
  const refreshToken = signToken({ id: raw.id }, env.JWT_REFRESH_SECRET, refreshTokenTtl ?? env.JWT_REFRESH_EXPIRES_IN);

  return {
    user: {
      id: loginUser.id,
      email: loginUser.email,
      name: loginUser.name,
      role: loginUser.role,
      avatarPath: loginUser.avatarPath,
      loyaltyPoints: loginUser.loyaltyPoints,
      loyaltyTier: loginUser.loyaltyTier,
      ambassadorCode: loginUser.ambassadorCode,
      referralCount: loginUser.referralCount,
      mustChangePassword: loginUser.mustChangePassword,
    },
    accessToken,
    refreshToken
  };
};

export const loginWithGoogle = async (credential: string) => {
  const { googleId, email, name, picture } = await verifyGoogleToken(credential);

  const generateAmbassadorCode = async (): Promise<string> => {
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = generateCode(8);
      const existing = await prisma.user.findUnique({ where: { ambassadorCode: code } });
      if (!existing) return code;
    }
    throw new AppError('Nie udało się wygenerować kodu ambasadora', 500);
  };

  // Find by googleId first, then by email (merge case)
  let user = await prisma.user.findFirst({
    where: { OR: [{ googleId }, { email }] },
  });

  if (user) {
    // Merge: link Google to existing account and activate if pending
    // Note: if user already has a different googleId, we preserve it (first Google account wins)
    if (user.accountStatus === 'REJECTED') {
      throw new AppError('Konto zostało zablokowane', 403);
    }
    if (!user.googleId || user.accountStatus === 'PENDING') {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: user.googleId ?? googleId,
          accountStatus: 'ACTIVE',
          emailVerificationToken: null,
        },
      });
    }
  } else {
    // New user — create with ACTIVE status immediately (Google verifies identity)
    const ambassadorCode = await generateAmbassadorCode();
    user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash: null,
        googleId,
        avatarPath: picture ?? null,
        accountStatus: 'ACTIVE',
        ambassadorCode,
        // termsAcceptedAt auto-set: Google verifies identity
        termsAcceptedAt: new Date(),
        marketingConsent: false,
        photoConsent: false,
      },
    });
  }

  const accessToken = signToken({ id: user.id, role: user.role }, env.JWT_SECRET, env.JWT_EXPIRES_IN);
  const refreshToken = signToken({ id: user.id }, env.JWT_REFRESH_SECRET, env.JWT_REFRESH_EXPIRES_IN);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarPath: user.avatarPath,
      loyaltyPoints: user.loyaltyPoints,
      loyaltyTier: user.loyaltyTier,
      ambassadorCode: user.ambassadorCode,
      referralCount: user.referralCount,
      mustChangePassword: user.mustChangePassword,
    },
    accessToken,
    refreshToken,
  };
};

export const adminCreateUser = async (data: {
  name: string;
  email: string;
  phone?: string;
  password: string;
}) => {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new AppError('Użytkownik z tym adresem email już istnieje', 400);

  let ambassadorCode = '';
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = generateCode(8);
    const exists = await prisma.user.findUnique({ where: { ambassadorCode: candidate } });
    if (!exists) { ambassadorCode = candidate; break; }
  }
  if (!ambassadorCode) throw new AppError('Nie udało się wygenerować kodu ambasadora', 500);

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash: hashedPassword,
      name: data.name,
      phone: data.phone ?? null,
      ambassadorCode,
      accountStatus: 'ACTIVE',
      mustChangePassword: true,
      termsAcceptedAt: new Date(),
    },
  });

  return { id: user.id, email: user.email, name: user.name, role: user.role };
};

export const verifyEmail = async (token: string): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { emailVerificationToken: token },
  });

  if (!user) {
    throw new AppError('Nieprawidłowy lub już użyty link aktywacyjny', 400);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      accountStatus: 'ACTIVE',
      emailVerificationToken: null,
    },
  });
};
