// filepath: apps/server/src/modules/achievements/achievements.router.ts
import { Router } from 'express';
import * as achievementsController from './achievements.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', achievementsController.getAll);
router.post('/check', achievementsController.check);

export default router;
