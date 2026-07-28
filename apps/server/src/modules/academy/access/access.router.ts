import { Router } from 'express';
import { academyAuthenticate, academyRequireAdmin } from '../../../middleware/academy-auth.middleware';
import * as accessController from './access.controller';

const router = Router();

router.use(academyAuthenticate, academyRequireAdmin);

router.post('/grant', accessController.grantAccess);
router.post('/revoke', accessController.revokeAccess);
router.get('/log/:userId', accessController.getAccessLog);

export default router;
