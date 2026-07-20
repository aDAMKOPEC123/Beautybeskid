CREATE TYPE "CancellationRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN');

ALTER TABLE "SalonTerms"
ADD COLUMN "cancellationNoticeHours" INTEGER NOT NULL DEFAULT 24;

CREATE TABLE "SalonLocation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "phone" TEXT,
    "email" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SalonLocation_pkey" PRIMARY KEY ("id")
);

INSERT INTO "SalonLocation" (
    "id", "name", "street", "postalCode", "city", "latitude", "longitude",
    "phone", "email", "isDefault", "isActive", "updatedAt"
)
VALUES (
    'default-beskidstudio-location',
    'BeskidStudio By Wiktoria Ćwik',
    'Mordarka 505',
    '34-600',
    'Mordarka',
    49.689496,
    20.455024,
    '+48532128227',
    'kontakt@kosmetologwiktoriacwik.pl',
    true,
    true,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;

CREATE INDEX "SalonLocation_isDefault_isActive_idx" ON "SalonLocation"("isDefault", "isActive");
CREATE UNIQUE INDEX "SalonLocation_one_default_idx" ON "SalonLocation"("isDefault") WHERE "isDefault" = true;

ALTER TABLE "Service" ADD COLUMN "locationId" TEXT;
UPDATE "Service" SET "locationId" = 'default-beskidstudio-location' WHERE "locationId" IS NULL;
CREATE INDEX "Service_locationId_idx" ON "Service"("locationId");
ALTER TABLE "Service" ADD CONSTRAINT "Service_locationId_fkey"
FOREIGN KEY ("locationId") REFERENCES "SalonLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Appointment"
ADD COLUMN "discountTotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN "discountBreakdown" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "locationId" TEXT,
ADD COLUMN "locationNameAtBooking" TEXT,
ADD COLUMN "locationAddressAtBooking" TEXT,
ADD COLUMN "locationLatitudeAtBooking" DECIMAL(9,6),
ADD COLUMN "locationLongitudeAtBooking" DECIMAL(9,6),
ADD COLUMN "salonPhoneAtBooking" TEXT;

UPDATE "Appointment"
SET
    "discountTotal" = GREATEST("priceAtBooking" - "finalPrice", 0),
    "discountBreakdown" = CASE
        WHEN "priceAtBooking" > "finalPrice" THEN jsonb_build_array(jsonb_build_object(
            'source', 'LEGACY',
            'label', 'Rabat zapisany historycznie',
            'amount', ("priceAtBooking" - "finalPrice")::double precision
        ))
        ELSE '[]'::jsonb
    END,
    "locationId" = 'default-beskidstudio-location',
    "locationNameAtBooking" = 'BeskidStudio By Wiktoria Ćwik',
    "locationAddressAtBooking" = 'Mordarka 505, 34-600 Mordarka',
    "locationLatitudeAtBooking" = 49.689496,
    "locationLongitudeAtBooking" = 20.455024,
    "salonPhoneAtBooking" = '+48532128227';

CREATE INDEX "Appointment_locationId_idx" ON "Appointment"("locationId");
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_locationId_fkey"
FOREIGN KEY ("locationId") REFERENCES "SalonLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "AppointmentCancellationRequest" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "CancellationRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "policyNoticeHours" INTEGER NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "decidedById" TEXT,
    "decisionNote" TEXT,
    "decidedAt" TIMESTAMP(3),
    "withdrawnAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AppointmentCancellationRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AppointmentCancellationRequest_appointmentId_status_idx"
ON "AppointmentCancellationRequest"("appointmentId", "status");
CREATE INDEX "AppointmentCancellationRequest_userId_status_idx"
ON "AppointmentCancellationRequest"("userId", "status");
CREATE UNIQUE INDEX "AppointmentCancellationRequest_one_pending_idx"
ON "AppointmentCancellationRequest"("appointmentId") WHERE "status" = 'PENDING';

ALTER TABLE "AppointmentCancellationRequest" ADD CONSTRAINT "AppointmentCancellationRequest_appointmentId_fkey"
FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppointmentCancellationRequest" ADD CONSTRAINT "AppointmentCancellationRequest_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppointmentCancellationRequest" ADD CONSTRAINT "AppointmentCancellationRequest_decidedById_fkey"
FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "SkinJournalEntry" entry
SET "linkedAppointmentId" = NULL
WHERE "linkedAppointmentId" IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM "Appointment" appointment WHERE appointment."id" = entry."linkedAppointmentId"
  );

CREATE INDEX "SkinJournalEntry_linkedAppointmentId_idx" ON "SkinJournalEntry"("linkedAppointmentId");
ALTER TABLE "SkinJournalEntry" ADD CONSTRAINT "SkinJournalEntry_linkedAppointmentId_fkey"
FOREIGN KEY ("linkedAppointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
