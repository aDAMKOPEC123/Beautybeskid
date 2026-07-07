UPDATE "LoyaltyReward"
SET "discountType" = 'AMOUNT',
    "discountValue" = 50
WHERE "name" = 'Zniżka 50 PLN'
  AND "discountValue" IS NULL;

UPDATE "LoyaltyReward"
SET "discountType" = 'OTHER',
    "discountValue" = NULL
WHERE "name" = 'Darmowa Konsultacja'
  AND "discountValue" IS NULL;
