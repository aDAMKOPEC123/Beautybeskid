-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('IG', 'TIKTOK', 'FB');

-- CreateEnum
CREATE TYPE "ContentFormat" AS ENUM ('ROLKA', 'KARUZELA', 'STORY', 'POST');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('POMYSL', 'SCENARIUSZ', 'NAGRANE', 'ZMONTOWANE', 'OPUBLIKOWANE');

-- CreateEnum
CREATE TYPE "IdeaCategory" AS ENUM ('LAMINACJA', 'PEDICURE', 'PODOLOGIA', 'TWARZ', 'BRWI', 'INNE');

-- CreateEnum
CREATE TYPE "IdeaType" AS ENUM ('POV', 'COMEDY', 'EDUKACYJNA', 'BEFORE_AFTER', 'BLIND_REACTION', 'LOOP');

-- CreateEnum
CREATE TYPE "IdeaStatus" AS ENUM ('POMYSL', 'SCENARIUSZ', 'GOTOWA', 'WYKORZYSTANA');

-- CreateTable
CREATE TABLE "ContentPost" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "format" "ContentFormat" NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "ContentStatus" NOT NULL,
    "thumbnailUrl" TEXT,
    "notes" TEXT,
    "ideaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolkaIdea" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "hook" TEXT,
    "sceneDesc" TEXT,
    "category" "IdeaCategory" NOT NULL,
    "type" "IdeaType" NOT NULL,
    "audioName" TEXT,
    "audioUrl" TEXT,
    "props" TEXT,
    "status" "IdeaStatus" NOT NULL,
    "plannedDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RolkaIdea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContentPost_ideaId_key" ON "ContentPost"("ideaId");

-- AddForeignKey
ALTER TABLE "ContentPost" ADD CONSTRAINT "ContentPost_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "RolkaIdea"("id") ON DELETE SET NULL ON UPDATE CASCADE;
