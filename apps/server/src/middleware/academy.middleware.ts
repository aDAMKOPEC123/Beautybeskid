import { Request, Response, NextFunction } from 'express';
import { AppError } from './error.middleware';
import { prisma } from '../config/prisma';

export const requireAcademyAccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    if (!user) throw new AppError('Nieautoryzowany', 401);

    // Fetch fresh user data to check academy access
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { hasAcademyAccess: true, academyAccessExpiresAt: true },
    });

    if (!dbUser) throw new AppError('Nie znaleziono użytkownika', 404);
    if (!dbUser.hasAcademyAccess) throw new AppError('Brak dostępu do Akademii', 403);

    if (dbUser.academyAccessExpiresAt && new Date() > dbUser.academyAccessExpiresAt) {
      // Revoke expired access in background
      prisma.user.update({
        where: { id: user.id },
        data: { hasAcademyAccess: false },
      }).catch(() => {});
      throw new AppError('Dostęp do Akademii wygasł', 403);
    }

    next();
  } catch (error) {
    next(error);
  }
};
