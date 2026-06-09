ALTER TABLE "SkinWeatherRule" DROP COLUMN "ruleType";
ALTER TABLE "SkinWeatherRule" DROP COLUMN "minValue";
ALTER TABLE "SkinWeatherRule" DROP COLUMN "maxValue";
ALTER TABLE "SkinWeatherRule" DROP COLUMN "sortOrder";

ALTER TABLE "SkinWeatherRule" ADD COLUMN "uvEnabled"          BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SkinWeatherRule" ADD COLUMN "uvTarget"           DOUBLE PRECISION NOT NULL DEFAULT 50;
ALTER TABLE "SkinWeatherRule" ADD COLUMN "aqiEnabled"         BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SkinWeatherRule" ADD COLUMN "aqiTarget"          DOUBLE PRECISION NOT NULL DEFAULT 50;
ALTER TABLE "SkinWeatherRule" ADD COLUMN "humidityEnabled"    BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SkinWeatherRule" ADD COLUMN "humidityTarget"     DOUBLE PRECISION NOT NULL DEFAULT 50;
ALTER TABLE "SkinWeatherRule" ADD COLUMN "temperatureEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SkinWeatherRule" ADD COLUMN "temperatureTarget"  DOUBLE PRECISION NOT NULL DEFAULT 50;
ALTER TABLE "SkinWeatherRule" ADD COLUMN "precipEnabled"      BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SkinWeatherRule" ADD COLUMN "precipTarget"       DOUBLE PRECISION NOT NULL DEFAULT 50;
ALTER TABLE "SkinWeatherRule" ADD COLUMN "matchThreshold"     DOUBLE PRECISION NOT NULL DEFAULT 25;
ALTER TABLE "SkinWeatherRule" ADD COLUMN "sortOrder"          INTEGER NOT NULL DEFAULT 0;

DROP TYPE "SkinWeatherRuleType";
