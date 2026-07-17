import { Request, Response, NextFunction } from 'express';
import { env } from '../../config/env';
import * as pushService from './push.service';

export const getVapidKey = (_req: Request, res: Response) => {
  res.json({ publicKey: env.VAPID_PUBLIC_KEY ?? '' });
};

export const subscribe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      res.status(400).json({ status: 'error', message: 'Nieprawidłowe dane subskrypcji' });
      return;
    }
    await pushService.saveSubscription(req.user!.id, { endpoint, keys });
    res.status(201).json({ status: 'success' });
  } catch (error) {
    next(error);
  }
};

export const unsubscribe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      res.status(400).json({ status: 'error', message: 'Brak endpoint' });
      return;
    }
    await pushService.deleteSubscription(req.user!.id, endpoint);
    res.status(200).json({ status: 'success' });
  } catch (error) {
    next(error);
  }
};
