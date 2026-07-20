import { Request, Response, NextFunction } from 'express';
import path from 'path';
import { verifyToken } from '../utils/jwt';
import { env } from '../config/env';
import { prisma } from '../config/prisma';

// Folders that require authentication + ownership check
const PRIVATE_FOLDERS = ['journal', 'appointments', 'academy-support', 'skin-scans'];

export const privateUploadMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // req.path under app.use('/uploads', ...) is e.g. /journal/abc.webp
  const folder = req.path.split('/')[1];

  if (!PRIVATE_FOLDERS.includes(folder)) {
    // Public folder (avatars, blog, services, etc.) — pass through
    return next();
  }

  // Require Bearer token
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    res.status(401).json({ status: 'error', message: 'Brak autoryzacji' });
    return;
  }

  let decoded: { id: string; role: string; scope?: string };
  try {
    decoded = folder === 'academy-support'
      ? verifyToken(token, `${env.JWT_SECRET}:academy`) as { id: string; role: string; scope?: string }
      : verifyToken(token, env.JWT_SECRET) as { id: string; role: string; scope?: string };
  } catch {
    res.status(401).json({ status: 'error', message: 'Nieprawidłowy token' });
    return;
  }

  if (!decoded?.id || !decoded?.role || (folder === 'academy-support' && decoded.scope !== 'academy')) {
    res.status(401).json({ status: 'error', message: 'Nieprawidłowy token' });
    return;
  }

  // Admins and employees can access all private files
  if (decoded.role === 'ADMIN' || decoded.role === 'EMPLOYEE') {
    return next();
  }

  // Regular users: verify they own the file
  const filename = path.basename(req.path);

  try {
    if (folder === 'journal') {
      const entry = await prisma.skinJournalEntry.findFirst({
        where: { photoPath: { endsWith: filename }, userId: decoded.id },
      });
      if (!entry) {
        res.status(403).json({ status: 'error', message: 'Brak dostępu do pliku' });
        return;
      }
    } else if (folder === 'appointments') {
      const appointment = await prisma.appointment.findFirst({
        where: { photoPath: { endsWith: filename }, userId: decoded.id },
      });
      if (!appointment) {
        res.status(403).json({ status: 'error', message: 'Brak dostępu do pliku' });
        return;
      }
    } else if (folder === 'academy-support') {
      const message = await prisma.academySupportMessage.findFirst({
        where: { attachmentUrl: { endsWith: filename }, thread: { userId: decoded.id } },
      });
      if (!message) {
        res.status(403).json({ status: 'error', message: 'Brak dostępu do pliku' });
        return;
      }
    } else if (folder === 'skin-scans') {
      const image = await prisma.skinScanImage.findFirst({
        where: { imagePath: { endsWith: filename }, session: { userId: decoded.id } },
      });
      if (!image) {
        res.status(403).json({ status: 'error', message: 'Brak dostępu do pliku' });
        return;
      }
    }
    next();
  } catch (error) {
    next(error);
    return;
  }
};
