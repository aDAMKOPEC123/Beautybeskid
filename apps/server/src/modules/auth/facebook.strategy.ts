import crypto from 'crypto';
import { env } from '../../config/env';
import { AppError } from '../../middleware/error.middleware';

export type FacebookAuthErrorCode =
  | 'facebook-unavailable'
  | 'facebook-denied'
  | 'facebook-invalid-state'
  | 'facebook-email-required'
  | 'facebook-registration-required'
  | 'facebook-account-blocked'
  | 'facebook-account-conflict'
  | 'facebook-failed';

export class FacebookAuthError extends AppError {
  constructor(
    public readonly code: FacebookAuthErrorCode,
    message: string,
    statusCode = 401,
  ) {
    super(message, statusCode);
  }
}

export interface FacebookProfile {
  facebookId: string;
  email: string;
  name: string;
  picture?: string;
}

const getFacebookConfig = () => {
  if (!env.FACEBOOK_APP_ID || !env.FACEBOOK_APP_SECRET) {
    throw new FacebookAuthError(
      'facebook-unavailable',
      'Logowanie przez Facebook nie jest jeszcze skonfigurowane',
      503,
    );
  }

  const redirectUri =
    env.FACEBOOK_REDIRECT_URI ??
    `${env.SERVER_URL ?? env.CLIENT_URL}/api/auth/facebook/callback`;

  return {
    appId: env.FACEBOOK_APP_ID,
    appSecret: env.FACEBOOK_APP_SECRET,
    redirectUri,
    graphVersion: env.FACEBOOK_GRAPH_API_VERSION,
  };
};

export const isFacebookConfigured = () =>
  Boolean(env.FACEBOOK_APP_ID && env.FACEBOOK_APP_SECRET);

export const createFacebookAuthorizationUrl = (state: string) => {
  const { appId, redirectUri, graphVersion } = getFacebookConfig();
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    state,
    scope: 'public_profile,email',
    response_type: 'code',
  });

  return `https://www.facebook.com/${graphVersion}/dialog/oauth?${params.toString()}`;
};

export const fetchFacebookProfile = async (code: string): Promise<FacebookProfile> => {
  const { appId, appSecret, redirectUri, graphVersion } = getFacebookConfig();
  const tokenParams = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  });

  const tokenResponse = await fetch(
    `https://graph.facebook.com/${graphVersion}/oauth/access_token?${tokenParams.toString()}`,
    { headers: { Accept: 'application/json' } },
  );
  const tokenPayload = (await tokenResponse.json()) as {
    access_token?: string;
    error?: { message?: string };
  };

  if (!tokenResponse.ok || !tokenPayload.access_token) {
    throw new FacebookAuthError('facebook-failed', 'Nie udało się potwierdzić logowania przez Facebook');
  }

  const appSecretProof = crypto
    .createHmac('sha256', appSecret)
    .update(tokenPayload.access_token)
    .digest('hex');
  const profileParams = new URLSearchParams({
    fields: 'id,name,email,picture.type(large)',
    appsecret_proof: appSecretProof,
  });
  const profileResponse = await fetch(
    `https://graph.facebook.com/${graphVersion}/me?${profileParams.toString()}`,
    {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${tokenPayload.access_token}`,
      },
    },
  );
  const profile = (await profileResponse.json()) as {
    id?: string;
    email?: string;
    name?: string;
    picture?: { data?: { url?: string } };
    error?: { message?: string };
  };

  if (!profileResponse.ok || !profile.id) {
    throw new FacebookAuthError('facebook-failed', 'Nie udało się pobrać profilu Facebook');
  }
  if (!profile.email) {
    throw new FacebookAuthError(
      'facebook-email-required',
      'Facebook nie udostępnił adresu email potrzebnego do utworzenia konta',
      400,
    );
  }

  return {
    facebookId: profile.id,
    email: profile.email.trim().toLowerCase(),
    name: profile.name?.trim() || profile.email,
    picture: profile.picture?.data?.url,
  };
};
