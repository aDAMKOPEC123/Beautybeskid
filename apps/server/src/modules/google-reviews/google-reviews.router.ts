import { Router, Request, Response } from 'express';
import { getGoogleReviews } from './google-reviews.service';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const data = await getGoogleReviews();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Nie udało się pobrać opinii Google' });
  }
});

export default router;
