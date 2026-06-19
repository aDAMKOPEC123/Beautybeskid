import { Router } from 'express';
import * as controller from './discount-codes.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';

const router = Router();

router.get('/referral-benefits', controller.getReferralBenefits);

router.use(authenticate);

// Named routes MUST come before /:id
router.get('/validate', controller.validateCode);
router.get('/welcome', controller.getWelcomeCoupon);
router.get('/ambassador-config', requireAdmin, controller.getAmbassadorConfig);
router.put('/ambassador-config', requireAdmin, controller.updateAmbassadorConfig);

router.get('/', requireAdmin, controller.getAllCodes);
router.post('/', requireAdmin, controller.createCode);
router.patch('/:id/toggle', requireAdmin, controller.toggleCode);
router.delete('/:id', requireAdmin, controller.deleteCode);

export default router;
