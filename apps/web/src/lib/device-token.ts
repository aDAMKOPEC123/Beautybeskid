const KEY = 'cosmo-device-token';

/**
 * Token urządzenia żyje w localStorage, a nie w ciasteczku — dzięki temu
 * przeżywa czyszczenie ciasteczek przez system (typowe na iOS po kilku dniach
 * nieużywania aplikacji) i pozwala odtworzyć sesję bez ponownego logowania.
 */
export const getDeviceToken = (): string | null => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};

export const setDeviceToken = (token: string) => {
  try {
    localStorage.setItem(KEY, token);
  } catch {
    // Prywatny tryb przeglądarki potrafi blokować zapis — sesja działa wtedy
    // wyłącznie na ciasteczku, czyli jak dotychczas.
  }
};

export const clearDeviceToken = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // jw.
  }
};
