-- DropIndex
DROP INDEX IF EXISTS "DiscountCodeUsage_discountCodeId_userId_idx";

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "DiscountCodeUsage_discountCodeId_userId_key" ON "DiscountCodeUsage"("discountCodeId", "userId");
