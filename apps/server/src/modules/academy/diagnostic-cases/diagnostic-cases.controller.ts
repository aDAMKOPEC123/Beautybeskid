import { Request, Response, NextFunction } from 'express';
import * as casesService from './diagnostic-cases.service';
import { processAndSaveImage } from '../../../utils/imageProcessor';
import { AppError } from '../../../middleware/error.middleware';

export const listForCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cases = await casesService.listForCourse(req.academyUser!.id, req.params.courseSlug);
    res.json({ data: cases });
  } catch (error) { next(error); }
};

export const getCaseStudy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cs = await casesService.getCaseStudy(req.academyUser!.id, req.params.id);
    res.json({ data: cs });
  } catch (error) { next(error); }
};

export const submitAttempt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await casesService.submitAttempt(
      req.academyUser!.id, req.params.id, req.body.stepAnswers
    );
    res.status(201).json({ data: result });
  } catch (error) { next(error); }
};

// ── Admin ───────────────────────────────────────────────────

export const adminList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cases = await casesService.adminList();
    res.json({ data: cases });
  } catch (error) { next(error); }
};

export const adminGet = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cs = await casesService.adminGet(req.params.id);
    res.json({ data: cs });
  } catch (error) { next(error); }
};

export const adminCreate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cs = await casesService.adminCreateCaseStudy(req.body);
    res.status(201).json({ data: cs });
  } catch (error) { next(error); }
};

export const adminUpdate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cs = await casesService.adminUpdateCaseStudy(req.params.id, req.body);
    res.json({ data: cs });
  } catch (error) { next(error); }
};

export const adminDelete = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await casesService.adminDeleteCaseStudy(req.params.id);
    res.json({ message: 'Case study usunięte' });
  } catch (error) { next(error); }
};

export const adminGetStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await casesService.adminGetStats(req.params.id);
    res.json({ data: stats });
  } catch (error) { next(error); }
};

export const adminUploadStepImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new AppError('Brak pliku', 400);
    const url = await processAndSaveImage(req.file.buffer, 'academy-cases');
    res.status(201).json({ data: { url } });
  } catch (error) { next(error); }
};
