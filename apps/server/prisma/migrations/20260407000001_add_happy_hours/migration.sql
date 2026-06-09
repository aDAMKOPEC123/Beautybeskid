-- CreateEnum
CREATE TYPE "RescheduleStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "HappyHourType" AS ENUM ('ONE_TIME', 'RECURRING');

-- DropForeignKey
ALTER TABLE "ProductRecommendation" DROP CONSTRAINT "ProductRecommendation_addedById_fkey";

-- DropForeignKey
ALTER TABLE "ProductRecommendation" DROP CONSTRAINT "ProductRecommendation_appointmentId_fkey";

-- DropForeignKey
ALTER TABLE "ProductRecommendation" DROP CONSTRAINT "ProductRecommendation_userId_fkey";

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "happyHourId" TEXT,
ADD COLUMN     "rescheduleDate" TIMESTAMP(3),
ADD COLUMN     "rescheduleStatus" "RescheduleStatus";

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "detailedContent" TEXT;

-- AlterTable
ALTER TABLE "UserCoupon" ADD COLUMN     "code" TEXT;

-- DropTable
DROP TABLE "ProductRecommendation";

-- CreateTable
CREATE TABLE "DiscountCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discountType" "DiscountType" NOT NULL,
    "discountValue" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lockedToUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscountCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscountCodeUsage" (
    "id" TEXT NOT NULL,
    "discountCodeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscountCodeUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmbassadorConfig" (
    "id" TEXT NOT NULL,
    "discountType" "DiscountType" NOT NULL DEFAULT 'PERCENTAGE',
    "discountValue" DECIMAL(10,2) NOT NULL DEFAULT 10,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AmbassadorConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalonTerms" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalonTerms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AboutPage" (
    "id" TEXT NOT NULL,
    "salonTagline" TEXT NOT NULL DEFAULT '',
    "salonDescription" TEXT NOT NULL DEFAULT '',
    "salonCoverImage" TEXT,
    "ownerName" TEXT NOT NULL DEFAULT 'Wiktoria Ćwik',
    "ownerTitle" TEXT NOT NULL DEFAULT 'Właścicielka & Kosmetolożka',
    "ownerBio" TEXT NOT NULL DEFAULT '',
    "ownerPhoto" TEXT,
    "featuresTitle" TEXT NOT NULL DEFAULT 'Dlaczego warto wybrać Cosmo?',
    "features" JSONB NOT NULL DEFAULT '[]',
    "appDescription" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AboutPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultationLead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "consentContact" BOOLEAN NOT NULL DEFAULT false,
    "consentData" BOOLEAN NOT NULL DEFAULT false,
    "contacted" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "contactedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsultationLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "imagePath" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentRecommendation" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "addedById" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "comment" TEXT,
    "pickedUp" BOOLEAN NOT NULL DEFAULT false,
    "pickedUpAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HappyHour" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "HappyHourType" NOT NULL,
    "date" TIMESTAMP(3),
    "dayOfWeek" INTEGER,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "discountType" "DiscountType" NOT NULL,
    "discountValue" DECIMAL(10,2) NOT NULL,
    "isAllEmployees" BOOLEAN NOT NULL DEFAULT true,
    "isAllServices" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HappyHour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HappyHourNotification" (
    "id" TEXT NOT NULL,
    "happyHourId" TEXT NOT NULL,
    "sentForDate" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HappyHourNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_HappyHourEmployees" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_HappyHourServices" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "DiscountCode_code_key" ON "DiscountCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "DiscountCodeUsage_appointmentId_key" ON "DiscountCodeUsage"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "DiscountCodeUsage_discountCodeId_userId_key" ON "DiscountCodeUsage"("discountCodeId", "userId");

-- CreateIndex
CREATE INDEX "AppointmentRecommendation_userId_idx" ON "AppointmentRecommendation"("userId");

-- CreateIndex
CREATE INDEX "AppointmentRecommendation_appointmentId_idx" ON "AppointmentRecommendation"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "HappyHourNotification_happyHourId_sentForDate_key" ON "HappyHourNotification"("happyHourId", "sentForDate");

-- CreateIndex
CREATE UNIQUE INDEX "_HappyHourEmployees_AB_unique" ON "_HappyHourEmployees"("A", "B");

-- CreateIndex
CREATE INDEX "_HappyHourEmployees_B_index" ON "_HappyHourEmployees"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_HappyHourServices_AB_unique" ON "_HappyHourServices"("A", "B");

-- CreateIndex
CREATE INDEX "_HappyHourServices_B_index" ON "_HappyHourServices"("B");

-- CreateIndex
CREATE UNIQUE INDEX "UserCoupon_code_key" ON "UserCoupon"("code");

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_happyHourId_fkey" FOREIGN KEY ("happyHourId") REFERENCES "HappyHour"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountCode" ADD CONSTRAINT "DiscountCode_lockedToUserId_fkey" FOREIGN KEY ("lockedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountCodeUsage" ADD CONSTRAINT "DiscountCodeUsage_discountCodeId_fkey" FOREIGN KEY ("discountCodeId") REFERENCES "DiscountCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountCodeUsage" ADD CONSTRAINT "DiscountCodeUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountCodeUsage" ADD CONSTRAINT "DiscountCodeUsage_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentRecommendation" ADD CONSTRAINT "AppointmentRecommendation_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentRecommendation" ADD CONSTRAINT "AppointmentRecommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentRecommendation" ADD CONSTRAINT "AppointmentRecommendation_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentRecommendation" ADD CONSTRAINT "AppointmentRecommendation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HappyHourNotification" ADD CONSTRAINT "HappyHourNotification_happyHourId_fkey" FOREIGN KEY ("happyHourId") REFERENCES "HappyHour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_HappyHourEmployees" ADD CONSTRAINT "_HappyHourEmployees_A_fkey" FOREIGN KEY ("A") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_HappyHourEmployees" ADD CONSTRAINT "_HappyHourEmployees_B_fkey" FOREIGN KEY ("B") REFERENCES "HappyHour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_HappyHourServices" ADD CONSTRAINT "_HappyHourServices_A_fkey" FOREIGN KEY ("A") REFERENCES "HappyHour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_HappyHourServices" ADD CONSTRAINT "_HappyHourServices_B_fkey" FOREIGN KEY ("B") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "TreatmentSeriesNotification_treatmentSeriesId_kind_bucketKey_ke" RENAME TO "TreatmentSeriesNotification_treatmentSeriesId_kind_bucketKe_key";

