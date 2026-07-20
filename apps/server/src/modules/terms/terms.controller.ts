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
    const { content, version, cancellationNoticeHours } = req.body;
    const noticeHours = Number(cancellationNoticeHours ?? 24);
    if (!Number.isFinite(noticeHours) || noticeHours < 1 || noticeHours > 168) {
      res.status(400).json({ status: 'error', message: 'Okno anulowania musi mieć od 1 do 168 godzin' });
      return;
    }
    const terms = await termsService.upsertTerms(content, version ?? '1.0', noticeHours);
    res.status(200).json({ status: 'success', data: { terms } });
  } catch (error) {
    next(error);
  }
};
