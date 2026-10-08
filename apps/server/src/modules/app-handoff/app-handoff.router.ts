import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as appHandoffController from './app-handoff.controller';

const router = Router();

const saveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { status: 'error', message: 'Zbyt wiele prób. Spróbuj ponownie za chwilę.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Publiczne: w przeglądarce Messengera klientka nie jest zalogowana.
router.post('/', saveLimiter, appHandoffController.save);
router.post('/claim', appHandoffController.claim);

export default router;
