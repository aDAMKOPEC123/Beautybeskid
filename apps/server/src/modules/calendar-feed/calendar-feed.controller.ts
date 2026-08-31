import { Request, Response, NextFunction } from 'express';
import { getOrCreateFeed, regenerateToken, buildFeedForToken } from './calendar-feed.service';

export const handleGetConfig = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const feed = await getOrCreateFeed();
    res.json({
      token: feed.token,
      lastAccessedAt: feed.lastAccessedAt,
      accessCount: feed.accessCount,
    });
  } catch (err) {
    next(err);
  }
};

export const handleRegenerate = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const feed = await regenerateToken();
    res.json({ token: feed.token, lastAccessedAt: null, accessCount: 0 });
  } catch (err) {
    next(err);
  }
};

export const handleFeed = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Token jest poświadczeniem — nie może trafić do żadnego logu.
    const ics = await buildFeedForToken(req.params.token);
    if (ics === null) {
      // 404, a nie 401: odpowiedź nie potwierdza, czy jakikolwiek token istnieje.
      res.status(404).json({ status: 'error', message: 'Nie znaleziono' });
      return;
    }
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(ics);
  } catch (err) {
    next(err);
  }
};
