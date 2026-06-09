CREATE TYPE "SkinType" AS ENUM ('SUCHA', 'TLUSTA', 'MIESZANA', 'NORMALNA', 'WRAZLIWA');
CREATE TYPE "SkinWeatherRuleType" AS ENUM ('UV', 'AQI', 'HUMIDITY', 'TEMPERATURE', 'PRECIPITATION');

CREATE TABLE "SkinWeatherProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "skinType" "SkinType" NOT NULL,
  "skinConcerns" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "locationLat" DECIMAL(9,6) NOT NULL,
  "locationLng" DECIMAL(9,6) NOT NULL,
  "cityName" VARCHAR(100) NOT NULL,
  "notificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SkinWeatherProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SkinWeatherProfile_userId_key" ON "SkinWeatherProfile"("userId");
ALTER TABLE "SkinWeatherProfile" ADD CONSTRAINT "SkinWeatherProfile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SkinWeatherReport" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "reportDate" DATE NOT NULL,
  "weatherData" JSONB NOT NULL,
  "reportData" JSONB NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SkinWeatherReport_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SkinWeatherReport_userId_reportDate_key" ON "SkinWeatherReport"("userId", "reportDate");
ALTER TABLE "SkinWeatherReport" ADD CONSTRAINT "SkinWeatherReport_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SkinWeatherRule" (
  "id" TEXT NOT NULL,
  "ruleType" "SkinWeatherRuleType" NOT NULL,
  "minValue" DOUBLE PRECISION NOT NULL,
  "maxValue" DOUBLE PRECISION,
  "label" TEXT NOT NULL,
  "recommendation" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SkinWeatherRule_pkey" PRIMARY KEY ("id")
);

ALTER TYPE "NotificationType" ADD VALUE 'SKIN_WEATHER';
