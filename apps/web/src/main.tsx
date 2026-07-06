// filepath: apps/web/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const PRELOAD_RECOVERY_KEY = 'cosmo:preload-recovery';

// Vite emits this event when a lazy route still points at a chunk removed by a
// deployment. Refresh once to load the current HTML/chunk manifest, without
// risking an infinite reload loop if the origin is temporarily inconsistent.
window.addEventListener('vite:preloadError', (event) => {
  const now = Date.now();
  const previousAttempt = Number(sessionStorage.getItem(PRELOAD_RECOVERY_KEY) ?? 0);

  if (now - previousAttempt < 30_000) return;

  event.preventDefault();
  sessionStorage.setItem(PRELOAD_RECOVERY_KEY, String(now));
  window.location.reload();
});

window.addEventListener('load', () => {
  window.setTimeout(() => sessionStorage.removeItem(PRELOAD_RECOVERY_KEY), 30_000);
}, { once: true });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    import('virtual:pwa-register')
      .then(({ registerSW }) => registerSW())
      .catch((error) => {
        if (import.meta.env.DEV) {
          console.warn('Service worker registration failed:', error);
        }
      });
  });
}
