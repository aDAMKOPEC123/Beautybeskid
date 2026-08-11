// Breadcrumb linking a finished booking to the confirmation panel on "Moje wizyty".
// Kept in sessionStorage (not only in router state) so the panel survives a hard
// navigation or a page reload on the way to the list.

export const APPOINTMENTS_PATH = '/user/wizyty';
export const JUST_BOOKED_KEY = 'booking-confirmation-id';
export const JUST_BOOKED_DISMISSED_KEY = 'booking-confirmation-dismissed';

export const readSession = (key: string): string | null => {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

export const writeSession = (key: string, value: string | null) => {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch {
    // sessionStorage may be unavailable in private browsing.
  }
};
