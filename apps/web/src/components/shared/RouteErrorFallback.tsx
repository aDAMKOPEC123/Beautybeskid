import { useEffect } from 'react';
import { isRouteErrorResponse, Link, useLocation, useRouteError } from 'react-router-dom';
import {
  clearChunkReloadMarks,
  getErrorMessage,
  isChunkLoadError,
  markDocumentNoIndex,
  reloadOnceForChunkError,
} from '@/lib/chunkRecovery';
import { useAuth } from '@/hooks/useAuth';
import { getPanelPath } from '@/lib/panel-routing';

export const RouteErrorFallback = () => {
  const error = useRouteError();
  const location = useLocation();
  const isChunkError = isChunkLoadError(error);
  const { user, isAuthenticated } = useAuth();

  const status = isRouteErrorResponse(error) ? error.status : null;
  const title = isChunkError
    ? 'Nie udało się załadować strony'
    : status === 404
      ? 'Nie znaleziono strony'
      : 'Coś poszło nie tak';

  useEffect(() => {
    markDocumentNoIndex(`${title} | BeskidStudio`);
    if (isChunkError) {
      reloadOnceForChunkError('route');
    }
  }, [isChunkError, location.pathname, title]);
  const description = isChunkError
    ? 'Odśwież stronę, aby spróbować ponownie. Jeśli problem się powtórzy, wróć za kilka minut.'
    : status === 404
      ? 'Ta sekcja nie istnieje albo została przeniesiona.'
      : 'Aplikacja napotkała błąd w tej sekcji. Możesz odświeżyć stronę albo wrócić do panelu.';
  const details = import.meta.env.DEV ? getErrorMessage(error) : '';
  const returnToHome = status === 404 || !isAuthenticated;
  const returnPath = returnToHome ? '/' : getPanelPath(user?.role);
  const returnLabel = returnToHome ? 'Wróć na stronę główną' : 'Wróć do panelu';

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-lg w-full rounded-3xl border bg-card p-8 text-center shadow-xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-2xl">
          {isChunkError ? '↻' : '!'}
        </div>
        <h1 className="text-2xl font-heading font-semibold text-foreground">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
        {details && (
          <pre className="mt-5 max-h-40 overflow-auto rounded-xl bg-muted p-3 text-left text-xs text-muted-foreground">
            {details}
          </pre>
        )}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              clearChunkReloadMarks();
              window.location.reload();
            }}
            className="w-full sm:w-auto rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
          >
            Odśwież aplikację
          </button>
          <Link
            to={returnPath}
            className="w-full sm:w-auto rounded-full border px-5 py-2.5 text-sm font-semibold transition hover:bg-accent"
          >
            {returnLabel}
          </Link>
        </div>
      </div>
    </div>
  );
};
