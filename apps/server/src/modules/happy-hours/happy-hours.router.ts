import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';
import {
  handleGetActiveHappyHours,
  handleGetHappyHours,
  handleCreateHappyHour,
  handleUpdateHappyHour,
  handleDeleteHappyHour,
  handleToggleHappyHour,
} from './happy-hours.controller';

const router = Router();

// Public — must be before /:id
router.get('/active', handleGetActiveHappyHours);

// Admin only
router.get('/', authenticate, requireAdmin, handleGetHappyHours);
router.post('/', authenticate, requireAdmin, handleCreateHappyHour);
router.patch('/:id/toggle', authenticate, requireAdmin, handleToggleHappyHour);
router.patch('/:id', authenticate, requireAdmin, handleUpdateHappyHour);
router.delete('/:id', authenticate, requireAdmin, handleDeleteHappyHour);

export default router;
