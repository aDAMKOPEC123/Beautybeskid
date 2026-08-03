-- CreateEnum
CREATE TYPE "SkinAtlasSeverity" AS ENUM ('MILD', 'MODERATE', 'SEVERE');

-- CreateEnum
CREATE TYPE "DiagnosticDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "DiagnosticStepType" AS ENUM ('INTERVIEW', 'DIAGNOSIS', 'TREATMENT', 'RESULT');

-- CreateEnum
CREATE TYPE "DiagnosticImageType" AS ENUM ('BEFORE', 'DURING', 'AFTER');

-- CreateTable
CREATE TABLE "SkinAtlasRegion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "hotspotX" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "hotspotY" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "order" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkinAtlasRegion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkinAtlasCondition" (
    "id" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "causes" TEXT NOT NULL,
    "treatments" TEXT NOT NULL,
    "contraindications" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "relatedCourseId" TEXT,
    "relatedCaseStudyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkinAtlasCondition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkinAtlasImage" (
    "id" TEXT NOT NULL,
    "conditionId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT NOT NULL DEFAULT '',
    "severity" "SkinAtlasSeverity" NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SkinAtlasImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkinAtlasQuizQuestion" (
    "id" TEXT NOT NULL,
    "conditionId" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "questionImageUrl" TEXT,
    "explanation" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SkinAtlasQuizQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkinAtlasQuizAnswer" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SkinAtlasQuizAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkinAtlasQuizAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "regionSlug" TEXT,
    "score" INTEGER NOT NULL,
    "maxScore" INTEGER NOT NULL,
    "answers" JSONB NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkinAtlasQuizAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosticCaseStudy" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "difficulty" "DiagnosticDifficulty" NOT NULL DEFAULT 'MEDIUM',
    "regionSlug" TEXT,
    "courseId" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "clientName" TEXT NOT NULL,
    "clientAge" INTEGER NOT NULL,
    "clientDescription" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiagnosticCaseStudy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosticCaseStep" (
    "id" TEXT NOT NULL,
    "caseStudyId" TEXT NOT NULL,
    "type" "DiagnosticStepType" NOT NULL,
    "content" TEXT NOT NULL,
    "question" TEXT,
    "multiSelect" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DiagnosticCaseStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosticCaseStepImage" (
    "id" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "type" "DiagnosticImageType" NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DiagnosticCaseStepImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosticCaseAnswer" (
    "id" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "explanation" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DiagnosticCaseAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosticCaseAttempt" (
    "id" TEXT NOT NULL,
    "caseStudyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "maxScore" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "answers" JSONB NOT NULL,

    CONSTRAINT "DiagnosticCaseAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SkinAtlasRegion_slug_key" ON "SkinAtlasRegion"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "SkinAtlasCondition_slug_key" ON "SkinAtlasCondition"("slug");

-- CreateIndex
CREATE INDEX "SkinAtlasCondition_regionId_idx" ON "SkinAtlasCondition"("regionId");

-- CreateIndex
CREATE INDEX "SkinAtlasImage_conditionId_idx" ON "SkinAtlasImage"("conditionId");

-- CreateIndex
CREATE INDEX "SkinAtlasQuizQuestion_conditionId_idx" ON "SkinAtlasQuizQuestion"("conditionId");

-- CreateIndex
CREATE INDEX "SkinAtlasQuizAnswer_questionId_idx" ON "SkinAtlasQuizAnswer"("questionId");

-- CreateIndex
CREATE INDEX "SkinAtlasQuizAttempt_userId_idx" ON "SkinAtlasQuizAttempt"("userId");

-- CreateIndex
CREATE INDEX "DiagnosticCaseStudy_courseId_idx" ON "DiagnosticCaseStudy"("courseId");

-- CreateIndex
CREATE INDEX "DiagnosticCaseStep_caseStudyId_idx" ON "DiagnosticCaseStep"("caseStudyId");

-- CreateIndex
CREATE INDEX "DiagnosticCaseStepImage_stepId_idx" ON "DiagnosticCaseStepImage"("stepId");

-- CreateIndex
CREATE INDEX "DiagnosticCaseAnswer_stepId_idx" ON "DiagnosticCaseAnswer"("stepId");

-- CreateIndex
CREATE INDEX "DiagnosticCaseAttempt_userId_idx" ON "DiagnosticCaseAttempt"("userId");

-- CreateIndex
CREATE INDEX "DiagnosticCaseAttempt_caseStudyId_idx" ON "DiagnosticCaseAttempt"("caseStudyId");

-- AddForeignKey
ALTER TABLE "SkinAtlasCondition" ADD CONSTRAINT "SkinAtlasCondition_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "SkinAtlasRegion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkinAtlasCondition" ADD CONSTRAINT "SkinAtlasCondition_relatedCourseId_fkey" FOREIGN KEY ("relatedCourseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkinAtlasCondition" ADD CONSTRAINT "SkinAtlasCondition_relatedCaseStudyId_fkey" FOREIGN KEY ("relatedCaseStudyId") REFERENCES "DiagnosticCaseStudy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkinAtlasImage" ADD CONSTRAINT "SkinAtlasImage_conditionId_fkey" FOREIGN KEY ("conditionId") REFERENCES "SkinAtlasCondition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkinAtlasQuizQuestion" ADD CONSTRAINT "SkinAtlasQuizQuestion_conditionId_fkey" FOREIGN KEY ("conditionId") REFERENCES "SkinAtlasCondition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkinAtlasQuizAnswer" ADD CONSTRAINT "SkinAtlasQuizAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "SkinAtlasQuizQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkinAtlasQuizAttempt" ADD CONSTRAINT "SkinAtlasQuizAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AcademyUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticCaseStudy" ADD CONSTRAINT "DiagnosticCaseStudy_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticCaseStep" ADD CONSTRAINT "DiagnosticCaseStep_caseStudyId_fkey" FOREIGN KEY ("caseStudyId") REFERENCES "DiagnosticCaseStudy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticCaseStepImage" ADD CONSTRAINT "DiagnosticCaseStepImage_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "DiagnosticCaseStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticCaseAnswer" ADD CONSTRAINT "DiagnosticCaseAnswer_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "DiagnosticCaseStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticCaseAttempt" ADD CONSTRAINT "DiagnosticCaseAttempt_caseStudyId_fkey" FOREIGN KEY ("caseStudyId") REFERENCES "DiagnosticCaseStudy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticCaseAttempt" ADD CONSTRAINT "DiagnosticCaseAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AcademyUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
