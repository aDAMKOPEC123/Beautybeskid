// filepath: apps/server/src/modules/reminders/reminders.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as remindersService from './reminders.service';

export const getMyReminders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reminders = await remindersService.getUserReminders(req.user!.id);
    res.status(200).json({ status: 'success', data: { reminders } });
  } catch (error) {
    next(error);
  }
};
