import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../../middleware/error.middleware';
import * as progressService from './progress.service';

export const markLessonComplete = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.academyUser!.id;
    const result = await progressService.markLessonComplete(userId, req.params.lessonId, req.academyUser!.role === 'ADMIN');
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
};

export const updateVideoProgress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.academyUser!.id;
    const watchedSeconds = Number(req.body.watchedSeconds);
    if (!Number.isFinite(watchedSeconds) || watchedSeconds < 0 || watchedSeconds > 86400) throw new AppError('Nieprawidłowy czas oglądania', 400);
    await progressService.updateVideoProgress(userId, req.params.lessonId, Math.round(watchedSeconds), req.academyUser!.role === 'ADMIN');
    res.json({ message: 'Postęp zaktualizowany' });
  } catch (error) {
    next(error);
  }
};

export const getUserCourseProgress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.academyUser!.id;
    const progress = await progressService.getUserCourseProgress(userId, req.params.courseId, req.academyUser!.role === 'ADMIN');
    res.json({ data: progress });
  } catch (error) {
    next(error);
  }
};

export const getLearningDashboard = async (req: Request, res: Response, next: NextFunction) => { try { res.json({ data: await progressService.getLearningDashboard(req.academyUser!.id) }); } catch (error) { next(error); } };
export const updateLearningGoal = async (req: Request, res: Response, next: NextFunction) => { try { res.json({ data: await progressService.updateLearningGoal(req.academyUser!.id, Number(req.body.weeklyMinutesGoal)) }); } catch (error) { next(error); } };
