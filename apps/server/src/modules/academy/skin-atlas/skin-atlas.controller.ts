import { Request, Response, NextFunction } from 'express';
import * as atlasService from './skin-atlas.service';
import { processAndSaveImage } from '../../../utils/imageProcessor';
import { AppError } from '../../../middleware/error.middleware';

// ── Public ──────────────────────────────────────────────────

export const listRegions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parentId = req.query.parentId as string | undefined;
    const regions = await atlasService.listPublishedRegions(parentId ?? undefined);
    res.json({ data: regions });
  } catch (error) { next(error); }
};

export const getRegion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const region = await atlasService.getRegionBySlug(req.params.region);
    res.json({ data: region });
  } catch (error) { next(error); }
};

export const getCondition = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const condition = await atlasService.getConditionBySlug(req.params.condition);
    res.json({ data: condition });
  } catch (error) { next(error); }
};

export const getQuizQuestions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const questions = await atlasService.getQuizQuestions(req.params.region || null);
    res.json({ data: questions });
  } catch (error) { next(error); }
};

export const submitQuiz = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await atlasService.submitQuizAttempt(
      req.academyUser!.id,
      req.body.regionSlug || null,
      req.body.answers
    );
    res.status(201).json({ data: result });
  } catch (error) { next(error); }
};

// ── Admin ───────────────────────────────────────────────────

export const adminListRegions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const regions = await atlasService.adminListRegions();
    res.json({ data: regions });
  } catch (error) { next(error); }
};

export const adminCreateRegion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const region = await atlasService.adminCreateRegion(req.body);
    res.status(201).json({ data: region });
  } catch (error) { next(error); }
};

export const adminUpdateRegion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const region = await atlasService.adminUpdateRegion(req.params.id, req.body);
    res.json({ data: region });
  } catch (error) { next(error); }
};

export const adminDeleteRegion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await atlasService.adminDeleteRegion(req.params.id);
    res.json({ message: 'Region usunięty' });
  } catch (error) { next(error); }
};

export const adminCreateCondition = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const condition = await atlasService.adminCreateCondition(req.body);
    res.status(201).json({ data: condition });
  } catch (error) { next(error); }
};

export const adminUpdateCondition = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const condition = await atlasService.adminUpdateCondition(req.params.id, req.body);
    res.json({ data: condition });
  } catch (error) { next(error); }
};

export const adminDeleteCondition = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await atlasService.adminDeleteCondition(req.params.id);
    res.json({ message: 'Problem skórny usunięty' });
  } catch (error) { next(error); }
};

export const adminCreateQuizQuestion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const question = await atlasService.adminCreateQuizQuestion(req.body);
    res.status(201).json({ data: question });
  } catch (error) { next(error); }
};

export const adminDeleteQuizQuestion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await atlasService.adminDeleteQuizQuestion(req.params.id);
    res.json({ message: 'Pytanie usunięte' });
  } catch (error) { next(error); }
};

export const adminUploadImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new AppError('Brak pliku', 400);
    const url = await processAndSaveImage(req.file.buffer, 'academy-atlas');
    const image = await atlasService.adminAddImage({ ...req.body, url });
    res.status(201).json({ data: image });
  } catch (error) { next(error); }
};

export const adminDeleteImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await atlasService.adminDeleteImage(req.params.id);
    res.json({ message: 'Zdjęcie usunięte' });
  } catch (error) { next(error); }
};
