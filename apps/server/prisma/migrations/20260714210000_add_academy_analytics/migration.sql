CREATE TYPE "AcademyOrderStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED');

CREATE TABLE "AcademyAnalyticsEvent" (
  "id" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "visitorId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "userId" TEXT,
  "courseId" TEXT,
  "path" TEXT,
  "referrer" TEXT,
  "source" TEXT,
  "medium" TEXT,
  "campaign" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AcademyAnalyticsEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AcademyOrder" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "status" "AcademyOrderStatus" NOT NULL DEFAULT 'PENDING',
  "amount" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'PLN',
  "stripeSessionId" TEXT,
  "stripePaymentId" TEXT,
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AcademyOrder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AcademyOrder_stripeSessionId_key" ON "AcademyOrder"("stripeSessionId");
CREATE UNIQUE INDEX "AcademyOrder_stripePaymentId_key" ON "AcademyOrder"("stripePaymentId");
CREATE INDEX "AcademyAnalyticsEvent_eventType_createdAt_idx" ON "AcademyAnalyticsEvent"("eventType", "createdAt");
CREATE INDEX "AcademyAnalyticsEvent_visitorId_createdAt_idx" ON "AcademyAnalyticsEvent"("visitorId", "createdAt");
CREATE INDEX "AcademyAnalyticsEvent_sessionId_createdAt_idx" ON "AcademyAnalyticsEvent"("sessionId", "createdAt");
CREATE INDEX "AcademyAnalyticsEvent_userId_createdAt_idx" ON "AcademyAnalyticsEvent"("userId", "createdAt");
CREATE INDEX "AcademyAnalyticsEvent_courseId_createdAt_idx" ON "AcademyAnalyticsEvent"("courseId", "createdAt");
CREATE INDEX "AcademyOrder_status_createdAt_idx" ON "AcademyOrder"("status", "createdAt");
CREATE INDEX "AcademyOrder_userId_createdAt_idx" ON "AcademyOrder"("userId", "createdAt");
CREATE INDEX "AcademyOrder_courseId_createdAt_idx" ON "AcademyOrder"("courseId", "createdAt");
ALTER TABLE "AcademyAnalyticsEvent" ADD CONSTRAINT "AcademyAnalyticsEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AcademyUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AcademyAnalyticsEvent" ADD CONSTRAINT "AcademyAnalyticsEvent_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AcademyOrder" ADD CONSTRAINT "AcademyOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AcademyUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AcademyOrder" ADD CONSTRAINT "AcademyOrder_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
