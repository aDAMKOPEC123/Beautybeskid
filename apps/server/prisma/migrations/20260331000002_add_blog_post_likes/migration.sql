-- Create BlogPostLike table
CREATE TABLE "BlogPostLike" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BlogPostLike_pkey" PRIMARY KEY ("id")
);

-- Add foreign keys
ALTER TABLE "BlogPostLike" ADD CONSTRAINT "BlogPostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "BlogPostLike" ADD CONSTRAINT "BlogPostLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Add unique constraint
CREATE UNIQUE INDEX "BlogPostLike_postId_userId_key" ON "BlogPostLike"("postId", "userId");
CREATE INDEX "BlogPostLike_postId_idx" ON "BlogPostLike"("postId");
