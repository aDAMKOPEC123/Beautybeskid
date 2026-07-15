import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';

interface Props {
  content: string;
  className?: string;
}

const normalizeHeadingHierarchy = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(normalizeHeadingHierarchy);
  if (!value || typeof value !== 'object') return value;

  const node = value as Record<string, unknown>;
  const normalized = Object.fromEntries(
    Object.entries(node).map(([key, child]) => [key, normalizeHeadingHierarchy(child)]),
  );

  if (node.type === 'heading') {
    const attrs = (normalized.attrs as Record<string, unknown> | undefined) ?? {};
    normalized.attrs = { ...attrs, level: Math.max(2, Number(attrs.level) || 2) };
  }

  return normalized;
};

const normalizeContent = (content: string): any => {
  if (!content) return '';
  try {
    return normalizeHeadingHierarchy(JSON.parse(content));
  } catch {
    return content
      .replace(/<h1(\s[^>]*)?>/gi, '<h2$1>')
      .replace(/<\/h1>/gi, '</h2>');
  }
};

export const RichTextViewer = ({ content, className }: Props) => {
  const editor = useEditor({
    editable: false,
    extensions: [StarterKit, Image, Link],
    content: normalizeContent(content),
  });

  return (
    <div className={className}>
      <EditorContent editor={editor} />
    </div>
  );
};
