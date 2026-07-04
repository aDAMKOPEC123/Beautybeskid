# Forum Improvements Design

**Date:** 2026-07-04
**Status:** Approved
**Scope:** Full forum upgrade — UI/UX, new features, backend extensions

## Overview

Upgrade the existing COSMO forum from a minimal MVP to a fully-featured cosmetic forum. Maintain the existing purple/white design language. Forum is exclusively for logged-in users — all new endpoints require `authMiddleware` unless explicitly noted.

## Architecture

### Database Changes (Prisma migrations)

**ForumThread — new fields:**
- `viewCount Int @default(0)` — view counter, incremented atomically on thread open via `prisma.forumThread.update({ data: { viewCount: { increment: 1 } } })`
- `tags String[]` — array of normalized tag strings (e.g. `["cera-trądzikowa", "retinol"]`). Default `[]`.

**ForumPost — new fields:**
- `quotedPostId String?` — ID of the quoted post (not enforced as FK; allows display even if original is soft-deleted)
- `quotedContent String?` — text snapshot of the quoted content at time of reply (max 300 chars, truncated if longer)

**ForumCategory — new fields:**
- `icon String?` — emoji string (e.g. "💄"). Nullable, existing rows default to null.
- `color String?` — hex color string for icon badge background (e.g. "#f3e8ff"). Nullable, existing rows default to null.

**New model: ForumReaction**
```prisma
model ForumReaction {
  id        String       @id @default(cuid())
  userId    String
  postId    String
  type      ReactionType
  createdAt DateTime     @default(now())
  user      User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  post      ForumPost    @relation(fields: [postId], references: [id], onDelete: Cascade)
  @@unique([userId, postId, type])
  @@index([postId])
}

enum ReactionType {
  LIKE
  HEART
  HELPFUL
}
```

**User rank** is computed on the frontend from `_count.posts` returned with each author object. No stored counter. The mapping:
- 0–9 posts: Nowicjusz
- 10–49 posts: Bywalec
- 50–199 posts: Ekspert
- 200+: Kosmetolog-Entuzjastka

### New Backend Endpoints

All endpoints below require `authMiddleware` (JWT). `adminMiddleware` noted separately.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/forum/posts/:id/react` | user | Toggle reaction on a post |
| `GET` | `/forum/search` | user | Search threads |
| `GET` | `/forum/tags` | user | List popular tags |
| `GET` | `/forum/users/:userId/threads` | user | Public thread history for a user |
| `GET` | `/forum/stats` | user | Forum-wide stats |

**Note:** View counting is handled inline inside the existing `GET /forum/threads/:id` handler — no separate endpoint. The handler increments `viewCount` on every call.

#### `POST /forum/posts/:id/react`

Request body:
```json
{ "type": "LIKE" | "HEART" | "HELPFUL" }
```
Validation: `type` must be one of the three enum values; 400 if invalid or missing.
Logic: If `ForumReaction` with `(userId, postId, type)` exists — delete it (toggle off). Else create it.
Response:
```json
{
  "reacted": true,
  "type": "LIKE",
  "counts": { "LIKE": 3, "HEART": 1, "HELPFUL": 0 }
}
```
Reactions on locked or deleted threads/posts: allowed (no server-side block).

#### `GET /forum/search`

Query params: `q` (string, required, min 2 chars), `tags` (comma-separated string, optional), `categoryId` (string, optional), `page` (number, default 1), `limit` (number, default 20).

Backend logic: Prisma `findMany` with `where`:
- `title: { contains: q, mode: 'insensitive' }` OR `content: { contains: q, mode: 'insensitive' }`
- `tags: { hasSome: [...tags] }` if tags provided
- `categoryId` filter if provided
- `isDeleted: false`

Response:
```json
{
  "data": [ /* ForumThread objects same shape as getThreadsByCategory */ ],
  "totalPages": 3,
  "total": 58
}
```
Each thread object includes: `id, title, tags, isPinned, isLocked, author, category, createdAt, updatedAt, _count.posts, viewCount, lastPost: { author: {name}, createdAt } | null`.

Text highlighting is done on the **frontend** via simple substring match — the backend returns full title/content, the frontend wraps matched substrings in `<mark>` tags using the `q` value from the URL.

#### `GET /forum/tags`

No query params. Returns top 20 tags by frequency across all non-deleted threads.

Response:
```json
[
  { "tag": "retinol", "count": 42 },
  { "tag": "cera-trądzikowa", "count": 38 }
]
```
Implementation: `prisma.$queryRaw` to unnest the `tags` array and count occurrences, ordered by count desc, limit 20.

#### `GET /forum/users/:userId/threads`

Returns the most recent 10 non-anonymous, non-deleted threads authored by `userId`. Paginated: `page` param, `limit` default 10.

Response:
```json
{
  "user": { "id": "...", "name": "...", "avatarPath": null, "createdAt": "..." },
  "postCount": 42,
  "data": [ /* ForumThread objects: id, title, category, createdAt, _count.posts */ ],
  "totalPages": 2
}
```
`postCount` = count of non-deleted, non-anonymous posts by this user.
If `userId` does not exist: 404.

#### `GET /forum/stats`

No params.

Response:
```json
{
  "threadCount": 1243,
  "postCount": 8921,
  "userCount": 347
}
```
`userCount` = distinct `authorId` count across non-deleted non-anonymous posts (approximation).

### Existing Endpoints Modified

**`GET /forum/threads/:id`** (getThread):
- Increments `viewCount` via `{ viewCount: { increment: 1 } }` inside the handler before returning
- Each post now includes:
  - `author._count.posts` (total non-deleted posts by that author)
  - `author.createdAt` (user join date)
  - `quotedPostId`, `quotedContent`
  - `reactions`: `{ LIKE: { count: N, reacted: boolean }, HEART: { count: N, reacted: boolean }, HELPFUL: { count: N, reacted: boolean } }` — computed from `ForumReaction` grouped by type, with current user's reaction status
- Thread includes `viewCount`, `tags`

**`GET /forum/categories/:slug/threads`** (getThreadsByCategory):
- Each thread card includes: `tags`, `viewCount`, `lastPost: { author: { name }, createdAt } | null`
- `lastPost` = most recent non-deleted post in that thread (single `findFirst` with `orderBy: { createdAt: 'desc' }`)
- `_count.posts` already included

**`GET /forum/categories`** (getCategories):
- Each category includes: `icon`, `color`, `_count.threads` (existing), `postCount` (sum of posts in threads of that category — via `prisma.forumPost.count({ where: { thread: { categoryId: cat.id }, isDeleted: false } })`), `lastThread: { title, createdAt } | null`

**`POST /forum/threads`** (createThread):
- Accepts `tags?: string[]` in body
- Backend normalizes tags: trim whitespace, lowercase, replace spaces with hyphens, deduplicate
- Validates: max 5 tags, each max 30 chars after normalization; 400 error if violated with message "Maksymalnie 5 tagów, każdy do 30 znaków"
- Stores normalized tags array

**`POST /forum/threads/:id/posts`** (createPost):
- Accepts `quotedPostId?: string`, `quotedContent?: string`
- `quotedContent` is truncated to 300 chars server-side if longer
- `quotedPostId` is not validated as FK — stored as-is

## Frontend Components

### ForumHome (`/user/forum`)

**Hero bar:**
- Heading "Forum Kosmetyczne" + subtitle "Zadaj pytanie, podziel się doświadczeniem"
- Search input navigating to `/user/forum/szukaj?q=` on submit
- "+ Nowy watek" button

**Category cards:** Show `icon` (emoji in colored badge using `color`), `name`, `description`, thread count, post count (`postCount`), last thread title + relative date (`lastThread`). If `icon` is null, show a default 💬 icon.

**Stats footer:** Fetched from `GET /forum/stats`. Shows total threads, posts, user count.

### ForumCategory (`/user/forum/:categorySlug`)

Thread cards show:
- Pin/lock badges
- Tags as colored pills (click → navigate to `/user/forum/szukaj?tags=TAG`)
- Author name (or "Anonim" if `isAnonymous`)
- Creation date
- Last reply: `lastPost.author.name` + relative time (or "Brak odpowiedzi")
- `_count.posts` reply count + `viewCount` (eye icon)
- Hot indicator (flame icon) if `_count.posts > 20` OR `updatedAt` is within last 24h — computed on the **frontend** from fields already present in the response

### ForumThread (`/user/forum/watek/:id`)

**Post card layout:**
- Left column: avatar initial circle, username (clickable → `/user/forum/uzytkownik/:id` if `!post.isAnonymous`), rank badge (computed from `author._count.posts`), post count, join date (`author.createdAt`)
- Right column: content, quoted block (gray left-border block with italic text and "@ AuthorName" label) if `quotedContent` set, reaction row, action buttons

**Quoted block rendering:** If `quotedContent` is set and `quotedPostId` is set, render a gray bordered block above the post content. Label shows "Anonim" if original post was anonymous, else quoted author name is not available from stored content alone — show generic "> Cytowany post:" label.

**Reaction row:** Three buttons: 👍 LIKE, ❤️ HEART, 💡 HELPFUL. Each shows count. Active state (fioletowe tło) if `reacted: true`. Clicking calls `POST /forum/posts/:id/react` and updates local state optimistically.

**Quote flow:**
- "Cytuj" button on each post sets `quoteState = { postId, content: post.content.slice(0, 300), authorName: post.author.name }`
- Gray preview block shown above reply textarea with author name and truncated content + "✕" to clear
- On submit: sends `quotedPostId` and `quotedContent` to backend

**Anonymous author linking:** Authors with `post.isAnonymous === true` render name as plain text (not a link). Authors with `post.isAnonymous === false` render name as a link to `/user/forum/uzytkownik/:id`.

### ForumNewThread (`/user/forum/nowy`)

New **Tags field:**
- Text input with autocomplete dropdown from `GET /forum/tags` (fetch on mount)
- Press Enter or comma to add tag as pill
- Max 5 tags, max 30 chars each (validated on frontend before submit with inline error message)
- Each pill has "✕" to remove
- Helper text: "Dodaj tagi, żeby inni łatwiej znaleźli Twój wątek (maks. 5)"

### ForumSearch (`/user/forum/szukaj`)

New page:
- Controlled search input synced with URL param `?q=`
- Tag filter: pills from `GET /forum/tags`, toggleable (adds to `?tags=` URL param)
- Category filter: dropdown (adds `?categoryId=` URL param)
- Results: same thread cards as ForumCategory (without hot indicator)
- Matched text in title/content highlighted via simple frontend string replace wrapping in `<mark className="bg-yellow-100">` using the `q` value
- Pagination
- Empty state: "Nic nie znaleziono dla „{q}". Może założysz nowy wątek?" with link to ForumNewThread

### ForumUserProfile (`/user/forum/uzytkownik/:userId`)

New page, fetches `GET /forum/users/:userId/threads`:
- Avatar initial circle, name, rank badge, post count, join date
- List of up to 10 most recent threads by user (non-anonymous only)
- If user not found: 404 message

### Navigation

Check `MobileBottomNav` and `UserLayout` sidebar — ensure Forum link with 💬 icon is present. Add if missing.

## Admin Moderation

Reactions are **not visible in AdminForum** — no admin UI for reactions. Admins cannot delete reactions. This is out of scope.

Reactions on posts in locked/deleted threads are blocked by the frontend (reply form hidden when `thread.isLocked`), but the API does not enforce this.

The existing AdminForum page requires no changes for this feature set.

## Error Handling

- `GET /forum/search` with `q` shorter than 2 chars: return 400 with "Wpisz co najmniej 2 znaki"
- `POST /forum/posts/:id/react` with invalid `type`: 400 "Nieprawidłowy typ reakcji"
- `POST /forum/threads` with too many or too long tags: 400 "Maksymalnie 5 tagów, każdy do 30 znaków"
- `GET /forum/users/:userId/threads` for nonexistent user: 404
- Quote content truncated silently server-side (no error)

## Out of Scope

- Rich text editor (TipTap)
- Email notifications for watched threads
- Admin moderation of reactions
- User-to-user private messages
- Full-text search index (uses simple `contains`, acceptable for this scale)
