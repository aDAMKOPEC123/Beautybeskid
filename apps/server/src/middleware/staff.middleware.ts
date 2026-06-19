import { Request, Response, NextFunction } from 'express';
import { AppError } from './error.middleware';

export const requireStaff = (req: Request, res: Response, next: NextFunction): void => {
  try {
    if (!req.user) {
      throw new AppError('Brak autoryzacji', 401);
    }
    if (req.user.role !== 'ADMIN' && req.user.role !== 'EMPLOYEE') {
      throw new AppError('Brak uprawnień personelu', 403);
    }
    next();
  } catch (error) {
    next(error);
  }
};
