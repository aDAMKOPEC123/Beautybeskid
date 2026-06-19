import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as pushController from './push.controller';

const router = Router();

router.get('/vapid-key', pushController.getVapidKey);
router.post('/subscribe', authenticate, pushController.subscribe);
router.delete('/unsubscribe', authenticate, pushController.unsubscribe);

export default router;
