import { Router } from 'express';
import { academyAuthenticate, academyRequireAdmin } from '../../../middleware/academy-auth.middleware';
import * as controller from './support.controller';
import rateLimit from 'express-rate-limit';
import { upload } from '../../../config/multer';

const router = Router();
const supportLimiter = rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: true, legacyHeaders: false });
router.get('/support/my-thread', academyAuthenticate, controller.myThread);
router.post('/support/messages', academyAuthenticate, supportLimiter, upload.single('attachment'), controller.sendMine);
router.post('/support/threads/:threadId/rating', academyAuthenticate, controller.rateMine);
router.get('/admin/support/threads', academyAuthenticate, academyRequireAdmin, controller.adminThreads);
router.post('/admin/support/threads/:threadId/read', academyAuthenticate, academyRequireAdmin, controller.markAdminRead);
router.post('/admin/support/threads/:threadId/messages', academyAuthenticate, academyRequireAdmin, controller.sendAsAdmin);
router.patch('/admin/support/threads/:threadId/status', academyAuthenticate, academyRequireAdmin, controller.setStatus);
export default router;
