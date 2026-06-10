// filepath: apps/server/src/modules/auth/auth.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '@cosmo/shared';
import { AppError } from '../../middleware/error.middleware';
import { verifyToken, signToken, parseDurationMs } from '../../utils/jwt';
import { env } from '../../config/env';
import { prisma } from '../../config/prisma';
import { sendEmail } from '../../utils/email';
import { processAndSaveImage } from '../../utils/imageProcessor';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

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
    const result = await authService.loginUser(validatedData);
    const rememberMe = req.body.rememberMe === true;

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      ...(rememberMe ? { maxAge: 30 * 24 * 60 * 60 * 1000 } : {}), // session cookie if not remembered
    });

    const tokenHash = crypto.createHash('sha256').update(result.refreshToken).digest('hex');
    const tokenTtlMs = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
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
    res.clearCookie('refreshToken');
    res.status(200).json({ status: 'success', message: 'Wylogowano pomyślnie' });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) throw new AppError('Brak tokenu odświeżania', 401);

    const decoded = verifyToken(refreshToken, env.JWT_REFRESH_SECRET) as { id: string; iat?: number };

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const storedToken = await prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new AppError('Token odświeżania wygasł lub został unieważniony', 401);
    }

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

    const newRefreshToken = signToken({ id: user.id }, env.JWT_REFRESH_SECRET, env.JWT_REFRESH_EXPIRES_IN);
    const newTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    const refreshTokenTtlMs = parseDurationMs(env.JWT_REFRESH_EXPIRES_IN);
    await prisma.$transaction([
      prisma.refreshToken.delete({ where: { tokenHash } }),
      prisma.refreshToken.create({
        data: {
          tokenHash: newTokenHash,
          userId: user.id,
          expiresAt: new Date(Date.now() + refreshTokenTtlMs),
        },
      }),
    ]);
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: refreshTokenTtlMs,
    });

    res.status(200).json({
      status: 'success',
      data: { accessToken }
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
        resetTokenExp: new Date(Date.now() + 15 * 60 * 1000) // 15 mins
      }
    });

    const resetUrl = `${env.CLIENT_URL}/reset-password?token=${resetToken}`;
    const message = `<p>Kliknij w link, aby zresetować hasło: <a href="${resetUrl}">${resetUrl}</a></p>`;

    await sendEmail(user.email, 'Reset hasła - Cosmo App', message);

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

    const result = await authService.loginWithGoogle(credential);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    const tokenHash = crypto.createHash('sha256').update(result.refreshToken).digest('hex');
    await prisma.refreshToken.create({
      data: {
        tokenHash,
        userId: result.user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

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

export const verifyEmail = async (req: Request, res: Response) => {
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
