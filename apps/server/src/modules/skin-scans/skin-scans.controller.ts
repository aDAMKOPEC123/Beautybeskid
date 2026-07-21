import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../../middleware/error.middleware';
import * as skinScansService from './skin-scans.service';

const createSessionSchema = z.object({
  consentAccepted: z.literal(true, {
    errorMap: () => ({ message: 'Świadoma zgoda jest wymagana przed uruchomieniem kamery' }),
  }),
  captureContext: z.object({
    makeup: z.boolean(),
    spfApplied: z.boolean(),
    spfAppliedAt: z.string().datetime().optional(),
    recentTreatment: z.boolean(),
    recentTreatmentNotes: z.string().trim().max(500).optional(),
  }),
});

export const createSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = createSessionSchema.parse(req.body);
    const session = await skinScansService.createSession(req.user!.id, input.captureContext);
    res.status(201).json({ status: 'success', data: { session } });
  } catch (error) {
    next(error);
  }
};

export const listSessions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessions = await skinScansService.listSessions(req.user!.id);
    res.status(200).json({ status: 'success', data: { sessions } });
  } catch (error) {
    next(error);
  }
};

export const getSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await skinScansService.getSession(req.user!.id, req.params.id);
    res.status(200).json({ status: 'success', data: { session } });
  } catch (error) {
    next(error);
  }
};

export const uploadImages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const fileMap = (req.files ?? {}) as Record<string, Express.Multer.File[]>;
    const files = Object.values(fileMap).flat();
    if (files.length > 8) throw new AppError('Sesja może zawierać maksymalnie osiem zdjęć', 400);
    const session = await skinScansService.uploadImages(req.user!.id, req.params.id, files);
    res.status(200).json({ status: 'success', data: { session } });
  } catch (error) {
    next(error);
  }
};

export const completeSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await skinScansService.completeSession(req.user!.id, req.params.id);
    res.status(200).json({ status: 'success', data: { session } });
  } catch (error) {
    next(error);
  }
};

export const getComparison = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const comparison = await skinScansService.getComparison(req.user!.id);
    res.status(200).json({ status: 'success', data: { comparison } });
  } catch (error) {
    next(error);
  }
};

export const deleteSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await skinScansService.deleteSession(req.user!.id, req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
