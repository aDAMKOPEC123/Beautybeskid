// filepath: apps/web/src/pages/admin/AdminBlogForm.tsx
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { blogApi } from '@/api/blog.api';
import { queryClient } from '@/lib/queryClient';
import { RichTextEditor } from '@/components/shared/RichTextEditor';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const Label = ({ htmlFor, children, className = '' }: { htmlFor?: string; children: React.ReactNode; className?: string }) => (
  <label htmlFor={htmlFor} className={`text-sm font-medium leading-none ${className}`}>{children}</label>
);
const Textarea = ({ className = '', ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea className={`flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`} {...props} />
);
import { X, Upload } from 'lucide-react';

function extractTextFromTipTap(node: any): string {
  if (!node) return '';
  if (node.type === 'text') return node.text ?? '';
  if (Array.isArray(node.content)) {
    return node.content.map(extractTextFromTipTap).join(' ');
  }
  return '';
}

export const AdminBlogForm = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [readingTime, setReadingTime] = useState(1);
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [tags, setTags] = useState('');
  const [category, setCategory] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const skipAutoCalc = useRef(false);

  // Load all posts and find by id when editing (separate key from public blog cache)
  const { data: posts } = useQuery({
    queryKey: ['blog-admin'],
    queryFn: () => blogApi.getAll(),
    enabled: true,
    staleTime: 0,
  });

  useEffect(() => {
    if (!isEdit || !posts) return;
    const post = posts.find((p: any) => p.id === id);
    if (!post) return;
    skipAutoCalc.current = true; // block auto-calc on initial content load
    setTitle(post.title ?? '');
    setContent(post.content ?? '');
    setExcerpt(post.excerpt ?? '');
    setReadingTime(post.readingTime ?? 1);
    setMetaTitle(post.metaTitle ?? '');
    setMetaDescription(post.metaDescription ?? '');
    setTags(post.tags?.map((t: any) => t.name).join(', ') ?? '');
    setCategory(post.category ?? '');
    if (post.coverImage) setCoverPreview(post.coverImage);
  }, [posts, id, isEdit]);

  // Auto-calculate reading time from content (skipped on initial API load)
  useEffect(() => {
    if (!content) return;
    if (skipAutoCalc.current) {
      skipAutoCalc.current = false;
      return;
    }
    try {
      const json = JSON.parse(content);
      const text = extractTextFromTipTap(json);
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      setReadingTime(Math.max(1, Math.round(words / 200)));
    } catch {}
  }, [content]);

  const createMutation = useMutation({
    mutationFn: (fd: FormData) => blogApi.create(fd),
    onSuccess: () => {
      toast.success('Artykuł zapisany!');
      queryClient.invalidateQueries({ queryKey: ['blog-admin'] });
      queryClient.invalidateQueries({ queryKey: ['blog'] });
      navigate('/admin/blog');
    },
    onError: () => toast.error('Błąd zapisu artykułu'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, fd }: { id: string; fd: FormData }) => blogApi.update(id, fd),
    onSuccess: () => {
      toast.success('Artykuł zaktualizowany!');
      queryClient.invalidateQueries({ queryKey: ['blog-admin'] });
      queryClient.invalidateQueries({ queryKey: ['blog'] });
      navigate('/admin/blog');
    },
    onError: () => toast.error('Błąd aktualizacji artykułu'),
  });

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleInlineImageUpload = async (file: File): Promise<string> => {
    return await blogApi.uploadImage(file);
  };

  const handleSubmit = (publish: boolean) => {
    const data = {
      title,
      content,
      excerpt,
      readingTime,
      metaTitle: metaTitle || undefined,
      metaDescription: metaDescription || undefined,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      category: category.trim() || undefined,
      isPublished: publish,
    };

    const fd = new FormData();
    fd.append('data', JSON.stringify(data));
    if (coverFile) fd.append('coverImage', coverFile);

    if (isEdit) {
      updateMutation.mutate({ id: id!, fd });
    } else {
      createMutation.mutate(fd);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);

  const existingCategories = Array.from(
    new Set((posts ?? []).map((p: any) => p.category).filter(Boolean))
  ) as string[];

  return (
    <div className="space-y-6 animate-enter max-w-4xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-heading font-bold text-primary">
          {isEdit ? `Edytuj: ${title}` : 'Nowy artykuł'}
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleSubmit(false)} disabled={isPending}>
            Zapisz szkic
          </Button>
          <Button onClick={() => handleSubmit(true)} disabled={isPending}>
            Opublikuj
          </Button>
        </div>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Podstawowe informacje</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">
              Tytuł artykułu * <span className={title.length < 5 ? "text-destructive text-xs" : "text-muted-foreground text-xs"}>({title.length}/5 min)</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Wpisz tytuł artykułu..."
              minLength={5}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Miniaturka artykułu</Label>
            {coverPreview ? (
              <div className="relative w-40 h-28 rounded-lg overflow-hidden border">
                <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" loading="lazy" />
                <button
                  type="button"
                  onClick={() => { setCoverFile(null); setCoverPreview(null); }}
                  className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 hover:opacity-90"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div
                onClick={() => coverInputRef.current?.click()}
                className="w-40 h-28 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
              >
                <Upload size={20} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Dodaj miniaturkę</span>
              </div>
            )}
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle>Treść artykułu</CardTitle>
        </CardHeader>
        <CardContent>
          <RichTextEditor
            content={content}
            onChange={setContent}
            onImageUpload={handleInlineImageUpload}
          />
        </CardContent>
      </Card>

      {/* Excerpt & Reading time */}
      <Card>
        <CardHeader>
          <CardTitle>Streszczenie i czas czytania</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="excerpt">
              Streszczenie / Excerpt * <span className={excerpt.length < 10 ? "text-destructive text-xs" : "text-muted-foreground text-xs"}>({excerpt.length}/10 min)</span>
            </Label>
            <Textarea
              id="excerpt"
              value={excerpt}
              onChange={e => setExcerpt(e.target.value)}
              placeholder="Krótkie streszczenie artykułu..."
              rows={3}
              minLength={10}
              required
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="space-y-2 w-32">
              <Label htmlFor="readingTime">Czas czytania (min)</Label>
              <Input
                id="readingTime"
                type="number"
                min={1}
                value={readingTime}
                onChange={e => setReadingTime(Math.max(1, Number(e.target.value)))}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-6">
              Ten artykuł przeczytasz w ~{readingTime} min
            </p>
          </div>
        </CardContent>
      </Card>

      {/* SEO */}
      <Card>
        <CardHeader>
          <CardTitle>Ustawienia SEO</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">Optymalnie: tytuł 50-60 znaków, opis 140-155 znaków</p>
          <div className="space-y-2">
            <Label htmlFor="metaTitle">
              Meta tytuł <span className="text-muted-foreground text-xs">({metaTitle.length}/70)</span>
            </Label>
            <Input
              id="metaTitle"
              value={metaTitle}
              onChange={e => setMetaTitle(e.target.value.slice(0, 70))}
              placeholder="Zostaw puste = użyje tytułu artykułu"
              maxLength={70}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="metaDescription">
              Meta opis <span className="text-muted-foreground text-xs">({metaDescription.length}/160)</span>
            </Label>
            <Textarea
              id="metaDescription"
              value={metaDescription}
              onChange={e => setMetaDescription(e.target.value.slice(0, 160))}
              placeholder="Krótki opis dla wyszukiwarek..."
              rows={3}
              maxLength={160}
            />
          </div>
        </CardContent>
      </Card>

      {/* Category */}
      <Card>
        <CardHeader>
          <CardTitle>Kategoria</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="category">Kategoria artykułu</Label>
            <Input
              id="category"
              list="category-suggestions"
              value={category}
              onChange={e => setCategory(e.target.value)}
              placeholder="np. Zabiegi na twarz, Pielęgnacja skóry..."
            />
            <datalist id="category-suggestions">
              {existingCategories.map(cat => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>
          {category && (
            <span className="inline-flex text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
              {category}
            </span>
          )}
        </CardContent>
      </Card>

      {/* Tags */}
      <Card>
        <CardHeader>
          <CardTitle>Tagi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="tags">Tagi (oddziel przecinkami)</Label>
            <Input
              id="tags"
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="np. pielęgnacja, makijaż, trendy..."
            />
          </div>
          {tagList.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tagList.map(tag => (
                <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom save buttons */}
      <div className="flex gap-2 pb-8">
        <Button variant="outline" onClick={() => navigate('/admin/blog')}>Anuluj</Button>
        <Button variant="outline" onClick={() => handleSubmit(false)} disabled={isPending}>
          Zapisz szkic
        </Button>
        <Button onClick={() => handleSubmit(true)} disabled={isPending}>
          Opublikuj
        </Button>
      </div>
    </div>
  );
};
