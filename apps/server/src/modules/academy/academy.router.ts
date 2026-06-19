import { Router } from 'express';
import accessRouter from './access/access.router';
import coursesRouter from './courses/courses.router';
import lessonsRouter from './lessons/lessons.router';
import progressRouter from './progress/progress.router';
import quizzesRouter from './quizzes/quizzes.router';
import certificatesRouter from './certificates/certificates.router';

const router = Router();

router.use('/access', accessRouter);
router.use('/', coursesRouter);
router.use('/', lessonsRouter);
router.use('/', progressRouter);
router.use('/', quizzesRouter);
router.use('/', certificatesRouter);

export { router as academyRouter };
