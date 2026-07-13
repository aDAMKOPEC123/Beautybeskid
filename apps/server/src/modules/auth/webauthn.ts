import crypto from 'crypto';
import { env } from '../../config/env';
import { AppError } from '../../middleware/error.middleware';

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export const WEBAUTHN_REGISTER_PURPOSE = 'passkey-register';
export const WEBAUTHN_LOGIN_PURPOSE = 'passkey-login';
export const webAuthnChallengeTtlMs = CHALLENGE_TTL_MS;

export const base64UrlEncode = (buffer: Buffer) =>
  buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

export const base64UrlDecode = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return Buffer.from(padded, 'base64');
};

export const createChallenge = () => base64UrlEncode(crypto.randomBytes(32));

const expectedOrigin = () => new URL(env.CLIENT_URL).origin;

const rpId = () => new URL(env.CLIENT_URL).hostname;

const parseClientData = (clientDataJSON: string, expectedType: 'webauthn.create' | 'webauthn.get', challenge: string) => {
  const clientData = JSON.parse(base64UrlDecode(clientDataJSON).toString('utf8')) as {
    type?: string;
    challenge?: string;
    origin?: string;
  };

  if (clientData.type !== expectedType) {
    throw new AppError('Nieprawidłowy typ logowania biometrycznego', 400);
  }
  if (clientData.challenge !== challenge) {
    throw new AppError('Sesja logowania biometrycznego wygasła. Spróbuj ponownie.', 400);
  }
  if (clientData.origin !== expectedOrigin()) {
    throw new AppError('Nieprawidłowe pochodzenie logowania biometrycznego', 400);
  }
};

type CborValue = number | string | Buffer | CborValue[] | Map<CborValue, CborValue>;

class CborReader {
  private offset = 0;

  constructor(private readonly data: Buffer) {}

  read(): CborValue {
    const initial = this.readByte();
    const major = initial >> 5;
    const additional = initial & 0x1f;
    const length = this.readLength(additional);

    if (major === 0) return length;
    if (major === 1) return -1 - length;
    if (major === 2) return this.readBytes(length);
    if (major === 3) return this.readBytes(length).toString('utf8');
    if (major === 4) {
      const arr: CborValue[] = [];
      for (let index = 0; index < length; index += 1) arr.push(this.read());
      return arr;
    }
    if (major === 5) {
      const map = new Map<CborValue, CborValue>();
      for (let index = 0; index < length; index += 1) {
        map.set(this.read(), this.read());
      }
      return map;
    }

    throw new AppError('Nieobsługiwany format klucza biometrycznego', 400);
  }

  remaining() {
    return this.data.subarray(this.offset);
  }

  private readByte() {
    if (this.offset >= this.data.length) throw new AppError('Uszkodzona odpowiedź biometryczna', 400);
    const value = this.data[this.offset];
    this.offset += 1;
    return value;
  }

  private readBytes(length: number) {
    if (this.offset + length > this.data.length) throw new AppError('Uszkodzona odpowiedź biometryczna', 400);
    const value = this.data.subarray(this.offset, this.offset + length);
    this.offset += length;
    return value;
  }

  private readLength(additional: number) {
    if (additional < 24) return additional;
    if (additional === 24) return this.readByte();
    if (additional === 25) {
      const value = this.data.readUInt16BE(this.offset);
      this.offset += 2;
      return value;
    }
    if (additional === 26) {
      const value = this.data.readUInt32BE(this.offset);
      this.offset += 4;
      return value;
    }
    throw new AppError('Nieobsługiwana długość danych biometrycznych', 400);
  }
}

const getMapBuffer = (map: Map<CborValue, CborValue>, key: number) => {
  const value = map.get(key);
  if (!Buffer.isBuffer(value)) throw new AppError('Nieprawidłowy klucz biometryczny', 400);
  return value;
};

export const parseRegistrationCredential = (attestationObject: string, clientDataJSON: string, challenge: string) => {
  parseClientData(clientDataJSON, 'webauthn.create', challenge);

  const decoded = new CborReader(base64UrlDecode(attestationObject)).read();
  if (!(decoded instanceof Map)) throw new AppError('Nieprawidłowa odpowiedź biometryczna', 400);
  const authData = decoded.get('authData');
  if (!Buffer.isBuffer(authData)) throw new AppError('Brak danych autoryzatora', 400);

  const rpIdHash = authData.subarray(0, 32);
  const expectedRpIdHash = crypto.createHash('sha256').update(rpId()).digest();
  if (!crypto.timingSafeEqual(rpIdHash, expectedRpIdHash)) {
    throw new AppError('Ten klucz nie należy do tej aplikacji', 400);
  }

  const flags = authData[32];
  if ((flags & 0x01) === 0 || (flags & 0x04) === 0 || (flags & 0x40) === 0) {
    throw new AppError('Nie udało się potwierdzić biometrii', 400);
  }

  const counter = authData.readUInt32BE(33);
  let offset = 37 + 16;
  const credentialIdLength = authData.readUInt16BE(offset);
  offset += 2;
  const credentialId = authData.subarray(offset, offset + credentialIdLength);
  offset += credentialIdLength;
  const publicKey = authData.subarray(offset);

  return {
    credentialId: base64UrlEncode(credentialId),
    publicKey: base64UrlEncode(publicKey),
    counter,
  };
};

const cosePublicKeyToKeyObject = (publicKey: string) => {
  const parsed = new CborReader(base64UrlDecode(publicKey)).read();
  if (!(parsed instanceof Map)) throw new AppError('Nieprawidłowy zapisany klucz biometryczny', 400);

  const kty = parsed.get(1);
  const alg = parsed.get(3);
  const crv = parsed.get(-1);
  if (kty !== 2 || alg !== -7 || crv !== 1) {
    throw new AppError('Nieobsługiwany typ klucza biometrycznego', 400);
  }

  const x = getMapBuffer(parsed, -2);
  const y = getMapBuffer(parsed, -3);

  return crypto.createPublicKey({
    key: {
      kty: 'EC',
      crv: 'P-256',
      x: base64UrlEncode(x),
      y: base64UrlEncode(y),
    },
    format: 'jwk',
  });
};

export const verifyLoginCredential = ({
  authenticatorData,
  clientDataJSON,
  signature,
  challenge,
  publicKey,
  previousCounter,
}: {
  authenticatorData: string;
  clientDataJSON: string;
  signature: string;
  challenge: string;
  publicKey: string;
  previousCounter: number;
}) => {
  parseClientData(clientDataJSON, 'webauthn.get', challenge);

  const authData = base64UrlDecode(authenticatorData);
  const rpIdHash = authData.subarray(0, 32);
  const expectedRpIdHash = crypto.createHash('sha256').update(rpId()).digest();
  if (!crypto.timingSafeEqual(rpIdHash, expectedRpIdHash)) {
    throw new AppError('Ten klucz nie należy do tej aplikacji', 400);
  }

  const flags = authData[32];
  if ((flags & 0x01) === 0 || (flags & 0x04) === 0) {
    throw new AppError('Nie udało się potwierdzić biometrii', 400);
  }

  const counter = authData.readUInt32BE(33);
  if (previousCounter > 0 && counter > 0 && counter <= previousCounter) {
    throw new AppError('Ten klucz biometryczny został odrzucony', 400);
  }

  const signedData = Buffer.concat([
    authData,
    crypto.createHash('sha256').update(base64UrlDecode(clientDataJSON)).digest(),
  ]);
  const isValid = crypto.verify('sha256', signedData, cosePublicKeyToKeyObject(publicKey), base64UrlDecode(signature));
  if (!isValid) throw new AppError('Nie udało się zalogować biometrycznie', 401);

  return counter;
};
