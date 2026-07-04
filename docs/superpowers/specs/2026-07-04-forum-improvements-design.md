# Forum Improvements Design

**Date:** 2026-07-04
**Status:** Approved
**Scope:** Full forum upgrade — UI/UX, new features, backend extensions

## Overview

Upgrade the existing COSMO forum from a minimal MVP to a fully-featured cosmetic forum matching the quality of real Polish cosmetic forums (Wizaz.pl style). Maintain the existing purple/white design language. Forum remains exclusive to logged-in users.

## Architecture

### Database Changes (Prisma migrations)

**ForumThread — new fields:**
- `viewCount Int @default(0)` — view counter, incremented on thread open
- `tags String[]` — array of tag strings (e.g. `["cera trądzikowa", "retinol"]`)

**ForumPost — new field:**
- `quotedPostId String?` — optional reference to a quoted post (not a FK relation, just stored ID for display)
- `quotedContent String?` — snapshot of quoted text at time of reply (denormalized for deleted-post safety)

**New model: ForumReaction**
```prisma
model ForumReaction {
  id        String   @id @default(cuid())
  userId    String
  postId    String
  type      ReactionType
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
  post      ForumPost @relation(fields: [postId], references: [id])
  @@unique([userId, postId, type])
}

enum ReactionType {
  LIKE
  HEART
  HELPFUL
}
```

**ForumCategory — new field:**
- `icon String?` — emoji or icon identifier (e.g. "💄")
- `color String?` — background color for icon badge (e.g. "#f3e8ff")

User rank is computed on the frontend from `forumPostCount` (fetched alongside author data):
- 0–9 posts: Nowicjusz
- 10–49 posts: Bywalec
- 50–199 posts: Ekspert
- 200+: Kosmetolog-Entuzjastka

### New Backend Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `PATCH` | `/forum/threads/:id/view` | Increment viewCount |
| `POST` | `/forum/posts/:id/react` | Toggle reaction (LIKE/HEART/HELPFUL) |
| `GET` | `/forum/search` | Search threads by q, tags, categoryId, page |
| `GET` | `/forum/tags` | List popular tags (top 20 by frequency) |
| `GET` | `/forum/users/:userId/posts` | Public post history (non-anonymous only) |

**Search endpoint** uses Prisma `contains` (mode: insensitive) on `title` and `content`. Tag filter uses `hasSome`. Returns paginated ForumThread list.

**Reactions** use upsert logic: if reaction exists for (userId, postId, type) — delete it (toggle off), else create it.

**View count** incremented server-side on `getThread`. Frontend does not need to call a separate endpoint — the view is tracked inside the existing `GET /forum/threads/:id` handler.

**Author data** in posts now includes `_count: { select: { posts: true } }` and `createdAt` (user join date) for rank/stats display.

### Existing Endpoints Modified

- `GET /forum/threads/:id` — includes `viewCount` increment + returns `reactions` grouped by type with counts and whether current user reacted
- `GET /forum/categories` — includes `icon`, `color`, last thread title+date, total post count
- `GET /forum/categories/:slug/threads` — thread cards include `tags`, `viewCount`, last post author+date
- `POST /forum/threads` — accepts `tags?: string[]` (max 5, each max 30 chars)
- `POST /forum/threads/:id/posts` — accepts `quotedPostId?: string`, `quotedContent?: string`

## Frontend Components

### ForumHome (`/user/forum`)

**Hero bar:**
- Title "Forum Kosmetyczne" + subtitle
- Search input (navigates to `/user/forum/szukaj?q=`)
- "+ Nowy watek" button

**Category cards:** Each shows icon badge, name, description, thread count, post count, last thread title+date.

**Forum stats footer:** Total threads, posts, users (fetched from `/forum/categories` aggregate or a dedicated stats endpoint).

### ForumCategory (`/user/forum/:categorySlug`)

Thread cards show:
- Pin/lock badges
- Tags as colored pills (clickable, filters by tag via query param `?tag=`)
- Avatar initial + author name (or "Anonim")
- Creation date
- Last reply: author name + relative time ("2 godz. temu")
- Reply count + view count (eye icon)
- Hot indicator (flame icon if >20 replies OR updated within last 24h)

### ForumThread (`/user/forum/watek/:id`)

**Post card:**
- Left column: avatar, username (clickable → profile), rank badge, post count, join date
- Right column: post content, quoted block (gray left-border block) if `quotedPostId` set
- Footer: reactions row (3 buttons with counts, toggle highlight if user reacted), Quote button, Delete button

**Quote flow:**
- Clicking "Cytuj" fills reply area with quoted author + content snapshot
- Gray preview block shown above textarea with "x" to clear
- On submit: sends `quotedPostId` + `quotedContent` to backend

**Reply form enhancements:**
- Placeholder updated to mention @admin
- Quote preview block above textarea

### ForumNewThread (`/user/forum/nowy`)

New **Tags field:**
- Text input with autocomplete from `/forum/tags` popular tags
- Press Enter or comma to add tag as pill
- Max 5 tags, max 30 chars each
- Each pill has "x" to remove

### ForumSearch (`/user/forum/szukaj`)

New page:
- Search input (controlled, synced with URL `?q=`)
- Tag filter: popular tags as toggleable pills
- Category filter: dropdown
- Results: same thread cards as ForumCategory
- Matched text highlighted in results
- Empty state with CTA to create new thread

### ForumUserProfile (`/user/forum/uzytkownik/:userId`)

New page:
- Avatar, name, rank badge, post count, join date
- Last 5 non-anonymous threads by user
- Anonymous posts are excluded
- `id: null` (anon) authors are not clickable — no profile link rendered

### Navigation

Verify Forum link exists in `MobileBottomNav` and `UserLayout` sidebar. Add if missing.

## Error Handling

- Search with empty query returns empty results (no error)
- React toggle on deleted post returns 404 gracefully
- Tag validation: strip whitespace, lowercase, deduplicate on save
- `quotedPostId` not validated as FK — if post deleted, `quotedContent` snapshot is shown with "Post usuniety" label

## Out of Scope

- Rich text editor (TipTap) — plain textarea with quote block is sufficient
- Email notifications for watched threads (push + in-app already exists)
- Forum moderation queue UI beyond existing AdminForum page (minor additions only)
- User-to-user private messages
