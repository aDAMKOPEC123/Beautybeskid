-- AlterTable
ALTER TABLE "AmbassadorConfig" ADD COLUMN     "referrerDiscountType" "DiscountType" NOT NULL DEFAULT 'PERCENTAGE',
ADD COLUMN     "referrerDiscountValue" DECIMAL(10,2) NOT NULL DEFAULT 10;
