import { Router } from 'express';
import { academyAuthenticate } from '../../../middleware/academy-auth.middleware';
import * as academyPushController from './academy-push.controller';

const router = Router();

router.get('/push/vapid-key', academyPushController.getVapidKey);
router.post('/push/subscribe', academyAuthenticate, academyPushController.subscribe);
router.delete('/push/unsubscribe', academyAuthenticate, academyPushController.unsubscribe);

export default router;
