import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';
import { upload } from '../../config/multer';
import * as ctrl from './beauty-plan.controller';

const router = Router();

router.use(authenticate);

// User
router.get('/my', ctrl.getMyPlan);

// Admin
router.get('/', requireAdmin, ctrl.getAllPlans);
router.get('/user/:userId', requireAdmin, ctrl.getPlanByUser);
router.post('/user/:userId', requireAdmin, ctrl.createPlan);
router.patch('/:id', requireAdmin, ctrl.updatePlan);
router.delete('/:id', requireAdmin, ctrl.deletePlan);
router.post('/:id/section/:sectionId/image', requireAdmin, upload.single('image'), ctrl.uploadSectionImage);

export default router;
