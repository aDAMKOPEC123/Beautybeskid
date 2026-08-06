-- CreateEnum
CREATE TYPE "AcademyAudience" AS ENUM ('STARTER', 'PRACTITIONER', 'SALON_OWNER');

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "audiences" "AcademyAudience"[] DEFAULT ARRAY[]::"AcademyAudience"[],
ADD COLUMN     "instructorId" TEXT;

-- AlterTable
ALTER TABLE "AcademyBundle" ADD COLUMN     "audiences" "AcademyAudience"[] DEFAULT ARRAY[]::"AcademyAudience"[];

-- CreateTable
CREATE TABLE "AcademyInstructor" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "shortBio" TEXT NOT NULL,
    "fullBio" TEXT NOT NULL,
    "credentials" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "photoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademyInstructor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AcademyInstructor_slug_key" ON "AcademyInstructor"("slug");

-- CreateIndex
CREATE INDEX "AcademyInstructor_isActive_displayOrder_idx" ON "AcademyInstructor"("isActive", "displayOrder");

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "AcademyInstructor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
