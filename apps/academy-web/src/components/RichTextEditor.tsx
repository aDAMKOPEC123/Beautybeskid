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

export function RichTextEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<HTMLElement | null>(null);
  const [layout, setLayout] = useState<FigureLayout>('center');
  const [width, setWidth] = useState(100);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) editorRef.current.innerHTML = value;
  }, [value]);

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

  const { pick, dialog, uploading, error } = useImageUpload({
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

      <div ref={editorRef} className="rich-editor-body" contentEditable suppressContentEditableWarning
        data-placeholder="Napisz instrukcję. Zaznacz tekst, aby użyć formatowania."
        onInput={sync}
        onClick={selectFigure}
        onPaste={(event) => {
          event.preventDefault();
          document.execCommand('insertText', false, event.clipboardData.getData('text/plain'));
          sync();
        }} />

      <p className="rich-editor-hint">
        Kliknij w zdjęcie, żeby ustawić jego rozmiar i położenie. Wstawione obrazy są automatycznie optymalizowane i zapisywane jako WebP.
      </p>
      {error && <p className="rich-editor-error" role="alert">{error}</p>}
      {dialog}
      {recrop.dialog}
    </div>
  );
}
