import { Router } from 'express';
import { authenticate } from '../../../middleware/auth.middleware';
import { requireAdmin } from '../../../middleware/admin.middleware';
import * as accessController from './access.controller';

const router = Router();

router.use(authenticate, requireAdmin);

router.post('/grant', accessController.grantAccess);
router.post('/revoke', accessController.revokeAccess);
router.get('/log/:userId', accessController.getAccessLog);

export default router;
