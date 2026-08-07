import { Router } from 'express';
import academyAuthRouter from './auth/academy-auth.router';
import coursesRouter from './courses/courses.router';
import lessonsRouter from './lessons/lessons.router';
import progressRouter from './progress/progress.router';
import quizzesRouter from './quizzes/quizzes.router';
import certificatesRouter from './certificates/certificates.router';
import supportRouter from './support/support.router';
import analyticsRouter from './analytics/analytics.router';
import paymentsRouter from './payments/payments.router';
import legalRouter from './legal/legal.router';
import marketingRouter from './marketing/marketing.router';
import operationsRouter from './operations/operations.router';
import skinAtlasRouter from './skin-atlas/skin-atlas.router';
import diagnosticCasesRouter from './diagnostic-cases/diagnostic-cases.router';
import academyPushRouter from './push/academy-push.router';

const router = Router();

router.use('/auth', academyAuthRouter);
router.use('/', academyPushRouter);
router.use('/', coursesRouter);
router.use('/', lessonsRouter);
router.use('/', progressRouter);
router.use('/', quizzesRouter);
router.use('/', certificatesRouter);
router.use('/', supportRouter);
router.use('/', analyticsRouter);
router.use('/', paymentsRouter);
router.use('/', legalRouter);
router.use('/', marketingRouter);
router.use('/', operationsRouter);
router.use('/', skinAtlasRouter);
router.use('/', diagnosticCasesRouter);

export { router as academyRouter };
