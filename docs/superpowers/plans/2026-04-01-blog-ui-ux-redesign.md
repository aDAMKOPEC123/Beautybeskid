# Blog UI/UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the COSMO blog more engaging by sorting articles by engagement score, replacing the grid layout with a scannable horizontal list, and adding satisfying like/comment animations.

**Architecture:** Backend computes an engagement score (`likes + comments + newness bonus`) in `getAllPosts()` and returns posts pre-sorted. Frontend gets a new horizontal-list layout for `/blog`, floating-hearts like animation on both list and article pages, and a slide-in animation for newly added comments.

**Tech Stack:** Node.js/Express + Prisma (backend), React 19 + TypeScript + Tailwind + React Query (frontend), no new dependencies required.

---

## Task 1: Backend — Engagement Score Sorting

**Files:**
- Modify: `apps/server/src/modules/blog/blog.service.ts`

- [ ] **Step 1: Open `blog.service.ts` and locate `getAllPosts`**

  The function starts at line 7. It currently returns posts sorted by `orderBy: { createdAt: 'desc' }` from Prisma and maps them to add `isLiked`. No other changes are needed to the Prisma query — `_count.likes` and `_count.comments` are already fetched.

- [ ] **Step 2: Add the engagement score sort after the `isLiked` mapping**

  Replace the two `return` statements (lines 18 and 27-30) with a single unified return that computes the score and conditionally sorts:

  ```ts
  export const getAllPosts = async (includeUnpublished = false, userId?: string) => {
    const posts = await prisma.blogPost.findMany({
      where: includeUnpublished ? {} : { isPublished: true },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { name: true, avatarPath: true } },
        tags: true,
        _count: { select: { likes: true, comments: true } }
      }
    });

    const NEWNESS_BONUS = 10;
    const NEWNESS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
    const isNew = (createdAt: Date) =>
      Date.now() - new Date(createdAt).getTime() < NEWNESS_WINDOW_MS;

    let likedPostIdSet = new Set<string>();
    if (userId) {
      const likedPostIds = await prisma.blogPostLike.findMany({
        where: { userId },
        select: { postId: true }
      });
      likedPostIdSet = new Set(likedPostIds.map(l => l.postId));
    }

    const mapped = posts.map(post => ({
      ...post,
      isLiked: likedPostIdSet.has(post.id),
      engagementScore: post._count.likes + post._count.comments + (isNew(post.createdAt) ? NEWNESS_BONUS : 0)
    }));

    // Admin calls keep createdAt desc (already sorted by Prisma); only sort public view
    if (includeUnpublished) return mapped;
    return mapped.sort((a, b) => b.engagementScore - a.engagementScore);
  };
  ```

- [ ] **Step 3: Verify TypeScript compiles**

  Run from `apps/server/`:
  ```bash
  pnpm build
  ```
  Expected: exits with code 0, no type errors.

- [ ] **Step 4: Commit**

  ```bash
  git add apps/server/src/modules/blog/blog.service.ts
  git commit -m "feat(blog): sort public posts by engagement score with newness bonus"
  ```

---

## Task 2: Fix Pre-existing JSX Error in BlogPost.tsx

**Files:**
- Modify: `apps/web/src/pages/public/BlogPost.tsx`

- [ ] **Step 1: Open `BlogPost.tsx` and locate the broken `LikeButton` JSX**

  The error is in the `LikeButton` component (lines 69–144). At line 90 there is a valid conditional opening: `{(!isLiked || justLiked) && (`. Line 91 is an exact duplicate of that same line — a second opening that creates a mismatched JSX structure. Lines 117-129 are orphaned JSX from the erroneously opened second branch.

- [ ] **Step 2: Delete the duplicate line and orphaned block**

  The corrected `LikeButton` JSX from `<button>` onward should look exactly like this:

  ```tsx
  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={isPending}
        className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${
          isLoggedIn ? 'hover:scale-105 active:scale-95' : ''
        }`}
        style={{
          color: isLiked ? '#B8913A' : 'rgba(26,18,8,0.6)',
          backgroundColor: isLiked ? 'rgba(184,145,58,0.12)' : 'rgba(26,18,8,0.05)',
          transform: animate ? 'scale(1.15)' : 'scale(1)'
        }}
      >
        <Heart
          size={24}
          fill={isLiked ? '#B8913A' : 'none'}
          stroke={isLiked ? '#B8913A' : 'currentColor'}
          className={animate ? 'animate-pulse' : ''}
        />
        <span className="text-base font-medium">{count}</span>
        {(!isLiked || justLiked) && (
          <span className="relative inline-block" style={{ width: '140px', height: '20px' }}>
            <span
              className="absolute inset-0 text-sm font-medium transition-all duration-500 ease-in-out"
              style={{
                color: 'rgba(26,18,8,0.5)',
                opacity: !justLiked ? 1 : 0,
                transform: !justLiked ? 'translateX(0)' : 'translateX(-8px)',
                pointerEvents: 'none'
              }}
            >
              Polub ten artykuł
            </span>
            <span
              className="absolute inset-0 text-sm font-medium transition-all duration-500 ease-in-out"
              style={{
                color: '#B8913A',
                opacity: justLiked ? 1 : 0,
                transform: justLiked ? 'translateX(0)' : 'translateX(8px)',
                pointerEvents: 'none'
              }}
            >
              Polubiono
            </span>
          </span>
        )}
      </button>
      {showHint && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-4 py-3 text-sm font-medium rounded-xl whitespace-nowrap z-10 shadow-lg"
          style={{ backgroundColor: '#1A1208', color: '#fff' }}
        >
          <div className="text-center">
            <div>Zaloguj się, aby polubić artykuł</div>
            <div className="text-xs mt-1 opacity-70">To tylko chwila — dołącz do nas!</div>
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1" style={{ border: '8px solid transparent', borderTopColor: '#1A1208' }} />
        </div>
      )}
    </div>
  );
  ```

- [ ] **Step 3: Verify the file compiles**

  Run from `apps/web/`:
  ```bash
  pnpm build
  ```
  Expected: exits with code 0, no TypeScript or JSX errors.

- [ ] **Step 4: Commit**

  ```bash
  git add apps/web/src/pages/public/BlogPost.tsx
  git commit -m "fix(blog): remove duplicate JSX conditional in BlogPost LikeButton"
  ```

---

## Task 3: Floating Hearts — LikeButton in BlogList.tsx

**Files:**
- Modify: `apps/web/src/pages/public/BlogList.tsx`

- [ ] **Step 1: Add the CSS keyframes**

  At the top of `BlogList.tsx`, after the imports, add a `<style>` injection via a module-level constant that will be inserted into the component, OR add the keyframes to your global CSS file. Since this project uses Tailwind without a separate CSS-in-JS layer, add the keyframes directly in the component via a `<style>` tag inside the JSX (before the return of `BlogList`):

  Add this as the first element inside the outer `<>` fragment:
  ```tsx
  <style>{`
    @keyframes floatUp {
      to { opacity: 0; transform: translateY(-40px) scale(0.5); }
    }
    @keyframes heartPop {
      0%   { transform: scale(1); }
      40%  { transform: scale(1.2); }
      100% { transform: scale(1); }
    }
    @keyframes counterDown {
      from { opacity: 1; transform: translateY(0); }
      to   { opacity: 0; transform: translateY(6px); }
    }
    @keyframes counterUp {
      from { opacity: 0; transform: translateY(-6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `}</style>
  ```

- [ ] **Step 2: Replace the `LikeButton` component with the floating-hearts version**

  Replace the entire `LikeButton` component (lines 12–107) with:

  ```tsx
  const LikeButton = ({
    post,
    onLike,
    isLoggedIn,
    isPending
  }: {
    post: any;
    onLike: () => void;
    isLoggedIn: boolean;
    isPending: boolean;
  }) => {
    const [showHint, setShowHint] = useState(false);
    const [animate, setAnimate] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const isLiked = post.isLiked;

    const spawnHearts = () => {
      if (!wrapperRef.current) return;
      for (let i = 0; i < 4; i++) {
        setTimeout(() => {
          if (!wrapperRef.current) return;
          const heart = document.createElement('span');
          heart.textContent = '❤️';
          heart.style.cssText = `
            position: absolute;
            font-size: 14px;
            pointer-events: none;
            left: ${30 + Math.random() * 40}%;
            top: -4px;
            animation: floatUp 0.7s ease forwards;
            animation-delay: ${Math.random() * 0.1}s;
            z-index: 10;
          `;
          wrapperRef.current.appendChild(heart);
          setTimeout(() => heart.remove(), 800);
        }, i * 60);
      }
    };

    const handleClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!isLoggedIn) {
        setShowHint(true);
        setTimeout(() => setShowHint(false), 2500);
        return;
      }
      if (animate) return;
      setAnimate(true);
      if (!isLiked) spawnHearts();
      onLike();
      setTimeout(() => setAnimate(false), 400);
    };

    return (
      <div className="relative" ref={wrapperRef}>
        <button
          onClick={handleClick}
          disabled={isPending}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300 ${
            isLoggedIn ? 'hover:scale-105 active:scale-95' : ''
          }`}
          style={{
            color: isLiked ? '#B8913A' : 'rgba(26,18,8,0.6)',
            backgroundColor: isLiked ? 'rgba(184,145,58,0.1)' : 'rgba(26,18,8,0.05)',
          }}
        >
          <Heart
            size={22}
            fill={isLiked ? '#B8913A' : 'none'}
            stroke={isLiked ? '#B8913A' : 'currentColor'}
            style={{
              animation: animate ? 'heartPop 0.3s ease' : 'none',
              transition: 'fill 0.3s, stroke 0.3s',
            }}
          />
          <span
            className="text-sm font-medium"
            style={{
              animation: animate ? (isLiked ? 'counterDown 0.3s ease' : 'counterUp 0.3s ease') : 'none',
            }}
          >
            {post._count?.likes ?? 0}
          </span>
        </button>
        {showHint && (
          <div
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-4 py-3 text-sm font-medium rounded-xl whitespace-nowrap z-10 shadow-lg"
            style={{ backgroundColor: '#1A1208', color: '#fff' }}
          >
            <div className="text-center">
              <div>Zaloguj się, aby polubić artykuł</div>
              <div className="text-xs mt-1 opacity-70">To tylko chwila — dołącz do nas!</div>
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1" style={{ border: '8px solid transparent', borderTopColor: '#1A1208' }} />
          </div>
        )}
      </div>
    );
  };
  ```

  Also add `useRef` to the React import at the top:
  ```tsx
  import { useState, useRef } from 'react';
  ```

- [ ] **Step 3: Verify no TypeScript errors**

  ```bash
  cd apps/web && pnpm build
  ```
  Expected: exits with code 0.

- [ ] **Step 4: Commit**

  ```bash
  git add apps/web/src/pages/public/BlogList.tsx
  git commit -m "feat(blog): add floating hearts like animation to BlogList"
  ```

---

## Task 4: Floating Hearts — LikeButton in BlogPost.tsx

**Files:**
- Modify: `apps/web/src/pages/public/BlogPost.tsx`

- [ ] **Step 1: Add `useRef` to the React import**

  Change line 1:
  ```tsx
  import { useMemo, useState, useRef } from 'react';
  ```

- [ ] **Step 2: Add the CSS keyframes `<style>` tag**

  Same keyframes as Task 3. Add as first element inside the outer `<>` of the `BlogPost` component return:
  ```tsx
  <style>{`
    @keyframes floatUp {
      to { opacity: 0; transform: translateY(-40px) scale(0.5); }
    }
    @keyframes heartPop {
      0%   { transform: scale(1); }
      40%  { transform: scale(1.2); }
      100% { transform: scale(1); }
    }
    @keyframes counterDown {
      from { opacity: 1; transform: translateY(0); }
      to   { opacity: 0; transform: translateY(6px); }
    }
    @keyframes counterUp {
      from { opacity: 0; transform: translateY(-6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `}</style>
  ```

- [ ] **Step 3: Replace the `LikeButton` component with the floating-hearts version**

  Replace the entire `LikeButton` component in `BlogPost.tsx` (lines 36-145, already fixed in Task 2) with:

  ```tsx
  const LikeButton = ({
    isLiked,
    count,
    onLike,
    isLoggedIn,
    isPending
  }: {
    isLiked: boolean;
    count: number;
    onLike: () => void;
    isLoggedIn: boolean;
    isPending: boolean;
  }) => {
    const [showHint, setShowHint] = useState(false);
    const [animate, setAnimate] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const spawnHearts = () => {
      if (!wrapperRef.current) return;
      for (let i = 0; i < 4; i++) {
        setTimeout(() => {
          if (!wrapperRef.current) return;
          const heart = document.createElement('span');
          heart.textContent = '❤️';
          heart.style.cssText = `
            position: absolute;
            font-size: 14px;
            pointer-events: none;
            left: ${30 + Math.random() * 40}%;
            top: -4px;
            animation: floatUp 0.7s ease forwards;
            animation-delay: ${Math.random() * 0.1}s;
            z-index: 10;
          `;
          wrapperRef.current.appendChild(heart);
          setTimeout(() => heart.remove(), 800);
        }, i * 60);
      }
    };

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isLoggedIn) {
        setShowHint(true);
        setTimeout(() => setShowHint(false), 2500);
        return;
      }
      if (animate) return;
      setAnimate(true);
      if (!isLiked) spawnHearts();
      onLike();
      setTimeout(() => setAnimate(false), 400);
    };

    return (
      <div className="relative" ref={wrapperRef}>
        <button
          onClick={handleClick}
          disabled={isPending}
          className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${
            isLoggedIn ? 'hover:scale-105 active:scale-95' : ''
          }`}
          style={{
            color: isLiked ? '#B8913A' : 'rgba(26,18,8,0.6)',
            backgroundColor: isLiked ? 'rgba(184,145,58,0.12)' : 'rgba(26,18,8,0.05)',
          }}
        >
          <Heart
            size={24}
            fill={isLiked ? '#B8913A' : 'none'}
            stroke={isLiked ? '#B8913A' : 'currentColor'}
            style={{
              animation: animate ? 'heartPop 0.3s ease' : 'none',
              transition: 'fill 0.3s, stroke 0.3s',
            }}
          />
          <span
            className="text-base font-medium"
            style={{
              animation: animate ? (isLiked ? 'counterDown 0.3s ease' : 'counterUp 0.3s ease') : 'none',
            }}
          >
            {count}
          </span>
        </button>
        {showHint && (
          <div
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-4 py-3 text-sm font-medium rounded-xl whitespace-nowrap z-10 shadow-lg"
            style={{ backgroundColor: '#1A1208', color: '#fff' }}
          >
            <div className="text-center">
              <div>Zaloguj się, aby polubić artykuł</div>
              <div className="text-xs mt-1 opacity-70">To tylko chwila — dołącz do nas!</div>
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1" style={{ border: '8px solid transparent', borderTopColor: '#1A1208' }} />
          </div>
        )}
      </div>
    );
  };
  ```

- [ ] **Step 4: Verify no TypeScript errors**

  ```bash
  cd apps/web && pnpm build
  ```
  Expected: exits with code 0.

- [ ] **Step 5: Commit**

  ```bash
  git add apps/web/src/pages/public/BlogPost.tsx
  git commit -m "feat(blog): add floating hearts like animation to BlogPost"
  ```

---

## Task 5: Comment Slide-in Animation

**Files:**
- Modify: `apps/web/src/components/blog/BlogCommentsSection.tsx`
- Modify: `apps/web/src/components/blog/CommentTree.tsx`
- Modify: `apps/web/src/components/blog/CommentItem.tsx`

### 5a — CommentItem: accept `isNew` + apply CSS

- [ ] **Step 1: Add `isNew?: boolean` and `newCommentId?: string` to `CommentItem` Props**

  Add to the `Props` interface (after line 33):
  ```ts
  interface Props {
    comment: CommentData;
    slug: string;
    currentUserId?: string;
    isAdmin: boolean;
    depth?: number;
    isNew?: boolean;           // ← add
    newCommentId?: string;     // ← add (for threading to children)
    onDelete: (id: string) => void;
    onModerate: (id: string, data: { isHidden?: boolean; isSpam?: boolean }) => void;
    onReact: (id: string, emoji: string) => void;
    onReply: (data: { content: string; parentId?: string; image?: File }) => Promise<void>;
  }
  ```

- [ ] **Step 2: Destructure the new props in `CommentItem`**

  Update the destructuring (line 35-45):
  ```tsx
  export const CommentItem = ({
    comment,
    slug,
    currentUserId,
    isAdmin,
    depth = 0,
    isNew = false,
    newCommentId,
    onDelete,
    onModerate,
    onReact,
    onReply,
  }: Props) => {
  ```

- [ ] **Step 3: Add a `ref` and scroll effect for new comments**

  Add after the existing `useState` call:
  ```tsx
  const itemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isNew && itemRef.current) {
      itemRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isNew]);
  ```

  Add `useRef` and `useEffect` to the import at the top of `CommentItem.tsx`:
  ```tsx
  import { useState, useRef, useEffect } from 'react';
  ```

- [ ] **Step 4: Apply the `comment-new` class and ref to the outer `<div>`**

  Change line 50:
  ```tsx
  <div className={`${indentClass} ${isNew ? 'comment-new' : ''}`} ref={itemRef}>
  ```

- [ ] **Step 5: Thread `newCommentId` to recursive children**

  In the recursive children render (lines 159-172), pass `isNew` and `newCommentId`:
  ```tsx
  {comment.children?.map((child) => (
    <CommentItem
      key={child.id}
      comment={child}
      slug={slug}
      currentUserId={currentUserId}
      isAdmin={isAdmin}
      depth={depth + 1}
      isNew={child.id === newCommentId}
      newCommentId={newCommentId}
      onDelete={onDelete}
      onModerate={onModerate}
      onReact={onReact}
      onReply={onReply}
    />
  ))}
  ```

### 5b — CommentTree: accept and forward `newCommentId`

- [ ] **Step 6: Add `newCommentId?: string` to `CommentTree` Props**

  Update the `Props` interface in `CommentTree.tsx`:
  ```ts
  interface Props {
    comments: CommentData[];
    slug: string;
    currentUserId?: string;
    isAdmin: boolean;
    newCommentId?: string;  // ← add
    onDelete: (id: string) => void;
    onModerate: (id: string, data: { isHidden?: boolean; isSpam?: boolean }) => void;
    onReact: (id: string, emoji: string) => void;
    onReply: (data: { content: string; parentId?: string; image?: File }) => Promise<void>;
  }
  ```

- [ ] **Step 7: Destructure and forward `newCommentId` to each root `CommentItem`**

  In `CommentTree`:
  ```tsx
  export const CommentTree = ({
    comments,
    slug,
    currentUserId,
    isAdmin,
    newCommentId,   // ← add
    onDelete,
    onModerate,
    onReact,
    onReply,
  }: Props) => {
    // ...
    return (
      <div className="divide-y divide-border/30">
        {tree.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            slug={slug}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            isNew={comment.id === newCommentId}
            newCommentId={newCommentId}
            onDelete={onDelete}
            onModerate={onModerate}
            onReact={onReact}
            onReply={onReply}
          />
        ))}
      </div>
    );
  };
  ```

### 5c — BlogCommentsSection: track newCommentId + add CSS

- [ ] **Step 8: Add `newCommentId` state and update `addMutation.onSuccess`**

  In `BlogCommentsSection.tsx`, add:
  ```tsx
  import { useState } from 'react';
  // ...
  const [newCommentId, setNewCommentId] = useState<string | undefined>();
  ```

  Update `addMutation`:
  ```tsx
  const addMutation = useMutation({
    mutationFn: (data: { content: string; parentId?: string; image?: File }) =>
      blogApi.addComment(slug, data),
    onSuccess: (newComment) => {
      setNewCommentId(newComment.id);
      invalidate();
      setTimeout(() => setNewCommentId(undefined), 2500);
    },
    onError: () => toast.error('Nie udało się dodać komentarza'),
  });
  ```

- [ ] **Step 9: Pass `newCommentId` to `CommentTree`**

  Update the `<CommentTree>` usage:
  ```tsx
  <CommentTree
    comments={comments}
    slug={slug}
    currentUserId={user?.id}
    isAdmin={isAdmin}
    newCommentId={newCommentId}
    onDelete={(id) => deleteMutation.mutate(id)}
    onModerate={(id, data) => moderateMutation.mutate({ id, data })}
    onReact={(id, emoji) => reactMutation.mutate({ id, emoji })}
    onReply={(data) => addMutation.mutateAsync(data)}
  />
  ```

- [ ] **Step 10: Add the CSS keyframe and `.comment-new` class**

  Add a `<style>` tag at the top of the `BlogCommentsSection` JSX:
  ```tsx
  <style>{`
    @keyframes slideInFade {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .comment-new {
      animation: slideInFade 0.4s cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
      border-left: 3px solid #B8913A !important;
      transition: border-left-color 0.5s ease;
    }
  `}</style>
  ```

- [ ] **Step 11: Verify TypeScript compiles**

  ```bash
  cd apps/web && pnpm build
  ```
  Expected: exits with code 0.

- [ ] **Step 12: Commit**

  ```bash
  git add apps/web/src/components/blog/BlogCommentsSection.tsx \
          apps/web/src/components/blog/CommentTree.tsx \
          apps/web/src/components/blog/CommentItem.tsx
  git commit -m "feat(blog): add slide-in animation for new comments"
  ```

---

## Task 6: Blog List — Horizontal Layout + Skeleton

**Files:**
- Modify: `apps/web/src/pages/public/BlogList.tsx`
- Modify: `apps/web/src/components/skeletons/BlogCardSkeleton.tsx`

### 6a — New horizontal card layout in BlogList.tsx

- [ ] **Step 1: Replace the grid section with a vertical list**

  In `BlogList.tsx`, replace the entire `{/* Grid */}` section (lines 218-299) with:

  ```tsx
  {/* List */}
  <section className="py-16" style={{ backgroundColor: '#FDFAF6' }}>
    <div className="container max-w-4xl mx-auto">
      <div className="flex flex-col gap-4">
        {posts?.filter((p: any) => p.isPublished).map((post: any) => (
          <Link to={`/blog/${post.slug}`} key={post.id} className="block group">
            <div
              className="flex flex-col sm:flex-row gap-0 overflow-hidden transition-all duration-300"
              style={{
                borderRadius: '16px',
                border: '1px solid rgba(0,0,0,0.07)',
                backgroundColor: '#fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.boxShadow = '0 6px 24px rgba(0,0,0,0.09)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)')}
            >
              {/* Thumbnail */}
              <div
                className="shrink-0 overflow-hidden hidden sm:block"
                style={{ width: '140px', borderRadius: '16px 0 0 16px' }}
              >
                {post.coverImage ? (
                  <img
                    src={post.coverImage}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    style={{ minHeight: '100px' }}
                  />
                ) : (
                  <div className="w-full h-full" style={{ background: 'rgba(184,145,58,0.08)', minHeight: '100px' }} />
                )}
              </div>

              {/* Mobile thumbnail (top) */}
              {post.coverImage && (
                <div className="sm:hidden w-full overflow-hidden" style={{ height: '160px', borderRadius: '16px 16px 0 0' }}>
                  <img
                    src={post.coverImage}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )}

              {/* Content */}
              <div className="flex flex-col flex-1 px-5 py-4 min-w-0">
                <h2
                  className="text-lg font-heading font-bold leading-snug mb-1 line-clamp-2"
                  style={{ color: '#1A1208' }}
                >
                  {post.title}
                </h2>
                <p
                  className="text-sm leading-relaxed mb-3 line-clamp-2"
                  style={{ color: 'rgba(26,18,8,0.55)' }}
                >
                  {post.excerpt}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-auto">
                  {post.tags?.slice(0, 3).map((tag: any) => (
                    <span
                      key={tag.id}
                      className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                      style={{ backgroundColor: 'rgba(184,145,58,0.1)', color: '#B8913A' }}
                    >
                      #{tag.name}
                    </span>
                  ))}
                  <div className="flex items-center gap-3 ml-auto text-xs" style={{ color: 'rgba(26,18,8,0.45)' }}>
                    {post.readingTime && (
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> {post.readingTime} min
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <MessageCircle size={12} /> {post._count?.comments ?? 0}
                    </span>
                    <LikeButton
                      post={post}
                      onLike={() => likeMutation.mutate(post.slug)}
                      isLoggedIn={!!user}
                      isPending={likeMutation.isPending}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  </section>
  ```

  Also update the loading skeleton call to use `max-w-4xl` wrapper — change:
  ```tsx
  <div className="container">
    <BlogListSkeleton count={6} />
  </div>
  ```
  to:
  ```tsx
  <div className="container max-w-4xl mx-auto">
    <BlogListSkeleton count={5} />
  </div>
  ```

### 6b — Update BlogCardSkeleton to horizontal layout

- [ ] **Step 2: Replace `BlogCardSkeleton` and `BlogListSkeleton` in `BlogCardSkeleton.tsx`**

  Replace the entire file content with:

  ```tsx
  import { Skeleton } from '@/components/ui/skeleton';

  export function BlogCardSkeleton() {
    return (
      <div
        className="flex gap-0 overflow-hidden"
        style={{
          borderRadius: '16px',
          border: '1px solid rgba(0,0,0,0.07)',
          backgroundColor: '#fff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}
      >
        {/* Thumbnail placeholder */}
        <div className="shrink-0 hidden sm:block" style={{ width: '140px' }}>
          <Skeleton className="w-full h-full rounded-none" style={{ minHeight: '100px' }} />
        </div>

        {/* Content placeholder */}
        <div className="flex flex-col flex-1 px-5 py-4 gap-2">
          {/* Title */}
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-5 w-1/2" />

          {/* Excerpt */}
          <Skeleton className="h-4 w-full mt-1" />
          <Skeleton className="h-4 w-5/6" />

          {/* Tags + meta row */}
          <div className="flex items-center gap-2 mt-auto pt-1">
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-12 ml-auto" />
            <Skeleton className="h-4 w-8" />
          </div>
        </div>
      </div>
    );
  }

  export function BlogListSkeleton({ count = 5 }: { count?: number }) {
    return (
      <div className="flex flex-col gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <BlogCardSkeleton key={i} />
        ))}
      </div>
    );
  }
  ```

- [ ] **Step 3: Verify TypeScript compiles**

  ```bash
  cd apps/web && pnpm build
  ```
  Expected: exits with code 0.

- [ ] **Step 4: Commit**

  ```bash
  git add apps/web/src/pages/public/BlogList.tsx \
          apps/web/src/components/skeletons/BlogCardSkeleton.tsx
  git commit -m "feat(blog): replace grid layout with horizontal list, update skeleton"
  ```

---

## Task 7: End-to-End Verification

- [ ] **Step 1: Start the dev server**

  From `cosmo-app/`:
  ```bash
  pnpm dev
  ```
  Expected: frontend on http://localhost:5173, backend on http://localhost:3001

- [ ] **Step 2: Verify engagement sorting**

  Open http://localhost:5173/blog. Articles should appear in engagement order (most liked + commented first), not by date. If all articles have 0 likes and 0 comments, articles from the last 7 days will rank equally — add a test like to one post to confirm it rises to the top.

- [ ] **Step 3: Verify horizontal list layout**

  Confirm the blog list shows horizontal cards (thumbnail left, content right) not a 3-column grid. On mobile (resize window to <640px), confirm thumbnail moves to top or is hidden and content is below.

- [ ] **Step 4: Verify like animations on blog list**

  Click Like on a card. Expected: 4 small ❤️ float upward and fade out, heart icon pops, counter animates. Click again (unlike): no floating hearts, counter decrements.

- [ ] **Step 5: Verify like animations on blog article page**

  Open any article (http://localhost:5173/blog/[slug]). Click the Like button in the article header. Expected: same floating hearts behavior as Step 4.

- [ ] **Step 6: Verify comment animation — top-level comment**

  On an article page, add a comment. Expected: comment slides in from below with a golden left border, page scrolls to it, border fades after ~2.5s.

- [ ] **Step 7: Verify comment animation — reply**

  Click "Odpowiedz" on an existing comment and submit a reply. Expected: the reply slides in with the same animation.

- [ ] **Step 8: Verify admin blog list is unaffected**

  Log in as admin, open http://localhost:5173/admin/blog. Expected: articles still in `createdAt desc` order (most recent first), not engagement order.

- [ ] **Step 9: Verify skeleton matches layout**

  Throttle network to "Slow 3G" in browser DevTools, hard refresh `/blog`. Expected: skeleton shows horizontal rectangles (not a grid of cards) before content loads.
