ALTER TABLE "Service" ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 1;

WITH ordered_services AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY category ASC, name ASC) AS position
  FROM "Service"
)
UPDATE "Service" AS service
SET "displayOrder" = ordered_services.position
FROM ordered_services
WHERE service.id = ordered_services.id;

CREATE INDEX "Service_displayOrder_idx" ON "Service"("displayOrder");
