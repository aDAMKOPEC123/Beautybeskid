CREATE TABLE "AcademySupportThread" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "adminId" TEXT,
  "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userUnread" INTEGER NOT NULL DEFAULT 0,
  "adminUnread" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AcademySupportThread_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AcademySupportMessage" (
  "id" TEXT NOT NULL,
  "threadId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AcademySupportMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AcademySupportThread_userId_key" ON "AcademySupportThread"("userId");
CREATE INDEX "AcademySupportMessage_threadId_createdAt_idx" ON "AcademySupportMessage"("threadId", "createdAt");
ALTER TABLE "AcademySupportThread" ADD CONSTRAINT "AcademySupportThread_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademySupportThread" ADD CONSTRAINT "AcademySupportThread_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AcademySupportMessage" ADD CONSTRAINT "AcademySupportMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "AcademySupportThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademySupportMessage" ADD CONSTRAINT "AcademySupportMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
