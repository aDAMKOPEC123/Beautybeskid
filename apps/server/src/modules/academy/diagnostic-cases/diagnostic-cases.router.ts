import { Router } from 'express';
import { academyAuthenticate, academyRequireAdmin } from '../../../middleware/academy-auth.middleware';
import { upload } from '../../../config/multer';
import * as casesController from './diagnostic-cases.controller';

const router = Router();

// User — requires auth (course-level access checked in service)
router.get('/diagnostic-cases/course/:courseSlug', academyAuthenticate, casesController.listForCourse);
router.get('/diagnostic-cases/:id', academyAuthenticate, casesController.getCaseStudy);
router.post('/diagnostic-cases/:id/attempt', academyAuthenticate, casesController.submitAttempt);

// Admin — static routes before dynamic /:id routes
router.get('/admin/diagnostic-cases', academyAuthenticate, academyRequireAdmin, casesController.adminList);
router.post('/admin/diagnostic-cases', academyAuthenticate, academyRequireAdmin, casesController.adminCreate);
router.post('/admin/diagnostic-cases/images', academyAuthenticate, academyRequireAdmin, upload.single('image'), casesController.adminUploadStepImage);
router.get('/admin/diagnostic-cases/:id', academyAuthenticate, academyRequireAdmin, casesController.adminGet);
router.patch('/admin/diagnostic-cases/:id', academyAuthenticate, academyRequireAdmin, casesController.adminUpdate);
router.delete('/admin/diagnostic-cases/:id', academyAuthenticate, academyRequireAdmin, casesController.adminDelete);
router.get('/admin/diagnostic-cases/:id/stats', academyAuthenticate, academyRequireAdmin, casesController.adminGetStats);

export default router;
