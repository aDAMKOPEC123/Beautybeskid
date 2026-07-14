import { Router } from 'express';
import { academyAuthenticate, academyRequireAdmin } from '../../../middleware/academy-auth.middleware';
import * as controller from './support.controller';

const router = Router();
router.get('/support/my-thread', academyAuthenticate, controller.myThread);
router.post('/support/messages', academyAuthenticate, controller.sendMine);
router.get('/admin/support/threads', academyAuthenticate, academyRequireAdmin, controller.adminThreads);
router.post('/admin/support/threads/:threadId/messages', academyAuthenticate, academyRequireAdmin, controller.sendAsAdmin);
export default router;
