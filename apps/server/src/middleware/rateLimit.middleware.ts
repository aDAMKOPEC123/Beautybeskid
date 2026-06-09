import rateLimit from 'express-rate-limit';

const createLimiter = (max: number, windowMs: number, message: string) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 'error', message },
  });

export const authRateLimiter = createLimiter(
  10,
  60 * 1000,
  'Zbyt wiele prób, spróbuj ponownie za minutę'
);

export const apiRateLimiter = createLimiter(
  200,
  60 * 1000,
  'Zbyt wiele żądań, spróbuj ponownie później'
);
