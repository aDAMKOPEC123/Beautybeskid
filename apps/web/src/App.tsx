// filepath: apps/web/src/App.tsx
import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'sonner';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { router } from './router';
import { queryClient } from './lib/queryClient';
import { useAuthStore } from './store/auth.store';
import { useEffect } from 'react';
import { api } from './lib/axios';
import { getSocket } from './lib/socket';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error) { console.error('App error:', error); }
  render() {
    if (this.state.hasError) {
      return <div style={{ padding: 32, textAlign: 'center' }}>Coś poszło nie tak. <button onClick={() => this.setState({ hasError: false })}>Odśwież</button></div>;
    }
    return this.props.children;
  }
}

function App() {
  const { hydrate, setAccessToken, logout } = useAuthStore();

  // Initial token refresh on app start
  useEffect(() => {
    api.post('/auth/refresh')
      .then((res) => {
        setAccessToken(res.data.data.accessToken);
        // user is hydrated from localStorage — no need to set here
      })
      .catch((err) => {
        // Clear stale auth state only on confirmed unauthorized sessions.
        if (err?.response?.status === 401) {
          logout();
        }
      })
      .finally(() => {
        hydrate();
      });
  }, []);

  // PWA: refresh token and reconnect socket when app becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;

      const { accessToken } = useAuthStore.getState();
      if (!accessToken) return;

      api.post('/auth/refresh')
        .then((res) => {
          setAccessToken(res.data.data.accessToken);
          // Reconnect socket with fresh token
          const sock = getSocket();
          sock.auth = { token: res.data.data.accessToken };
          sock.disconnect();
          sock.connect();
        })
        .catch((err) => {
          // Only logout on confirmed 401 — network errors/timeouts keep the session alive
          if (err && err.response && err.response.status === 401) {
            logout();
          }
        });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return (
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
        <HelmetProvider>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
            <Toaster position="top-right" richColors />
          </QueryClientProvider>
        </HelmetProvider>
      </GoogleOAuthProvider>
    </ErrorBoundary>
  );
}

export default App;
