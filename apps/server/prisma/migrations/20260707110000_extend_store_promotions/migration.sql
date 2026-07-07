-- Extend store promotions into a lightweight marketing/sales module.

CREATE TYPE "StorePromotionEventType" AS ENUM (
  'VIEW',
  'CLICK',
  'COPY_CODE',
  'SAVE',
  'UNSAVE',
  'REMINDER_SET'
);

ALTER TABLE "StorePromotion"
  ADD COLUMN "brand" TEXT,
  ADD COLUMN "category" TEXT,
  ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "targetLoyaltyTiers" "LoyaltyTier"[] NOT NULL DEFAULT ARRAY[]::"LoyaltyTier"[],
  ADD COLUMN "targetSkinTypes" "SkinType"[] NOT NULL DEFAULT ARRAY[]::"SkinType"[],
  ADD COLUMN "targetConcerns" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "clickCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "copyCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "saveCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "createdById" TEXT;

ALTER TABLE "StorePromotion"
  ADD CONSTRAINT "StorePromotion_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "StorePromotionFavorite" (
  "id" TEXT NOT NULL,
  "promotionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StorePromotionFavorite_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StorePromotionReminder" (
  "id" TEXT NOT NULL,
  "promotionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "remindAt" TIMESTAMP(3) NOT NULL,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StorePromotionReminder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StorePromotionEvent" (
  "id" TEXT NOT NULL,
  "promotionId" TEXT NOT NULL,
  "userId" TEXT,
  "type" "StorePromotionEventType" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StorePromotionEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StorePromotionFavorite_promotionId_userId_key"
  ON "StorePromotionFavorite"("promotionId", "userId");
CREATE INDEX "StorePromotionFavorite_userId_createdAt_idx"
  ON "StorePromotionFavorite"("userId", "createdAt");

CREATE UNIQUE INDEX "StorePromotionReminder_promotionId_userId_key"
  ON "StorePromotionReminder"("promotionId", "userId");
CREATE INDEX "StorePromotionReminder_userId_remindAt_idx"
  ON "StorePromotionReminder"("userId", "remindAt");
CREATE INDEX "StorePromotionReminder_sentAt_idx"
  ON "StorePromotionReminder"("sentAt");

CREATE INDEX "StorePromotionEvent_promotionId_type_createdAt_idx"
  ON "StorePromotionEvent"("promotionId", "type", "createdAt");
CREATE INDEX "StorePromotionEvent_userId_createdAt_idx"
  ON "StorePromotionEvent"("userId", "createdAt");

CREATE INDEX "StorePromotion_category_idx" ON "StorePromotion"("category");
CREATE INDEX "StorePromotion_createdById_idx" ON "StorePromotion"("createdById");

ALTER TABLE "StorePromotionFavorite"
  ADD CONSTRAINT "StorePromotionFavorite_promotionId_fkey"
  FOREIGN KEY ("promotionId") REFERENCES "StorePromotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StorePromotionFavorite"
  ADD CONSTRAINT "StorePromotionFavorite_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StorePromotionReminder"
  ADD CONSTRAINT "StorePromotionReminder_promotionId_fkey"
  FOREIGN KEY ("promotionId") REFERENCES "StorePromotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StorePromotionReminder"
  ADD CONSTRAINT "StorePromotionReminder_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StorePromotionEvent"
  ADD CONSTRAINT "StorePromotionEvent_promotionId_fkey"
  FOREIGN KEY ("promotionId") REFERENCES "StorePromotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StorePromotionEvent"
  ADD CONSTRAINT "StorePromotionEvent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
