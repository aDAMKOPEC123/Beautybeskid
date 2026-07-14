import { Router } from 'express';
import { academyAuthenticate, academyRequireAdmin } from '../../../middleware/academy-auth.middleware';
import * as coursesController from './courses.controller';

const router = Router();

// Public storefront — course details are intentionally visible before purchase.
router.get('/public/courses', coursesController.listPublic);
router.get('/public/sitemap.xml', coursesController.publicSitemap);
router.get('/public/courses/:slug', coursesController.getPublicCourse);
router.get('/public/bundles', coursesController.listPublicBundles);
router.get('/public/bundles/:slug', coursesController.getPublicBundle);

// User routes (require academy access)
router.get('/courses', academyAuthenticate, coursesController.listPublished);
router.get('/courses/:slug', academyAuthenticate, coursesController.getCourseBySlug);
router.post('/courses/:courseId/interest', academyAuthenticate, coursesController.registerInterest);
router.get('/favorites', academyAuthenticate, coursesController.listFavorites);
router.post('/favorites/:courseId', academyAuthenticate, coursesController.addFavorite);
router.delete('/favorites/:courseId', academyAuthenticate, coursesController.removeFavorite);
router.post('/courses/:courseId/reviews', academyAuthenticate, coursesController.submitReview);

// Admin routes
router.get('/admin/courses', academyAuthenticate, academyRequireAdmin, coursesController.adminListAll);
router.post('/admin/courses', academyAuthenticate, academyRequireAdmin, coursesController.createCourse);
router.get('/admin/reviews', academyAuthenticate, academyRequireAdmin, coursesController.adminListReviews);
router.patch('/admin/reviews/:id', academyAuthenticate, academyRequireAdmin, coursesController.adminApproveReview);
router.patch('/admin/courses/:id', academyAuthenticate, academyRequireAdmin, coursesController.updateCourse);
router.delete('/admin/courses/:id', academyAuthenticate, academyRequireAdmin, coursesController.deleteCourse);
router.get('/admin/bundles', academyAuthenticate, academyRequireAdmin, coursesController.adminListBundles);
router.post('/admin/bundles', academyAuthenticate, academyRequireAdmin, coursesController.createBundle);
router.patch('/admin/bundles/:id', academyAuthenticate, academyRequireAdmin, coursesController.updateBundle);
router.delete('/admin/bundles/:id', academyAuthenticate, academyRequireAdmin, coursesController.deleteBundle);
router.put('/admin/courses/:id/reorder-modules', academyAuthenticate, academyRequireAdmin, coursesController.reorderModules);
router.put('/admin/modules/:id/reorder-lessons', academyAuthenticate, academyRequireAdmin, coursesController.reorderLessons);
router.post('/admin/courses/:courseId/modules', academyAuthenticate, academyRequireAdmin, coursesController.createModule);
router.patch('/admin/modules/:moduleId', academyAuthenticate, academyRequireAdmin, coursesController.updateModule);
router.delete('/admin/modules/:moduleId', academyAuthenticate, academyRequireAdmin, coursesController.deleteModule);
router.post('/admin/modules/:moduleId/checkpoints', academyAuthenticate, academyRequireAdmin, coursesController.createCheckpoint);

export default router;
