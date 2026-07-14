import { Router } from 'express';
import academyAuthRouter from './auth/academy-auth.router';
import coursesRouter from './courses/courses.router';
import lessonsRouter from './lessons/lessons.router';
import progressRouter from './progress/progress.router';
import quizzesRouter from './quizzes/quizzes.router';
import certificatesRouter from './certificates/certificates.router';
import supportRouter from './support/support.router';
import analyticsRouter from './analytics/analytics.router';

const router = Router();

router.use('/auth', academyAuthRouter);
router.use('/', coursesRouter);
router.use('/', lessonsRouter);
router.use('/', progressRouter);
router.use('/', quizzesRouter);
router.use('/', certificatesRouter);
router.use('/', supportRouter);
router.use('/', analyticsRouter);

export { router as academyRouter };
