// filepath: apps/server/src/modules/achievements/achievements.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as achievementsService from './achievements.service';

export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const achievements = await achievementsService.getAllForUser(req.user!.id);
    res.status(200).json({ status: 'success', data: { achievements } });
  } catch (error) {
    next(error);
  }
};

export const check = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const newAchievements = await achievementsService.checkAndAward(req.user!.id);
    res.status(200).json({ status: 'success', data: { newAchievements } });
  } catch (error) {
    next(error);
  }
};
