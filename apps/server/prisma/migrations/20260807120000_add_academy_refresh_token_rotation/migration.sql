-- Grace window for concurrent refresh-token rotation.
-- Rotated tokens are kept briefly instead of being deleted so that parallel tabs
-- refreshing at the same moment do not log each other out. Reuse after the grace
-- window is treated as theft and revokes the whole token family.
ALTER TABLE "AcademyRefreshToken" ADD COLUMN "rotatedAt" TIMESTAMP(3);

CREATE INDEX "AcademyRefreshToken_rotatedAt_idx" ON "AcademyRefreshToken"("rotatedAt");
