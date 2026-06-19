import { describe, it, expect, vi } from 'vitest';

// vi.hoisted ensures mockVerifyIdToken is available when vi.mock factory runs (vi.mock is hoisted above const declarations)
const { mockVerifyIdToken } = vi.hoisted(() => ({
  mockVerifyIdToken: vi.fn(),
}));

vi.mock('google-auth-library', () => ({
  OAuth2Client: vi.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

vi.mock('../../config/env', () => ({
  env: { GOOGLE_CLIENT_ID: 'test-client-id' },
}));

import { verifyGoogleToken } from './google.strategy';

describe('verifyGoogleToken', () => {
  it('returns parsed payload on valid token', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      getPayload: () => ({
        sub: 'google-user-123',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://lh3.googleusercontent.com/photo.jpg',
      }),
    });

    const result = await verifyGoogleToken('valid-credential');

    expect(result).toEqual({
      googleId: 'google-user-123',
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://lh3.googleusercontent.com/photo.jpg',
    });
  });

  it('throws when payload is missing', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ getPayload: () => null });
    await expect(verifyGoogleToken('bad-credential')).rejects.toThrow('Nieprawidłowy token Google');
  });

  it('throws when email is missing from payload', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      getPayload: () => ({ sub: '123', name: 'Test' }),
    });
    await expect(verifyGoogleToken('no-email-credential')).rejects.toThrow('Nieprawidłowy token Google');
  });
});
