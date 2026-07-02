import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../config/env', () => ({
  env: {
    FACEBOOK_APP_ID: 'facebook-app-123',
    FACEBOOK_APP_SECRET: 'facebook-secret-123',
    FACEBOOK_REDIRECT_URI: 'https://example.com/api/auth/facebook/callback',
    FACEBOOK_GRAPH_API_VERSION: 'v23.0',
    PORT: 3001,
  },
}));

import {
  createFacebookAuthorizationUrl,
  fetchFacebookProfile,
  isFacebookConfigured,
} from './facebook.strategy';

describe('Facebook OAuth strategy', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('builds an authorization URL with the required scopes and state', () => {
    const url = new URL(createFacebookAuthorizationUrl('secure-state'));

    expect(isFacebookConfigured()).toBe(true);
    expect(url.origin).toBe('https://www.facebook.com');
    expect(url.searchParams.get('client_id')).toBe('facebook-app-123');
    expect(url.searchParams.get('redirect_uri')).toBe(
      'https://example.com/api/auth/facebook/callback',
    );
    expect(url.searchParams.get('scope')).toBe('public_profile,email');
    expect(url.searchParams.get('state')).toBe('secure-state');
  });

  it('exchanges the code and returns a normalized profile', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'facebook-access-token' }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'fb-user-123',
            email: ' USER@Example.com ',
            name: 'Facebook User',
            picture: { data: { url: 'https://example.com/avatar.jpg' } },
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchFacebookProfile('authorization-code')).resolves.toEqual({
      facebookId: 'fb-user-123',
      email: 'user@example.com',
      name: 'Facebook User',
      picture: 'https://example.com/avatar.jpg',
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1]?.headers).toMatchObject({
      Authorization: 'Bearer facebook-access-token',
    });
  });

  it('rejects a profile without an email address', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ access_token: 'facebook-access-token' }), { status: 200 }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ id: 'fb-user-123', name: 'Facebook User' }), {
            status: 200,
          }),
        ),
    );

    await expect(fetchFacebookProfile('authorization-code')).rejects.toMatchObject({
      code: 'facebook-email-required',
    });
  });
});
