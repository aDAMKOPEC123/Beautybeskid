import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { AppError } from './error.middleware';
import { verifyToken } from '../utils/jwt';
import { prisma } from '../config/prisma';
import { hasActiveCourseAccess } from '../modules/academy/access';

declare global {
  namespace Express {
    interface Request {
      academyUser?: { id: string; role: string };
    }
  }
}

const academySecret = `${env.JWT_SECRET}:academy`;

export const academyAuthenticate = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : undefined;
    if (!token) throw new AppError('Zaloguj się do Akademii', 401);
    const payload = verifyToken(token, academySecret) as { id: string; role: string; scope?: string };
    if (payload.scope !== 'academy') throw new AppError('Nieprawidłowa sesja Akademii', 401);
    req.academyUser = { id: payload.id, role: payload.role };
    next();
  } catch (error) { next(error); }
};

export const academyOptionalAuthenticate = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : undefined;
    if (!token) return next();
    const payload = verifyToken(token, academySecret) as { id: string; role: string; scope?: string };
    if (payload.scope === 'academy') req.academyUser = { id: payload.id, role: payload.role };
  } catch {
    // Analytics must never interrupt browsing because of an expired token.
  }
  next();
};

export const academyRequireAdmin = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    if (!req.academyUser || req.academyUser.role !== 'ADMIN') throw new AppError('Wymagane konto administratora Akademii', 403);
    const user = await prisma.academyUser.findUnique({ where: { id: req.academyUser.id }, select: { role: true } });
    if (user?.role !== 'ADMIN') throw new AppError('Uprawnienia administratora wygasły', 403);
    next();
  } catch (error) { next(error); }
};

export const academyRequirePurchase = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    if (req.academyUser?.role === 'ADMIN') return next();
    if (!req.academyUser) throw new AppError('Materiał będzie dostępny po zakupie kursu', 403);
    const enrollments = await prisma.academyEnrollment.findMany({ where: { userId: req.academyUser.id }, include: { course: { select: { accessDays: true } } } });
    if (!enrollments.some(enrollment => hasActiveCourseAccess(enrollment, enrollment.course.accessDays))) throw new AppError('Materiał będzie dostępny po zakupie lub odnowieniu kursu', 403);
    next();
  } catch (error) { next(error); }
};
