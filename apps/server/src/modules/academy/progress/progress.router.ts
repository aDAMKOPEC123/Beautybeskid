import { Router } from 'express';
import { authenticate } from '../../../middleware/auth.middleware';
import { requireAcademyAccess } from '../../../middleware/academy.middleware';
import * as progressController from './progress.controller';

const router = Router();

router.use(authenticate, requireAcademyAccess);

router.post('/progress/lesson/:lessonId/complete', progressController.markLessonComplete);
router.patch('/progress/lesson/:lessonId/video', progressController.updateVideoProgress);
router.get('/progress/course/:courseId', progressController.getUserCourseProgress);
router.get('/progress/my-courses', progressController.getMyCourses);

export default router;
