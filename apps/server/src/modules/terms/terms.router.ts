// filepath: apps/server/src/modules/terms/terms.router.ts
import { Router } from 'express';
import * as termsController from './terms.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';

const router = Router();

router.get('/', termsController.getTerms);
router.put('/', authenticate, requireAdmin, termsController.updateTerms);

export default router;
