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
