// filepath: apps/server/src/modules/auth/google.strategy.ts
import { OAuth2Client } from 'google-auth-library';
import { AppError } from '../../middleware/error.middleware';
import { env } from '../../config/env';

const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);

export interface GooglePayload {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
}

export const verifyGoogleToken = async (credential: string): Promise<GooglePayload> => {
  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.email || !payload.sub) {
    throw new AppError('Nieprawidłowy token Google', 401);
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name ?? payload.email,
    picture: payload.picture,
  };
};
