import { Router } from 'express';
import { authenticate } from '../../../middleware/auth.middleware';
import { requireAdmin } from '../../../middleware/admin.middleware';
import { requireAcademyAccess } from '../../../middleware/academy.middleware';
import * as coursesController from './courses.controller';

const router = Router();

// User routes (require academy access)
router.get('/courses', authenticate, requireAcademyAccess, coursesController.listPublished);
router.get('/courses/:slug', authenticate, requireAcademyAccess, coursesController.getCourseBySlug);

// Admin routes
router.get('/admin/courses', authenticate, requireAdmin, coursesController.adminListAll);
router.post('/admin/courses', authenticate, requireAdmin, coursesController.createCourse);
router.patch('/admin/courses/:id', authenticate, requireAdmin, coursesController.updateCourse);
router.delete('/admin/courses/:id', authenticate, requireAdmin, coursesController.deleteCourse);
router.put('/admin/courses/:id/reorder-modules', authenticate, requireAdmin, coursesController.reorderModules);
router.put('/admin/modules/:id/reorder-lessons', authenticate, requireAdmin, coursesController.reorderLessons);
router.post('/admin/courses/:courseId/modules', authenticate, requireAdmin, coursesController.createModule);
router.patch('/admin/modules/:moduleId', authenticate, requireAdmin, coursesController.updateModule);
router.delete('/admin/modules/:moduleId', authenticate, requireAdmin, coursesController.deleteModule);
router.post('/admin/modules/:moduleId/checkpoints', authenticate, requireAdmin, coursesController.createCheckpoint);

export default router;
