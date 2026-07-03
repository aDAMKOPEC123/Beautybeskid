// filepath: apps/server/src/modules/auth/auth.service.ts
import { prisma } from '../../config/prisma';
import bcrypt from 'bcryptjs';
import { AppError } from '../../middleware/error.middleware';
import { signToken } from '../../utils/jwt';
import { env } from '../../config/env';
import { RegisterInput, LoginInput } from '@cosmo/shared';
import { generateCode } from '../../utils/generateCode';
import { createWelcomeCodeForUser } from '../discount-codes/discount-codes.service';
import { GooglePayload } from './google.strategy';
import { FacebookAuthError, FacebookProfile } from './facebook.strategy';
import crypto from 'crypto';
import { sendEmail } from '../../utils/email';
import { getIO } from '../../socket';

export const toAuthUser = (user: {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarPath: string | null;
  loyaltyPoints: number;
  loyaltyTier: string;
  ambassadorCode: string | null;
  referralCount: number;
  mustChangePassword: boolean;
}) => ({
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
});

const generateUniqueAmbassadorCode = async (): Promise<string> => {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateCode(8);
    const existing = await prisma.user.findUnique({ where: { ambassadorCode: code } });
    if (!existing) return code;
  }
  throw new AppError('Nie udało się wygenerować kodu ambasadora', 500);
};

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
    .then(() => { try { getIO().to('admin:global').emit('notification:new', {}); } catch {} })
    .catch(() => {/* ignore — don't fail registration */});

  // Send verification email (fire-and-forget — don't fail registration if email fails)
  if (user.emailVerificationToken) {
    if (!env.SERVER_URL && env.NODE_ENV === 'production') {
      console.error('[AUTH] SERVER_URL nie jest ustawione w produkcji — linki weryfikacyjne będą wskazywać na localhost!');
    }
    const verifyUrl = `${env.SERVER_URL ?? `http://localhost:${env.PORT || 3001}`}/api/auth/verify-email?token=${user.emailVerificationToken}`;
    sendEmail(
      user.email,
      'Aktywuj swoje konto w BeautyStudio By Wiktoria Ćwik',
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
    throw new AppError('To konto używa logowania społecznościowego. Wybierz odpowiedni przycisk logowania.', 401);
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
    user: toAuthUser(loginUser),
    accessToken,
    refreshToken
  };
};

const findGoogleAccount = async (profile: GooglePayload) => {
  const [byGoogleId, byEmail] = await Promise.all([
    prisma.user.findUnique({ where: { googleId: profile.googleId } }),
    prisma.user.findUnique({ where: { email: profile.email } }),
  ]);

  if (byGoogleId && byEmail && byGoogleId.id !== byEmail.id) {
    throw new AppError('Konto Google jest już połączone z innym użytkownikiem', 409);
  }

  const user = byGoogleId ?? byEmail;
  if (user?.googleId && user.googleId !== profile.googleId) {
    throw new AppError('Ten adres email jest już połączony z innym kontem Google', 409);
  }
  return user;
};

export const hasExistingGoogleAccount = async (profile: GooglePayload) =>
  Boolean(await findGoogleAccount(profile));

export const loginWithGoogle = async (
  profile: GooglePayload,
  options: {
    mode: 'login' | 'register';
    termsAccepted: boolean;
    marketingConsent: boolean;
    photoConsent: boolean;
    ambassadorCode?: string;
    name?: string;
    phone?: string;
  },
) => {
  let user = await findGoogleAccount(profile);
  let created = false;

  if (user) {
    if (user.accountStatus === 'REJECTED') {
      throw new AppError('Konto zostało zablokowane', 403);
    }
    if (!user.googleId || user.accountStatus === 'PENDING') {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: user.googleId ?? profile.googleId,
          accountStatus: 'ACTIVE',
          emailVerificationToken: null,
        },
      });
    }
  } else {
    if (options.mode !== 'register' || !options.termsAccepted) {
      throw new AppError('Najpierw zarejestruj konto przez Google', 403);
    }
    const registrationName = options.name?.trim();
    const registrationPhone = options.phone?.trim();
    if (!registrationName || !registrationPhone) {
      throw new AppError('Uzupełnij imię, nazwisko i numer telefonu', 400);
    }

    const ambassadorCode = await generateUniqueAmbassadorCode();
    const referrer = options.ambassadorCode
      ? await prisma.user.findUnique({
          where: { ambassadorCode: options.ambassadorCode.trim().toUpperCase() },
        })
      : null;

    user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: profile.email,
          name: registrationName,
          phone: registrationPhone,
          passwordHash: null,
          googleId: profile.googleId,
          avatarPath: profile.picture ?? null,
          accountStatus: 'ACTIVE',
          ambassadorCode,
          referredById: referrer?.id ?? null,
          termsAcceptedAt: new Date(),
          marketingConsent: options.marketingConsent,
          photoConsent: options.photoConsent,
        },
      });

      if (referrer) {
        await createWelcomeCodeForUser(tx, newUser.id, referrer.id);
      }
      return newUser;
    });
    created = true;
  }

  if (created) {
    prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } })
      .then((admins) => {
        if (admins.length === 0) return;
        return prisma.notification.createMany({
          data: admins.map((admin) => ({
            userId: admin.id,
            type: 'GENERIC' as const,
            title: 'Nowa rejestracja',
            body: `Nowa rejestracja przez Google: ${user.name} (${user.email})`,
          })),
        });
      })
      .then(() => { try { getIO().to('admin:global').emit('notification:new', {}); } catch {} })
      .catch(() => {/* rejestracja nie może zależeć od powiadomienia */});
  }

  const accessToken = signToken({ id: user.id, role: user.role }, env.JWT_SECRET, env.JWT_EXPIRES_IN);
  const refreshToken = signToken({ id: user.id }, env.JWT_REFRESH_SECRET, env.JWT_REFRESH_EXPIRES_IN);
  return { user: toAuthUser(user), accessToken, refreshToken };
};

const findFacebookAccount = async (profile: FacebookProfile) => {
  const [byFacebookId, byEmail] = await Promise.all([
    prisma.user.findUnique({ where: { facebookId: profile.facebookId } }),
    prisma.user.findUnique({ where: { email: profile.email } }),
  ]);

  if (byFacebookId && byEmail && byFacebookId.id !== byEmail.id) {
    throw new FacebookAuthError(
      'facebook-account-conflict',
      'Konto Facebook jest już połączone z innym użytkownikiem',
      409,
    );
  }

  const user = byFacebookId ?? byEmail;
  if (user?.facebookId && user.facebookId !== profile.facebookId) {
    throw new FacebookAuthError(
      'facebook-account-conflict',
      'Ten adres email jest już połączony z innym kontem Facebook',
      409,
    );
  }

  return user;
};

export const hasExistingFacebookAccount = async (profile: FacebookProfile) =>
  Boolean(await findFacebookAccount(profile));

export const loginWithFacebook = async (
  profile: FacebookProfile,
  options: {
    mode: 'login' | 'register';
    termsAccepted: boolean;
    marketingConsent: boolean;
    photoConsent: boolean;
    ambassadorCode?: string;
    name?: string;
    phone?: string;
  },
) => {
  let user = await findFacebookAccount(profile);
  let created = false;

  if (user) {
    if (user.accountStatus === 'REJECTED') {
      throw new FacebookAuthError('facebook-account-blocked', 'Konto zostało zablokowane', 403);
    }

    if (!user.facebookId || user.accountStatus === 'PENDING') {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          facebookId: user.facebookId ?? profile.facebookId,
          accountStatus: 'ACTIVE',
          emailVerificationToken: null,
        },
      });
    }
  } else {
    if (options.mode !== 'register' || !options.termsAccepted) {
      throw new FacebookAuthError(
        'facebook-registration-required',
        'Najpierw zaakceptuj regulamin i zarejestruj konto przez Facebook',
        403,
      );
    }
    const registrationName = options.name?.trim();
    const registrationPhone = options.phone?.trim();
    if (!registrationName || !registrationPhone) {
      throw new FacebookAuthError(
        'facebook-registration-required',
        'Uzupełnij imię, nazwisko i numer telefonu',
        400,
      );
    }

    const ambassadorCode = await generateUniqueAmbassadorCode();
    const referrer = options.ambassadorCode
      ? await prisma.user.findUnique({
          where: { ambassadorCode: options.ambassadorCode.trim().toUpperCase() },
        })
      : null;

    user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: profile.email,
          name: registrationName,
          phone: registrationPhone,
          passwordHash: null,
          facebookId: profile.facebookId,
          avatarPath: profile.picture ?? null,
          accountStatus: 'ACTIVE',
          ambassadorCode,
          referredById: referrer?.id ?? null,
          termsAcceptedAt: new Date(),
          marketingConsent: options.marketingConsent,
          photoConsent: options.photoConsent,
        },
      });

      if (referrer) {
        await createWelcomeCodeForUser(tx, newUser.id, referrer.id);
      }

      return newUser;
    });
    created = true;
  }

  if (created) {
    prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } })
      .then((admins) => {
        if (admins.length === 0) return;
        return prisma.notification.createMany({
          data: admins.map((admin) => ({
            userId: admin.id,
            type: 'GENERIC' as const,
            title: 'Nowa rejestracja',
            body: `Nowa rejestracja przez Facebook: ${user.name} (${user.email})`,
          })),
        });
      })
      .then(() => { try { getIO().to('admin:global').emit('notification:new', {}); } catch {} })
      .catch(() => {/* rejestracja nie może zależeć od powiadomienia */});
  }

  const accessToken = signToken({ id: user.id, role: user.role }, env.JWT_SECRET, env.JWT_EXPIRES_IN);
  const refreshToken = signToken({ id: user.id }, env.JWT_REFRESH_SECRET, env.JWT_REFRESH_EXPIRES_IN);

  return {
    user: toAuthUser(user),
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
