export type FigureLayout = 'left' | 'center' | 'right' | 'full';

const LAYOUTS: FigureLayout[] = ['left', 'center', 'right', 'full'];

export const clampWidth = (value: number): number => {
  if (!Number.isFinite(value)) return 100;
  return Math.min(100, Math.max(10, Math.round(value)));
};

/** Obraz rozciągnięty na całą szerokość ignoruje ustawioną wartość — inaczej
 *  „cała szerokość" nie znaczyłaby tego, co mówi. */
export const layoutWidth = (layout: FigureLayout, widthPercent: number): number =>
  layout === 'full' ? 100 : clampWidth(widthPercent);

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function buildFigureHtml(input: {
  src: string;
  alt: string;
  caption: string;
  layout: FigureLayout;
  widthPercent: number;
}): string {
  const width = layoutWidth(input.layout, input.widthPercent);
  const caption = input.caption.trim()
    ? `<figcaption>${escapeHtml(input.caption.trim())}</figcaption>`
    : '';
  return `<figure class="academy-figure academy-figure--${input.layout}" style="width:${width}%" draggable="true">`
    + `<img src="${escapeHtml(input.src)}" alt="${escapeHtml(input.alt)}" loading="lazy">`
    + `${caption}</figure>`;
}

export function readFigureLayout(figure: HTMLElement): { layout: FigureLayout; widthPercent: number } {
  const layout = LAYOUTS.find((name) => figure.classList.contains(`academy-figure--${name}`)) ?? 'center';
  const raw = Number.parseFloat(figure.style.width);
  return { layout, widthPercent: layoutWidth(layout, Number.isNaN(raw) ? 100 : raw) };
}

export function applyFigureLayout(figure: HTMLElement, layout: FigureLayout, widthPercent: number): void {
  LAYOUTS.forEach((name) => figure.classList.remove(`academy-figure--${name}`));
  figure.classList.add('academy-figure', `academy-figure--${layout}`);
  figure.style.width = `${layoutWidth(layout, widthPercent)}%`;
}
