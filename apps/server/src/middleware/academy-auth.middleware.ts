import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { AppError } from './error.middleware';
import { verifyToken } from '../utils/jwt';
import { prisma } from '../config/prisma';

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

export const academyRequireAdmin = (req: Request, _res: Response, next: NextFunction) => {
  if (req.academyUser?.role !== 'ADMIN') return next(new AppError('Wymagane konto administratora Akademii', 403));
  next();
};

export const academyRequirePurchase = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    if (req.academyUser?.role === 'ADMIN') return next();
    if (!req.academyUser || !await prisma.academyEnrollment.findFirst({ where: { userId: req.academyUser.id } })) throw new AppError('Materiał będzie dostępny po zakupie kursu', 403);
    next();
  } catch (error) { next(error); }
};
