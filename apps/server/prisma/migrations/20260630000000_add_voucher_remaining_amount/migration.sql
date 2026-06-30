-- AlterTable
ALTER TABLE "Voucher" ADD COLUMN "remainingAmount" DECIMAL(10,2);

-- Initialize remainingAmount from amount for existing CASH vouchers
UPDATE "Voucher" SET "remainingAmount" = "amount" WHERE type = 'CASH' AND "amount" IS NOT NULL;
