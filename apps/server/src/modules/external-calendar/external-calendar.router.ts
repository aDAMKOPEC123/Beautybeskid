import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';
import {
  handleGetSource,
  handleUpsertSource,
  handleDeleteSource,
  handleSyncNow,
  handleListEvents,
} from './external-calendar.controller';

const router = Router();

router.get('/source', authenticate, requireAdmin, handleGetSource);
router.put('/source', authenticate, requireAdmin, handleUpsertSource);
router.delete('/source', authenticate, requireAdmin, handleDeleteSource);
router.post('/sync', authenticate, requireAdmin, handleSyncNow);
router.get('/events', authenticate, requireAdmin, handleListEvents);

export default router;
