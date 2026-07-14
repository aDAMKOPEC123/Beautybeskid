CREATE TYPE "AcademyLegalDocumentType" AS ENUM ('TERMS', 'PRIVACY', 'COOKIES', 'WITHDRAWAL', 'COMPLAINTS', 'ACCESSIBILITY');

ALTER TYPE "AcademySupportCategory" ADD VALUE IF NOT EXISTS 'PAYMENT';
ALTER TYPE "AcademySupportCategory" ADD VALUE IF NOT EXISTS 'INVOICE';
ALTER TYPE "AcademySupportCategory" ADD VALUE IF NOT EXISTS 'REFUND';
ALTER TYPE "AcademySupportCategory" ADD VALUE IF NOT EXISTS 'COMPLAINT';

ALTER TABLE "Course" ADD COLUMN "compareAtPrice" DECIMAL(10,2);

ALTER TABLE "AcademyUser"
  ADD COLUMN "emailVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "emailVerificationToken" TEXT,
  ADD COLUMN "emailVerificationExpiresAt" TIMESTAMP(3),
  ADD COLUMN "passwordResetToken" TEXT,
  ADD COLUMN "passwordResetExpiresAt" TIMESTAMP(3),
  ADD COLUMN "termsAcceptedAt" TIMESTAMP(3),
  ADD COLUMN "termsVersion" TEXT,
  ADD COLUMN "privacyAcceptedAt" TIMESTAMP(3),
  ADD COLUMN "privacyVersion" TEXT;

CREATE UNIQUE INDEX "AcademyUser_emailVerificationToken_key" ON "AcademyUser"("emailVerificationToken");
CREATE UNIQUE INDEX "AcademyUser_passwordResetToken_key" ON "AcademyUser"("passwordResetToken");

CREATE TABLE "AcademyBundle" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "price" DECIMAL(10,2) NOT NULL,
  "compareAtPrice" DECIMAL(10,2),
  "accessDays" INTEGER,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "thumbnailUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AcademyBundle_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AcademyBundle_slug_key" ON "AcademyBundle"("slug");

CREATE TABLE "AcademyBundleCourse" (
  "bundleId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "AcademyBundleCourse_pkey" PRIMARY KEY ("bundleId", "courseId")
);
CREATE INDEX "AcademyBundleCourse_courseId_idx" ON "AcademyBundleCourse"("courseId");
ALTER TABLE "AcademyBundleCourse" ADD CONSTRAINT "AcademyBundleCourse_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "AcademyBundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademyBundleCourse" ADD CONSTRAINT "AcademyBundleCourse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AcademyCoursePriceHistory" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "price" DECIMAL(10,2) NOT NULL,
  "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AcademyCoursePriceHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AcademyCoursePriceHistory_courseId_validFrom_idx" ON "AcademyCoursePriceHistory"("courseId", "validFrom");
ALTER TABLE "AcademyCoursePriceHistory" ADD CONSTRAINT "AcademyCoursePriceHistory_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AcademyLegalDocument" (
  "id" TEXT NOT NULL,
  "type" "AcademyLegalDocumentType" NOT NULL,
  "version" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AcademyLegalDocument_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AcademyLegalDocument_type_version_key" ON "AcademyLegalDocument"("type", "version");
CREATE INDEX "AcademyLegalDocument_type_isPublished_publishedAt_idx" ON "AcademyLegalDocument"("type", "isPublished", "publishedAt");

CREATE TABLE "AcademySellerProfile" (
  "id" TEXT NOT NULL DEFAULT 'academy-seller',
  "legalName" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "taxId" TEXT,
  "registryNumber" TEXT,
  "street" TEXT NOT NULL,
  "postalCode" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "country" TEXT NOT NULL DEFAULT 'Polska',
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AcademySellerProfile_pkey" PRIMARY KEY ("id")
);

INSERT INTO "AcademySellerProfile" ("id", "legalName", "displayName", "street", "postalCode", "city", "country", "email", "phone", "updatedAt")
VALUES ('academy-seller', 'BeskidStudio By Wiktoria Ćwik', 'Akademia BeskidStudio', 'Mordarka 505', '34-600', 'Mordarka', 'Polska', 'kontakt@kosmetologwiktoriacwik.pl', '+48 532 128 227', CURRENT_TIMESTAMP);

ALTER TABLE "AcademyOrder" ALTER COLUMN "courseId" DROP NOT NULL;
ALTER TABLE "AcademyEnrollment" ADD COLUMN "accessExpiresAt" TIMESTAMP(3);
ALTER TABLE "AcademyOrder"
  ADD COLUMN "bundleId" TEXT,
  ADD COLUMN "checkoutExpiresAt" TIMESTAMP(3),
  ADD COLUMN "cancelledAt" TIMESTAMP(3),
  ADD COLUMN "refundedAt" TIMESTAMP(3),
  ADD COLUMN "refundAmount" DECIMAL(10,2),
  ADD COLUMN "refundReason" TEXT,
  ADD COLUMN "failureReason" TEXT,
  ADD COLUMN "termsVersion" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "privacyVersion" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "termsAcceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "immediateDeliveryConsent" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "withdrawalAcknowledged" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "billingName" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "billingAddress" TEXT,
  ADD COLUMN "billingPostalCode" TEXT,
  ADD COLUMN "billingCity" TEXT,
  ADD COLUMN "billingCountry" TEXT NOT NULL DEFAULT 'PL',
  ADD COLUMN "billingTaxId" TEXT,
  ADD COLUMN "isBusiness" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "invoiceRequested" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "invoiceNumber" TEXT,
  ADD COLUMN "confirmationSentAt" TIMESTAMP(3);

CREATE INDEX "AcademyOrder_bundleId_createdAt_idx" ON "AcademyOrder"("bundleId", "createdAt");
ALTER TABLE "AcademyOrder" ADD CONSTRAINT "AcademyOrder_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "AcademyBundle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "AcademyOrderEvent" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "details" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AcademyOrderEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AcademyOrderEvent_orderId_createdAt_idx" ON "AcademyOrderEvent"("orderId", "createdAt");
ALTER TABLE "AcademyOrderEvent" ADD CONSTRAINT "AcademyOrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "AcademyOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
