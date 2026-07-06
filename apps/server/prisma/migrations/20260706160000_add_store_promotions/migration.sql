-- CreateTable
CREATE TABLE "StorePromotion" (
    "id" TEXT NOT NULL,
    "storeName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "conditions" TEXT NOT NULL DEFAULT '',
    "discountValue" TEXT NOT NULL,
    "promoCode" TEXT,
    "link" TEXT,
    "imageUrl" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorePromotion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StorePromotion_isActive_startDate_endDate_idx" ON "StorePromotion"("isActive", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "StorePromotion_isFeatured_idx" ON "StorePromotion"("isFeatured");
