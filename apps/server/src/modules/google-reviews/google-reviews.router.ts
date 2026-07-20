import { Router, Request, Response } from 'express';
import { getGoogleReviews } from './google-reviews.service';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const data = await getGoogleReviews();
    res.set('Cache-Control', 'private, no-store, max-age=0');
    res.json(data);
  } catch (err) {
    console.error('Google reviews fetch failed:', err);
    res.status(503).json({ error: 'Nie udało się pobrać opinii Google' });
  }
});

export default router;
