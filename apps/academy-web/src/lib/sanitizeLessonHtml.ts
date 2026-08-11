import DOMPurify from 'dompurify';

/** Jedna konfiguracja dla wszystkich miejsc pokazujących treść lekcji. Rozjazd
 *  między odtwarzaczem a stroną sprzedażową oznaczałby, że ta sama lekcja
 *  wygląda w dwóch miejscach inaczej. */
const LESSON_HTML_CONFIG = {
  ADD_TAGS: ['iframe', 'img'],
  ADD_ATTR: [
    'allowfullscreen', 'frameborder', 'loading', 'allow',
    'style', 'class', 'width', 'height', 'alt', 'title',
  ],
  // Filmy tylko z zatwierdzonych platform; obrazy kursu z katalogu uploadów Akademii.
  ALLOWED_URI_REGEXP:
    /^(?:(?:https?):\/\/(?:www\.youtube\.com|player\.vimeo\.com)\/|\/uploads\/academy-lessons\/|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
};

export const sanitizeLessonHtml = (html: string): string => DOMPurify.sanitize(html, LESSON_HTML_CONFIG);
