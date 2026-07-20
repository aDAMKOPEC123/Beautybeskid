CREATE TYPE "SkinScanStatus" AS ENUM ('DRAFT', 'CAPTURING', 'NEEDS_RETAKE', 'COMPLETED', 'FAILED');
CREATE TYPE "SkinScanAngle" AS ENUM ('FRONT', 'LEFT', 'RIGHT');

CREATE TABLE "SkinScanSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "SkinScanStatus" NOT NULL DEFAULT 'DRAFT',
    "consentAcceptedAt" TIMESTAMP(3) NOT NULL,
    "captureContext" JSONB NOT NULL DEFAULT '{}',
    "qualitySummary" JSONB,
    "analysis" JSONB,
    "analysisProvider" TEXT NOT NULL DEFAULT 'quality-only',
    "analysisVersion" TEXT NOT NULL DEFAULT 'quality-v1',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SkinScanSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SkinScanImage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "angle" "SkinScanAngle" NOT NULL,
    "imagePath" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "quality" JSONB NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SkinScanImage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SkinScanSession_userId_createdAt_idx" ON "SkinScanSession"("userId", "createdAt");
CREATE UNIQUE INDEX "SkinScanImage_sessionId_angle_key" ON "SkinScanImage"("sessionId", "angle");
CREATE INDEX "SkinScanImage_sessionId_idx" ON "SkinScanImage"("sessionId");

ALTER TABLE "SkinScanSession" ADD CONSTRAINT "SkinScanSession_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SkinScanImage" ADD CONSTRAINT "SkinScanImage_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "SkinScanSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
