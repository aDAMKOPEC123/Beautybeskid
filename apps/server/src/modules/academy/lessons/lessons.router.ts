import { Router } from 'express';
import { authenticate } from '../../../middleware/auth.middleware';
import { requireAdmin } from '../../../middleware/admin.middleware';
import { requireAcademyAccess } from '../../../middleware/academy.middleware';
import * as lessonsController from './lessons.controller';

const router = Router();

// User routes
router.get('/courses/:slug/lessons/:lessonSlug', authenticate, requireAcademyAccess, lessonsController.getLessonBySlug);

// Admin routes
router.post('/admin/modules/:moduleId/lessons', authenticate, requireAdmin, lessonsController.createLesson);
router.patch('/admin/lessons/:id', authenticate, requireAdmin, lessonsController.updateLesson);
router.delete('/admin/lessons/:id', authenticate, requireAdmin, lessonsController.deleteLesson);

export default router;
