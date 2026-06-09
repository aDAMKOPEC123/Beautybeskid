-- AlterTable
ALTER TABLE "SkinWeatherRule" ADD COLUMN     "thresholds" JSONB NOT NULL DEFAULT '{}';
