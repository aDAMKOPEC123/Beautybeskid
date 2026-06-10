// filepath: apps/server/src/utils/jwt.ts
import jwt from 'jsonwebtoken';

export const signToken = (payload: object, secret: string, expiresIn: string) => {
  return jwt.sign(payload, secret, { expiresIn: expiresIn as any });
};

export const verifyToken = (token: string, secret: string) => {
  return jwt.verify(token, secret);
};

/** Parses duration strings like '7d', '30d', '15m', '1h' to milliseconds */
export const parseDurationMs = (duration: string): number => {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Unsupported duration format: ${duration}`);
  const n = parseInt(match[1], 10);
  const units: Record<string, number> = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return n * units[match[2]];
};
