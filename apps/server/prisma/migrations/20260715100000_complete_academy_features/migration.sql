CREATE TYPE "AcademyCertificateStatus" AS ENUM ('ACTIVE', 'REVOKED', 'REPLACED');
CREATE TYPE "AcademySupportStatus" AS ENUM ('OPEN', 'WAITING_FOR_USER', 'RESOLVED', 'ARCHIVED');
CREATE TYPE "AcademySupportCategory" AS ENUM ('COURSE_CONTENT', 'PROCEDURE', 'CONTRAINDICATIONS', 'TECHNICAL', 'CERTIFICATE', 'OTHER');

ALTER TABLE "Course"
  ADD COLUMN "isFree" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "accessDays" INTEGER,
  ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isBestseller" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isComingSoon" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "previewLessonId" TEXT,
  ADD COLUMN "instructorName" TEXT NOT NULL DEFAULT 'Wiktoria Ćwik',
  ADD COLUMN "instructorBio" TEXT,
  ADD COLUMN "bundleGroup" TEXT;

ALTER TABLE "AcademyCertificate"
  ADD COLUMN "status" "AcademyCertificateStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "revokedAt" TIMESTAMP(3),
  ADD COLUMN "revokedReason" TEXT,
  ADD COLUMN "replacedByCode" TEXT;

ALTER TABLE "AcademySupportThread"
  ADD COLUMN "status" "AcademySupportStatus" NOT NULL DEFAULT 'OPEN',
  ADD COLUMN "category" "AcademySupportCategory" NOT NULL DEFAULT 'COURSE_CONTENT',
  ADD COLUMN "courseId" TEXT,
  ADD COLUMN "lessonId" TEXT,
  ADD COLUMN "resolvedAt" TIMESTAMP(3),
  ADD COLUMN "rating" INTEGER,
  ADD COLUMN "ratingComment" TEXT;

ALTER TABLE "AcademySupportMessage"
  ADD COLUMN "attachmentUrl" TEXT,
  ADD COLUMN "attachmentType" TEXT,
  ADD COLUMN "sensitiveDataConsent" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "AcademyCourseReview" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "isApproved" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AcademyCourseReview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AcademyLearningGoal" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "weeklyMinutesGoal" INTEGER NOT NULL DEFAULT 60,
  "currentStreak" INTEGER NOT NULL DEFAULT 0,
  "longestStreak" INTEGER NOT NULL DEFAULT 0,
  "lastActivityDate" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AcademyLearningGoal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AcademyCourseReview_userId_courseId_key" ON "AcademyCourseReview"("userId", "courseId");
CREATE INDEX "AcademyCourseReview_courseId_isApproved_idx" ON "AcademyCourseReview"("courseId", "isApproved");
CREATE UNIQUE INDEX "AcademyLearningGoal_userId_key" ON "AcademyLearningGoal"("userId");
ALTER TABLE "AcademyCourseReview" ADD CONSTRAINT "AcademyCourseReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AcademyUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademyCourseReview" ADD CONSTRAINT "AcademyCourseReview_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademyLearningGoal" ADD CONSTRAINT "AcademyLearningGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AcademyUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
