import { Request, Response, NextFunction } from 'express';
import * as support from './support.service';
import { AppError } from '../../../middleware/error.middleware';
import { processAndSaveImage } from '../../../utils/imageProcessor';

const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const validateMessage = (value: unknown) => {
  const content = text(value);
  if (!content) throw new AppError('Wiadomość nie może być pusta', 400);
  if (content.length > 2000) throw new AppError('Wiadomość może mieć maksymalnie 2000 znaków', 400);
  return content;
};
export const myThread = async (req: Request, res: Response, next: NextFunction) => { try { res.json({ data: await support.getMyThread(req.academyUser!.id) }); } catch (error) { next(error); } };
const categories = ['COURSE_CONTENT', 'PROCEDURE', 'CONTRAINDICATIONS', 'TECHNICAL', 'CERTIFICATE', 'PAYMENT', 'INVOICE', 'REFUND', 'COMPLAINT', 'OTHER'] as const;
const statuses = ['OPEN', 'WAITING_FOR_USER', 'RESOLVED', 'ARCHIVED'] as const;
export const sendMine = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const content = validateMessage(req.body.content);
    const category = categories.includes(req.body.category) ? req.body.category : 'COURSE_CONTENT';
    const consent = req.body.sensitiveDataConsent === true || req.body.sensitiveDataConsent === 'true';
    if (req.file && !consent) throw new AppError('Zaakceptuj zgodę na przetwarzanie załączonego zdjęcia', 400);
    const attachmentUrl = req.file ? await processAndSaveImage(req.file.buffer, 'academy-support') : undefined;
    res.status(201).json({ data: await support.sendUserMessage(req.academyUser!.id, content, {
      category,
      courseId: text(req.body.courseId) || undefined,
      lessonId: text(req.body.lessonId) || undefined,
      attachmentUrl,
      attachmentType: req.file ? 'image/webp' : undefined,
      sensitiveDataConsent: consent,
    }) });
  } catch (error) { next(error); }
};
export const adminThreads = async (_req: Request, res: Response, next: NextFunction) => { try { res.json({ data: await support.listAdminThreads() }); } catch (error) { next(error); } };
export const markAdminRead = async (req: Request, res: Response, next: NextFunction) => { try { await support.markAdminThreadRead(req.params.threadId); res.status(204).end(); } catch (error) { next(error); } };
export const sendAsAdmin = async (req: Request, res: Response, next: NextFunction) => { try { const content = validateMessage(req.body.content); res.status(201).json({ data: await support.sendAdminMessage(req.academyUser!.id, req.params.threadId, content) }); } catch (error) { next(error); } };
export const setStatus = async (req: Request, res: Response, next: NextFunction) => { try { if (!statuses.includes(req.body.status)) throw new AppError('Nieprawidłowy status rozmowy', 400); res.json({ data: await support.updateThreadStatus(req.params.threadId, req.academyUser!.id, req.body.status) }); } catch (error) { next(error); } };
export const rateMine = async (req: Request, res: Response, next: NextFunction) => { try { res.json({ data: await support.rateThread(req.params.threadId, req.academyUser!.id, Number(req.body.rating), text(req.body.comment)) }); } catch (error) { next(error); } };
