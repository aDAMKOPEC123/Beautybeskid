import { Router } from 'express';
import { academyAuthenticate, academyRequireAdmin, academyRequirePurchase } from '../../../middleware/academy-auth.middleware';
import * as quizzesController from './quizzes.controller';

const router = Router();

// User routes (require academy access)
router.get('/quizzes', academyAuthenticate, academyRequirePurchase, quizzesController.listStandaloneQuizzes);
router.get('/quizzes/:quizId', academyAuthenticate, academyRequirePurchase, quizzesController.getStandaloneQuiz);
router.post('/quizzes/:quizId/attempt', academyAuthenticate, academyRequirePurchase, quizzesController.submitAttempt);
router.get('/lessons/:lessonId/quiz', academyAuthenticate, academyRequirePurchase, quizzesController.getQuizForLesson);

// Admin routes
router.get('/admin/quizzes', academyAuthenticate, academyRequireAdmin, quizzesController.adminListQuizzes);
router.get('/admin/quizzes/:id', academyAuthenticate, academyRequireAdmin, quizzesController.adminGetQuiz);
router.post('/admin/quizzes', academyAuthenticate, academyRequireAdmin, quizzesController.createQuiz);
router.patch('/admin/quizzes/:id', academyAuthenticate, academyRequireAdmin, quizzesController.updateQuiz);
router.delete('/admin/quizzes/:id', academyAuthenticate, academyRequireAdmin, quizzesController.deleteQuiz);
router.post('/admin/quizzes/:quizId/questions', academyAuthenticate, academyRequireAdmin, quizzesController.createQuestion);
router.patch('/admin/questions/:questionId', academyAuthenticate, academyRequireAdmin, quizzesController.updateQuestion);
router.delete('/admin/questions/:questionId', academyAuthenticate, academyRequireAdmin, quizzesController.deleteQuestion);

export default router;
