import { describe, expect, it } from 'vitest';
import {
  applyFigureLayout, buildFigureHtml, clampWidth, layoutWidth, readFigureLayout,
  type FigureLayout,
} from './lessonFigure';

const figureFromHtml = (html: string): HTMLElement => {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host.firstElementChild as HTMLElement;
};

describe('clampWidth', () => {
  it('trzyma szerokość w zakresie 10–100', () => {
    expect(clampWidth(5)).toBe(10);
    expect(clampWidth(150)).toBe(100);
    expect(clampWidth(45)).toBe(45);
  });

  it('zaokrągla do pełnych procentów', () => {
    expect(clampWidth(45.6)).toBe(46);
  });

  it('broni się przed wartością, która nie jest liczbą', () => {
    expect(clampWidth(Number.NaN)).toBe(100);
    expect(clampWidth(Number.POSITIVE_INFINITY)).toBe(100);
  });
});

describe('layoutWidth', () => {
  it('wymusza pełną szerokość dla układu full', () => {
    expect(layoutWidth('full', 30)).toBe(100);
  });

  it('zachowuje szerokość dla pozostałych układów', () => {
    expect(layoutWidth('left', 30)).toBe(30);
  });
});

describe('buildFigureHtml', () => {
  it('buduje figurę z klasą układu i szerokością', () => {
    const html = buildFigureHtml({ src: '/uploads/academy-lessons/a.webp', alt: 'Opis', caption: 'Podpis', layout: 'left', widthPercent: 45 });
    expect(html).toContain('academy-figure--left');
    expect(html).toContain('width:45%');
    expect(html).toContain('<figcaption>Podpis</figcaption>');
    expect(html).toContain('loading="lazy"');
  });

  it('pomija podpis, gdy jest pusty', () => {
    const html = buildFigureHtml({ src: '/a.webp', alt: '', caption: '   ', layout: 'center', widthPercent: 100 });
    expect(html).not.toContain('figcaption');
  });

  it('ucieka znaki specjalne w podpisie i tekście alternatywnym', () => {
    const html = buildFigureHtml({ src: '/a.webp', alt: '"x" & <y>', caption: '<script>alert(1)</script>', layout: 'center', widthPercent: 50 });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&quot;x&quot; &amp; &lt;y&gt;');
  });
});

describe('readFigureLayout', () => {
  it('odczytuje układ i szerokość zapisane w HTML', () => {
    const figure = figureFromHtml('<figure class="academy-figure academy-figure--right" style="width:35%"></figure>');
    expect(readFigureLayout(figure)).toEqual({ layout: 'right', widthPercent: 35 });
  });

  it('wraca do środka i pełnej szerokości, gdy brakuje danych', () => {
    const figure = figureFromHtml('<figure class="academy-figure"></figure>');
    expect(readFigureLayout(figure)).toEqual({ layout: 'center', widthPercent: 100 });
  });
});

describe('applyFigureLayout', () => {
  it('podmienia klasę układu bez pozostawiania starej', () => {
    const figure = figureFromHtml('<figure class="academy-figure academy-figure--left" style="width:40%"></figure>');
    applyFigureLayout(figure, 'right', 60);
    expect(figure.classList.contains('academy-figure--left')).toBe(false);
    expect(figure.classList.contains('academy-figure--right')).toBe(true);
    expect(figure.style.width).toBe('60%');
  });

  it('działa w obie strony razem z readFigureLayout', () => {
    const layouts: FigureLayout[] = ['left', 'center', 'right', 'full'];
    for (const layout of layouts) {
      const figure = figureFromHtml('<figure></figure>');
      applyFigureLayout(figure, layout, 40);
      expect(readFigureLayout(figure)).toEqual({ layout, widthPercent: layout === 'full' ? 100 : 40 });
    }
  });
});
