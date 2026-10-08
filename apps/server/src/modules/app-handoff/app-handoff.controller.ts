import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as appHandoffService from './app-handoff.service';

const deviceSchema = z.string().min(8).max(200);

const saveSchema = z.object({
  path: z.string().min(1).max(500),
  device: deviceSchema,
});

const claimSchema = z.object({ device: deviceSchema });

export const save = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { path, device } = saveSchema.parse(req.body);
    await appHandoffService.saveHandoff(req.ip, device, path);
    res.status(201).json({ status: 'success' });
  } catch (error) {
    next(error);
  }
};

export const claim = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { device } = claimSchema.parse(req.body);
    const path = await appHandoffService.claimHandoff(req.ip, device);
    res.status(200).json({ status: 'success', data: { path } });
  } catch (error) {
    next(error);
  }
};
