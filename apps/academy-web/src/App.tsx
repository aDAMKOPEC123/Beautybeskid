import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { router } from './router';
import { queryClient } from './lib/queryClient';
import { useAuthStore } from './store/auth.store';
import { api } from './lib/axios';
import { Toaster } from 'sonner';
import { CookieConsent } from './components/CookieConsent';
import { hasAcademySessionHint, shouldAttemptAcademySessionRefresh } from './lib/academySession';

function App() {
  const { hydrate, setAccessToken, setUser, logout } = useAuthStore();

  useEffect(() => {
    const current = useAuthStore.getState();
    if (!shouldAttemptAcademySessionRefresh(current.accessToken, Boolean(current.user), hasAcademySessionHint())) {
      hydrate();
      return;
    }
    api.post('/academy/auth/refresh')
      .then((res) => {
        setAccessToken(res.data.data.accessToken);
        setUser(res.data.data.user);
      })
      .catch((err) => {
        if (err?.response?.status === 401) {
          logout();
        }
      })
      .finally(() => {
        hydrate();
      });
  }, [hydrate, logout, setAccessToken, setUser]);

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <CookieConsent />
        <Toaster richColors position="top-right" />
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
