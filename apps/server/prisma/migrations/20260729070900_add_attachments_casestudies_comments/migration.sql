-- CreateEnum
CREATE TYPE "CaseStudyImageType" AS ENUM ('BEFORE', 'AFTER', 'DURING');

-- CreateTable
CREATE TABLE "LessonAttachment" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonCaseStudy" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "problemDescription" TEXT NOT NULL,
    "treatmentDescription" TEXT NOT NULL,
    "resultsDescription" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonCaseStudy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseStudyImage" (
    "id" TEXT NOT NULL,
    "caseStudyId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "caption" TEXT,
    "type" "CaseStudyImageType" NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CaseStudyImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonComment" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentId" TEXT,
    "content" TEXT NOT NULL,
    "isAdminReply" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LessonAttachment_lessonId_idx" ON "LessonAttachment"("lessonId");

-- CreateIndex
CREATE INDEX "LessonCaseStudy_lessonId_idx" ON "LessonCaseStudy"("lessonId");

-- CreateIndex
CREATE INDEX "CaseStudyImage_caseStudyId_idx" ON "CaseStudyImage"("caseStudyId");

-- CreateIndex
CREATE INDEX "LessonComment_lessonId_createdAt_idx" ON "LessonComment"("lessonId", "createdAt");

-- CreateIndex
CREATE INDEX "LessonComment_userId_idx" ON "LessonComment"("userId");

-- AddForeignKey
ALTER TABLE "LessonAttachment" ADD CONSTRAINT "LessonAttachment_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonCaseStudy" ADD CONSTRAINT "LessonCaseStudy_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseStudyImage" ADD CONSTRAINT "CaseStudyImage_caseStudyId_fkey" FOREIGN KEY ("caseStudyId") REFERENCES "LessonCaseStudy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonComment" ADD CONSTRAINT "LessonComment_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonComment" ADD CONSTRAINT "LessonComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AcademyUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonComment" ADD CONSTRAINT "LessonComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "LessonComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
