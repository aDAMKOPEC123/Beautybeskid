// filepath: apps/server/src/modules/terms/terms.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as termsService from './terms.service';

export const getTerms = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const terms = await termsService.getTerms();
    res.status(200).json({ status: 'success', data: { terms } });
  } catch (error) {
    next(error);
  }
};

export const updateTerms = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { content, version } = req.body;
    const terms = await termsService.upsertTerms(content, version ?? '1.0');
    res.status(200).json({ status: 'success', data: { terms } });
  } catch (error) {
    next(error);
  }
};
