-- CreateEnum
CREATE TYPE "ReactionType" AS ENUM ('LIKE', 'HEART', 'HELPFUL');

-- AlterTable: add icon and color to ForumCategory
ALTER TABLE "ForumCategory" ADD COLUMN "icon" TEXT;
ALTER TABLE "ForumCategory" ADD COLUMN "color" TEXT;

-- AlterTable: add viewCount and tags to ForumThread
ALTER TABLE "ForumThread" ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ForumThread" ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable: add quotedPostId and quotedContent to ForumPost
ALTER TABLE "ForumPost" ADD COLUMN "quotedPostId" TEXT;
ALTER TABLE "ForumPost" ADD COLUMN "quotedContent" TEXT;

-- CreateTable: ForumReaction
CREATE TABLE "ForumReaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "type" "ReactionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForumReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ForumReaction_userId_postId_type_key" ON "ForumReaction"("userId", "postId", "type");

-- CreateIndex
CREATE INDEX "ForumReaction_postId_idx" ON "ForumReaction"("postId");

-- AddForeignKey
ALTER TABLE "ForumReaction" ADD CONSTRAINT "ForumReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumReaction" ADD CONSTRAINT "ForumReaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ForumPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
