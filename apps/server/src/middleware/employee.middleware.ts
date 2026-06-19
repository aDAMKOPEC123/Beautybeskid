import { Request, Response, NextFunction } from 'express';
import { AppError } from './error.middleware';

/** Allows EMPLOYEE and ADMIN roles */
export const requireEmployee = (req: Request, res: Response, next: NextFunction): void => {
  try {
    if (!req.user) throw new AppError('Brak autoryzacji', 401);
    if (req.user.role !== 'EMPLOYEE' && req.user.role !== 'ADMIN') {
      throw new AppError('Brak uprawnień pracowniczych', 403);
    }
    next();
  } catch (error) {
    next(error);
  }
};
