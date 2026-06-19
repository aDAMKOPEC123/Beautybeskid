-- DropIndex
DROP INDEX "DiscountCodeUsage_discountCodeId_userId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "DiscountCodeUsage_discountCodeId_userId_key" ON "DiscountCodeUsage"("discountCodeId", "userId");
