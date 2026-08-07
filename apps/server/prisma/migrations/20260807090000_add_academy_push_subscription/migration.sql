-- CreateTable
CREATE TABLE "AcademyPushSubscription" (
    "id" TEXT NOT NULL,
    "academyUserId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcademyPushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AcademyPushSubscription_endpoint_key" ON "AcademyPushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "AcademyPushSubscription_academyUserId_idx" ON "AcademyPushSubscription"("academyUserId");

-- AddForeignKey
ALTER TABLE "AcademyPushSubscription" ADD CONSTRAINT "AcademyPushSubscription_academyUserId_fkey" FOREIGN KEY ("academyUserId") REFERENCES "AcademyUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
