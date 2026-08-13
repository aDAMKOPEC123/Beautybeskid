/** Rada domyślna — używana tylko wtedy, gdy serwer nic nie powiedział
 *  (np. przerwane połączenie). */
export const UPLOAD_FALLBACK_MESSAGE =
  'Nie udało się wgrać zdjęcia. Sprawdź połączenie i spróbuj ponownie.';

/** Backend odsyła gotowy polski komunikat (np. „Plik jest za duży. Maksymalny
 *  rozmiar to 5 MB."). Pokazujemy go wprost, bo mówi, co zrobić — rada
 *  o sprawdzeniu połączenia byłaby wtedy myląca. */
export function uploadErrorMessage(error: unknown): string {
  const message = (error as { response?: { data?: { message?: unknown } } } | null | undefined)
    ?.response?.data?.message;
  return typeof message === 'string' && message.trim() ? message.trim() : UPLOAD_FALLBACK_MESSAGE;
}
