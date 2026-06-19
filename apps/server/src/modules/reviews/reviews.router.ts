// filepath: apps/server/src/modules/reviews/reviews.router.ts
import { Router } from 'express';
import * as reviewsController from './reviews.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';

const router = Router();

// Public
router.get('/service/:serviceId', reviewsController.getServiceReviews);

// Auth required
router.post('/', authenticate, reviewsController.create);
router.get('/pending', authenticate, reviewsController.getPending);

// Admin only
router.patch('/:id/visibility', authenticate, requireAdmin, reviewsController.toggleVisibility);
router.get('/admin', authenticate, requireAdmin, reviewsController.getAll);

export default router;
