import { Router } from 'express';
import { authenticate } from '../../../middleware/auth.middleware';
import { requireAdmin } from '../../../middleware/admin.middleware';
import * as controller from './support.controller';

const router = Router();
router.get('/support/my-thread', authenticate, controller.myThread);
router.post('/support/messages', authenticate, controller.sendMine);
router.get('/admin/support/threads', authenticate, requireAdmin, controller.adminThreads);
router.post('/admin/support/threads/:threadId/messages', authenticate, requireAdmin, controller.sendAsAdmin);
export default router;
