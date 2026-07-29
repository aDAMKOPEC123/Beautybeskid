# Academy Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 5 features to the academy module: PWA, free preview, PDF attachments, case studies, and threaded lesson comments.

**Architecture:** Each feature adds to existing academy backend (lessons service/controller/router) and academy-web frontend. Prisma schema extended with 3 new models. PWA added via vite-plugin-pwa. All features follow existing patterns: field allowlists, sanitize-html, hasActiveCourseAccess(), academy auth middleware.

**Tech Stack:** Prisma, Express, multer, sanitize-html, vite-plugin-pwa, React, TanStack Query, Tailwind CSS, Lucide icons.

---

## File Map

**Prisma schema** (modify):
- `apps/server/prisma/schema.prisma` — add `LessonAttachment`, `LessonCaseStudy`, `CaseStudyImage`, `LessonComment` models + `CaseStudyImageType` enum

**Backend — existing files** (modify):
- `apps/server/src/modules/academy/lessons/lessons.service.ts` — add attachment, case study, and comment service functions
- `apps/server/src/modules/academy/lessons/lessons.controller.ts` — add controller handlers
- `apps/server/src/modules/academy/lessons/lessons.router.ts` — add routes
- `apps/server/src/modules/academy/courses/courses.service.ts` — add `getPreviewLesson()` function
- `apps/server/src/modules/academy/courses/courses.router.ts` — add preview route
- `apps/server/src/modules/academy/courses/courses.controller.ts` — add preview controller
- `apps/server/src/config/multer.ts` — add `uploadDocument` multer instance for PDFs

**Frontend — academy-web** (modify/create):
- `apps/academy-web/vite.config.ts` — add PWA plugin
- `apps/academy-web/index.html` — add manifest link
- `apps/academy-web/package.json` — add vite-plugin-pwa dependency

**Frontend — academy-web** (create):
- `apps/academy-web/public/manifest.json` — PWA manifest (if not using plugin auto-generation)

---

### Task 1: Prisma Schema — New Models

**Files:**
- Modify: `apps/server/prisma/schema.prisma`

- [ ] **Step 1: Add LessonAttachment model**

Add after the `LessonNote` model (around line 2148):

```prisma
model LessonAttachment {
  id           String   @id @default(cuid())
  lessonId     String
  lesson       Lesson   @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  fileName     String
  originalName String
  fileSize     Int
  mimeType     String
  description  String?
  order        Int      @default(0)
  createdAt    DateTime @default(now())

  @@index([lessonId])
}
```

- [ ] **Step 2: Add CaseStudyImageType enum, LessonCaseStudy and CaseStudyImage models**

```prisma
enum CaseStudyImageType {
  BEFORE
  AFTER
  DURING
}

model LessonCaseStudy {
  id                   String             @id @default(cuid())
  lessonId             String
  lesson               Lesson             @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  title                String
  problemDescription   String
  treatmentDescription String
  resultsDescription   String
  order                Int                @default(0)
  createdAt            DateTime           @default(now())

  images CaseStudyImage[]

  @@index([lessonId])
}

model CaseStudyImage {
  id          String              @id @default(cuid())
  caseStudyId String
  caseStudy   LessonCaseStudy     @relation(fields: [caseStudyId], references: [id], onDelete: Cascade)
  imageUrl    String
  caption     String?
  type        CaseStudyImageType
  order       Int                 @default(0)

  @@index([caseStudyId])
}
```

- [ ] **Step 3: Add LessonComment model**

```prisma
model LessonComment {
  id           String          @id @default(cuid())
  lessonId     String
  lesson       Lesson          @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  userId       String
  user         AcademyUser     @relation(fields: [userId], references: [id], onDelete: Cascade)
  parentId     String?
  parent       LessonComment?  @relation("CommentReplies", fields: [parentId], references: [id], onDelete: Cascade)
  replies      LessonComment[] @relation("CommentReplies")
  content      String
  isAdminReply Boolean         @default(false)
  isDeleted    Boolean         @default(false)
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt

  @@index([lessonId, createdAt])
  @@index([userId])
}
```

- [ ] **Step 4: Add relations to Lesson and AcademyUser models**

In the `Lesson` model, add after `notes LessonNote[]`:
```prisma
  attachments  LessonAttachment[]
  caseStudies  LessonCaseStudy[]
  comments     LessonComment[]
```

In the `AcademyUser` model, add after `lessonNotes`:
```prisma
  lessonComments            LessonComment[]
```

- [ ] **Step 5: Run migration**

```bash
cd apps/server && npx prisma migrate dev --name add_attachments_casestudies_comments
```

- [ ] **Step 6: Commit**

```bash
git add apps/server/prisma/
git commit -m "feat(academy): add Prisma models for attachments, case studies, comments"
```

---

### Task 2: Backend — PDF Attachments

**Files:**
- Modify: `apps/server/src/config/multer.ts`
- Modify: `apps/server/src/modules/academy/lessons/lessons.service.ts`
- Modify: `apps/server/src/modules/academy/lessons/lessons.controller.ts`
- Modify: `apps/server/src/modules/academy/lessons/lessons.router.ts`

- [ ] **Step 1: Add uploadDocument multer instance**

In `apps/server/src/config/multer.ts`, add after the existing `upload` export:

```typescript
const DOCUMENT_MIMETYPES = [
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export const uploadDocument = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    if (DOCUMENT_MIMETYPES.includes(file.mimetype)) return cb(null, true);
    cb(new AppError('Dozwolone formaty: PDF, ZIP, DOCX', 400));
  },
});
```

- [ ] **Step 2: Add attachment service functions**

In `apps/server/src/modules/academy/lessons/lessons.service.ts`, add:

```typescript
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

export const addAttachment = async (lessonId: string, file: Express.Multer.File, description?: string) => {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { id: true } });
  if (!lesson) throw new AppError('Nie znaleziono lekcji', 404);

  const ext = path.extname(file.originalname).toLowerCase();
  const fileName = `${crypto.randomUUID()}${ext}`;
  const dir = path.join(UPLOADS_DIR, 'academy-attachments');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, fileName), file.buffer);

  const count = await prisma.lessonAttachment.count({ where: { lessonId } });
  return prisma.lessonAttachment.create({
    data: {
      lessonId,
      fileName,
      originalName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      description: description?.trim() || null,
      order: count,
    },
  });
};

export const deleteAttachment = async (id: string) => {
  const attachment = await prisma.lessonAttachment.findUnique({ where: { id } });
  if (!attachment) throw new AppError('Nie znaleziono załącznika', 404);
  const filePath = path.join(UPLOADS_DIR, 'academy-attachments', attachment.fileName);
  await fs.unlink(filePath).catch(() => {});
  await prisma.lessonAttachment.delete({ where: { id } });
};

export const getAttachmentForDownload = async (lessonId: string, attachmentId: string, userId: string, isAdmin: boolean) => {
  const attachment = await prisma.lessonAttachment.findFirst({ where: { id: attachmentId, lessonId } });
  if (!attachment) throw new AppError('Nie znaleziono załącznika', 404);

  if (!isAdmin) {
    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { module: { select: { courseId: true, course: { select: { accessDays: true } } } } } });
    if (!lesson) throw new AppError('Nie znaleziono lekcji', 404);
    const enrollment = await prisma.academyEnrollment.findUnique({ where: { userId_courseId: { userId, courseId: lesson.module.courseId } } });
    if (!hasActiveCourseAccess(enrollment, lesson.module.course.accessDays)) throw new AppError('Dostęp do materiałów wymaga zakupu kursu', 403);
  }

  return {
    filePath: path.join(UPLOADS_DIR, 'academy-attachments', attachment.fileName),
    originalName: attachment.originalName,
    mimeType: attachment.mimeType,
  };
};
```

- [ ] **Step 3: Add attachment controller functions**

In `apps/server/src/modules/academy/lessons/lessons.controller.ts`, add:

```typescript
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
```

- [ ] **Step 4: Add attachment routes**

In `apps/server/src/modules/academy/lessons/lessons.router.ts`, add imports and routes:

```typescript
import { uploadDocument } from '../../../config/multer';

// After existing user routes:
router.get('/lessons/:lessonId/attachments/:attachmentId/download', academyAuthenticate, lessonsController.downloadAttachment);

// After existing admin routes:
router.post('/admin/lessons/:lessonId/attachments', academyAuthenticate, academyRequireAdmin, uploadDocument.single('file'), lessonsController.addAttachment);
router.delete('/admin/attachments/:id', academyAuthenticate, academyRequireAdmin, lessonsController.deleteAttachment);
```

- [ ] **Step 5: Include attachments in getLessonBySlug**

In `lessons.service.ts`, modify the `getLessonBySlug` function's Prisma query to include attachments. Add to the `include` block:

```typescript
attachments: { orderBy: { order: 'asc' } },
```

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/
git commit -m "feat(academy): add PDF attachment upload, download, and delete for lessons"
```

---

### Task 3: Backend — Free Preview

**Files:**
- Modify: `apps/server/src/modules/academy/courses/courses.service.ts`
- Modify: `apps/server/src/modules/academy/courses/courses.controller.ts`
- Modify: `apps/server/src/modules/academy/courses/courses.router.ts`

- [ ] **Step 1: Add getPreviewLesson service function**

In `courses.service.ts`, add:

```typescript
export const getPreviewLesson = async (slug: string) => {
  const course = await prisma.course.findUnique({
    where: { slug },
    select: { id: true, status: true, isActive: true, previewLessonId: true },
  });
  if (!course || course.status !== 'PUBLISHED' || !course.isActive) throw new AppError('Nie znaleziono kursu', 404);
  if (!course.previewLessonId) throw new AppError('Ten kurs nie ma lekcji próbnej', 404);

  const lesson = await prisma.lesson.findUnique({
    where: { id: course.previewLessonId },
    select: {
      id: true, title: true, slug: true, type: true,
      videoProvider: true, videoId: true,
      contentHtml: true, transcriptHtml: true,
      thumbnailUrl: true, estimatedMinutes: true,
    },
  });
  if (!lesson) throw new AppError('Lekcja próbna nie jest dostępna', 404);
  return lesson;
};
```

- [ ] **Step 2: Add preview controller**

In `courses.controller.ts`, add:

```typescript
export const getPreviewLesson = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ data: await coursesService.getPreviewLesson(req.params.slug) }); } catch (error) { next(error); }
};
```

- [ ] **Step 3: Add preview route**

In `courses.router.ts`, add after the existing public routes:

```typescript
router.get('/public/courses/:slug/preview', coursesController.getPreviewLesson);
```

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/modules/academy/courses/
git commit -m "feat(academy): add public preview lesson endpoint"
```

---

### Task 4: Backend — Case Studies

**Files:**
- Modify: `apps/server/src/modules/academy/lessons/lessons.service.ts`
- Modify: `apps/server/src/modules/academy/lessons/lessons.controller.ts`
- Modify: `apps/server/src/modules/academy/lessons/lessons.router.ts`

- [ ] **Step 1: Add case study service functions**

In `lessons.service.ts`, add:

```typescript
const CASE_STUDY_FIELDS = ['title', 'problemDescription', 'treatmentDescription', 'resultsDescription', 'order'] as const;
const pickCaseStudyFields = (data: Record<string, unknown>) => {
  const picked: Record<string, unknown> = {};
  for (const key of CASE_STUDY_FIELDS) if (data[key] !== undefined) picked[key] = data[key];
  // Sanitize text fields
  for (const key of ['problemDescription', 'treatmentDescription', 'resultsDescription'] as const) {
    if (typeof picked[key] === 'string') picked[key] = sanitizeHtml(picked[key] as string, lessonHtmlOptions);
  }
  return picked;
};

export const createCaseStudy = async (lessonId: string, data: Record<string, unknown>) => {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { id: true } });
  if (!lesson) throw new AppError('Nie znaleziono lekcji', 404);
  return prisma.lessonCaseStudy.create({ data: { lessonId, ...pickCaseStudyFields(data) } as any });
};

export const updateCaseStudy = async (id: string, data: Record<string, unknown>) => {
  return prisma.lessonCaseStudy.update({ where: { id }, data: pickCaseStudyFields(data) as any });
};

export const deleteCaseStudy = async (id: string) => {
  await prisma.lessonCaseStudy.delete({ where: { id } });
};

export const addCaseStudyImage = async (caseStudyId: string, file: Express.Multer.File, type: string, caption?: string) => {
  const cs = await prisma.lessonCaseStudy.findUnique({ where: { id: caseStudyId }, select: { id: true } });
  if (!cs) throw new AppError('Nie znaleziono case study', 404);
  if (!['BEFORE', 'AFTER', 'DURING'].includes(type)) throw new AppError('Typ zdjęcia musi być BEFORE, AFTER lub DURING', 400);

  const imageUrl = await processAndSaveImage(file.buffer, 'academy-case-studies');
  const count = await prisma.caseStudyImage.count({ where: { caseStudyId } });
  return prisma.caseStudyImage.create({
    data: { caseStudyId, imageUrl, type: type as any, caption: caption?.trim() || null, order: count },
  });
};

export const deleteCaseStudyImage = async (id: string) => {
  await prisma.caseStudyImage.delete({ where: { id } });
};
```

Need to add import at top of file:
```typescript
import { processAndSaveImage } from '../../../utils/imageProcessor';
```

- [ ] **Step 2: Add case study controller functions**

In `lessons.controller.ts`, add:

```typescript
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
```

- [ ] **Step 3: Add case study routes**

In `lessons.router.ts`, add admin routes:

```typescript
// Case study admin routes
router.post('/admin/lessons/:lessonId/case-studies', academyAuthenticate, academyRequireAdmin, lessonsController.createCaseStudy);
router.patch('/admin/case-studies/:id', academyAuthenticate, academyRequireAdmin, lessonsController.updateCaseStudy);
router.delete('/admin/case-studies/:id', academyAuthenticate, academyRequireAdmin, lessonsController.deleteCaseStudy);
router.post('/admin/case-studies/:caseStudyId/images', academyAuthenticate, academyRequireAdmin, upload.single('image'), lessonsController.addCaseStudyImage);
router.delete('/admin/case-study-images/:id', academyAuthenticate, academyRequireAdmin, lessonsController.deleteCaseStudyImage);
```

- [ ] **Step 4: Include case studies in getLessonBySlug**

In `lessons.service.ts`, add to the `getLessonBySlug` include block:

```typescript
caseStudies: {
  include: { images: { orderBy: { order: 'asc' } } },
  orderBy: { order: 'asc' },
},
```

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/
git commit -m "feat(academy): add case study CRUD with image upload for lessons"
```

---

### Task 5: Backend — Threaded Comments

**Files:**
- Modify: `apps/server/src/modules/academy/lessons/lessons.service.ts`
- Modify: `apps/server/src/modules/academy/lessons/lessons.controller.ts`
- Modify: `apps/server/src/modules/academy/lessons/lessons.router.ts`

- [ ] **Step 1: Add comment service functions**

In `lessons.service.ts`, add:

```typescript
export const getComments = async (lessonId: string) => {
  const comments = await prisma.lessonComment.findMany({
    where: { lessonId, parentId: null },
    include: {
      user: { select: { id: true, name: true, role: true } },
      replies: {
        where: { isDeleted: false },
        include: { user: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  return comments.map(c => c.isDeleted ? { ...c, content: '[Komentarz usunięty]', user: { id: '', name: '', role: 'USER' } } : c);
};

export const addComment = async (lessonId: string, userId: string, content: string) => {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { module: { select: { courseId: true, course: { select: { accessDays: true } } } } },
  });
  if (!lesson) throw new AppError('Nie znaleziono lekcji', 404);

  const user = await prisma.academyUser.findUnique({ where: { id: userId }, select: { role: true } });
  const isAdmin = user?.role === 'ADMIN';

  if (!isAdmin) {
    const enrollment = await prisma.academyEnrollment.findUnique({
      where: { userId_courseId: { userId, courseId: lesson.module.courseId } },
    });
    if (!hasActiveCourseAccess(enrollment, lesson.module.course.accessDays))
      throw new AppError('Komentowanie wymaga aktywnego dostępu do kursu', 403);
  }

  return prisma.lessonComment.create({
    data: {
      lessonId,
      userId,
      content: sanitizeHtml(content, { allowedTags: [], allowedAttributes: {} }),
      isAdminReply: isAdmin,
    },
    include: { user: { select: { id: true, name: true, role: true } } },
  });
};

export const addReply = async (commentId: string, userId: string, content: string) => {
  const parent = await prisma.lessonComment.findUnique({
    where: { id: commentId },
    select: { id: true, lessonId: true, parentId: true },
  });
  if (!parent) throw new AppError('Nie znaleziono komentarza', 404);
  if (parent.parentId) throw new AppError('Odpowiadanie na odpowiedzi nie jest dozwolone', 400);

  const lesson = await prisma.lesson.findUnique({
    where: { id: parent.lessonId },
    select: { module: { select: { courseId: true, course: { select: { accessDays: true } } } } },
  });

  const user = await prisma.academyUser.findUnique({ where: { id: userId }, select: { role: true } });
  const isAdmin = user?.role === 'ADMIN';

  if (!isAdmin) {
    const enrollment = await prisma.academyEnrollment.findUnique({
      where: { userId_courseId: { userId, courseId: lesson!.module.courseId } },
    });
    if (!hasActiveCourseAccess(enrollment, lesson!.module.course.accessDays))
      throw new AppError('Komentowanie wymaga aktywnego dostępu do kursu', 403);
  }

  return prisma.lessonComment.create({
    data: {
      lessonId: parent.lessonId,
      userId,
      parentId: commentId,
      content: sanitizeHtml(content, { allowedTags: [], allowedAttributes: {} }),
      isAdminReply: isAdmin,
    },
    include: { user: { select: { id: true, name: true, role: true } } },
  });
};

export const deleteComment = async (commentId: string, userId: string, isAdmin: boolean) => {
  const comment = await prisma.lessonComment.findUnique({ where: { id: commentId } });
  if (!comment) throw new AppError('Nie znaleziono komentarza', 404);
  if (!isAdmin && comment.userId !== userId) throw new AppError('Nie możesz usunąć cudzego komentarza', 403);
  await prisma.lessonComment.update({ where: { id: commentId }, data: { isDeleted: true } });
};
```

- [ ] **Step 2: Add comment controller functions**

In `lessons.controller.ts`, add:

```typescript
export const getComments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const comments = await lessonsService.getComments(req.params.lessonId);
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
```

- [ ] **Step 3: Add comment routes with rate limiting**

In `lessons.router.ts`, add at top:

```typescript
import rateLimit from 'express-rate-limit';

const commentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Zbyt wiele komentarzy — spróbuj ponownie za godzinę' },
});
```

Add routes:

```typescript
// Comment routes
router.get('/lessons/:lessonId/comments', academyAuthenticate, lessonsController.getComments);
router.post('/lessons/:lessonId/comments', academyAuthenticate, commentLimiter, lessonsController.addComment);
router.post('/comments/:commentId/replies', academyAuthenticate, commentLimiter, lessonsController.addReply);
router.delete('/comments/:id', academyAuthenticate, lessonsController.deleteComment);
```

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/
git commit -m "feat(academy): add threaded lesson comments with rate limiting"
```

---

### Task 6: PWA for Academy-Web

**Files:**
- Modify: `apps/academy-web/package.json`
- Modify: `apps/academy-web/vite.config.ts`
- Modify: `apps/academy-web/index.html`

- [ ] **Step 1: Install vite-plugin-pwa**

```bash
cd apps/academy-web && pnpm add -D vite-plugin-pwa
```

- [ ] **Step 2: Update vite.config.ts with PWA plugin**

In `apps/academy-web/vite.config.ts`, add the PWA plugin:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Akademia BeskidStudio',
        short_name: 'Akademia',
        description: 'Kursy kosmetologiczne online — Akademia BeskidStudio by Wiktoria Ćwik',
        theme_color: '#1a1a2e',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@cosmo/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('/node_modules/')) return undefined;
          if (/\/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) return 'vendor-react';
          if (id.includes('@tanstack/react-query')) return 'vendor-query';
          if (id.includes('axios')) return 'vendor-http';
          if (id.includes('zustand')) return 'vendor-state';
          if (id.includes('lucide-react')) return 'vendor-icons';
          if (id.includes('framer-motion')) return 'vendor-motion';
          return undefined;
        },
      },
    },
  },
  server: {
    port: 5174,
    host: true,
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
      '/uploads': { target: 'http://localhost:3001', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:3001', changeOrigin: true, ws: true },
    },
  },
});
```

- [ ] **Step 3: Create PWA icons directory and placeholder icons**

Create `apps/academy-web/public/icons/` directory. The actual icon files (icon-192.png, icon-512.png) must be generated from the BeskidStudio logo. For now, create placeholder files:

```bash
mkdir -p apps/academy-web/public/icons
```

Note: Actual icon PNG files need to be created from the academy logo. Use any image editor or online tool to create 192x192 and 512x512 PNG icons.

- [ ] **Step 4: Update index.html**

In `apps/academy-web/index.html`, add inside `<head>`:

```html
<link rel="apple-touch-icon" href="/icons/icon-192.png" />
<meta name="theme-color" content="#1a1a2e" />
```

- [ ] **Step 5: Commit**

```bash
git add apps/academy-web/
git commit -m "feat(academy): add PWA support with vite-plugin-pwa"
```

---

### Task 7: Verify and Build

- [ ] **Step 1: Generate Prisma client**

```bash
cd apps/server && npx prisma generate
```

- [ ] **Step 2: Build backend**

```bash
cd apps/server && pnpm build
```

Expected: No TypeScript errors.

- [ ] **Step 3: Build academy frontend**

```bash
cd apps/academy-web && pnpm build
```

Expected: No TypeScript errors. PWA manifest and service worker generated in `dist/`.

- [ ] **Step 4: Verify service worker output**

```bash
ls apps/academy-web/dist/sw.js apps/academy-web/dist/manifest.webmanifest 2>/dev/null
```

Expected: Both files exist.

- [ ] **Step 5: Final commit if any fixes needed**

```bash
git add -A && git commit -m "fix(academy): build fixes for new features"
```
