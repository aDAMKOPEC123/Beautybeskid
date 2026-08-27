-- CreateTable
CREATE TABLE "CalendarBlock" (
    "id" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "appliesToAll" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalCalendarSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Kalendarz Apple',
    "url" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "syncIntervalMinutes" INTEGER NOT NULL DEFAULT 15,
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalCalendarSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalCalendarEvent" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "isAllDay" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT,

    CONSTRAINT "ExternalCalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CalendarBlockEmployees" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "CalendarBlock_startsAt_endsAt_idx" ON "CalendarBlock"("startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "ExternalCalendarEvent_startsAt_endsAt_idx" ON "ExternalCalendarEvent"("startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalCalendarEvent_sourceId_uid_startsAt_key" ON "ExternalCalendarEvent"("sourceId", "uid", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "_CalendarBlockEmployees_AB_unique" ON "_CalendarBlockEmployees"("A", "B");

-- CreateIndex
CREATE INDEX "_CalendarBlockEmployees_B_index" ON "_CalendarBlockEmployees"("B");

-- AddForeignKey
ALTER TABLE "CalendarBlock" ADD CONSTRAINT "CalendarBlock_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalCalendarEvent" ADD CONSTRAINT "ExternalCalendarEvent_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ExternalCalendarSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CalendarBlockEmployees" ADD CONSTRAINT "_CalendarBlockEmployees_A_fkey" FOREIGN KEY ("A") REFERENCES "CalendarBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CalendarBlockEmployees" ADD CONSTRAINT "_CalendarBlockEmployees_B_fkey" FOREIGN KEY ("B") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
