// filepath: apps/server/src/modules/reminders/reminders.router.ts
import { Router } from 'express';
import * as remindersController from './reminders.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/me', remindersController.getMyReminders);

export default router;
