-- Add custom duration for external appointments
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "customDurationMinutes" INTEGER;
