import { Router } from 'express';
import { academyAuthenticate, academyRequireAdmin } from '../../../middleware/academy-auth.middleware';
import * as lessonsController from './lessons.controller';

const router = Router();

// User routes
router.get('/courses/:slug/lessons/:lessonSlug', academyAuthenticate, lessonsController.getLessonBySlug);

// Admin routes
router.post('/admin/modules/:moduleId/lessons', academyAuthenticate, academyRequireAdmin, lessonsController.createLesson);
router.patch('/admin/lessons/:id', academyAuthenticate, academyRequireAdmin, lessonsController.updateLesson);
router.delete('/admin/lessons/:id', academyAuthenticate, academyRequireAdmin, lessonsController.deleteLesson);

export default router;
