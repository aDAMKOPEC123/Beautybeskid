-- AlterTable
ALTER TABLE "SkinAtlasRegion" ADD COLUMN "parentId" TEXT;

-- CreateIndex
CREATE INDEX "SkinAtlasRegion_parentId_idx" ON "SkinAtlasRegion"("parentId");

-- AddForeignKey
ALTER TABLE "SkinAtlasRegion" ADD CONSTRAINT "SkinAtlasRegion_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "SkinAtlasRegion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
