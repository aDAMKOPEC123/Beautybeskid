// filepath: apps/server/src/modules/auth/auth.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '@cosmo/shared';
import { AppError } from '../../middleware/error.middleware';
import { verifyToken, signToken } from '../../utils/jwt';
import { env } from '../../config/env';
import { prisma } from '../../config/prisma';
import { sendEmail } from '../../utils/email';
import { processAndSaveImage } from '../../utils/imageProcessor';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import {
  createFacebookAuthorizationUrl,
  FacebookAuthError,
  FacebookAuthErrorCode,
  FacebookProfile,
  fetchFacebookProfile,
  isFacebookConfigured,
} from './facebook.strategy';
import { GooglePayload, verifyGoogleToken } from './google.strategy';

const REFRESH_COOKIE_DOMAIN = env.NODE_ENV === 'production' ? '.kosmetologwiktoriacwik.pl' : undefined;
const LONG_LIVED_REFRESH_TTL_DAYS = 400;
const LONG_LIVED_REFRESH_TTL = `${LONG_LIVED_REFRESH_TTL_DAYS}d`;
const LONG_LIVED_REFRESH_TTL_MS = LONG_LIVED_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000;

const buildRefreshCookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge,
  ...(REFRESH_COOKIE_DOMAIN && { domain: REFRESH_COOKIE_DOMAIN }),
});

/**
 * Clear stale refreshToken cookies — both host-only (legacy) and domain-scoped.
 * Browsers treat these as separate entries, so both must be removed to prevent
 * duplicate cookies that break token rotation.
 */
const clearAllRefreshCookies = (res: Response) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
  });
  if (REFRESH_COOKIE_DOMAIN) {
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      domain: REFRESH_COOKIE_DOMAIN,
    });
  }
};

const FACEBOOK_STATE_COOKIE = 'facebookOAuthState';
const FACEBOOK_CONTEXT_COOKIE = 'facebookOAuthContext';
const FACEBOOK_REGISTRATION_COOKIE = 'facebookRegistration';
const GOOGLE_REGISTRATION_COOKIE = 'googleRegistration';
const FACEBOOK_OAUTH_TTL_MS = 10 * 60 * 1000;
const FACEBOOK_REGISTRATION_TTL_MS = 15 * 60 * 1000;

type FacebookOAuthContext = {
  mode: 'login' | 'register';
  returnTo: string;
  termsAccepted: boolean;
  marketingConsent: boolean;
  photoConsent: boolean;
  ambassadorCode?: string;
};

type FacebookRegistrationPayload = {
  profile: FacebookProfile;
  context: FacebookOAuthContext;
};

type GoogleRegistrationContext = {
  mode: 'login' | 'register';
  termsAccepted: boolean;
  marketingConsent: boolean;
  photoConsent: boolean;
  ambassadorCode?: string;
};

type GoogleRegistrationPayload = {
  profile: GooglePayload;
  context: GoogleRegistrationContext;
};

const facebookRegistrationFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Podaj imię i nazwisko')
    .max(100, 'Imię i nazwisko jest za długie')
    .refine((value) => /^\S+\s+\S+/.test(value), 'Podaj imię i nazwisko'),
  phone: z
    .string()
    .trim()
    .min(7, 'Podaj prawidłowy numer telefonu')
    .max(30, 'Numer telefonu jest za długi')
    .regex(/^[+0-9()\s-]+$/, 'Podaj prawidłowy numer telefonu'),
});

const facebookOAuthCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: FACEBOOK_OAUTH_TTL_MS,
  path: '/api/auth/facebook',
};

const facebookRegistrationCookieOptions = {
  ...facebookOAuthCookieOptions,
  maxAge: FACEBOOK_REGISTRATION_TTL_MS,
};

const googleRegistrationCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: FACEBOOK_REGISTRATION_TTL_MS,
  path: '/api/auth/google',
};

const sanitizeReturnTo = (value: unknown) => {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '/user';
  return value.slice(0, 500);
};

const redirectFacebookResult = (
  res: Response,
  path: '/auth/login' | '/auth/register' | '/auth/facebook/callback' | '/auth/facebook/complete',
  params: Record<string, string>,
) => {
  const url = new URL(path, env.CLIENT_URL);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return res.redirect(url.toString());
};

const clearFacebookOAuthCookies = (res: Response) => {
  const options = { path: facebookOAuthCookieOptions.path };
  res.clearCookie(FACEBOOK_STATE_COOKIE, options);
  res.clearCookie(FACEBOOK_CONTEXT_COOKIE, options);
};

const clearFacebookRegistrationCookie = (res: Response) => {
  res.clearCookie(FACEBOOK_REGISTRATION_COOKIE, { path: facebookRegistrationCookieOptions.path });
};

const clearGoogleRegistrationCookie = (res: Response) => {
  res.clearCookie(GOOGLE_REGISTRATION_COOKIE, { path: googleRegistrationCookieOptions.path });
};

const persistAuthSession = async (
  res: Response,
  result: { refreshToken: string; user: { id: string } },
) => {
  const tokenTtlMs = LONG_LIVED_REFRESH_TTL_MS;
  clearAllRefreshCookies(res);
  res.cookie('refreshToken', result.refreshToken, buildRefreshCookieOptions(tokenTtlMs));
  const tokenHash = crypto.createHash('sha256').update(result.refreshToken).digest('hex');
  await prisma.refreshToken.create({
    data: {
      tokenHash,
      userId: result.user.id,
      expiresAt: new Date(Date.now() + tokenTtlMs),
    },
  });
};

const parseFacebookRegistration = (req: Request): FacebookRegistrationPayload => {
  const token = req.cookies?.[FACEBOOK_REGISTRATION_COOKIE];
  if (!token) {
    throw new AppError('Rejestracja przez Facebook wygasła. Rozpocznij ją ponownie.', 410);
  }

  try {
    const decoded = verifyToken(token, env.JWT_SECRET) as Partial<FacebookRegistrationPayload>;
    if (
      !decoded.profile ||
      typeof decoded.profile.facebookId !== 'string' ||
      typeof decoded.profile.email !== 'string' ||
      typeof decoded.profile.name !== 'string' ||
      !decoded.context ||
      decoded.context.mode !== 'register' ||
      decoded.context.termsAccepted !== true
    ) {
      throw new Error('Invalid registration payload');
    }
    return decoded as FacebookRegistrationPayload;
  } catch {
    throw new AppError('Rejestracja przez Facebook wygasła. Rozpocznij ją ponownie.', 410);
  }
};

const parseGoogleRegistration = (req: Request): GoogleRegistrationPayload => {
  const token = req.cookies?.[GOOGLE_REGISTRATION_COOKIE];
  if (!token) {
    throw new AppError('Rejestracja przez Google wygasła. Rozpocznij ją ponownie.', 410);
  }

  try {
    const decoded = verifyToken(token, env.JWT_SECRET) as Partial<GoogleRegistrationPayload>;
    if (
      !decoded.profile ||
      typeof decoded.profile.googleId !== 'string' ||
      typeof decoded.profile.email !== 'string' ||
      typeof decoded.profile.name !== 'string' ||
      !decoded.context ||
      decoded.context.mode !== 'register' ||
      decoded.context.termsAccepted !== true
    ) {
      throw new Error('Invalid registration payload');
    }
    return decoded as GoogleRegistrationPayload;
  } catch {
    throw new AppError('Rejestracja przez Google wygasła. Rozpocznij ją ponownie.', 410);
  }
};

const parseFacebookContext = (req: Request): FacebookOAuthContext => {
  const returnedState = typeof req.query.state === 'string' ? req.query.state : '';
  const expectedState = req.cookies?.[FACEBOOK_STATE_COOKIE];
  const contextToken = req.cookies?.[FACEBOOK_CONTEXT_COOKIE];

  if (!returnedState || !expectedState || !contextToken) {
    throw new FacebookAuthError('facebook-invalid-state', 'Sesja logowania przez Facebook wygasła', 400);
  }

  const returnedBuffer = Buffer.from(returnedState);
  const expectedBuffer = Buffer.from(expectedState);
  if (
    returnedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(returnedBuffer, expectedBuffer)
  ) {
    throw new FacebookAuthError('facebook-invalid-state', 'Nieprawidłowy stan logowania Facebook', 400);
  }

  let decoded: unknown;
  try {
    decoded = verifyToken(contextToken, env.JWT_SECRET);
  } catch {
    throw new FacebookAuthError('facebook-invalid-state', 'Sesja logowania przez Facebook wygasła', 400);
  }

  if (!decoded || typeof decoded !== 'object') {
    throw new FacebookAuthError('facebook-invalid-state', 'Nieprawidłowy kontekst logowania Facebook', 400);
  }

  const context = decoded as Partial<FacebookOAuthContext>;
  if (context.mode !== 'login' && context.mode !== 'register') {
    throw new FacebookAuthError('facebook-invalid-state', 'Nieprawidłowy tryb logowania Facebook', 400);
  }

  return {
    mode: context.mode,
    returnTo: sanitizeReturnTo(context.returnTo),
    termsAccepted: context.termsAccepted === true,
    marketingConsent: context.marketingConsent === true,
    photoConsent: context.photoConsent === true,
    ambassadorCode:
      typeof context.ambassadorCode === 'string' ? context.ambassadorCode.slice(0, 32) : undefined,
  };
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    let avatarPath: string | undefined;
    if (req.file) {
      avatarPath = await processAndSaveImage(req.file.buffer, 'avatars');
    }
    if (req.body.termsAccepted !== 'true') {
      throw new AppError('Musisz zaakceptować regulamin', 400);
    }
    const marketingConsent = req.body.marketingConsent === 'true';
    const photoConsent = req.body.photoConsent === 'true';
    const user = await authService.registerUser({
      ...validatedData,
      avatarPath,
      termsAcceptedAt: new Date(),
      marketingConsent,
      photoConsent,
    });
    res.status(201).json({ status: 'success', data: { user } });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const result = await authService.loginUser(validatedData, LONG_LIVED_REFRESH_TTL);
    const tokenTtlMs = LONG_LIVED_REFRESH_TTL_MS;

    clearAllRefreshCookies(res);
    res.cookie('refreshToken', result.refreshToken, buildRefreshCookieOptions(tokenTtlMs));

    const tokenHash = crypto.createHash('sha256').update(result.refreshToken).digest('hex');
    await prisma.refreshToken.create({
      data: {
        tokenHash,
        userId: result.user.id,
        expiresAt: new Date(Date.now() + tokenTtlMs),
      },
    });

    res.status(200).json({
      status: 'success',
      data: {
        user: result.user,
        accessToken: result.accessToken
      }
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await prisma.refreshToken.deleteMany({ where: { tokenHash } });
    }
    clearAllRefreshCookies(res);
    res.status(200).json({ status: 'success', message: 'Wylogowano pomyślnie' });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // When duplicate cookies exist (host-only + domain-scoped), the raw header
    // may contain multiple refreshToken values. cookie-parser only exposes the
    // first one, which may be stale. Parse all candidates from the raw header.
    const rawCookie = req.headers.cookie ?? '';
    const allRefreshTokens = rawCookie
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.startsWith('refreshToken='))
      .map((s) => s.slice('refreshToken='.length));

    if (allRefreshTokens.length === 0) {
      throw new AppError('Brak tokenu odświeżania', 401);
    }

    // Try each candidate — find the one that still exists in the DB
    let refreshToken: string | null = null;
    let decoded: { id: string; iat?: number } | null = null;
    let storedToken: { tokenHash: string; expiresAt: Date; userId: string } | null = null;

    for (const candidate of allRefreshTokens) {
      try {
        const payload = verifyToken(candidate, env.JWT_REFRESH_SECRET) as { id: string; iat?: number };
        const hash = crypto.createHash('sha256').update(candidate).digest('hex');
        const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: hash } });
        if (stored && stored.expiresAt > new Date()) {
          refreshToken = candidate;
          decoded = payload;
          storedToken = stored;
          break;
        }
      } catch {
        // Invalid JWT or not in DB — try next candidate
      }
    }

    if (!refreshToken || !decoded || !storedToken) {
      throw new AppError('Token odświeżania wygasł lub został unieważniony', 401);
    }

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user) throw new AppError('Użytkownik nie istnieje', 401);

    if (user.passwordChangedAt && decoded.iat && decoded.iat * 1000 < user.passwordChangedAt.getTime()) {
      throw new AppError('Hasło zostało zmienione. Zaloguj się ponownie.', 401);
    }

    if (user.accountStatus === 'PENDING') {
      if (user.emailVerificationToken) {
        throw new AppError('Potwierdź swój adres email. Sprawdź skrzynkę pocztową i kliknij link aktywacyjny.', 403);
      }
      throw new AppError('Konto oczekuje na zatwierdzenie przez administratora', 403);
    }
    if (user.accountStatus === 'REJECTED') {
      throw new AppError('Konto zostało odrzucone. Skontaktuj się z salonem.', 403);
    }

    const accessToken = signToken({ id: user.id, role: user.role }, env.JWT_SECRET, env.JWT_EXPIRES_IN);

    // Sliding long-lived session: every successful refresh extends the device session.
    const newRefreshToken = signToken({ id: user.id }, env.JWT_REFRESH_SECRET, LONG_LIVED_REFRESH_TTL);
    const newTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    await prisma.$transaction([
      prisma.refreshToken.delete({ where: { tokenHash } }),
      prisma.refreshToken.create({
        data: {
          tokenHash: newTokenHash,
          userId: user.id,
          expiresAt: new Date(Date.now() + LONG_LIVED_REFRESH_TTL_MS),
        },
      }),
    ]);
    // Clear all stale cookies (host-only + domain) before setting the new one
    clearAllRefreshCookies(res);
    res.cookie('refreshToken', newRefreshToken, buildRefreshCookieOptions(LONG_LIVED_REFRESH_TTL_MS));

    res.status(200).json({
      status: 'success',
      data: {
        accessToken,
        user: authService.toAuthUser(user),
      }
    });
  } catch (error) {
    if (error instanceof AppError) return next(error);
    next(new AppError('Nieprawidłowy token odświeżania', 401));
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(200).json({ status: 'success', message: 'Jeżeli email istnieje, wysłano link.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: resetTokenHash,
        resetTokenExp: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
      }
    });

    const resetUrl = `${env.CLIENT_URL}/auth/reset-password?token=${resetToken}`;
    const message = `<p>Kliknij w link, aby zresetować hasło: <a href="${resetUrl}">${resetUrl}</a></p>`;

    await sendEmail(user.email, 'Reset hasła - BeskidStudio By Wiktoria Ćwik App', message);

    res.status(200).json({ status: 'success', message: 'Link zresetowania hasła wysłany na email.' });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        resetToken: hashedToken,
        resetTokenExp: { gt: new Date() }
      }
    });

    if (!user) throw new AppError('Token jest nieprawidłowy lub wygasł', 400);

    const newPasswordHash = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        resetToken: null,
        resetTokenExp: null,
        passwordChangedAt: new Date(),
      }
    });

    res.status(200).json({ status: 'success', message: 'Hasło zostało zmienione. Możesz się zalogować.' });
  } catch (error) {
    next(error);
  }
};

export const googleAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { credential } = req.body;
    if (!credential || typeof credential !== 'string') {
      throw new AppError('Brak tokenu Google', 400);
    }

    const mode = req.body.mode === 'register' ? 'register' : 'login';
    const profile = await verifyGoogleToken(credential);
    const context: GoogleRegistrationContext = {
      mode,
      termsAccepted: true,
      marketingConsent: req.body.marketingConsent === true,
      photoConsent: req.body.photoConsent === true,
      ambassadorCode:
        typeof req.body.ambassadorCode === 'string'
          ? req.body.ambassadorCode.trim().toUpperCase().slice(0, 32)
          : undefined,
    };

    if (!(await authService.hasExistingGoogleAccount(profile))) {
      const registrationContext: GoogleRegistrationContext = {
        ...context,
        mode: 'register',
        termsAccepted: true,
      };
      const registrationToken = signToken(
        { profile, context: registrationContext } satisfies GoogleRegistrationPayload,
        env.JWT_SECRET,
        '15m',
      );
      res.cookie(GOOGLE_REGISTRATION_COOKIE, registrationToken, googleRegistrationCookieOptions);
      return res.status(202).json({
        status: 'completion_required',
        data: { requiresCompletion: true },
      });
    }

    const result = await authService.loginWithGoogle(profile, context);
    await persistAuthSession(res, result);

    res.status(200).json({
      status: 'success',
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const facebookStatus = (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    data: { enabled: isFacebookConfigured() },
  });
};

export const startFacebookAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isFacebookConfigured()) {
      throw new FacebookAuthError(
        'facebook-unavailable',
        'Logowanie przez Facebook nie jest jeszcze skonfigurowane',
        503,
      );
    }

    const mode = req.query.mode === 'register' ? 'register' : 'login';
    const state = crypto.randomBytes(32).toString('hex');
    const context: FacebookOAuthContext = {
      mode,
      returnTo: sanitizeReturnTo(req.query.returnTo),
      termsAccepted: true,
      marketingConsent: req.query.marketingConsent === 'true',
      photoConsent: req.query.photoConsent === 'true',
      ambassadorCode:
        typeof req.query.ambassadorCode === 'string'
          ? req.query.ambassadorCode.trim().toUpperCase().slice(0, 32)
          : undefined,
    };
    const contextToken = signToken(context, env.JWT_SECRET, '10m');

    res.cookie(FACEBOOK_STATE_COOKIE, state, facebookOAuthCookieOptions);
    res.cookie(FACEBOOK_CONTEXT_COOKIE, contextToken, facebookOAuthCookieOptions);
    return res.redirect(createFacebookAuthorizationUrl(state));
  } catch (error) {
    next(error);
  }
};

export const googleRegistrationDetails = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { profile } = parseGoogleRegistration(req);
    res.status(200).json({
      status: 'success',
      data: { name: profile.name, email: profile.email },
    });
  } catch (error) {
    clearGoogleRegistrationCookie(res);
    next(error);
  }
};

export const completeGoogleRegistration = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const form = facebookRegistrationFormSchema.parse(req.body);
    const { profile, context } = parseGoogleRegistration(req);
    const result = await authService.loginWithGoogle(profile, {
      ...context,
      name: form.name,
      phone: form.phone,
    });
    await persistAuthSession(res, result);
    clearGoogleRegistrationCookie(res);

    res.status(201).json({
      status: 'success',
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const facebookCallback = async (req: Request, res: Response) => {
  let context: FacebookOAuthContext | undefined;

  try {
    context = parseFacebookContext(req);
    clearFacebookOAuthCookies(res);

    if (req.query.error) {
      throw new FacebookAuthError('facebook-denied', 'Logowanie przez Facebook zostało anulowane', 400);
    }

    const code = typeof req.query.code === 'string' ? req.query.code : '';
    if (!code) {
      throw new FacebookAuthError('facebook-failed', 'Facebook nie zwrócił kodu autoryzacyjnego', 400);
    }

    const profile = await fetchFacebookProfile(code);
    if (!(await authService.hasExistingFacebookAccount(profile))) {
      const registrationContext: FacebookOAuthContext = {
        ...context,
        mode: 'register',
        termsAccepted: true,
      };
      const registrationToken = signToken(
        { profile, context: registrationContext } satisfies FacebookRegistrationPayload,
        env.JWT_SECRET,
        '15m',
      );
      res.cookie(
        FACEBOOK_REGISTRATION_COOKIE,
        registrationToken,
        facebookRegistrationCookieOptions,
      );
      return redirectFacebookResult(res, '/auth/facebook/complete', {});
    }

    const result = await authService.loginWithFacebook(profile, context);
    await persistAuthSession(res, result);

    return redirectFacebookResult(res, '/auth/facebook/callback', {
      next: context.returnTo,
    });
  } catch (error) {
    clearFacebookOAuthCookies(res);
    if (!(error instanceof FacebookAuthError)) {
      console.error('[Facebook OAuth] Callback failed:', error);
    }
    const errorCode: FacebookAuthErrorCode =
      error instanceof FacebookAuthError ? error.code : 'facebook-failed';
    const target =
      errorCode === 'facebook-registration-required' || context?.mode === 'register'
        ? '/auth/register'
        : '/auth/login';
    return redirectFacebookResult(res, target, { facebookError: errorCode });
  }
};

export const facebookRegistrationDetails = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { profile } = parseFacebookRegistration(req);
    res.status(200).json({
      status: 'success',
      data: { name: profile.name, email: profile.email },
    });
  } catch (error) {
    clearFacebookRegistrationCookie(res);
    next(error);
  }
};

export const completeFacebookRegistration = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const form = facebookRegistrationFormSchema.parse(req.body);
    const { profile, context } = parseFacebookRegistration(req);
    const result = await authService.loginWithFacebook(profile, {
      ...context,
      name: form.name,
      phone: form.phone,
    });
    await persistAuthSession(res, result);
    clearFacebookRegistrationCookie(res);

    res.status(201).json({
      status: 'success',
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  const { token } = req.query as { token?: string };

  if (!token) {
    return res.redirect(`${env.CLIENT_URL}/auth/login?error=invalid-token`);
  }

  try {
    await authService.verifyEmail(token);
    return res.redirect(`${env.CLIENT_URL}/auth/login?verified=true`);
  } catch {
    return res.redirect(`${env.CLIENT_URL}/auth/login?error=invalid-token`);
  }
};
