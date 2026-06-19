import { Request, Response, NextFunction } from 'express';
import * as progressService from './progress.service';

export const markLessonComplete = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const result = await progressService.markLessonComplete(userId, req.params.lessonId);
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
};

export const updateVideoProgress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    await progressService.updateVideoProgress(userId, req.params.lessonId, req.body.watchedSeconds);
    res.json({ message: 'Postęp zaktualizowany' });
  } catch (error) {
    next(error);
  }
};

export const getUserCourseProgress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const progress = await progressService.getUserCourseProgress(userId, req.params.courseId);
    res.json({ data: progress });
  } catch (error) {
    next(error);
  }
};

export const getMyCourses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const courses = await progressService.getMyCourses(userId);
    res.json({ data: courses });
  } catch (error) {
    next(error);
  }
};
