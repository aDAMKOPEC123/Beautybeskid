ALTER TABLE "AcademyPromotion" ADD COLUMN "eligibleEmails" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "AcademyDiscountCode" ADD COLUMN "eligibleEmails" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
