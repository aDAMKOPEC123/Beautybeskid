ALTER TABLE "Appointment"
ADD COLUMN "priceAtBooking" DECIMAL(10,2),
ADD COLUMN "finalPrice" DECIMAL(10,2),
ADD COLUMN "loyaltyPointsAwarded" INTEGER;

UPDATE "Appointment" AS appointment
SET
  "priceAtBooking" = service."price",
  "finalPrice" = service."price",
  "loyaltyPointsAwarded" = CASE
    WHEN appointment."status" = 'COMPLETED' THEN FLOOR(service."price")::INTEGER
    ELSE NULL
  END
FROM "Service" AS service
WHERE service."id" = appointment."serviceId";

ALTER TABLE "Appointment"
ALTER COLUMN "priceAtBooking" SET NOT NULL,
ALTER COLUMN "finalPrice" SET NOT NULL;
