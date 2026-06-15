// filepath: apps/web/src/components/shared/RichTextEditor.tsx
import { useRef, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { Bold, Italic, List, ListOrdered, Heading1, Heading2, Heading3, Quote, Minus, Link as LinkIcon, ImageIcon } from 'lucide-react';
import { Button } from '../ui/button';

interface Props {
  content: string;
  onChange: (value: string) => void;
  onImageUpload?: (file: File) => Promise<string>;
}

const MenuBar = ({ editor, onImageUpload }: { editor: any; onImageUpload?: (file: File) => Promise<string> }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!editor) return null;

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImageUpload) return;
    try {
      const url = await onImageUpload(file);
      editor.chain().focus().setImage({ src: url }).run();
    } catch {}
    e.target.value = '';
  };

  const isValidUrl = (u: string): boolean => {
    try {
      const parsed = new URL(u);
      return ['http:', 'https:', 'mailto:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  };

  const handleLinkClick = () => {
    const prev = editor.getAttributes('link').href ?? '';
    const url = window.prompt('URL linku:', prev);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().unsetLink().run();
    } else {
      if (!isValidUrl(url)) {
        alert('Nieprawidłowy URL. Dozwolone są tylko adresy http://, https:// i mailto:');
        return;
      }
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  return (
    <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/30 rounded-t-lg">
      <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'bg-muted shadow-sm' : 'hover:bg-muted'} type="button">
        <Bold size={16} className="text-foreground/80" />
      </Button>
      <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'bg-muted shadow-sm' : 'hover:bg-muted'} type="button">
        <Italic size={16} className="text-foreground/80" />
      </Button>
      <div className="w-px h-6 bg-border mx-1 self-center" />
      <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={editor.isActive('heading', { level: 1 }) ? 'bg-muted shadow-sm' : 'hover:bg-muted'} type="button">
        <Heading1 size={16} className="text-foreground/80" />
      </Button>
      <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={editor.isActive('heading', { level: 2 }) ? 'bg-muted shadow-sm' : 'hover:bg-muted'} type="button">
        <Heading2 size={16} className="text-foreground/80" />
      </Button>
      <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={editor.isActive('heading', { level: 3 }) ? 'bg-muted shadow-sm' : 'hover:bg-muted'} type="button">
        <Heading3 size={16} className="text-foreground/80" />
      </Button>
      <div className="w-px h-6 bg-border mx-1 self-center" />
      <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBulletList().run()} className={editor.isActive('bulletList') ? 'bg-muted shadow-sm' : 'hover:bg-muted'} type="button">
        <List size={16} className="text-foreground/80" />
      </Button>
      <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={editor.isActive('orderedList') ? 'bg-muted shadow-sm' : 'hover:bg-muted'} type="button">
        <ListOrdered size={16} className="text-foreground/80" />
      </Button>
      <div className="w-px h-6 bg-border mx-1 self-center" />
      <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={editor.isActive('blockquote') ? 'bg-muted shadow-sm' : 'hover:bg-muted'} type="button">
        <Quote size={16} className="text-foreground/80" />
      </Button>
      <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().setHorizontalRule().run()} className="hover:bg-muted" type="button">
        <Minus size={16} className="text-foreground/80" />
      </Button>
      <Button variant="ghost" size="sm" onClick={handleLinkClick} className={editor.isActive('link') ? 'bg-muted shadow-sm' : 'hover:bg-muted'} type="button">
        <LinkIcon size={16} className="text-foreground/80" />
      </Button>
      {onImageUpload && (
        <>
          <Button variant="ghost" size="sm" onClick={handleImageClick} className="hover:bg-muted" type="button">
            <ImageIcon size={16} className="text-foreground/80" />
          </Button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </>
      )}
    </div>
  );
};

export const RichTextEditor = ({ content, onChange, onImageUpload }: Props) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Link.configure({ openOnClick: false }),
    ],
    content: '',
    onUpdate: ({ editor }) => {
      onChange(JSON.stringify(editor.getJSON()));
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[250px] p-5',
      },
    },
  });

  // Sync external content changes (e.g. loaded from API) into the editor
  useEffect(() => {
    if (!editor || !content) return;
    try {
      const parsed = JSON.parse(content);
      const current = JSON.stringify(editor.getJSON());
      if (current !== content) {
        editor.commands.setContent(parsed, false);
      }
    } catch {}
  }, [content, editor]);

  return (
    <div className="border rounded-lg flex flex-col focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-sm overflow-hidden bg-card">
      <MenuBar editor={editor} onImageUpload={onImageUpload} />
      <div className="bg-background">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};
