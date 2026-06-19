# Chat Room Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin can delete a user's entire chat room (messages + files + room record) from the admin panel sidebar to free disk space.

**Architecture:** New `DELETE /api/chat/rooms/:id` endpoint (admin-only) deletes DB records and physical files, then emits a `room:deleted` socket event. Frontend adds a trash icon to each room row in the admin sidebar, and the user chat page listens for `room:deleted` to reset its state.

**Tech Stack:** Express 5, Prisma, Node.js `fs/promises`, Socket.IO, React 19, TanStack Query, Lucide React, Vitest

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `apps/server/src/modules/chat/chat.service.ts` | Modify | Add `deleteRoom(roomId)` function |
| `apps/server/src/modules/chat/chat.service.test.ts` | Create | Unit tests for `deleteRoom` |
| `apps/server/src/modules/chat/chat.controller.ts` | Modify | Add `deleteRoom` controller handler |
| `apps/server/src/modules/chat/chat.router.ts` | Modify | Register `DELETE /rooms/:id` route with `requireAdmin` |
| `apps/web/src/api/chat.api.ts` | Modify | Add `deleteRoom` API function |
| `apps/web/src/pages/admin/Chat.tsx` | Modify | Add trash icon + delete flow to room list |
| `apps/web/src/hooks/useChat.ts` | Modify | Add `room:deleted` socket event listener |
| `apps/web/src/pages/user/Chat.tsx` | Modify | Pass `onRoomDeleted` callback to `useChat`, add `useQueryClient` |

---

## Task 1: Service — `deleteRoom` (TDD)

**Files:**
- Modify: `apps/server/src/modules/chat/chat.service.ts`
- Create: `apps/server/src/modules/chat/chat.service.test.ts`

- [ ] **Step 1.1: Create the test file with failing tests**

Create `apps/server/src/modules/chat/chat.service.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma BEFORE importing service (vi.mock hoisting requires this order)
vi.mock('../../config/prisma', () => ({
  prisma: {
    chatRoom: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    chatMessage: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Mock fs/promises
vi.mock('fs/promises', () => ({
  unlink: vi.fn(),
}));

import { deleteRoom } from './chat.service';
import { prisma } from '../../config/prisma';
import { unlink } from 'fs/promises';
import { AppError } from '../../middleware/error.middleware';

const mockPrisma = prisma as any;
const mockUnlink = unlink as any;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('deleteRoom', () => {
  it('throws 404 when room does not exist', async () => {
    mockPrisma.chatRoom.findUnique.mockResolvedValue(null);

    await expect(deleteRoom('nonexistent-id')).rejects.toThrow(AppError);
    await expect(deleteRoom('nonexistent-id')).rejects.toThrow('Pokój nie istnieje');
  });

  it('uses path.basename to prevent path traversal on attachment URLs', async () => {
    mockPrisma.chatRoom.findUnique.mockResolvedValue({ id: 'room1' });
    mockPrisma.chatMessage.findMany.mockResolvedValue([
      { attachmentUrl: '/uploads/chat/file1.jpg' },
      { attachmentUrl: '/uploads/chat/../../etc/passwd' }, // malicious path attempt
    ]);
    // $transaction receives a callback — call it with the mock prisma client
    mockPrisma.$transaction.mockImplementation((fn: Function) => fn(mockPrisma));
    mockPrisma.chatMessage.deleteMany.mockResolvedValue({});
    mockPrisma.chatRoom.delete.mockResolvedValue({});
    mockUnlink.mockResolvedValue(undefined);

    await deleteRoom('room1');

    expect(mockUnlink).toHaveBeenCalledTimes(2);
    const unlinkPaths = mockUnlink.mock.calls.map((c: any[]) => c[0] as string);
    // Safe filenames only — path.basename strips directory components
    expect(unlinkPaths[0]).toMatch(/uploads[/\\]chat[/\\]file1\.jpg$/);
    expect(unlinkPaths[1]).toMatch(/uploads[/\\]chat[/\\]passwd$/);
    // No path traversal sequences
    unlinkPaths.forEach((p: string) => expect(p).not.toContain('..'));
  });

  it('continues when a file is already missing on disk (ENOENT)', async () => {
    mockPrisma.chatRoom.findUnique.mockResolvedValue({ id: 'room1' });
    mockPrisma.chatMessage.findMany.mockResolvedValue([
      { attachmentUrl: '/uploads/chat/gone.jpg' },
    ]);
    mockPrisma.$transaction.mockImplementation((fn: Function) => fn(mockPrisma));
    mockPrisma.chatMessage.deleteMany.mockResolvedValue({});
    mockPrisma.chatRoom.delete.mockResolvedValue({});
    const enoent = Object.assign(new Error('no such file'), { code: 'ENOENT' });
    mockUnlink.mockRejectedValue(enoent);

    // Should resolve without throwing
    await expect(deleteRoom('room1')).resolves.toBeUndefined();
  });

  it('deletes messages before room inside the transaction (no onDelete: Cascade)', async () => {
    const callOrder: string[] = [];
    mockPrisma.chatRoom.findUnique.mockResolvedValue({ id: 'room1' });
    mockPrisma.chatMessage.findMany.mockResolvedValue([]);
    // $transaction passes mockPrisma as the `tx` argument to the callback.
    // So when implementation calls tx.chatMessage.deleteMany() and tx.chatRoom.delete(),
    // those hit mockPrisma.chatMessage.deleteMany and mockPrisma.chatRoom.delete below.
    mockPrisma.$transaction.mockImplementation(async (fn: Function) => fn(mockPrisma));
    mockPrisma.chatMessage.deleteMany.mockImplementation(() => {
      callOrder.push('deleteMessages');
      return Promise.resolve({});
    });
    mockPrisma.chatRoom.delete.mockImplementation(() => {
      callOrder.push('deleteRoom');
      return Promise.resolve({});
    });

    await deleteRoom('room1');

    // MUST be this order — ChatMessage has no onDelete: Cascade, so PostgreSQL
    // will reject deleting the ChatRoom while ChatMessage rows still reference it
    expect(callOrder).toEqual(['deleteMessages', 'deleteRoom']);
  });
});
```

- [ ] **Step 1.2: Run tests — expect FAIL**

```bash
cd cosmo-app/apps/server && pnpm vitest run src/modules/chat/chat.service.test.ts
```

Expected: FAIL — "deleteRoom is not a function" or similar import error.

- [ ] **Step 1.3: Implement `deleteRoom` in chat.service.ts**

Add these two imports at the top of `apps/server/src/modules/chat/chat.service.ts` (after existing imports):

```ts
import path from 'path';
import { unlink } from 'fs/promises';
```

Add this function at the bottom of `apps/server/src/modules/chat/chat.service.ts`:

```ts
export const deleteRoom = async (roomId: string): Promise<void> => {
  const room = await prisma.chatRoom.findUnique({ where: { id: roomId } });
  if (!room) throw new AppError('Pokój nie istnieje', 404);

  // Find messages that have physical file attachments
  const messagesWithFiles = await prisma.chatMessage.findMany({
    where: { roomId, attachmentUrl: { not: null } },
    select: { attachmentUrl: true },
  });

  // Delete files from disk.
  // path.basename() is REQUIRED here — it strips directory components from the
  // stored URL (e.g. '/uploads/chat/file.jpg' -> 'file.jpg'), preventing path
  // traversal if a DB value is ever malformed.
  // CHAT_UPLOADS_DIR equivalent: process.cwd()/uploads/chat (matches chatUpload.ts)
  for (const msg of messagesWithFiles) {
    if (!msg.attachmentUrl) continue;
    const filename = path.basename(msg.attachmentUrl);
    const filePath = path.join(process.cwd(), 'uploads', 'chat', filename);
    try {
      await unlink(filePath);
    } catch (err: any) {
      if (err.code !== 'ENOENT') {
        console.error(`Failed to delete chat attachment: ${filePath}`, err);
      }
      // ENOENT = file already gone — not an error, continue
    }
  }

  // Delete records in a transaction.
  // IMPORTANT: messages MUST be deleted before the room.
  // ChatMessage has no onDelete: Cascade — PostgreSQL will reject deleting
  // ChatRoom while ChatMessage rows still hold a foreign key reference to it.
  // Inside $transaction, use the transaction client `tx`, NOT the outer `prisma`.
  await prisma.$transaction(async (tx) => {
    await tx.chatMessage.deleteMany({ where: { roomId } });
    await tx.chatRoom.delete({ where: { id: roomId } });
  });
};
```

- [ ] **Step 1.4: Run tests — expect PASS**

```bash
cd cosmo-app/apps/server && pnpm vitest run src/modules/chat/chat.service.test.ts
```

Expected: All 4 tests pass.

- [ ] **Step 1.5: Commit**

```bash
cd cosmo-app && git add apps/server/src/modules/chat/chat.service.ts apps/server/src/modules/chat/chat.service.test.ts
git commit -m "feat(chat): add deleteRoom service with file cleanup"
```

---

## Task 2: Controller and Router

**Files:**
- Modify: `apps/server/src/modules/chat/chat.controller.ts`
- Modify: `apps/server/src/modules/chat/chat.router.ts`

- [ ] **Step 2.1: Add `deleteRoom` controller to chat.controller.ts**

At the end of `apps/server/src/modules/chat/chat.controller.ts`, add:

```ts
export const deleteRoom = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const roomId = req.params.id;
    await chatService.deleteRoom(roomId);

    // Emit room:deleted to the Socket.IO room `room:<roomId>`.
    // Users join this room via `socket.emit('chat:join_room', roomId)` in useChat.ts.
    // This notifies any user who currently has their chat page open.
    try {
      const io = getIO();
      io.to(`room:${roomId}`).emit('room:deleted', { roomId });
    } catch {
      // Socket not initialized — safe to ignore
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
```

- [ ] **Step 2.2: Register the route in chat.router.ts**

In `apps/server/src/modules/chat/chat.router.ts`, add `requireAdmin` from the admin middleware.
The file already imports `requireStaff` from `staff.middleware` — add a NEW import line for `requireAdmin` from `admin.middleware` (different file, different role restriction):

```ts
import { requireAdmin } from '../../middleware/admin.middleware';
```

Then add this route at the end of the file, before `export default router`:

```ts
// Admin-only: delete a chat room and all its messages + files
router.delete('/rooms/:id', requireAdmin, chatController.deleteRoom);
```

Note: `requireAdmin` allows only ADMIN role. `requireStaff` (used on other routes) allows ADMIN and EMPLOYEE — insufficient for a destructive operation.

- [ ] **Step 2.3: Verify TypeScript compiles**

```bash
cd cosmo-app/apps/server && pnpm build 2>&1 | grep -E "error|Error" | head -20
```

Expected: No TypeScript errors.

- [ ] **Step 2.4: Commit**

```bash
cd cosmo-app && git add apps/server/src/modules/chat/chat.controller.ts apps/server/src/modules/chat/chat.router.ts
git commit -m "feat(chat): add DELETE /chat/rooms/:id endpoint (admin only)"
```

---

## Task 3: Frontend API function

**Files:**
- Modify: `apps/web/src/api/chat.api.ts`

- [ ] **Step 3.1: Add `deleteRoom` to chatApi**

In `apps/web/src/api/chat.api.ts`, add this function inside the `chatApi` object after `markRoomAsRead`:

```ts
deleteRoom: async (roomId: string): Promise<void> => {
  await api.delete(`/chat/rooms/${roomId}`);
  // No return value — server responds with 204 No Content
},
```

- [ ] **Step 3.2: Verify TypeScript compiles**

```bash
cd cosmo-app/apps/web && pnpm build 2>&1 | grep -E "error TS" | head -10
```

Expected: No TypeScript errors.

- [ ] **Step 3.3: Commit**

```bash
cd cosmo-app && git add apps/web/src/api/chat.api.ts
git commit -m "feat(chat): add deleteRoom API function"
```

---

## Task 4: Admin Chat UI — delete button

**Files:**
- Modify: `apps/web/src/pages/admin/Chat.tsx`

- [ ] **Step 4.1: Add Trash2 to lucide import**

At the top of `apps/web/src/pages/admin/Chat.tsx`, find the existing lucide-react import:

```ts
import { Search, CalendarClock } from 'lucide-react';
```

Change it to:

```ts
import { Search, CalendarClock, Trash2 } from 'lucide-react';
```

- [ ] **Step 4.2: Add `handleDeleteRoom` function**

Inside the `AdminChat` component body, before the `return` statement, add:

```ts
const handleDeleteRoom = async (e: React.MouseEvent, room: any) => {
  e.stopPropagation(); // Prevents triggering loadRoom on the parent button
  const confirmed = window.confirm(
    `Usunąć całą historię czatu z ${room.user.name}? Tej operacji nie można cofnąć.`
  );
  if (!confirmed) return;

  try {
    await chatApi.deleteRoom(room.id);
    // If the deleted room is currently open, reset the main view
    if (activeRoom?.id === room.id) {
      setActiveRoom(null);
      setMessages([]);
    }
    // Refresh the room list to remove the deleted room from the sidebar
    refetchRooms();
  } catch {
    window.alert('Nie udało się usunąć czatu. Spróbuj ponownie.');
  }
};
```

- [ ] **Step 4.3: Update room list to include trash icon**

In the JSX room list, find the `{rooms?.map((room: any) => (` block. Replace the existing plain `<button>` element with a wrapper `<div>` that contains the room button and a separate trash button:

Replace:
```tsx
<button
  key={room.id}
  onClick={() => loadRoom(room)}
  className={`w-full text-left p-4 rounded-2xl transition-all duration-300 ${
    activeRoom?.id === room.id
      ? 'bg-primary text-primary-foreground shadow-lg scale-[0.98]'
      : room.adminUnread > 0
      ? 'bg-primary/5 border-l-2 border-primary font-medium hover:bg-primary/10'
      : 'hover:bg-background border border-transparent hover:border-border hover:shadow-sm'
  }`}
>
  <div className="flex justify-between items-start mb-1">
    <span className="font-bold">{room.user.name}</span>
    {room.adminUnread > 0 && (
      <span className="bg-destructive text-white text-[10px] shadow-sm font-black px-2 py-0.5 rounded-full animate-pulse">
        {room.adminUnread} Nowych
      </span>
    )}
  </div>
  <span
    className={`text-xs mt-1 block font-medium ${
      activeRoom?.id === room.id ? 'text-primary-foreground/80' : 'text-muted-foreground'
    }`}
  >
    {new Date(room.lastMessageAt).toLocaleString('pl-PL')}
  </span>
</button>
```

With:
```tsx
<div key={room.id} className="relative group">
  <button
    onClick={() => loadRoom(room)}
    className={`w-full text-left p-4 rounded-2xl transition-all duration-300 pr-10 ${
      activeRoom?.id === room.id
        ? 'bg-primary text-primary-foreground shadow-lg scale-[0.98]'
        : room.adminUnread > 0
        ? 'bg-primary/5 border-l-2 border-primary font-medium hover:bg-primary/10'
        : 'hover:bg-background border border-transparent hover:border-border hover:shadow-sm'
    }`}
  >
    <div className="flex justify-between items-start mb-1">
      <span className="font-bold">{room.user.name}</span>
      {room.adminUnread > 0 && (
        <span className="bg-destructive text-white text-[10px] shadow-sm font-black px-2 py-0.5 rounded-full animate-pulse">
          {room.adminUnread} Nowych
        </span>
      )}
    </div>
    <span
      className={`text-xs mt-1 block font-medium ${
        activeRoom?.id === room.id ? 'text-primary-foreground/80' : 'text-muted-foreground'
      }`}
    >
      {new Date(room.lastMessageAt).toLocaleString('pl-PL')}
    </span>
  </button>
  <button
    onClick={(e) => handleDeleteRoom(e, room)}
    title="Usuń historię czatu"
    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
  >
    <Trash2 size={14} />
  </button>
</div>
```

Note: `key={room.id}` moves from the `<button>` to the outer `<div>`. Also add `pr-10` to the room button's className so the text doesn't overlap with the trash icon.

- [ ] **Step 4.4: Verify TypeScript compiles**

```bash
cd cosmo-app/apps/web && pnpm build 2>&1 | grep -E "error TS" | head -10
```

Expected: No errors.

- [ ] **Step 4.5: Commit**

```bash
cd cosmo-app && git add apps/web/src/pages/admin/Chat.tsx
git commit -m "feat(chat): add delete room button in admin chat sidebar"
```

---

## Task 5: User chat — handle room:deleted socket event

**Files:**
- Modify: `apps/web/src/hooks/useChat.ts`
- Modify: `apps/web/src/pages/user/Chat.tsx`

- [ ] **Step 5.0: Verify the query key in user/Chat.tsx before coding**

Run this to confirm the exact query key used for the room query (the invalidation in the callback MUST match it):

```bash
grep -n "queryKey" cosmo-app/apps/web/src/pages/user/Chat.tsx
```

Expected output should contain: `queryKey: ['chat', 'my-room']`
If it differs, use the actual key in Step 5.2 below.

- [ ] **Step 5.1: Add optional `onRoomDeleted` callback to `useChat`**

In `apps/web/src/hooks/useChat.ts`, change the hook signature from:

```ts
export const useChat = (roomId?: string) => {
```

To:

```ts
export const useChat = (roomId?: string, onRoomDeleted?: () => void) => {
```

Inside the existing `useEffect` (after the last `socket.on(...)` call and before the `return () => {` cleanup), add:

```ts
const onRoomDeletedEvent = ({ roomId: deletedRoomId }: { roomId: string }) => {
  if (deletedRoomId === roomId && onRoomDeleted) {
    onRoomDeleted();
  }
};
socket.on('room:deleted', onRoomDeletedEvent);
```

In the cleanup `return () => {` block, add:

```ts
socket.off('room:deleted', onRoomDeletedEvent);
```

Add `onRoomDeleted` to the `useEffect` dependency array:

```ts
}, [isConnected, socket, roomId, addMessage, incrementUnread, setTyping, setStaffUnreadTotal, updateMessagesReadAt, onRoomDeleted]);
```

- [ ] **Step 5.2: Wire `onRoomDeleted` in user Chat.tsx**

In `apps/web/src/pages/user/Chat.tsx`:

1. Add `useQueryClient` to the existing `@tanstack/react-query` import:

```ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
```

2. Inside the component body, after the existing hooks, add:

```ts
const queryClient = useQueryClient();
```

3. Change the `useChat` call from:

```ts
const { sendMessage, markAsRead, notifyTyping } = useChat(room?.id);
```

To:

```ts
const { sendMessage, markAsRead, notifyTyping } = useChat(room?.id, () => {
  // Admin deleted this room — reset UI and refetch (getMyRoom creates a new room automatically)
  setMessages([]);
  setUnreadCount(0);
  // Query key must match line 18: queryKey: ['chat', 'my-room']
  queryClient.invalidateQueries({ queryKey: ['chat', 'my-room'] });
});
```

- [ ] **Step 5.3: Verify TypeScript compiles for both apps**

```bash
cd cosmo-app/apps/web && pnpm build 2>&1 | grep -E "error TS" | head -20
cd cosmo-app/apps/server && pnpm build 2>&1 | grep -E "error TS" | head -10
```

Expected: No TypeScript errors in either app.

- [ ] **Step 5.4: Run all server tests**

```bash
cd cosmo-app/apps/server && pnpm vitest run
```

Expected: All tests pass, including the new `chat.service.test.ts`.

- [ ] **Step 5.5: Commit**

```bash
cd cosmo-app && git add apps/web/src/hooks/useChat.ts apps/web/src/pages/user/Chat.tsx
git commit -m "feat(chat): handle room:deleted socket event in user chat"
```

---

## Manual Smoke Test (after all tasks)

Start the dev server:
```bash
cd cosmo-app && pnpm dev
```

1. Log in as a regular user, open `/user/chat`, send a message with an image attachment.
2. In a separate tab, log in as admin and open `/admin/chat`.
3. Hover over the user's room in the sidebar — confirm the `Trash2` icon appears on hover.
4. Click the trash icon — confirm the `window.confirm` dialog shows the user's name.
5. Confirm the deletion — the room should disappear from the admin sidebar list.
6. Check the user's chat tab — it should reset to empty (or auto-create a fresh empty room).
7. Verify the image file no longer exists in `cosmo-app/apps/server/uploads/chat/`.
8. Send a new message as the user — a new room appears in the admin sidebar.
