-- Subskrypcja ICS: jeden wiersz z tokenem dostępowym do feedu wizyt.
CREATE TABLE "CalendarFeed" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAccessedAt" TIMESTAMP(3),
    "accessCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CalendarFeed_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CalendarFeed_token_key" ON "CalendarFeed"("token");
