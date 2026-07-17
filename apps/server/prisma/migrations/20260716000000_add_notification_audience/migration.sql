-- Add a scope so admin operational alerts cannot leak into the client inbox.
ALTER TYPE "NotificationType" ADD VALUE 'NEW_REGISTRATION';

CREATE TYPE "NotificationAudience" AS ENUM ('USER', 'ADMIN');

ALTER TABLE "Notification"
ADD COLUMN "audience" "NotificationAudience" NOT NULL DEFAULT 'USER';

UPDATE "Notification"
SET "audience" = 'ADMIN'
WHERE "userId" IN (SELECT "id" FROM "User" WHERE "role" = 'ADMIN')
  AND (
    "type" IN ('NEW_APPOINTMENT', 'NEW_CONSULTATION', 'NEW_REVIEW', 'CHAT_MESSAGE')
    OR "title" IN ('Nowa rejestracja', 'Oznaczono @admin na forum')
  );

CREATE INDEX "Notification_userId_audience_createdAt_idx"
ON "Notification"("userId", "audience", "createdAt");
