CREATE TABLE "AcademyUser" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT,
  "name" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'USER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AcademyUser_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AcademyUser_email_key" ON "AcademyUser"("email");
CREATE INDEX "AcademyUser_role_idx" ON "AcademyUser"("role");

-- Preserve existing Academy history, while making future accounts fully independent.
INSERT INTO "AcademyUser" ("id", "email", "passwordHash", "name", "role", "createdAt", "updatedAt")
SELECT DISTINCT u."id", u."email", u."passwordHash", u."name", u."role", u."createdAt", u."updatedAt"
FROM "User" u
WHERE u."role" = 'ADMIN' OR u."hasAcademyAccess" = true
   OR u."id" IN (SELECT "userId" FROM "UserCourseProgress")
   OR u."id" IN (SELECT "userId" FROM "UserLessonProgress")
   OR u."id" IN (SELECT "userId" FROM "AcademyCertificate")
   OR u."id" IN (SELECT "userId" FROM "AcademyQuizAttempt")
   OR u."id" IN (SELECT "userId" FROM "CourseFavorite")
   OR u."id" IN (SELECT "userId" FROM "LessonNote")
   OR u."id" IN (SELECT "userId" FROM "AcademySupportThread")
   OR u."id" IN (SELECT "authorId" FROM "AcademySupportMessage");

CREATE TABLE "AcademyRefreshToken" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AcademyRefreshToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AcademyRefreshToken_tokenHash_key" ON "AcademyRefreshToken"("tokenHash");
CREATE INDEX "AcademyRefreshToken_userId_idx" ON "AcademyRefreshToken"("userId");

CREATE TABLE "AcademyEnrollment" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AcademyEnrollment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AcademyEnrollment_userId_courseId_key" ON "AcademyEnrollment"("userId", "courseId");
CREATE INDEX "AcademyEnrollment_userId_idx" ON "AcademyEnrollment"("userId");

ALTER TABLE "AcademyQuizAttempt" DROP CONSTRAINT "AcademyQuizAttempt_userId_fkey";
ALTER TABLE "UserCourseProgress" DROP CONSTRAINT "UserCourseProgress_userId_fkey";
ALTER TABLE "UserLessonProgress" DROP CONSTRAINT "UserLessonProgress_userId_fkey";
ALTER TABLE "AcademyCertificate" DROP CONSTRAINT "AcademyCertificate_userId_fkey";
ALTER TABLE "CourseFavorite" DROP CONSTRAINT "CourseFavorite_userId_fkey";
ALTER TABLE "LessonNote" DROP CONSTRAINT "LessonNote_userId_fkey";
ALTER TABLE "AcademySupportThread" DROP CONSTRAINT "AcademySupportThread_userId_fkey";
ALTER TABLE "AcademySupportThread" DROP CONSTRAINT "AcademySupportThread_adminId_fkey";
ALTER TABLE "AcademySupportMessage" DROP CONSTRAINT "AcademySupportMessage_authorId_fkey";

ALTER TABLE "AcademyQuizAttempt" ADD CONSTRAINT "AcademyQuizAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AcademyUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserCourseProgress" ADD CONSTRAINT "UserCourseProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AcademyUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserLessonProgress" ADD CONSTRAINT "UserLessonProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AcademyUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademyCertificate" ADD CONSTRAINT "AcademyCertificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AcademyUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseFavorite" ADD CONSTRAINT "CourseFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AcademyUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LessonNote" ADD CONSTRAINT "LessonNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AcademyUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademySupportThread" ADD CONSTRAINT "AcademySupportThread_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AcademyUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademySupportThread" ADD CONSTRAINT "AcademySupportThread_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AcademyUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AcademySupportMessage" ADD CONSTRAINT "AcademySupportMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "AcademyUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademyEnrollment" ADD CONSTRAINT "AcademyEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AcademyUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademyEnrollment" ADD CONSTRAINT "AcademyEnrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
