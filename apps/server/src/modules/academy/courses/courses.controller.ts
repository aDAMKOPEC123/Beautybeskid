import { Request, Response, NextFunction } from 'express';
import * as coursesService from './courses.service';

export const listPublished = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id;
    const courses = await coursesService.listPublished(userId);
    res.json({ data: courses });
  } catch (error) {
    next(error);
  }
};

export const getCourseBySlug = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id;
    const course = await coursesService.getCourseBySlug(req.params.slug, userId);
    res.json({ data: course });
  } catch (error) {
    next(error);
  }
};

export const adminListAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courses = await coursesService.adminListAll();
    res.json({ data: courses });
  } catch (error) {
    next(error);
  }
};

export const createCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await coursesService.createCourse(req.body);
    res.status(201).json({ data: course });
  } catch (error) {
    next(error);
  }
};

export const updateCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await coursesService.updateCourse(req.params.id, req.body);
    res.json({ data: course });
  } catch (error) {
    next(error);
  }
};

export const deleteCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await coursesService.deleteCourse(req.params.id);
    res.json({ message: 'Kurs usunięty' });
  } catch (error) {
    next(error);
  }
};

export const reorderModules = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await coursesService.reorderModules(req.params.id, req.body.order);
    res.json({ message: 'Kolejność modułów zaktualizowana' });
  } catch (error) {
    next(error);
  }
};

export const reorderLessons = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await coursesService.reorderLessons(req.params.id, req.body.order);
    res.json({ message: 'Kolejność lekcji zaktualizowana' });
  } catch (error) {
    next(error);
  }
};

export const createModule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const mod = await coursesService.createModule(req.params.courseId, req.body);
    res.status(201).json({ data: mod });
  } catch (error) {
    next(error);
  }
};

export const updateModule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const mod = await coursesService.updateModule(req.params.moduleId, req.body);
    res.json({ data: mod });
  } catch (error) {
    next(error);
  }
};

export const deleteModule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await coursesService.deleteModule(req.params.moduleId);
    res.json({ message: 'Moduł usunięty' });
  } catch (error) {
    next(error);
  }
};

export const createCheckpoint = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const checkpoint = await coursesService.createCheckpoint(req.params.moduleId, req.body);
    res.status(201).json({ data: checkpoint });
  } catch (error) {
    next(error);
  }
};
