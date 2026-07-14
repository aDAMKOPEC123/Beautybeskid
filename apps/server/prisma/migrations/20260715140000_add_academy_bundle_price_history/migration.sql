CREATE TABLE "AcademyBundlePriceHistory" (
    "id" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AcademyBundlePriceHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AcademyBundlePriceHistory_bundleId_validFrom_idx" ON "AcademyBundlePriceHistory"("bundleId", "validFrom");
ALTER TABLE "AcademyBundlePriceHistory" ADD CONSTRAINT "AcademyBundlePriceHistory_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "AcademyBundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
INSERT INTO "AcademyBundlePriceHistory" ("id", "bundleId", "price", "validFrom")
SELECT 'initial-' || "id", "id", "price", "createdAt" FROM "AcademyBundle";
