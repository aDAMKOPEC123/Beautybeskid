import { Router } from 'express';
import { academyAuthenticate, academyRequireAdmin, academyRequireAnyPurchase } from '../../../middleware/academy-auth.middleware';
import { upload } from '../../../config/multer';
import * as atlasController from './skin-atlas.controller';

const router = Router();

// Public — requires any course purchase
router.get('/atlas/regions', academyAuthenticate, academyRequireAnyPurchase, atlasController.listRegions);
router.get('/atlas/quiz', academyAuthenticate, academyRequireAnyPurchase, atlasController.getQuizQuestions);
router.get('/atlas/quiz/:region', academyAuthenticate, academyRequireAnyPurchase, atlasController.getQuizQuestions);
router.post('/atlas/quiz', academyAuthenticate, academyRequireAnyPurchase, atlasController.submitQuiz);
router.get('/atlas/:region', academyAuthenticate, academyRequireAnyPurchase, atlasController.getRegion);
router.get('/atlas/:region/:condition', academyAuthenticate, academyRequireAnyPurchase, atlasController.getCondition);

// Admin
router.get('/admin/atlas/regions', academyAuthenticate, academyRequireAdmin, atlasController.adminListRegions);
router.post('/admin/atlas/regions', academyAuthenticate, academyRequireAdmin, atlasController.adminCreateRegion);
router.patch('/admin/atlas/regions/:id', academyAuthenticate, academyRequireAdmin, atlasController.adminUpdateRegion);
router.delete('/admin/atlas/regions/:id', academyAuthenticate, academyRequireAdmin, atlasController.adminDeleteRegion);
router.post('/admin/atlas/conditions', academyAuthenticate, academyRequireAdmin, atlasController.adminCreateCondition);
router.patch('/admin/atlas/conditions/:id', academyAuthenticate, academyRequireAdmin, atlasController.adminUpdateCondition);
router.delete('/admin/atlas/conditions/:id', academyAuthenticate, academyRequireAdmin, atlasController.adminDeleteCondition);
router.post('/admin/atlas/questions', academyAuthenticate, academyRequireAdmin, atlasController.adminCreateQuizQuestion);
router.delete('/admin/atlas/questions/:id', academyAuthenticate, academyRequireAdmin, atlasController.adminDeleteQuizQuestion);
router.post('/admin/atlas/images', academyAuthenticate, academyRequireAdmin, upload.single('image'), atlasController.adminUploadImage);
router.delete('/admin/atlas/images/:id', academyAuthenticate, academyRequireAdmin, atlasController.adminDeleteImage);

export default router;
