import crypto from 'crypto';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export const generateCode = (length = 8): string =>
  Array.from(crypto.randomBytes(length)).map(b => CHARS[b % CHARS.length]).join('');
