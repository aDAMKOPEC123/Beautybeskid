-- AlterTable
ALTER TABLE "Service" ADD COLUMN "promoDiscountType" "DiscountType",
ADD COLUMN "promoDiscountValue" DECIMAL(10,2),
ADD COLUMN "promoStartDate" TIMESTAMP(3),
ADD COLUMN "promoEndDate" TIMESTAMP(3);
