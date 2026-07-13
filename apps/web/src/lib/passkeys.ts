import type { User } from '@cosmo/shared';

const PASSKEY_ACCOUNT_KEY = 'cosmo-passkey-account';

export type StoredPasskeyAccount = {
  userId: string;
  email: string;
  name: string;
};

export const getStoredPasskeyAccount = (): StoredPasskeyAccount | null => {
  try {
    const raw = localStorage.getItem(PASSKEY_ACCOUNT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredPasskeyAccount;
    return parsed?.userId ? parsed : null;
  } catch {
    return null;
  }
};

export const storePasskeyAccount = (user: Pick<User, 'id' | 'email' | 'name'>) => {
  try {
    localStorage.setItem(
      PASSKEY_ACCOUNT_KEY,
      JSON.stringify({ userId: user.id, email: user.email, name: user.name }),
    );
  } catch {
    // localStorage may be unavailable in private browsing.
  }
};

export const isPasskeySupported = async () => {
  if (!window.PublicKeyCredential || !navigator.credentials) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
};

const base64UrlToBuffer = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
};

const bufferToBase64Url = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

type CredentialDescriptor = {
  type: 'public-key';
  id: string;
  transports?: string[];
};

export type PasskeyRegistrationOptions = Omit<PublicKeyCredentialCreationOptions, 'challenge' | 'user' | 'excludeCredentials'> & {
  challenge: string;
  user: Omit<PublicKeyCredentialUserEntity, 'id'> & { id: string };
  excludeCredentials?: CredentialDescriptor[];
};

export type PasskeyAuthenticationOptions = Omit<PublicKeyCredentialRequestOptions, 'challenge' | 'allowCredentials'> & {
  challenge: string;
  allowCredentials?: CredentialDescriptor[];
};

export const createPasskeyCredential = async (options: PasskeyRegistrationOptions) => {
  const credential = await navigator.credentials.create({
    publicKey: {
      ...options,
      challenge: base64UrlToBuffer(options.challenge),
      user: {
        ...options.user,
        id: base64UrlToBuffer(options.user.id),
      },
      excludeCredentials: options.excludeCredentials?.map((item) => ({
        ...item,
        id: base64UrlToBuffer(item.id),
        transports: item.transports as AuthenticatorTransport[] | undefined,
      })),
    },
  });

  if (!(credential instanceof PublicKeyCredential)) {
    throw new Error('Nie udało się utworzyć logowania biometrycznego.');
  }

  const response = credential.response as AuthenticatorAttestationResponse;
  return {
    id: credential.id,
    rawId: bufferToBase64Url(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: bufferToBase64Url(response.clientDataJSON),
      attestationObject: bufferToBase64Url(response.attestationObject),
      transports: response.getTransports?.() ?? [],
    },
  };
};

export const getPasskeyCredential = async (options: PasskeyAuthenticationOptions) => {
  const credential = await navigator.credentials.get({
    publicKey: {
      ...options,
      challenge: base64UrlToBuffer(options.challenge),
      allowCredentials: options.allowCredentials?.map((item) => ({
        ...item,
        id: base64UrlToBuffer(item.id),
        transports: item.transports as AuthenticatorTransport[] | undefined,
      })),
    },
  });

  if (!(credential instanceof PublicKeyCredential)) {
    throw new Error('Nie udało się potwierdzić biometrii.');
  }

  const response = credential.response as AuthenticatorAssertionResponse;
  return {
    id: credential.id,
    rawId: bufferToBase64Url(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: bufferToBase64Url(response.clientDataJSON),
      authenticatorData: bufferToBase64Url(response.authenticatorData),
      signature: bufferToBase64Url(response.signature),
      userHandle: response.userHandle ? bufferToBase64Url(response.userHandle) : null,
    },
  };
};
