import { Request, Response, NextFunction } from 'express';
import { processAndSaveImage } from '../../../utils/imageProcessor';
import { AppError } from '../../../middleware/error.middleware';
import * as lessonsService from './lessons.service';

/** Nazwa katalogu przychodzi od klienta, więc nigdy nie trafia do ścieżki bez
 *  sprawdzenia przynależności do tej listy — inaczej byłaby to droga do zapisu
 *  poza katalogiem uploads. */
const ALLOWED_UPLOAD_FOLDERS = ['academy-lessons', 'academy-courses', 'academy-instructors'] as const;

export type AcademyUploadFolder = (typeof ALLOWED_UPLOAD_FOLDERS)[number];

export const resolveUploadFolder = (input: unknown): AcademyUploadFolder =>
  typeof input === 'string' && (ALLOWED_UPLOAD_FOLDERS as readonly string[]).includes(input)
    ? (input as AcademyUploadFolder)
    : 'academy-lessons';

export const getLessonBySlug = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.academyUser!.id;
    const lesson = await lessonsService.getLessonBySlug(req.params.slug, req.params.lessonSlug, userId, req.academyUser!.role === 'ADMIN');
    res.json({ data: lesson });
  } catch (error) {
    next(error);
  }
};

export const saveNote = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const content = typeof req.body.content === 'string' ? req.body.content.trim() : '';
    if (!content) throw new AppError('Notatka nie może być pusta', 400);
    if (content.length > 5000) throw new AppError('Notatka może mieć maksymalnie 5000 znaków', 400);
    const rawTs = req.body.videoTimestamp;
    const videoTimestamp = rawTs != null ? Math.round(Number(rawTs)) : undefined;
    if (videoTimestamp !== undefined && (!Number.isFinite(videoTimestamp) || videoTimestamp < 0 || videoTimestamp > 86400)) throw new AppError('Nieprawidłowy znacznik czasu', 400);
    const note = await lessonsService.saveNote(req.academyUser!.id, req.params.lessonId, content, videoTimestamp);
    res.json({ data: note });
  } catch (error) { next(error); }
};

export const deleteNote = async (req: Request, res: Response, next: NextFunction) => {
  try { await lessonsService.deleteNote(req.academyUser!.id, req.params.lessonId); res.status(204).end(); } catch (error) { next(error); }
};

export const createLesson = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lesson = await lessonsService.createLesson(req.params.moduleId, req.body);
    res.status(201).json({ data: lesson });
  } catch (error) {
    next(error);
  }
};

export const updateLesson = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lesson = await lessonsService.updateLesson(req.params.id, req.body);
    res.json({ data: lesson });
  } catch (error) {
    next(error);
  }
};

export const deleteLesson = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await lessonsService.deleteLesson(req.params.id);
    res.json({ message: 'Lekcja usunięta' });
  } catch (error) {
    next(error);
  }
};

export const uploadInlineImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new AppError('Wybierz obraz do wgrania', 400);

    // Każdy obraz w Akademii jest optymalizowany i zapisywany jako WebP.
    const folder = resolveUploadFolder(req.body?.folder);
    const url = await processAndSaveImage(req.file.buffer, folder);
    res.status(201).json({ data: { url } });
  } catch (error) {
    next(error);
  }
};

// ---- Attachments ----

export const addAttachment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new AppError('Wybierz plik do wgrania', 400);
    const attachment = await lessonsService.addAttachment(req.params.lessonId, req.file, req.body.description);
    res.status(201).json({ data: attachment });
  } catch (error) { next(error); }
};

export const deleteAttachment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await lessonsService.deleteAttachment(req.params.id);
    res.json({ message: 'Załącznik usunięty' });
  } catch (error) { next(error); }
};

export const downloadAttachment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { filePath, originalName, mimeType } = await lessonsService.getAttachmentForDownload(
      req.params.lessonId, req.params.attachmentId, req.academyUser!.id, req.academyUser!.role === 'ADMIN'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(originalName)}"`);
    res.setHeader('Content-Type', mimeType);
    res.sendFile(filePath);
  } catch (error) { next(error); }
};

// ---- Case Studies ----

export const createCaseStudy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cs = await lessonsService.createCaseStudy(req.params.lessonId, req.body);
    res.status(201).json({ data: cs });
  } catch (error) { next(error); }
};

export const updateCaseStudy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cs = await lessonsService.updateCaseStudy(req.params.id, req.body);
    res.json({ data: cs });
  } catch (error) { next(error); }
};

export const deleteCaseStudy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await lessonsService.deleteCaseStudy(req.params.id);
    res.json({ message: 'Case study usunięte' });
  } catch (error) { next(error); }
};

export const addCaseStudyImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new AppError('Wybierz zdjęcie', 400);
    const image = await lessonsService.addCaseStudyImage(req.params.caseStudyId, req.file, req.body.type, req.body.caption);
    res.status(201).json({ data: image });
  } catch (error) { next(error); }
};

export const deleteCaseStudyImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await lessonsService.deleteCaseStudyImage(req.params.id);
    res.json({ message: 'Zdjęcie usunięte' });
  } catch (error) { next(error); }
};

// ---- Comments ----

export const getComments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const comments = await lessonsService.getComments(req.params.lessonId, req.academyUser!.id, req.academyUser!.role === 'ADMIN');
    res.json({ data: comments });
  } catch (error) { next(error); }
};

export const addComment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const content = typeof req.body.content === 'string' ? req.body.content.trim() : '';
    if (!content) throw new AppError('Komentarz nie może być pusty', 400);
    if (content.length > 2000) throw new AppError('Komentarz może mieć maksymalnie 2000 znaków', 400);
    const comment = await lessonsService.addComment(req.params.lessonId, req.academyUser!.id, content);
    res.status(201).json({ data: comment });
  } catch (error) { next(error); }
};

export const addReply = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const content = typeof req.body.content === 'string' ? req.body.content.trim() : '';
    if (!content) throw new AppError('Odpowiedź nie może być pusta', 400);
    if (content.length > 2000) throw new AppError('Odpowiedź może mieć maksymalnie 2000 znaków', 400);
    const reply = await lessonsService.addReply(req.params.commentId, req.academyUser!.id, content);
    res.status(201).json({ data: reply });
  } catch (error) { next(error); }
};

export const deleteComment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await lessonsService.deleteComment(req.params.id, req.academyUser!.id, req.academyUser!.role === 'ADMIN');
    res.json({ message: 'Komentarz usunięty' });
  } catch (error) { next(error); }
};
