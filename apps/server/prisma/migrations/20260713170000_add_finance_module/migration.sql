CREATE TYPE "FinanceRevenueSource" AS ENUM ('SERVICE', 'PRODUCT', 'VOUCHER', 'OTHER');
CREATE TYPE "FinanceCostCategory" AS ENUM ('PRODUCTS', 'MARKETING', 'RENT', 'SALARIES', 'UTILITIES', 'TAXES', 'EQUIPMENT', 'TRAINING', 'SOFTWARE', 'OTHER');
CREATE TYPE "FinancePaymentMethod" AS ENUM ('CASH', 'CARD', 'TRANSFER', 'BLIK', 'OTHER');
CREATE TYPE "InventoryMovementType" AS ENUM ('PURCHASE', 'USAGE', 'SALE', 'WASTE', 'CORRECTION');

ALTER TABLE "Product" ADD COLUMN "unit" TEXT NOT NULL DEFAULT 'szt.';
ALTER TABLE "Product" ADD COLUMN "minStock" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "Product" ADD COLUMN "monthlyUsageEstimate" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "FinanceRevenue" (
  "id" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "source" "FinanceRevenueSource" NOT NULL DEFAULT 'SERVICE',
  "description" TEXT,
  "clientName" TEXT,
  "paymentMethod" "FinancePaymentMethod" NOT NULL DEFAULT 'CARD',
  "serviceId" TEXT,
  "userId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FinanceRevenue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinanceCost" (
  "id" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "category" "FinanceCostCategory" NOT NULL,
  "description" TEXT NOT NULL,
  "vendor" TEXT,
  "paymentMethod" "FinancePaymentMethod" NOT NULL DEFAULT 'TRANSFER',
  "productId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FinanceCost_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryMovement" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "type" "InventoryMovementType" NOT NULL,
  "quantity" INTEGER NOT NULL,
  "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "note" TEXT,
  "unitCost" DECIMAL(10,2),
  "costId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FinanceRevenue_date_idx" ON "FinanceRevenue"("date");
CREATE INDEX "FinanceRevenue_serviceId_idx" ON "FinanceRevenue"("serviceId");
CREATE INDEX "FinanceRevenue_userId_idx" ON "FinanceRevenue"("userId");
CREATE INDEX "FinanceRevenue_source_idx" ON "FinanceRevenue"("source");
CREATE INDEX "FinanceCost_date_idx" ON "FinanceCost"("date");
CREATE INDEX "FinanceCost_category_idx" ON "FinanceCost"("category");
CREATE INDEX "FinanceCost_productId_idx" ON "FinanceCost"("productId");
CREATE INDEX "InventoryMovement_productId_date_idx" ON "InventoryMovement"("productId", "date");
CREATE INDEX "InventoryMovement_type_idx" ON "InventoryMovement"("type");
CREATE INDEX "InventoryMovement_costId_idx" ON "InventoryMovement"("costId");

ALTER TABLE "FinanceRevenue" ADD CONSTRAINT "FinanceRevenue_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinanceRevenue" ADD CONSTRAINT "FinanceRevenue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinanceCost" ADD CONSTRAINT "FinanceCost_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_costId_fkey" FOREIGN KEY ("costId") REFERENCES "FinanceCost"("id") ON DELETE SET NULL ON UPDATE CASCADE;
