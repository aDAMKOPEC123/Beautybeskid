// filepath: apps/server/src/modules/loyalty/loyalty.router.ts
import { Router } from 'express';
import * as loyaltyController from './loyalty.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';

const router = Router();

router.get('/rewards', loyaltyController.getRewards);

router.use(authenticate);

router.get('/stats', loyaltyController.getStats);
router.get('/history', loyaltyController.getHistory);
router.post('/redeem', loyaltyController.redeem);
router.get('/coupons', loyaltyController.getCoupons);
router.get('/vouchers/validate', loyaltyController.validateVoucher);
router.post('/coupons/:id/use', requireAdmin, loyaltyController.useCoupon);

router.post('/adjust', requireAdmin, loyaltyController.adjust);
router.post('/rewards', requireAdmin, loyaltyController.createReward);
router.delete('/rewards/:id', requireAdmin, loyaltyController.deleteReward);
router.patch('/users/:id/tier', requireAdmin, loyaltyController.updateTier);

export default router;
