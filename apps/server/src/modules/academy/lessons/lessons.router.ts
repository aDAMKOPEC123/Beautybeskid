import { Router } from 'express';
import { academyAuthenticate, academyRequireAdmin } from '../../../middleware/academy-auth.middleware';
import { upload } from '../../../config/multer';
import * as lessonsController from './lessons.controller';

const router = Router();

// User routes
router.get('/courses/:slug/lessons/:lessonSlug', academyAuthenticate, lessonsController.getLessonBySlug);
router.put('/lessons/:lessonId/note', academyAuthenticate, lessonsController.saveNote);
router.delete('/lessons/:lessonId/note', academyAuthenticate, lessonsController.deleteNote);

// Admin routes
router.post('/admin/modules/:moduleId/lessons', academyAuthenticate, academyRequireAdmin, lessonsController.createLesson);
router.post('/admin/lesson-images', academyAuthenticate, academyRequireAdmin, upload.single('image'), lessonsController.uploadInlineImage);
router.patch('/admin/lessons/:id', academyAuthenticate, academyRequireAdmin, lessonsController.updateLesson);
router.delete('/admin/lessons/:id', academyAuthenticate, academyRequireAdmin, lessonsController.deleteLesson);

export default router;
