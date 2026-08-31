/**
 * Kształt obiektu zwracanego przez domyślny serializer żądania pino-http
 * (`pino-std-serializers`). Zapisany lokalnie, bo `pino-std-serializers` jest
 * tylko przechodnią zależnością pino-http, więc nie jest bezpośrednio
 * importowalna w trybie pnpm bez dopisywania nowej zależności — a repo ma to
 * wprost zakazane w tej zmianie.
 */
export interface SerializedRequestShape {
  id?: string | number;
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  remoteAddress?: string;
  remotePort?: number;
  params?: Record<string, string>;
  query?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Serializer żądania dla pino-http.
 *
 * pino-http zawsze owija podany serializer swoim domyślnym
 * (`wrapRequestSerializer` z `pino-std-serializers`, patrz
 * node_modules/pino-http/logger.js), więc obiekt `req` trafiający tutaj ma już
 * standardowy kształt: id, method, url, headers, remoteAddress, remotePort,
 * params, query. Poniższa funkcja niczego z tego nie odbiera — podmienia
 * wyłącznie te pola, które dla trasy publicznego feedu kalendarza
 * (`GET /api/calendar-feed/:token/wizyty.ics`) niosłyby surowy token:
 *
 * - `url` — Express zostawia w `req.originalUrl` pełną ścieżkę ze zapytania,
 *   a to ona trafia tu jako `url`;
 * - `params` — Express uzupełnia `req.params.token` podczas routingu, zanim
 *   pino-http zaloguje żądanie na zdarzeniu 'finish', więc surowy token
 *   trafiłby do logu również stamtąd, nawet po zamaskowaniu samego `url`.
 *
 * Token feedu jest jedynym poświadczeniem dostępu (Apple nie wysyła
 * Authorization przy subskrypcji) — nie może trafić do logów w jawnej
 * postaci pod żadnym z tych pól.
 */
export const maskCalendarFeedToken = (req: SerializedRequestShape): SerializedRequestShape => {
  const url = req.url;
  const isFeedRoute = typeof url === 'string'
    && /^\/api\/calendar-feed\/[^/]+\//.test(url);

  return {
    ...req,
    url: isFeedRoute && typeof url === 'string'
      ? url.replace(/^(\/api\/calendar-feed\/)[^/]+(\/)/, '$1***$2')
      : url,
    params: isFeedRoute && req.params
      ? { ...req.params, token: '***' }
      : req.params,
  };
};
