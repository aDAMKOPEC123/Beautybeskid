import { describe, expect, it } from 'vitest';
import { UPLOAD_FALLBACK_MESSAGE, uploadErrorMessage } from './uploadErrorMessage';

describe('uploadErrorMessage', () => {
  it('pokazuje komunikat serwera o zbyt dużym pliku', () => {
    const error = { response: { status: 413, data: { message: 'Plik jest za duży. Maksymalny rozmiar to 5 MB.' } } };
    expect(uploadErrorMessage(error)).toBe('Plik jest za duży. Maksymalny rozmiar to 5 MB.');
  });

  it('przycina białe znaki w komunikacie serwera', () => {
    expect(uploadErrorMessage({ response: { data: { message: '  Nieobsługiwany format pliku.  ' } } }))
      .toBe('Nieobsługiwany format pliku.');
  });

  it('wraca do rady o połączeniu, gdy serwer nic nie odesłał', () => {
    expect(uploadErrorMessage(new Error('Network Error'))).toBe(UPLOAD_FALLBACK_MESSAGE);
    expect(uploadErrorMessage(undefined)).toBe(UPLOAD_FALLBACK_MESSAGE);
    expect(uploadErrorMessage({ response: { data: {} } })).toBe(UPLOAD_FALLBACK_MESSAGE);
    expect(uploadErrorMessage({ response: { data: { message: '   ' } } })).toBe(UPLOAD_FALLBACK_MESSAGE);
    expect(uploadErrorMessage({ response: { data: { message: { pl: 'x' } } } })).toBe(UPLOAD_FALLBACK_MESSAGE);
  });
});
