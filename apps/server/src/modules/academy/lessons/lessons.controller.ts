import { Request, Response, NextFunction } from 'express';
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
