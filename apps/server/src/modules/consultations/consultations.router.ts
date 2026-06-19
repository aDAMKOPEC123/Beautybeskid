import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as consultationsController from './consultations.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';

const router = Router();

const consultationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Zbyt wiele zgłoszeń. Spróbuj ponownie za 15 minut.',
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/', consultationLimiter, consultationsController.create);

router.use(authenticate, requireAdmin);
router.get('/', consultationsController.getActive);
router.get('/archived', consultationsController.getArchived);
router.patch('/:id/contact', consultationsController.markContacted);
router.delete('/:id', consultationsController.remove);

export default router;
