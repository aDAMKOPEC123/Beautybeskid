import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';

interface Props {
  content: string;
  className?: string;
}

export const RichTextViewer = ({ content, className }: Props) => {
  const editor = useEditor({
    editable: false,
    extensions: [StarterKit, Image, Link],
    content: (() => {
      if (!content) return '';
      try { return JSON.parse(content); } catch { return content; }
    })(),
  });

  return (
    <div className={className}>
      <EditorContent editor={editor} />
    </div>
  );
};
