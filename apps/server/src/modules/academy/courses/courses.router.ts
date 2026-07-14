import { Router } from 'express';
import { academyAuthenticate, academyRequireAdmin } from '../../../middleware/academy-auth.middleware';
import * as coursesController from './courses.controller';

const router = Router();

// Public storefront — course details are intentionally visible before purchase.
router.get('/public/courses', coursesController.listPublic);
router.get('/public/courses/:slug', coursesController.getPublicCourse);

// User routes (require academy access)
router.get('/courses', academyAuthenticate, coursesController.listPublished);
router.get('/courses/:slug', academyAuthenticate, coursesController.getCourseBySlug);

// Admin routes
router.get('/admin/courses', academyAuthenticate, academyRequireAdmin, coursesController.adminListAll);
router.post('/admin/courses', academyAuthenticate, academyRequireAdmin, coursesController.createCourse);
router.patch('/admin/courses/:id', academyAuthenticate, academyRequireAdmin, coursesController.updateCourse);
router.delete('/admin/courses/:id', academyAuthenticate, academyRequireAdmin, coursesController.deleteCourse);
router.put('/admin/courses/:id/reorder-modules', academyAuthenticate, academyRequireAdmin, coursesController.reorderModules);
router.put('/admin/modules/:id/reorder-lessons', academyAuthenticate, academyRequireAdmin, coursesController.reorderLessons);
router.post('/admin/courses/:courseId/modules', academyAuthenticate, academyRequireAdmin, coursesController.createModule);
router.patch('/admin/modules/:moduleId', academyAuthenticate, academyRequireAdmin, coursesController.updateModule);
router.delete('/admin/modules/:moduleId', academyAuthenticate, academyRequireAdmin, coursesController.deleteModule);
router.post('/admin/modules/:moduleId/checkpoints', academyAuthenticate, academyRequireAdmin, coursesController.createCheckpoint);

export default router;
