import { Router } from 'express';
import * as controller from './vouchers.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';

const router = Router();

// Public (authenticated) route — accessible to all logged-in users
router.get('/lookup', authenticate, controller.lookup);

// Admin-only routes
router.use(authenticate, requireAdmin);
router.post('/', controller.create);
router.get('/', controller.list);
router.get('/:id/pdf', controller.getPdf);
router.delete('/:id', controller.remove);

export default router;
