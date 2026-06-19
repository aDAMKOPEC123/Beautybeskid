import { Request, Response, NextFunction } from 'express';
import * as accessService from './access.service';

export const grantAccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, expiresAt } = req.body;
    const adminId = (req as any).user.id;
    await accessService.grantAccess(userId, adminId, expiresAt ? new Date(expiresAt) : undefined);
    res.json({ message: 'Dostęp do Akademii nadany' });
  } catch (error) {
    next(error);
  }
};

export const revokeAccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.body;
    const adminId = (req as any).user.id;
    await accessService.revokeAccess(userId, adminId);
    res.json({ message: 'Dostęp do Akademii cofnięty' });
  } catch (error) {
    next(error);
  }
};

export const getAccessLog = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const log = await accessService.getAccessLog(req.params.userId);
    res.json({ data: log });
  } catch (error) {
    next(error);
  }
};
