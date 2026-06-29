-- Add updatedAt column to Voucher
ALTER TABLE "Voucher" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Drop existing FK on discountCodeId (was SET NULL) and replace with RESTRICT
ALTER TABLE "Voucher" DROP CONSTRAINT IF EXISTS "Voucher_discountCodeId_fkey";

ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_discountCodeId_fkey"
  FOREIGN KEY ("discountCodeId") REFERENCES "DiscountCode"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
