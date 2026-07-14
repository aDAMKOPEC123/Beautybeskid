import { Router } from 'express';
import { academyAuthenticate } from '../../../middleware/academy-auth.middleware';
import * as progressController from './progress.controller';

const router = Router();

router.post('/progress/lesson/:lessonId/complete', academyAuthenticate, progressController.markLessonComplete);
router.patch('/progress/lesson/:lessonId/video', academyAuthenticate, progressController.updateVideoProgress);
router.get('/progress/course/:courseId', academyAuthenticate, progressController.getUserCourseProgress);
router.get('/progress/my-courses', academyAuthenticate, progressController.getMyCourses);
router.get('/progress/dashboard', academyAuthenticate, progressController.getLearningDashboard);
router.patch('/progress/goal', academyAuthenticate, progressController.updateLearningGoal);

export default router;
