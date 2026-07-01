// filepath: apps/web/src/App.tsx
import React, { lazy, Suspense, useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'sonner';
import { router } from './router';
import { queryClient } from './lib/queryClient';
import { useAuthStore } from './store/auth.store';
import { useClientPanelTransitionStore } from './store/clientPanelTransition.store';
import { api } from './lib/axios';
import { trackPageView } from './lib/analytics';
import { TourProvider } from './contexts/TourContext';
import {
  clearChunkReloadMarks,
  getErrorMessage,
  isChunkLoadError,
  reloadOnceForChunkError,
} from './lib/chunkRecovery';

const ClientPanelTransitionOverlay = lazy(() =>
  import('./components/shared/ClientPanelTransitionOverlay').then((module) => ({
    default: module.ClientPanelTransitionOverlay,
  }))
);

const DeferredClientPanelTransitionOverlay = () => {
  const active = useClientPanelTransitionStore((state) => state.active);

  if (!active) return null;

  return (
    <Suspense fallback={null}>
      <ClientPanelTransitionOverlay />
    </Suspense>
  );
};

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; isChunkError: boolean; errorMessage: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, isChunkError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      isChunkError: isChunkLoadError(error),
      errorMessage: getErrorMessage(error),
    };
  }

  componentDidCatch(error: Error) {
    console.error('App error:', error);
    if (isChunkLoadError(error)) {
      reloadOnceForChunkError('app');
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6 text-center">
          <div className="max-w-md rounded-3xl border bg-card p-8 shadow-xl">
            <h1 className="text-2xl font-heading font-semibold">
              {this.state.isChunkError ? 'Aktualizujemy aplikację' : 'Coś poszło nie tak'}
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {this.state.isChunkError
                ? 'Przeglądarka ma jeszcze starszą wersję plików. Odśwież stronę, żeby pobrać aktualną aplikację.'
                : 'Aplikacja napotkała błąd. Odświeżenie strony zwykle rozwiązuje ten problem.'}
            </p>
            {import.meta.env.DEV && this.state.errorMessage && (
              <pre className="mt-5 max-h-40 overflow-auto rounded-xl bg-muted p-3 text-left text-xs text-muted-foreground">
                {this.state.errorMessage}
              </pre>
            )}
            <button
              type="button"
              onClick={() => {
                clearChunkReloadMarks();
                window.location.reload();
              }}
              className="mt-6 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
            >
              Odśwież aplikację
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  const { hydrate, setAccessToken, setUser, logout } = useAuthStore();

  // Rebuild auth from the refresh cookie only when a session/protected route needs it.
  useEffect(() => {
    const { accessToken, user } = useAuthStore.getState();
    const protectedPath = ['/admin', '/employee', '/user', '/rezerwacja', '/akademia'].some((prefix) =>
      window.location.pathname.startsWith(prefix),
    );

    if (!accessToken && !user && !protectedPath) {
      hydrate();
      return;
    }

    api.post('/auth/refresh')
      .then((res) => {
        setAccessToken(res.data.data.accessToken);
        setUser(res.data.data.user);
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
  }, [hydrate, logout, setAccessToken, setUser]);

  // PWA: refresh token and reconnect socket when app becomes visible again.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;

      const { accessToken } = useAuthStore.getState();
      if (!accessToken) return;

      api.post('/auth/refresh')
        .then((res) => {
          setAccessToken(res.data.data.accessToken);
          setUser(res.data.data.user);
          return import('./lib/socket').then(({ getSocket }) => {
            const sock = getSocket();
            sock.auth = { token: res.data.data.accessToken };
            sock.disconnect();
            sock.connect();
          });
        })
        .catch((err) => {
          // Only logout on confirmed 401; network errors keep the session alive.
          if (err?.response?.status === 401) {
            logout();
          }
        });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [logout, setAccessToken, setUser]);

  useEffect(() => {
    const recoverFromChunkError = (error: unknown) => {
      if (isChunkLoadError(error)) {
        reloadOnceForChunkError('window');
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      recoverFromChunkError(event.reason);
    };

    const handleWindowError = (event: ErrorEvent) => {
      recoverFromChunkError(event.error ?? event.message);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleWindowError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleWindowError);
    };
  }, []);

  useEffect(() => {
    let currentPath = `${router.state.location.pathname}${router.state.location.search}${router.state.location.hash}`;

    return router.subscribe((state) => {
      const nextPath = `${state.location.pathname}${state.location.search}${state.location.hash}`;
      if (nextPath === currentPath) return;

      currentPath = nextPath;
      window.setTimeout(() => trackPageView(state.location), 0);
    });
  }, []);

  return (
    <ErrorBoundary>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <TourProvider>
            <RouterProvider router={router} />
          </TourProvider>
          <DeferredClientPanelTransitionOverlay />
          <Toaster position="top-right" richColors />
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

export default App;
