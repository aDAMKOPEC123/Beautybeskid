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

  describe('linki', () => {
    it('zachowuje adres linku zewnętrznego wstawionego z paska narzędzi', () => {
      expect(sanitizeLessonHtml('<a href="https://example.com/x">klik</a>'))
        .toContain('href="https://example.com/x"');
      expect(sanitizeLessonHtml('<a href="http://example.com/x">klik</a>'))
        .toContain('href="http://example.com/x"');
    });

    it('zachowuje adres mailowy', () => {
      expect(sanitizeLessonHtml('<a href="mailto:kontakt@example.pl">napisz</a>'))
        .toContain('href="mailto:kontakt@example.pl"');
    });

    it('zachowuje link względny w obrębie Akademii', () => {
      expect(sanitizeLessonHtml('<a href="/kurs/podstawy">kurs</a>')).toContain('href="/kurs/podstawy"');
    });

    it('nie przepuszcza innych schematów w linku', () => {
      expect(sanitizeLessonHtml('<a href="data:text/html,<b>x</b>">klik</a>')).not.toContain('data:text/html');
      expect(sanitizeLessonHtml('<a href="ftp://example.com/plik">klik</a>')).not.toContain('ftp://');
    });
  });

  describe('źródła obrazów i osadzeń', () => {
    it('przepuszcza obrazy ze wszystkich katalogów uploadów Akademii', () => {
      for (const folder of ['academy-lessons', 'academy-courses', 'academy-instructors']) {
        expect(sanitizeLessonHtml(`<img src="/uploads/${folder}/a.webp" alt="">`))
          .toContain(`/uploads/${folder}/a.webp`);
      }
    });

    it('usuwa src spoza białej listy, mimo poluzowania polityki dla href', () => {
      expect(sanitizeLessonHtml('<img src="https://obcy.example.com/pixel.png" alt="">'))
        .not.toContain('obcy.example.com');
      expect(sanitizeLessonHtml('<img src="/kurs/podstawy.png" alt="">')).not.toContain('/kurs/podstawy.png');
      expect(sanitizeLessonHtml('<img src="/uploads/avatars/a.webp" alt="">')).not.toContain('/uploads/avatars');
      expect(sanitizeLessonHtml('<iframe src="https://obcy.example.com/film"></iframe>'))
        .not.toContain('obcy.example.com');
    });

    it('usuwa też pozostałe atrybuty pobierające zasoby', () => {
      expect(sanitizeLessonHtml('<img srcset="https://obcy.example.com/a.png 1x" alt="">'))
        .not.toContain('obcy.example.com');
      expect(sanitizeLessonHtml('<video poster="https://obcy.example.com/p.jpg"></video>'))
        .not.toContain('obcy.example.com');
    });
  });

  describe('atrybut style', () => {
    it('zostawia samą szerokość figury', () => {
      const result = sanitizeLessonHtml('<figure style="width:45%;float:left">tekst</figure>');
      expect(result).toContain('width:45%');
      expect(result).not.toContain('float');
    });

    it('usuwa nakładkę przykrywającą lekcję', () => {
      const result = sanitizeLessonHtml('<div style="position:fixed;inset:0;z-index:9999">x</div>');
      expect(result).not.toContain('position');
      expect(result).not.toContain('style=');
    });

    it('usuwa tło pobierane z obcego serwera', () => {
      expect(sanitizeLessonHtml('<div style="background:url(https://obcy.example.com/t.png)">x</div>'))
        .not.toContain('obcy.example.com');
      expect(sanitizeLessonHtml('<figure style="background:url(javascript:alert(1))">x</figure>'))
        .not.toContain('javascript:');
    });
  });

  it('nie okalecza starszej treści lekcji bez klasy academy-figure', () => {
    const html = '<h2>Krok 1</h2><p>Tekst z <strong>wyróżnieniem</strong> i <em>kursywą</em>.</p>'
      + '<ul><li>punkt</li></ul>'
      + '<figure><img src="/uploads/academy-lessons/stare.webp" alt="Stare"><figcaption>Podpis</figcaption></figure>';
    const result = sanitizeLessonHtml(html);
    expect(result).toContain('<h2>Krok 1</h2>');
    expect(result).toContain('<strong>wyróżnieniem</strong>');
    expect(result).toContain('<li>punkt</li>');
    expect(result).toContain('<figure>');
    expect(result).toContain('/uploads/academy-lessons/stare.webp');
    expect(result).toContain('alt="Stare"');
    expect(result).toContain('<figcaption>Podpis</figcaption>');
  });
});
