import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlignCenter, AlignLeft, AlignRight, Bold, Crop, Heading1, Heading2, ImagePlus,
  Italic, Link2, List, ListOrdered, Maximize2, Pencil, Trash2, Underline,
} from 'lucide-react';
import { useImageUpload } from '@/hooks/useImageUpload';
import {
  applyFigureLayout, buildFigureHtml, clampWidth, readFigureLayout, type FigureLayout,
} from '@/lib/lessonFigure';

const LAYOUT_BUTTONS: { layout: FigureLayout; label: string; icon: React.ReactNode }[] = [
  { layout: 'left', label: 'Do lewej, tekst oblewa', icon: <AlignLeft /> },
  { layout: 'center', label: 'Wyśrodkowany', icon: <AlignCenter /> },
  { layout: 'right', label: 'Do prawej, tekst oblewa', icon: <AlignRight /> },
  { layout: 'full', label: 'Cała szerokość', icon: <Maximize2 /> },
];

/** Wylicza docelową szerokość (%) na podstawie przesunięcia kursora względem
 *  punktu startu gestu. Czysta funkcja — układ podajemy z zewnątrz (odczytany
 *  na bieżąco z DOM), żeby przełączenie układu w trakcie gestu nie cofało się
 *  do wartości zamrożonej w domknięciu z chwili `pointerdown`. */
export function computeResizedWidth(params: {
  startWidth: number;
  startX: number;
  editorWidth: number;
  layout: FigureLayout;
  clientX: number;
}): number {
  const direction = params.layout === 'right' ? -1 : 1;
  const deltaPercent = ((params.clientX - params.startX) / params.editorWidth) * 100 * direction;
  return clampWidth(params.startWidth + deltaPercent);
}

export function RichTextEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<HTMLElement | null>(null);
  const [layout, setLayout] = useState<FigureLayout>('center');
  const [width, setWidth] = useState(100);
  const stopResizeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) editorRef.current.innerHTML = value;
  }, [value]);

  // Odpina nasłuchy zmiany rozmiaru, gdyby edytor odmontował się w trakcie gestu.
  useEffect(() => () => stopResizeRef.current?.(), []);

  const sync = useCallback(() => onChange(editorRef.current?.innerHTML ?? ''), [onChange]);

  const command = (name: string, commandValue?: string) => {
    editorRef.current?.focus();
    document.execCommand(name, false, commandValue);
    sync();
  };

  const addLink = () => {
    const url = window.prompt('Wklej adres linku (https://...)');
    if (url?.trim()) command('createLink', url.trim());
  };

  const insertFigure = useCallback((url: string) => {
    const alt = window.prompt('Opisz krótko, co przedstawia obraz. Pozostaw puste tylko dla dekoracji.', '') ?? '';
    editorRef.current?.focus();
    document.execCommand('insertHTML', false,
      buildFigureHtml({ src: url, alt: alt.trim(), caption: '', layout: 'center', widthPercent: 100 }) + '<p><br></p>');
    sync();
  }, [sync]);

  const { pick, dialog, uploading, error, notice } = useImageUpload({
    folder: 'academy-lessons', aspect: 'free', onUploaded: insertFigure,
  });

  /** Ponowne kadrowanie już wstawionego obrazu — podmienia adres w miejscu. */
  const recrop = useImageUpload({
    folder: 'academy-lessons', aspect: 'free',
    onUploaded: (url) => {
      const image = selected?.querySelector('img');
      if (image) { image.setAttribute('src', url); sync(); }
    },
  });

  const selectFigure = (event: React.MouseEvent) => {
    const figure = (event.target as HTMLElement).closest('figure.academy-figure') as HTMLElement | null;
    setSelected(figure);
    if (figure) {
      const current = readFigureLayout(figure);
      setLayout(current.layout);
      setWidth(current.widthPercent);
    }
  };

  const setFigureLayout = (next: FigureLayout) => {
    if (!selected) return;
    applyFigureLayout(selected, next, width);
    setLayout(next);
    if (next === 'full') setWidth(100);
    sync();
  };

  const setFigureWidth = (next: number) => {
    if (!selected) return;
    const clamped = clampWidth(next);
    applyFigureLayout(selected, layout, clamped);
    setWidth(clamped);
    sync();
  };

  const editCaption = () => {
    if (!selected) return;
    const existing = selected.querySelector('figcaption');
    const text = window.prompt('Podpis pod zdjęciem (pusty usuwa podpis)', existing?.textContent ?? '') ?? '';
    if (text.trim()) {
      if (existing) existing.textContent = text.trim();
      else {
        const caption = document.createElement('figcaption');
        caption.textContent = text.trim();
        selected.appendChild(caption);
      }
    } else existing?.remove();
    sync();
  };

  const removeFigure = () => {
    if (!selected) return;
    selected.remove();
    setSelected(null);
    sync();
  };

  const tool = (label: string, icon: React.ReactNode, action: () => void) => (
    <button type="button" title={label} aria-label={label}
      onMouseDown={(event) => event.preventDefault()} onClick={action}>{icon}</button>
  );

  /** Ciągnięcie uchwytu w rogu. Szerokość liczymy względem szerokości edytora,
   *  bo tak samo zachowa się u kursantki — figura ma szerokość w procentach. */
  const startResize = (event: React.PointerEvent) => {
    if (!selected || !editorRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    const editorWidth = editorRef.current.clientWidth;
    const startX = event.clientX;
    const startWidth = width;

    const onMove = (move: PointerEvent) => {
      // Układ czytamy na bieżąco z DOM zamiast z domknięcia — gdyby ktoś
      // przełączył figurę na „cała szerokość" w trakcie ciągnięcia uchwytu,
      // gest ma to uszanować, a nie przywracać poprzednią klasę i szerokość.
      const current = readFigureLayout(selected);
      if (current.layout === 'full') return;
      const next = computeResizedWidth({ startWidth, startX, editorWidth, layout: current.layout, clientX: move.clientX });
      applyFigureLayout(selected, current.layout, next);
      setWidth(next);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      stopResizeRef.current = null;
      sync();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    stopResizeRef.current = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  };

  return (
    <div className="rich-editor">
      <div className="rich-editor-toolbar">
        {tool('Nagłówek H1', <Heading1 />, () => command('formatBlock', 'h1'))}
        {tool('Nagłówek H2', <Heading2 />, () => command('formatBlock', 'h2'))}
        {tool('Pogrubienie', <Bold />, () => command('bold'))}
        {tool('Kursywa', <Italic />, () => command('italic'))}
        {tool('Podkreślenie', <Underline />, () => command('underline'))}
        {tool('Lista punktowana', <List />, () => command('insertUnorderedList'))}
        {tool('Lista numerowana', <ListOrdered />, () => command('insertOrderedList'))}
        {tool('Dodaj link', <Link2 />, addLink)}
        <span className="rich-editor-divider" />
        <button type="button" className="rich-editor-image" onClick={() => fileRef.current?.click()} disabled={uploading}>
          <ImagePlus />{uploading ? 'Wgrywanie…' : 'Dodaj obraz'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={pick} hidden />
      </div>

      {selected && (
        <div className="figure-toolbar" role="group" aria-label="Ustawienia zdjęcia">
          <div className="figure-toolbar-row">
            {LAYOUT_BUTTONS.map((item) => (
              <button key={item.layout} type="button" title={item.label} aria-label={item.label}
                aria-pressed={layout === item.layout}
                className={layout === item.layout ? 'selected' : ''}
                onClick={() => setFigureLayout(item.layout)}>{item.icon}</button>
            ))}
          </div>
          <div className="figure-toolbar-row">
            <label className="figure-toolbar-width">
              <span>Szerokość {width}%</span>
              <input type="range" min={10} max={100} step={1} value={width}
                disabled={layout === 'full'}
                onChange={(event) => setFigureWidth(Number(event.target.value))} />
            </label>
            <span className="figure-toolbar-steps">
              <button type="button" aria-label="Węziej" disabled={layout === 'full'}
                onClick={() => setFigureWidth(width - 5)}>−</button>
              <button type="button" aria-label="Szerzej" disabled={layout === 'full'}
                onClick={() => setFigureWidth(width + 5)}>+</button>
            </span>
          </div>
          <div className="figure-toolbar-row">
            <button type="button" onClick={() => recrop.pickFor(selected.querySelector('img')?.getAttribute('src') ?? '')}>
              <Crop />Kadruj
            </button>
            <button type="button" onClick={editCaption}><Pencil />Podpis</button>
            <button type="button" className="danger" onClick={removeFigure}><Trash2 />Usuń</button>
          </div>
          {recrop.error && <p className="rich-editor-error" role="alert">{recrop.error}</p>}
        </div>
      )}

      {selected && layout !== 'full' && (
        // Uchwyt jest skrótem dla myszy; klawiaturą szerokość ustawia się
        // suwakiem i przyciskami − / +, dlatego zostaje poza kolejnością tabulacji.
        <div className="figure-resize-hint">
          <button type="button" className="figure-resize-handle" onPointerDown={startResize}
            tabIndex={-1} aria-label="Zmień szerokość zdjęcia"
            title="Ciągnij, aby zmienić szerokość" />
        </div>
      )}

      <div ref={editorRef} className="rich-editor-body" contentEditable suppressContentEditableWarning
        data-placeholder="Napisz instrukcję. Zaznacz tekst, aby użyć formatowania."
        onInput={sync}
        onClick={selectFigure}
        onDragStart={() => setSelected(null)}
        onDrop={() => { window.setTimeout(sync, 0); }}
        onPaste={(event) => {
          event.preventDefault();
          document.execCommand('insertText', false, event.clipboardData.getData('text/plain'));
          sync();
        }} />

      <p className="rich-editor-hint">
        Kliknij w zdjęcie, żeby ustawić jego rozmiar i położenie. Wstawione obrazy są automatycznie optymalizowane i zapisywane jako WebP.
      </p>
      {notice && <p className="rich-editor-hint" role="status">{notice}</p>}
      {error && <p className="rich-editor-error" role="alert">{error}</p>}
      {dialog}
      {recrop.dialog}
    </div>
  );
}
