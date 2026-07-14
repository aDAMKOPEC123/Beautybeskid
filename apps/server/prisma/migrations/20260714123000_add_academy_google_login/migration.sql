ALTER TABLE "AcademyUser" ADD COLUMN "googleId" TEXT;
CREATE UNIQUE INDEX "AcademyUser_googleId_key" ON "AcademyUser"("googleId");
