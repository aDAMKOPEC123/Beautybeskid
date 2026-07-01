-- AlterTable: make userId nullable and add guest fields to Appointment
ALTER TABLE "Appointment" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "clientName" TEXT;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "clientPhone" TEXT;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "clientEmail" TEXT;
