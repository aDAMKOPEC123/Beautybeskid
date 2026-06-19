# Chat Room Delete — Design Spec
**Date:** 2026-06-15
**Status:** Approved

## Overview

Admin can delete a user's entire chat room — all messages, physical attachments from disk, and the room record itself — from the admin chat panel. This frees server storage without requiring a large-capacity server. The next time the user opens their chat, `getMyRoom` automatically creates a fresh empty room.

## Scope

- Delete one room at a time (per-user)
- Deletes: all `ChatMessage` rows, all physical files in `uploads/chat/` referenced by those messages, the `ChatRoom` row
- Does NOT delete individual messages or selectively remove only media

## Backend

### Endpoint

```
DELETE /api/chat/rooms/:id
```

**Middleware:** `authenticate` -> `requireAdmin`

### Service: `deleteRoom(roomId: string)`

Located in `chat.service.ts`.

Steps:
1. Find the `ChatRoom` by `roomId`. If not found, throw `AppError('Pokoj nie istnieje', 404)`.
2. Fetch all `ChatMessage` records for the room where `attachmentUrl IS NOT NULL`.
3. For each attachment, extract the filename using **`path.basename(attachmentUrl)`** (mandatory — prevents path traversal on malformed DB values), then call `fs.unlink` on `path.join(process.cwd(), 'uploads', 'chat', filename)`. File-not-found errors are caught and logged but do not abort the operation.
4. Execute a Prisma transaction — **order is critical**:
   - `prisma.chatMessage.deleteMany({ where: { roomId } })` — MUST run first; the schema has no `onDelete: Cascade` on `ChatMessage.room`, so PostgreSQL will reject deletion of the parent `ChatRoom` while child `ChatMessage` rows still exist.
   - `prisma.chatRoom.delete({ where: { id: roomId } })` — runs second, after all messages are gone.
5. After the transaction, emit a Socket.IO `room:deleted` event to `room:<roomId>` so any connected user whose chat is open can reset their UI. Wrap in try/catch (socket may not be initialized).

### Controller: `deleteRoom`

Standard Express handler in `chat.controller.ts`. Calls `chatService.deleteRoom(req.params.id)`, returns `204 No Content` on success (no response body).

### Router addition (`chat.router.ts`)

Add the following import alongside the existing imports, and add the route after existing routes:

```ts
// Add this import (alongside existing requireStaff import):
import { requireAdmin } from '../../middleware/admin.middleware';

// Add this route (staff-only routes are already registered above):
router.delete('/rooms/:id', requireAdmin, chatController.deleteRoom);
```

`requireAdmin` restricts this to ADMIN role only — `requireStaff` (used for other routes) includes employees and is insufficient here.

## Frontend

### API (`chat.api.ts`)

New function (returns no data — 204):
```ts
deleteRoom: (roomId: string) => axios.delete(`/api/chat/rooms/${roomId}`)
```

### Admin Chat UI (`pages/admin/Chat.tsx`)

In the sidebar room list, each room button gets a `Trash2` icon (Lucide) on the right side, visible on hover via CSS (`group` + `group-hover:opacity-100`).

**Interaction flow:**
1. Admin hovers over a room -> trash icon appears.
2. Admin clicks trash icon (`e.stopPropagation()` to prevent triggering `loadRoom`) -> `window.confirm` dialog:
   `"Usunac cala historie czatu z [user.name]? Tej operacji nie mozna cofnac."`
3. On confirm:
   - Call `chatApi.deleteRoom(room.id)`
   - Call `refetchRooms()`
   - If the deleted room was the active room: `setActiveRoom(null)` + `setMessages([])`
4. On cancel: no action.

Note: `window.confirm` is used for simplicity. It is visually inconsistent with the rest of the admin UI but acceptable given the low frequency of this action. A custom modal can be added later if desired.

### User-side socket handling

When the backend emits `room:deleted` to `room:<roomId>`, the user's chat page should listen for this event and reset to an empty state (clear messages, show "czat zostal wyczyszczony" or similar). This prevents the user from seeing a stale chat or sending messages to a deleted room. Add the listener in the user chat's `useChat` hook or `useEffect` in `pages/user/Chat.tsx`.

## Error Handling

- Room not found -> backend returns 404; frontend shows `window.alert` with error message and refetches room list
- File deletion errors -> logged server-side (`console.error`), do not surface to admin (non-critical; room is still deleted)
- Network/server error on delete -> frontend catches the error and shows `window.alert` with generic error message
- Race condition (user sends message while admin deletes room): if the Prisma transaction runs first, the message insert will fail with a foreign key error; the user's UI will show a generic send error. Acceptable edge case for this context.

## What Is Not Changed

- Employee chat (`pages/employee/Chat.tsx`) -- no changes
- `ChatRoom` creation logic in `getMyRoom` -- no changes needed; it already handles missing rooms by creating a new one
- No database migration needed (no schema changes)
