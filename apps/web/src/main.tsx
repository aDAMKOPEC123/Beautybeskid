// filepath: apps/web/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

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
