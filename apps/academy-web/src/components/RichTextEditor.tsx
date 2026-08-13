import { useEffect, useRef, useState } from 'react';
import { Bold, Heading1, Heading2, ImagePlus, Italic, Link2, List, ListOrdered, Underline } from 'lucide-react';
import { academyApi } from '@/api/academy.api';

export function RichTextEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) editorRef.current.innerHTML = value;
  }, [value]);

  const sync = () => onChange(editorRef.current?.innerHTML ?? '');
  const command = (name: string, commandValue?: string) => {
    editorRef.current?.focus();
    document.execCommand(name, false, commandValue);
    sync();
  };
  const addLink = () => {
    const url = window.prompt('Wklej adres linku (https://...)');
    if (url?.trim()) command('createLink', url.trim());
  };
  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const image = event.target.files?.[0];
    event.target.value = '';
    if (!image) return;
    setError(''); setUploading(true);
    try {
      const { url } = await academyApi.adminUploadLessonImage(image);
      const alt = window.prompt('Opisz krótko, co przedstawia obraz. Pozostaw puste tylko dla dekoracji.', '') ?? '';
      const img = document.createElement('img'); img.src = url; img.alt = alt.trim(); img.loading = 'lazy';
      command('insertHTML', `<figure>${img.outerHTML}</figure><p><br></p>`);
    } catch {
      setError('Nie udało się wgrać obrazu. Wybierz plik graficzny do 5 MB.');
    } finally { setUploading(false); }
  };
  const tool = (label: string, icon: React.ReactNode, action: () => void) => <button type="button" title={label} aria-label={label} onMouseDown={event => event.preventDefault()} onClick={action}>{icon}</button>;

  return <div className="rich-editor">
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
      <button type="button" className="rich-editor-image" onClick={() => fileRef.current?.click()} disabled={uploading}><ImagePlus />{uploading ? 'Wgrywanie…' : 'Dodaj obraz'}</button>
      <input ref={fileRef} type="file" accept="image/*" onChange={uploadImage} hidden />
    </div>
    <div ref={editorRef} className="rich-editor-body" contentEditable suppressContentEditableWarning data-placeholder="Napisz instrukcję. Zaznacz tekst, aby użyć formatowania." onInput={sync} onPaste={event => { event.preventDefault(); document.execCommand('insertText', false, event.clipboardData.getData('text/plain')); sync(); }} />
    <p className="rich-editor-hint">Wstawione obrazy są automatycznie optymalizowane i zapisywane jako WebP.</p>
    {error && <p className="rich-editor-error">{error}</p>}
  </div>;
}
