import { Router } from 'express';
import { academyAuthenticate, academyRequireAdmin } from '../../../middleware/academy-auth.middleware';
import { upload, uploadDocument } from '../../../config/multer';
import rateLimit from 'express-rate-limit';
import * as lessonsController from './lessons.controller';

const router = Router();

const commentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Zbyt wiele komentarzy — spróbuj ponownie za godzinę' },
});

// User routes
router.get('/courses/:slug/lessons/:lessonSlug', academyAuthenticate, lessonsController.getLessonBySlug);
router.put('/lessons/:lessonId/note', academyAuthenticate, lessonsController.saveNote);
router.delete('/lessons/:lessonId/note', academyAuthenticate, lessonsController.deleteNote);
router.get('/lessons/:lessonId/attachments/:attachmentId/download', academyAuthenticate, lessonsController.downloadAttachment);

// Comment routes
router.get('/lessons/:lessonId/comments', academyAuthenticate, lessonsController.getComments);
router.post('/lessons/:lessonId/comments', academyAuthenticate, commentLimiter, lessonsController.addComment);
router.post('/comments/:commentId/replies', academyAuthenticate, commentLimiter, lessonsController.addReply);
router.delete('/comments/:id', academyAuthenticate, lessonsController.deleteComment);

// Admin routes
router.post('/admin/modules/:moduleId/lessons', academyAuthenticate, academyRequireAdmin, lessonsController.createLesson);
router.post('/admin/lesson-images', academyAuthenticate, academyRequireAdmin, upload.single('image'), lessonsController.uploadInlineImage);
router.patch('/admin/lessons/:id', academyAuthenticate, academyRequireAdmin, lessonsController.updateLesson);
router.delete('/admin/lessons/:id', academyAuthenticate, academyRequireAdmin, lessonsController.deleteLesson);

// Attachment admin routes
router.post('/admin/lessons/:lessonId/attachments', academyAuthenticate, academyRequireAdmin, uploadDocument.single('file'), lessonsController.addAttachment);
router.delete('/admin/attachments/:id', academyAuthenticate, academyRequireAdmin, lessonsController.deleteAttachment);

// Case study admin routes
router.post('/admin/lessons/:lessonId/case-studies', academyAuthenticate, academyRequireAdmin, lessonsController.createCaseStudy);
router.patch('/admin/case-studies/:id', academyAuthenticate, academyRequireAdmin, lessonsController.updateCaseStudy);
router.delete('/admin/case-studies/:id', academyAuthenticate, academyRequireAdmin, lessonsController.deleteCaseStudy);
router.post('/admin/case-studies/:caseStudyId/images', academyAuthenticate, academyRequireAdmin, upload.single('image'), lessonsController.addCaseStudyImage);
router.delete('/admin/case-study-images/:id', academyAuthenticate, academyRequireAdmin, lessonsController.deleteCaseStudyImage);

export default router;
