import { describe, expect, it, vi } from 'vitest';

vi.mock('../config/prisma', () => ({ prisma: {} }));
vi.mock('../config/env', () => ({ env: { JWT_SECRET: 'testowy-sekret-jwt-do-testow-middleware' } }));

import { academyAuthenticate } from './academy-auth.middleware';
import { signToken } from '../utils/jwt';
import { env } from '../config/env';

const run = (authorization?: string) => {
  const req = { headers: authorization ? { authorization } : {} } as never;
  return new Promise<any>((resolve) => academyAuthenticate(req, {} as never, resolve as never));
};

describe('academyAuthenticate — kody odpowiedzi dla złych tokenów', () => {
  // Klient odświeża sesję tylko na 401. Gdy wygasły token dawał 500,
  // przeglądarka nie próbowała odnowić sesji i użytkowniczka widziała błędy.
  it('zwraca 401, a nie 500, dla uszkodzonego tokenu', async () => {
    const error = await run('Bearer garbage.token.here');
    expect(error?.statusCode).toBe(401);
  });

  it('zwraca 401 dla wygasłego tokenu', async () => {
    const expired = signToken({ id: 'u1', role: 'USER', scope: 'academy' }, `${env.JWT_SECRET}:academy`, '-1s');
    const error = await run(`Bearer ${expired}`);
    expect(error?.statusCode).toBe(401);
  });

  it('zwraca 401 dla tokenu podpisanego innym sekretem', async () => {
    const foreign = signToken({ id: 'u1', role: 'USER', scope: 'academy' }, 'zupelnie-inny-sekret-do-testu', '30m');
    const error = await run(`Bearer ${foreign}`);
    expect(error?.statusCode).toBe(401);
  });

  it('odrzuca token salonu użyty w Akademii', async () => {
    const salonToken = signToken({ id: 'u1', role: 'USER' }, `${env.JWT_SECRET}:academy`, '30m');
    const error = await run(`Bearer ${salonToken}`);
    expect(error?.statusCode).toBe(401);
  });

  it('przepuszcza poprawny token Akademii', async () => {
    const valid = signToken({ id: 'u1', role: 'ADMIN', scope: 'academy' }, `${env.JWT_SECRET}:academy`, '30m');
    const error = await run(`Bearer ${valid}`);
    expect(error).toBeUndefined();
  });
});
