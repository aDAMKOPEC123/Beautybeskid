WITH normalized_positions AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY "displayOrder" ASC, "createdAt" ASC, id ASC)::INTEGER AS position
  FROM "Service"
)
UPDATE "Service" AS service
SET "displayOrder" = normalized_positions.position
FROM normalized_positions
WHERE service.id = normalized_positions.id;

DROP INDEX IF EXISTS "Service_displayOrder_idx";
CREATE UNIQUE INDEX "Service_displayOrder_key" ON "Service"("displayOrder");
