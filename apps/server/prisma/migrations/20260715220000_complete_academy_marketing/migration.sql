ALTER TABLE "AcademyMarketingLead" ADD COLUMN "unsubscribeToken" TEXT;
UPDATE "AcademyMarketingLead" SET "unsubscribeToken" = gen_random_uuid()::text WHERE "unsubscribeToken" IS NULL;
ALTER TABLE "AcademyMarketingLead" ALTER COLUMN "unsubscribeToken" SET NOT NULL;
CREATE UNIQUE INDEX "AcademyMarketingLead_unsubscribeToken_key" ON "AcademyMarketingLead"("unsubscribeToken");
