-- CreateEnum
CREATE TYPE "Season" AS ENUM ('SPRING', 'SUMMER', 'AUTUMN', 'WINTER');

-- AlterTable
ALTER TABLE "Service" ADD COLUMN "seasons" "Season"[] DEFAULT ARRAY[]::"Season"[];
