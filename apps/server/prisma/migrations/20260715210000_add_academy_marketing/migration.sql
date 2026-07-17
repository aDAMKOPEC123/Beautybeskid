CREATE TYPE "AcademyMarketingTarget" AS ENUM ('ALL', 'COURSE', 'BUNDLE');
CREATE TYPE "AcademyLeadType" AS ENUM ('NEWSLETTER', 'LEAD_MAGNET', 'WAITLIST', 'ABANDONED_CHECKOUT');

ALTER TABLE "Course" ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AcademyBundle" ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AcademyOrder" ADD COLUMN "originalAmount" DECIMAL(10,2), ADD COLUMN "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0, ADD COLUMN "promotionId" TEXT, ADD COLUMN "discountCodeId" TEXT;

CREATE TABLE "AcademyBanner" ("id" TEXT NOT NULL, "title" TEXT NOT NULL, "subtitle" TEXT, "badge" TEXT, "imageUrl" TEXT, "mobileImageUrl" TEXT, "buttonLabel" TEXT, "buttonUrl" TEXT, "startsAt" TIMESTAMP(3), "endsAt" TIMESTAMP(3), "isActive" BOOLEAN NOT NULL DEFAULT true, "sortOrder" INTEGER NOT NULL DEFAULT 0, "impressions" INTEGER NOT NULL DEFAULT 0, "clicks" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "AcademyBanner_pkey" PRIMARY KEY ("id"));
CREATE INDEX "AcademyBanner_isActive_startsAt_endsAt_sortOrder_idx" ON "AcademyBanner"("isActive", "startsAt", "endsAt", "sortOrder");

CREATE TABLE "AcademyPromotion" ("id" TEXT NOT NULL, "name" TEXT NOT NULL, "publicLabel" TEXT, "target" "AcademyMarketingTarget" NOT NULL DEFAULT 'ALL', "targetIds" TEXT[] DEFAULT ARRAY[]::TEXT[], "discountType" "DiscountType" NOT NULL, "discountValue" DECIMAL(10,2) NOT NULL, "startsAt" TIMESTAMP(3) NOT NULL, "endsAt" TIMESTAMP(3) NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT true, "newCustomersOnly" BOOLEAN NOT NULL DEFAULT false, "maxUses" INTEGER, "maxUsesPerCustomer" INTEGER NOT NULL DEFAULT 1, "minimumAmount" DECIMAL(10,2), "showCountdown" BOOLEAN NOT NULL DEFAULT false, "usageCount" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "AcademyPromotion_pkey" PRIMARY KEY ("id"));
CREATE INDEX "AcademyPromotion_isActive_startsAt_endsAt_idx" ON "AcademyPromotion"("isActive", "startsAt", "endsAt");

CREATE TABLE "AcademyDiscountCode" ("id" TEXT NOT NULL, "code" TEXT NOT NULL, "description" TEXT, "target" "AcademyMarketingTarget" NOT NULL DEFAULT 'ALL', "targetIds" TEXT[] DEFAULT ARRAY[]::TEXT[], "discountType" "DiscountType" NOT NULL, "discountValue" DECIMAL(10,2) NOT NULL, "startsAt" TIMESTAMP(3), "endsAt" TIMESTAMP(3), "isActive" BOOLEAN NOT NULL DEFAULT true, "newCustomersOnly" BOOLEAN NOT NULL DEFAULT false, "maxUses" INTEGER, "maxUsesPerCustomer" INTEGER NOT NULL DEFAULT 1, "minimumAmount" DECIMAL(10,2), "usageCount" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "AcademyDiscountCode_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "AcademyDiscountCode_code_key" ON "AcademyDiscountCode"("code");
CREATE INDEX "AcademyDiscountCode_isActive_startsAt_endsAt_idx" ON "AcademyDiscountCode"("isActive", "startsAt", "endsAt");

CREATE TABLE "AcademyPromotionUsage" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "promotionId" TEXT, "discountCodeId" TEXT, "courseId" TEXT, "bundleId" TEXT, "discountAmount" DECIMAL(10,2) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "AcademyPromotionUsage_pkey" PRIMARY KEY ("id"));
CREATE INDEX "AcademyPromotionUsage_userId_promotionId_idx" ON "AcademyPromotionUsage"("userId", "promotionId");
CREATE INDEX "AcademyPromotionUsage_userId_discountCodeId_idx" ON "AcademyPromotionUsage"("userId", "discountCodeId");

CREATE TABLE "AcademyMarketingLead" ("id" TEXT NOT NULL, "email" TEXT NOT NULL, "name" TEXT, "type" "AcademyLeadType" NOT NULL, "courseId" TEXT NOT NULL DEFAULT '', "source" TEXT, "consentAt" TIMESTAMP(3), "unsubscribedAt" TIMESTAMP(3), "metadata" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "AcademyMarketingLead_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "AcademyMarketingLead_email_type_courseId_key" ON "AcademyMarketingLead"("email", "type", "courseId");
CREATE INDEX "AcademyMarketingLead_type_createdAt_idx" ON "AcademyMarketingLead"("type", "createdAt");

ALTER TABLE "AcademyOrder" ADD CONSTRAINT "AcademyOrder_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "AcademyPromotion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AcademyOrder" ADD CONSTRAINT "AcademyOrder_discountCodeId_fkey" FOREIGN KEY ("discountCodeId") REFERENCES "AcademyDiscountCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AcademyPromotionUsage" ADD CONSTRAINT "AcademyPromotionUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AcademyUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademyPromotionUsage" ADD CONSTRAINT "AcademyPromotionUsage_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "AcademyPromotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademyPromotionUsage" ADD CONSTRAINT "AcademyPromotionUsage_discountCodeId_fkey" FOREIGN KEY ("discountCodeId") REFERENCES "AcademyDiscountCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademyPromotionUsage" ADD CONSTRAINT "AcademyPromotionUsage_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AcademyPromotionUsage" ADD CONSTRAINT "AcademyPromotionUsage_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "AcademyBundle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
