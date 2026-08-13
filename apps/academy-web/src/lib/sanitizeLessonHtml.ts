import createDOMPurify from 'dompurify';

/** Własna instancja, a nie globalny singleton — haki poniżej zmieniają politykę
 *  atrybutów i nie mogą wyciec do innych miejsc korzystających z DOMPurify. */
const purifier = createDOMPurify(window);

/** Adresy, które przeglądarka pobiera sama (obrazy, osadzone filmy). Zamknięta
 *  lista: odtwarzacze YouTube i Vimeo oraz katalogi uploadów Akademii. */
const EMBED_URL_ALLOWED =
  /^(?:https?:\/\/(?:www\.youtube\.com|player\.vimeo\.com)\/|\/uploads\/(?:academy-lessons|academy-courses|academy-instructors)\/)/i;

/** Atrybuty powodujące pobranie zasobu — dla nich obowiązuje lista powyżej. */
const EMBED_ATTRS = new Set(['src', 'srcset', 'poster', 'data', 'background']);

/** Jedyna deklaracja stylu, jakiej potrzebuje treść lekcji: szerokość figury
 *  w procentach (zapisuje ją `lessonFigure`). */
const WIDTH_DECLARATION = /(?:^|;)\s*width\s*:\s*(\d{1,3}(?:\.\d+)?)\s*%/i;

/** Jedna konfiguracja dla wszystkich miejsc pokazujących treść lekcji. Rozjazd
 *  między odtwarzaczem a stroną sprzedażową oznaczałby, że ta sama lekcja
 *  wygląda w dwóch miejscach inaczej.
 *
 *  Polityka adresów jest rozdzielona:
 *  - `href` (linki z paska narzędzi edytora) — http, https, mailto oraz adresy
 *    względne; bez tego linki zapisane przez administratorkę docierały do
 *    kursantki martwe, bez atrybutu `href`;
 *  - `src` i pokrewne — tylko `EMBED_URL_ALLOWED`, pilnowane hakiem niżej.
 *
 *  Uwaga: adresy względne (np. `/kurs/cos`) przechodzą w `href` bez ograniczeń
 *  — to ten sam origin, więc nie ma czego blokować. */
const LESSON_HTML_CONFIG = {
  ADD_TAGS: ['iframe', 'img'],
  ADD_ATTR: [
    'allowfullscreen', 'frameborder', 'loading', 'allow',
    'style', 'class', 'width', 'height', 'alt', 'title',
  ],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
};

purifier.addHook('uponSanitizeAttribute', (_node, data) => {
  if (EMBED_ATTRS.has(data.attrName)) {
    // DOMPurify sam nie rozróżnia `href` od `src`, więc zamkniętą listę źródeł
    // egzekwujemy tutaj.
    if (!EMBED_URL_ALLOWED.test(data.attrValue.trim())) data.keepAttr = false;
    return;
  }

  if (data.attrName === 'style') {
    // DOMPurify nie sanityzuje zawartości `style`. Zostawiamy wyłącznie
    // szerokość — inaczej treść lekcji mogłaby przykryć stronę nakładką
    // (`position:fixed`) albo pobrać tło z obcego serwera.
    const width = WIDTH_DECLARATION.exec(data.attrValue);
    if (width) data.attrValue = `width:${width[1]}%`;
    else data.keepAttr = false;
  }
});

export const sanitizeLessonHtml = (html: string): string => purifier.sanitize(html, LESSON_HTML_CONFIG);
