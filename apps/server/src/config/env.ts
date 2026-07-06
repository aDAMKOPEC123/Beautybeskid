// filepath: apps/server/src/config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().url(),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  ACADEMY_URL: z.string().url().optional(),
  SERVER_URL: z.string().url().optional(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM: z.string().email(),
  VAPID_PUBLIC_KEY: z.string().min(1).optional(),
  VAPID_PRIVATE_KEY: z.string().min(1).optional(),
  VAPID_EMAIL: z.string().min(1).optional(),
  GOOGLE_CLIENT_ID: z.string().min(10),
  FACEBOOK_APP_ID: z.string().min(5).optional(),
  FACEBOOK_APP_SECRET: z.string().min(10).optional(),
  FACEBOOK_REDIRECT_URI: z.string().url().optional(),
  FACEBOOK_GRAPH_API_VERSION: z.string().regex(/^v\d+\.\d+$/).default('v23.0'),
});

const _env = envSchema.superRefine((data, ctx) => {
  const vapidKeys = [data.VAPID_PUBLIC_KEY, data.VAPID_PRIVATE_KEY, data.VAPID_EMAIL];
  const definedCount = vapidKeys.filter(Boolean).length;
  if (definedCount > 0 && definedCount < 3) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Musisz podać wszystkie trzy klucze VAPID (PUBLIC_KEY, PRIVATE_KEY, EMAIL) lub żadnego',
    });
  }

  const facebookCredentials = [data.FACEBOOK_APP_ID, data.FACEBOOK_APP_SECRET];
  if (facebookCredentials.filter(Boolean).length === 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'FACEBOOK_APP_ID i FACEBOOK_APP_SECRET muszą być ustawione razem',
    });
  }
}).safeParse(process.env);

if (!_env.success) {
  console.error('❌ Invalid environment variables:', _env.error.format());
  throw new Error('Invalid environment variables');
}

export const env = _env.data;
