import path from 'path';
import fs from 'fs/promises';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { nanoid } from 'nanoid';
import { prisma } from '../../../config/prisma';
import { AppError } from '../../../middleware/error.middleware';

const UPLOADS_DIR = path.resolve('uploads/certificates');

const ensureDir = async () => {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
};

const generatePDF = async (opts: {
  recipientName: string;
  title: string;
  code: string;
  issuedAt: Date;
}): Promise<Buffer> => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([842, 595]); // A4 landscape
  const { width, height } = page.getSize();

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const gold = rgb(0.82, 0.68, 0.21);
  const dark = rgb(0.1, 0.1, 0.1);
  const gray = rgb(0.5, 0.5, 0.5);

  // Background
  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(1, 1, 1) });

  // Border
  page.drawRectangle({ x: 20, y: 20, width: width - 40, height: height - 40, borderColor: gold, borderWidth: 3, color: rgb(1, 1, 1) });
  page.drawRectangle({ x: 30, y: 30, width: width - 60, height: height - 60, borderColor: gold, borderWidth: 1, color: rgb(1, 1, 1) });

  // BeautyStudio By Wiktoria Ćwik header
  const brandWidth = fontBold.widthOfTextAtSize('BeautyStudio By Wiktoria Ćwik', 36);
  page.drawText('BeautyStudio By Wiktoria Ćwik', { x: width / 2 - brandWidth / 2, y: height - 100, size: 36, font: fontBold, color: gold });
  page.drawText('Akademia Beauty', { x: width / 2 - 80, y: height - 130, size: 16, font: fontRegular, color: dark });

  // Certificate text
  page.drawText('CERTYFIKAT UKOŃCZENIA', { x: width / 2 - 140, y: height - 200, size: 22, font: fontBold, color: dark });
  page.drawText('Niniejszym poświadczamy, że', { x: width / 2 - 110, y: height - 250, size: 14, font: fontRegular, color: gray });

  // Name
  const nameWidth = fontBold.widthOfTextAtSize(opts.recipientName, 28);
  page.drawText(opts.recipientName, { x: width / 2 - nameWidth / 2, y: height - 295, size: 28, font: fontBold, color: dark });

  // Course title
  page.drawText('ukończył(a) z wynikiem pozytywnym:', { x: width / 2 - 140, y: height - 340, size: 14, font: fontRegular, color: gray });
  const titleWidth = fontBold.widthOfTextAtSize(opts.title, 18);
  page.drawText(opts.title, { x: width / 2 - titleWidth / 2, y: height - 370, size: 18, font: fontBold, color: gold });

  // Date and code
  const dateStr = opts.issuedAt.toLocaleDateString('pl-PL');
  page.drawText(`Data wydania: ${dateStr}`, { x: 60, y: 80, size: 11, font: fontRegular, color: gray });
  page.drawText(`Kod weryfikacyjny: ${opts.code}`, { x: width - 280, y: 80, size: 11, font: fontRegular, color: gray });

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
};

export const issueCertificate = async (
  userId: string,
  opts: { courseId?: string; quizId?: string }
) => {
  if (!opts.courseId && !opts.quizId) {
    throw new AppError('Wymagane courseId lub quizId', 400);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });
  if (!user) throw new AppError('Nie znaleziono użytkownika', 404);

  let title = 'Kurs Akademii BeautyStudio By Wiktoria Ćwik';
  if (opts.courseId) {
    const course = await prisma.course.findUnique({ where: { id: opts.courseId }, select: { title: true } });
    if (course) title = course.title;
  } else if (opts.quizId) {
    const quiz = await prisma.academyQuiz.findUnique({ where: { id: opts.quizId }, select: { title: true } });
    if (quiz) title = quiz.title;
  }

  const verificationCode = nanoid(12);
  const issuedAt = new Date();

  // Guard against race condition: if a certificate was already issued between the caller's check and now, return early.
  const alreadyIssued = await prisma.academyCertificate.findFirst({
    where: {
      userId,
      ...(opts.courseId ? { courseId: opts.courseId } : {}),
      ...(opts.quizId ? { quizId: opts.quizId } : {}),
    },
  });
  if (alreadyIssued) return alreadyIssued;

  await ensureDir();
  const pdfBuffer = await generatePDF({ recipientName: user.name, title, code: verificationCode, issuedAt });
  const pdfPath = path.join(UPLOADS_DIR, `${verificationCode}.pdf`);
  await fs.writeFile(pdfPath, pdfBuffer);

  let certificate;
  try {
    certificate = await prisma.academyCertificate.create({
      data: {
        userId,
        courseId: opts.courseId ?? null,
        quizId: opts.quizId ?? null,
        verificationCode,
        issuedAt,
      },
    });
  } catch (err) {
    // Remove the PDF file if the DB insert failed to avoid orphaned files.
    await fs.unlink(pdfPath).catch(() => {});
    throw err;
  }

  return certificate;
};

export const getUserCertificates = async (userId: string) => {
  const certs = await prisma.academyCertificate.findMany({
    where: { userId },
    include: {
      course: { select: { title: true, slug: true } },
      quiz: { select: { title: true } },
    },
    orderBy: { issuedAt: 'desc' },
  });

  return certs.map((cert) => ({
    ...cert,
    downloadUrl: `/api/academy/certificates/download/${cert.verificationCode}`,
  }));
};

export const verifyCertificate = async (code: string) => {
  const cert = await prisma.academyCertificate.findUnique({
    where: { verificationCode: code },
    include: {
      user: { select: { name: true } },
      course: { select: { title: true } },
      quiz: { select: { title: true } },
    },
  });

  if (!cert) throw new AppError('Certyfikat nie istnieje lub jest nieważny', 404);

  return {
    verificationCode: cert.verificationCode,
    recipientName: cert.user.name,
    title: cert.course?.title ?? cert.quiz?.title ?? 'Akademia BeautyStudio By Wiktoria Ćwik',
    issuedAt: cert.issuedAt,
    type: cert.courseId ? 'course' : 'quiz',
  };
};
