import { describe, expect, it } from 'vitest';
import { sanitizeLessonHtml } from './sanitizeLessonHtml';

describe('sanitizeLessonHtml', () => {
  it('zachowuje układ obrazu wstawionego w lekcji', () => {
    const html = '<figure class="academy-figure academy-figure--left" style="width:45%">'
      + '<img src="/uploads/academy-lessons/a.webp" alt="Opis" loading="lazy">'
      + '<figcaption>Podpis</figcaption></figure>';
    const result = sanitizeLessonHtml(html);
    expect(result).toContain('academy-figure--left');
    expect(result).toContain('45%');
    expect(result).toContain('<figcaption>Podpis</figcaption>');
    expect(result).toContain('/uploads/academy-lessons/a.webp');
  });

  it('przepuszcza osadzone materiały z dozwolonych platform', () => {
    const html = '<iframe src="https://player.vimeo.com/video/123" allowfullscreen></iframe>';
    expect(sanitizeLessonHtml(html)).toContain('player.vimeo.com');
  });

  it('usuwa osadzenia spoza dozwolonych platform', () => {
    const html = '<iframe src="https://zly.example.com/x"></iframe>';
    expect(sanitizeLessonHtml(html)).not.toContain('zly.example.com');
  });

  it('usuwa skrypty i uchwyty zdarzeń', () => {
    expect(sanitizeLessonHtml('<script>alert(1)</script><p>Tekst</p>')).not.toContain('alert');
    expect(sanitizeLessonHtml('<img src="x" onerror="alert(1)">')).not.toContain('onerror');
  });

  it('usuwa adresy javascript:', () => {
    expect(sanitizeLessonHtml('<a href="javascript:alert(1)">klik</a>')).not.toContain('javascript:');
  });
});
