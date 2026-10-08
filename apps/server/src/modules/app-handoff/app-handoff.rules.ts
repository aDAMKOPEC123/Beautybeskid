import { createHash } from 'crypto';

// Czyste reguły przekazania linku z przeglądarki do PWA — bez Prismy, bez sieci.

const MAX_PATH_LENGTH = 500;
const BLOCKED_PREFIXES = ['/api', '/uploads', '/socket.io', '/auth'];
const PLACEHOLDER_ORIGIN = 'https://handoff.invalid';

/**
 * Zwraca bezpieczną ścieżkę wewnątrz aplikacji albo null.
 * Link trafia potem do nawigacji w PWA innej osoby z tej samej sieci w najgorszym
 * razie, więc nie może nigdy wyprowadzić poza stronę.
 */
export function normalizeHandoffPath(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > MAX_PATH_LENGTH) return null;
  if (!raw.startsWith('/') || raw.startsWith('//')) return null;
  if (/[\u0000-\u001f\u007f\\\s]/.test(raw)) return null;

  let url: URL;
  try {
    url = new URL(raw, PLACEHOLDER_ORIGIN);
  } catch {
    return null;
  }
  if (url.origin !== PLACEHOLDER_ORIGIN) return null;

  const blocked = BLOCKED_PREFIXES.some(
    (prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`),
  );
  if (blocked) return null;

  return `${url.pathname}${url.search}${url.hash}`;
}

const expandIpv6 = (address: string): string[] | null => {
  const [head, tail, ...rest] = address.split('::');
  if (rest.length > 0) return null;
  const headParts = head ? head.split(':') : [];
  const tailParts = tail ? tail.split(':') : [];
  if (tail === undefined) return headParts.length === 8 ? headParts : null;
  const missing = 8 - headParts.length - tailParts.length;
  if (missing < 1) return null;
  return [...headParts, ...Array(missing).fill('0'), ...tailParts];
};

/**
 * Klucz sieci, w której jest urządzenie. Dla IPv6 bierzemy prefiks /64 — telefon
 * zmienia końcówkę adresu między połączeniami, a sieć zostaje ta sama.
 */
export function networkKey(ip: string | undefined | null): string | null {
  if (!ip) return null;
  const address = ip.trim().toLowerCase().replace(/^::ffff:(?=\d+\.\d+\.\d+\.\d+$)/, '');
  if (!address) return null;
  if (!address.includes(':')) return address;

  const parts = expandIpv6(address.split('%')[0]);
  if (!parts) return address;
  return parts
    .slice(0, 4)
    .map((part) => part.replace(/^0+(?=.)/, ''))
    .join(':');
}

/** Skrót sieć + cechy urządzenia. W bazie nie trzymamy surowego adresu IP. */
export function buildMatchKey(
  secret: string,
  ip: string | undefined | null,
  device: string,
): string | null {
  const network = networkKey(ip);
  if (!network) return null;
  return createHash('sha256').update(`${secret}|${network}|${device}`).digest('hex');
}
