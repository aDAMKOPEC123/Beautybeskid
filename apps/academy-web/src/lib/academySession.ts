const SESSION_HINT_KEY = 'academy_has_session';

export const setAcademySessionHint = (active: boolean) => {
  try {
    if (active) localStorage.setItem(SESSION_HINT_KEY, '1');
    else localStorage.removeItem(SESSION_HINT_KEY);
  } catch {
    // Storage can be unavailable in privacy mode; authentication still works in the current tab.
  }
};

export const hasAcademySessionHint = () => {
  try {
    return localStorage.getItem(SESSION_HINT_KEY) === '1';
  } catch {
    return false;
  }
};

export const shouldAttemptAcademySessionRefresh = (accessToken: string | null, hasUser: boolean, hasHint: boolean) =>
  Boolean((accessToken && hasUser) || hasHint);
