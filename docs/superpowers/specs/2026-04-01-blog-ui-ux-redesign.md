# Blog UI/UX Redesign — Design Spec

**Date:** 2026-04-01
**Status:** Approved

---

## Context

The current blog (`/blog`) displays posts in a 3-column grid sorted by `createdAt desc`. The goal is to make the blog more engaging so users actually want to read and interact with articles. Three problems to solve:

1. **Sorting** — newest-first hides popular content; users should see the most engaging articles first
2. **Layout** — the 3-column card grid is hard to scan; a horizontal list with thumbnail gives more info at a glance
3. **Animations** — adding a comment and liking an article give no satisfying feedback; improving these encourages interaction

---

## Approach

**Backend score + frontend UI** — backend computes an engagement score and returns posts pre-sorted; frontend gets a new list layout and improved animations.

---

## 1. Backend — Engagement Score

**File:** `apps/server/src/modules/blog/blog.service.ts` — `getAllPosts()`

After fetching posts from Prisma (which already returns `_count.likes` and `_count.comments`), compute a score in JS and sort before returning. No schema migration needed.

**Formula:**
```ts
const NEWNESS_BONUS = 10; // bonus for posts < 7 days old
const NEWNESS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const isNew = (createdAt: Date) =>
  Date.now() - new Date(createdAt).getTime() < NEWNESS_WINDOW_MS;

const scored = posts.map(p => ({
  ...p,
  engagementScore: p._count.likes + p._count.comments + (isNew(p.createdAt) ? NEWNESS_BONUS : 0)
}));

return scored.sort((a, b) => b.engagementScore - a.engagementScore);
```

The `engagementScore` field is returned in the API response (no shared type change needed — it's additive).

**Admin view:** `getAllPosts` is also called with `includeUnpublished = true` from the admin panel. The engagement sort should only apply when `includeUnpublished = false` (i.e. the public route). When called from admin, keep the existing `createdAt desc` order so admins can find recent drafts easily. Implement by only running the scored sort when `!includeUnpublished`.

---

## 2. Frontend — Blog List Layout

**File:** `apps/web/src/pages/public/BlogList.tsx`

Replace the 3-column CSS grid with a vertical list of horizontal cards.

**Card anatomy (desktop):**
```
┌──────────────────────────────────────────────────────────┐
│ [120×90 thumbnail] │ Title (large, 2 lines max)           │
│                    │ Excerpt (2 lines, truncated)         │
│                    │ [Tag1] [Tag2]  ⏱ 5 min  ❤ 12  💬 5  │
└──────────────────────────────────────────────────────────┘
```

**Mobile:** thumbnail on top (full width), text below — same as current card style.

**Interactions:**
- Hover: row background lightens slightly + thumbnail scales to 1.03 (transition 300ms)
- Engagement badges (`❤ N  💬 N`) always visible — no hover required

**Sorting note:** posts arrive pre-sorted by `engagementScore` from backend; no client-side sort needed.

**Skeleton:** The existing `BlogListSkeleton` is designed for a 3-column card grid. Update it to match the horizontal list shape — each skeleton row should be a wide rectangle with a small thumbnail placeholder on the left and text lines on the right (matching the new card anatomy). File: `apps/web/src/components/skeletons/BlogListSkeleton.tsx` (or wherever it is defined).

---

## 3. Comment Animation — Slide-in + Fade

**Files:**
- `apps/web/src/components/blog/BlogCommentsSection.tsx` — mutation `onSuccess`, pass `newCommentId`
- `apps/web/src/components/blog/CommentTree.tsx` — accept `newCommentId?: string`, forward to `CommentItem`
- `apps/web/src/components/blog/CommentItem.tsx` — accept `isNew?: boolean` prop

**Data flow for `newCommentId`:**
The mutation response from `blogApi.addComment` already returns the created comment object (including `id`). In `onSuccess`:
1. Store the new comment's `id` in local state: `setNewCommentId(data.id)`
2. Invalidate the comments query (existing behavior)
3. Pass `newCommentId` as a prop to `CommentTree`
4. `CommentTree` passes `isNew={comment.id === newCommentId}` to each root-level `CommentItem` **and** threads `newCommentId` as a prop through the recursive render inside `CommentItem` so that reply-comments at any depth also receive `isNew=true` when they match. This requires adding `newCommentId?: string` to `CommentItem`'s props (`Props` interface at lines 23-33) and, at the recursive call site (lines 159-172 of `CommentItem.tsx`), explicitly passing `isNew={child.id === newCommentId}` to each child `CommentItem`.
5. Clear `newCommentId` after 2500ms via `setTimeout` in `BlogCommentsSection`. This is the **single** mechanism for removing the `.comment-new` class — React re-renders `CommentItem` with `isNew=false`, which removes the class. **Do not** use a separate 2000ms `setTimeout` with direct DOM manipulation.

**Behavior on successful comment submit:**
1. New comment renders with CSS class `.comment-new` → `slideInFade` keyframe (translateY 20px→0, opacity 0→1, 400ms ease-out)
2. Auto-scroll to new comment (`element.scrollIntoView({ behavior: 'smooth', block: 'nearest' })`)
3. Golden left border (`border-left: 3px solid #B8913A`) fades when `isNew` becomes false at 2500ms (React removes the class → `border-color` transitions to transparent via CSS)

**CSS:**
```css
@keyframes slideInFade {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
.comment-new {
  animation: slideInFade 0.4s cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
  border-left: 3px solid #B8913A;
  transition: border-left-color 0.5s ease;
}
/* When class is removed, border fades via the transition */
```

---

## 4. Like Animation — Floating Hearts

**Pre-condition:** `BlogList.tsx` and `BlogPost.tsx` each contain their own `LikeButton` implementation with **different prop shapes**:
- `BlogList.tsx` version: `{ post, onLike, isLoggedIn, isPending }`
- `BlogPost.tsx` version: `{ isLiked, count, onLike, isLoggedIn, isPending }`

Additionally, `BlogPost.tsx` has a pre-existing JSX syntax error that must be fixed before adding the animation. The error is a duplicated conditional opening: line 91 is an exact repeat of line 90 (`{(!isLiked || justLiked) && (`), creating a mismatched structure. **Fix:** delete line 91 (the duplicate opener) and lines 117-129 (the orphaned `<span>` block that belongs to the erroneously opened second branch, plus its stray closing `)}` at line 129). The resulting structure should have a single `{(!isLiked || justLiked) && ( ... )}` block. Fix this first, verify the file compiles, then add the animation.

Add the animation to both components independently (do not unify into a shared component — the prop shapes differ intentionally).

**Files:**
- `apps/web/src/pages/public/BlogList.tsx` — `LikeButton` component (inline)
- `apps/web/src/pages/public/BlogPost.tsx` — fix JSX error first, then add animation

**Trigger:** The floating hearts are triggered **optimistically from the click handler** (before the server responds), consistent with the existing optimistic update pattern. If the server returns an error and the optimistic update rolls back, the hearts will have already appeared — this is acceptable as a minor visual quirk.

**Behavior on like (toggle ON):**
1. Heart icon: scale 1→1.2→1 (300ms ease) + color transition to `#B8913A`
2. Counter: old number slides down + fades out, new number slides in from top (translateY -8px→0, opacity 0→1, 300ms)
3. 4 mini `❤️` spans (14px) appended to button wrapper, each:
   - Absolute positioned, randomX offset `±20px` from center
   - `floatUp` keyframe: translateY 0→-40px + scale 1→0.5 + opacity 1→0 over 700ms
   - Removed from DOM after animation ends

**Behavior on unlike (toggle OFF):**
- Heart scales 1→0.9→1 (200ms) + color fades back to muted
- Counter animates (reverse direction)
- No floating hearts

**CSS keyframes:**
```css
@keyframes floatUp {
  to { opacity: 0; transform: translateY(-40px) scale(0.5); }
}
@keyframes heartPop {
  0%   { transform: scale(1); }
  40%  { transform: scale(1.2); }
  100% { transform: scale(1); }
}
```

Implementation: use a `ref` on the button wrapper to append/remove mini-heart spans. No external animation libraries.

---

## Files to Modify

| File | Change |
|------|--------|
| `apps/server/src/modules/blog/blog.service.ts` | Add `engagementScore` sort in `getAllPosts()` (public only) |
| `apps/web/src/pages/public/BlogList.tsx` | New horizontal list layout + floating heart LikeButton |
| `apps/web/src/pages/public/BlogPost.tsx` | Fix JSX syntax error + floating heart LikeButton |
| `apps/web/src/components/blog/BlogCommentsSection.tsx` | Track `newCommentId` state, pass to CommentTree, scroll on add |
| `apps/web/src/components/blog/CommentTree.tsx` | Accept `newCommentId?: string`, forward `isNew` to CommentItem |
| `apps/web/src/components/blog/CommentItem.tsx` | Accept `isNew` prop + `comment-new` CSS class + slideInFade keyframe |
| `apps/web/src/components/skeletons/BlogListSkeleton.tsx` | Update skeleton shape to match horizontal list layout |

---

## Verification

1. Start dev server: `cd cosmo-app && pnpm dev`
2. Open `/blog` — verify posts appear in engagement order (popular + recent first, not purely by date)
3. On the `/blog` list page: click Like on a card — verify: floating hearts appear, counter animates. Click again (unlike) — verify: no floating hearts, counter decrements. Repeat on a `/blog/:slug` article page to verify both `LikeButton` implementations.
4. Open a blog article, add a comment — verify: comment slides in from below, golden border visible for ~2.5s, page scrolls to it. Also add a reply to an existing comment — verify the same animation fires for the nested reply.
5. Resize to mobile — verify list falls back to vertical card layout
