const CHUNK_ERROR_PATTERNS = [
  'Failed to fetch dynamically imported module',
  'dynamically imported module',
  'Importing a module script failed',
  'ChunkLoadError',
  'Loading chunk',
];

export const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message ?? '');
  }
  return '';
};

export const isChunkLoadError = (error: unknown) => {
  const message = getErrorMessage(error);
  return CHUNK_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
};

export const reloadOnceForChunkError = (scope: string) => {
  if (typeof window === 'undefined') return false;

  const key = `cosmo:chunk-reload:${scope}:${window.location.pathname}`;
  if (window.sessionStorage.getItem(key)) return false;

  window.sessionStorage.setItem(key, String(Date.now()));
  window.location.reload();
  return true;
};

export const clearChunkReloadMarks = () => {
  if (typeof window === 'undefined') return;

  for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = window.sessionStorage.key(index);
    if (key?.startsWith('cosmo:chunk-reload:')) {
      window.sessionStorage.removeItem(key);
    }
  }
};

export const markDocumentNoIndex = (title = 'Strona chwilowo niedostępna | BeskidStudio') => {
  if (typeof document === 'undefined') return;

  let robotsMeta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
  if (!robotsMeta) {
    robotsMeta = document.createElement('meta');
    robotsMeta.name = 'robots';
    document.head.appendChild(robotsMeta);
  }

  robotsMeta.content = 'noindex,nofollow,noarchive';
  document.title = title;
};
