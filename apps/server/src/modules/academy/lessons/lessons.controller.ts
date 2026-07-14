import { Request, Response, NextFunction } from 'express';
import { processAndSaveImage } from '../../../utils/imageProcessor';
import { AppError } from '../../../middleware/error.middleware';
import * as lessonsService from './lessons.service';

export const getLessonBySlug = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.academyUser!.id;
    const lesson = await lessonsService.getLessonBySlug(req.params.slug, req.params.lessonSlug, userId, req.academyUser!.role === 'ADMIN');
    res.json({ data: lesson });
  } catch (error) {
    next(error);
  }
};

export const saveNote = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const content = typeof req.body.content === 'string' ? req.body.content.trim() : '';
    if (!content) throw new AppError('Notatka nie może być pusta', 400);
    if (content.length > 5000) throw new AppError('Notatka może mieć maksymalnie 5000 znaków', 400);
    const note = await lessonsService.saveNote(req.academyUser!.id, req.params.lessonId, content, req.body.videoTimestamp);
    res.json({ data: note });
  } catch (error) { next(error); }
};

export const deleteNote = async (req: Request, res: Response, next: NextFunction) => {
  try { await lessonsService.deleteNote(req.academyUser!.id, req.params.lessonId); res.status(204).end(); } catch (error) { next(error); }
};

export const createLesson = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lesson = await lessonsService.createLesson(req.params.moduleId, req.body);
    res.status(201).json({ data: lesson });
  } catch (error) {
    next(error);
  }
};

export const updateLesson = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lesson = await lessonsService.updateLesson(req.params.id, req.body);
    res.json({ data: lesson });
  } catch (error) {
    next(error);
  }
};

export const deleteLesson = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await lessonsService.deleteLesson(req.params.id);
    res.json({ message: 'Lekcja usunięta' });
  } catch (error) {
    next(error);
  }
};

export const uploadInlineImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new AppError('Wybierz obraz do wgrania', 400);

    // Every image placed inside a lesson is optimized and saved as WebP.
    const url = await processAndSaveImage(req.file.buffer, 'academy-lessons');
    res.status(201).json({ data: { url } });
  } catch (error) {
    next(error);
  }
};
