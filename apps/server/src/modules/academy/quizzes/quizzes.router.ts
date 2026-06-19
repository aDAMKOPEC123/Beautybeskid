import { Router } from 'express';
import { authenticate } from '../../../middleware/auth.middleware';
import { requireAdmin } from '../../../middleware/admin.middleware';
import { requireAcademyAccess } from '../../../middleware/academy.middleware';
import * as quizzesController from './quizzes.controller';

const router = Router();

// User routes (require academy access)
router.get('/quizzes', authenticate, requireAcademyAccess, quizzesController.listStandaloneQuizzes);
router.get('/quizzes/:quizId', authenticate, requireAcademyAccess, quizzesController.getStandaloneQuiz);
router.post('/quizzes/:quizId/attempt', authenticate, requireAcademyAccess, quizzesController.submitAttempt);
router.get('/lessons/:lessonId/quiz', authenticate, requireAcademyAccess, quizzesController.getQuizForLesson);

// Admin routes
router.get('/admin/quizzes', authenticate, requireAdmin, quizzesController.adminListQuizzes);
router.get('/admin/quizzes/:id', authenticate, requireAdmin, quizzesController.adminGetQuiz);
router.post('/admin/quizzes', authenticate, requireAdmin, quizzesController.createQuiz);
router.patch('/admin/quizzes/:id', authenticate, requireAdmin, quizzesController.updateQuiz);
router.delete('/admin/quizzes/:id', authenticate, requireAdmin, quizzesController.deleteQuiz);
router.post('/admin/quizzes/:quizId/questions', authenticate, requireAdmin, quizzesController.createQuestion);
router.patch('/admin/questions/:questionId', authenticate, requireAdmin, quizzesController.updateQuestion);
router.delete('/admin/questions/:questionId', authenticate, requireAdmin, quizzesController.deleteQuestion);

export default router;
