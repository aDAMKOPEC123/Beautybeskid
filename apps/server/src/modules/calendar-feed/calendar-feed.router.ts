import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/admin.middleware';
import { handleGetConfig, handleRegenerate, handleFeed } from './calendar-feed.controller';

const router = Router();

// Trasa publiczna: Apple odpytując subskrypcję nie wysyła nagłówka Authorization,
// więc token w ścieżce jest jedynym poświadczeniem. Musi być zadeklarowana przed
// trasami panelu, ale sama nie przechodzi przez authenticate.
router.get('/:token/wizyty.ics', handleFeed);

router.get('/config', authenticate, requireAdmin, handleGetConfig);
router.post('/regenerate', authenticate, requireAdmin, handleRegenerate);

export default router;
