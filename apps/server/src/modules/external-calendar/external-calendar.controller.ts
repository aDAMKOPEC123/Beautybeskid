import { Request, Response, NextFunction } from 'express';
import {
  getSource,
  upsertSource,
  deleteSource,
  syncNow,
  listEvents,
} from './external-calendar.service';

export const handleGetSource = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await getSource());
  } catch (err) {
    next(err);
  }
};

export const handleUpsertSource = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await upsertSource(req.body));
  } catch (err) {
    next(err);
  }
};

export const handleDeleteSource = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await deleteSource());
  } catch (err) {
    next(err);
  }
};

export const handleSyncNow = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await syncNow());
  } catch (err) {
    next(err);
  }
};

export const handleListEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };
    if (!from || !to) {
      res.status(400).json({ message: 'Wymagane parametry from i to' });
      return;
    }
    res.json(await listEvents(from, to));
  } catch (err) {
    next(err);
  }
};
