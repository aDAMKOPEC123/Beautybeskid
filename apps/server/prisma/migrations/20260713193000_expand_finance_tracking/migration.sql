CREATE TYPE "FinanceSalesChannel" AS ENUM ('WALK_IN', 'BOOKING', 'WEBSITE', 'INSTAGRAM', 'FACEBOOK', 'PHONE', 'REFERRAL', 'OTHER');
CREATE TYPE "FinanceEntryStatus" AS ENUM ('PAID', 'UNPAID', 'PARTIAL', 'REFUNDED');

ALTER TABLE "Product" ADD COLUMN "supplier" TEXT;
ALTER TABLE "Product" ADD COLUMN "location" TEXT;
ALTER TABLE "Product" ADD COLUMN "expiryDate" TIMESTAMP(3);

ALTER TABLE "FinanceRevenue" ADD COLUMN "grossAmount" DECIMAL(10,2);
ALTER TABLE "FinanceRevenue" ADD COLUMN "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "FinanceRevenue" ADD COLUMN "tipAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "FinanceRevenue" ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "FinanceRevenue" ADD COLUMN "channel" "FinanceSalesChannel" NOT NULL DEFAULT 'WALK_IN';
ALTER TABLE "FinanceRevenue" ADD COLUMN "status" "FinanceEntryStatus" NOT NULL DEFAULT 'PAID';
ALTER TABLE "FinanceRevenue" ADD COLUMN "appointmentId" TEXT;
ALTER TABLE "FinanceRevenue" ADD COLUMN "notes" TEXT;

UPDATE "FinanceRevenue"
SET "grossAmount" = "amount"
WHERE "grossAmount" IS NULL;

ALTER TABLE "FinanceCost" ADD COLUMN "invoiceNumber" TEXT;
ALTER TABLE "FinanceCost" ADD COLUMN "quantity" DECIMAL(10,3);
ALTER TABLE "FinanceCost" ADD COLUMN "unitCost" DECIMAL(10,2);
ALTER TABLE "FinanceCost" ADD COLUMN "isFixed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "FinanceCost" ADD COLUMN "isRecurring" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "FinanceCost" ADD COLUMN "isPaid" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "FinanceCost" ADD COLUMN "dueDate" TIMESTAMP(3);

CREATE INDEX "FinanceRevenue_appointmentId_idx" ON "FinanceRevenue"("appointmentId");
CREATE INDEX "FinanceRevenue_channel_idx" ON "FinanceRevenue"("channel");
CREATE INDEX "FinanceRevenue_status_idx" ON "FinanceRevenue"("status");
CREATE INDEX "FinanceCost_isFixed_idx" ON "FinanceCost"("isFixed");
CREATE INDEX "FinanceCost_isPaid_idx" ON "FinanceCost"("isPaid");

ALTER TABLE "FinanceRevenue" ADD CONSTRAINT "FinanceRevenue_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
