import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { heroApi, SlideButton } from '@/api/hero.api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { queryClient } from '@/lib/queryClient';
import { Star, Trash2, Eye, EyeOff, Upload, X, Pencil, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const TARGET_RATIO = 16 / 9;

const DESTINATIONS = [
  { label: 'Usługi', href: '/uslugi' },
  { label: 'Rezerwacja online', href: '/user/wizyty' },
  { label: 'Galeria przed/po', href: '/metamorfozy' },
  { label: 'Blog', href: '/blog' },
  { label: 'Program lojalnościowy', href: '/program-lojalnosciowy' },
  { label: 'Zarejestruj się', href: '/auth/register' },
  { label: 'Zaloguj się', href: '/auth/login' },
  { label: 'Panel klienta', href: '/user' },
];

const POSITION_GRID = [
  ['top-left', 'top-center', 'top-right'],
  ['middle-left', 'middle-center', 'middle-right'],
  ['bottom-left', 'bottom-center', 'bottom-right'],
];

const POSITION_ICONS: Record<string, string> = {
  'top-left': '↖', 'top-center': '↑', 'top-right': '↗',
  'middle-left': '←', 'middle-center': '●', 'middle-right': '→',
  'bottom-left': '↙', 'bottom-center': '↓', 'bottom-right': '↘',
};

const PREVIEW_POSITION_CLASSES: Record<string, string> = {
  'top-left': 'items-start justify-start text-left',
  'top-center': 'items-start justify-center text-center',
  'top-right': 'items-start justify-end text-right',
  'middle-left': 'items-center justify-start text-left',
  'middle-center': 'items-center justify-center text-center',
  'middle-right': 'items-center justify-end text-right',
  'bottom-left': 'items-end justify-start text-left',
  'bottom-center': 'items-end justify-center text-center',
  'bottom-right': 'items-end justify-end text-right',
};

const PREVIEW_BUTTON_JUSTIFY_CLASSES: Record<string, string> = {
  'top-left': 'justify-start',
  'top-center': 'justify-center',
  'top-right': 'justify-end',
  'middle-left': 'justify-start',
  'middle-center': 'justify-center',
  'middle-right': 'justify-end',
  'bottom-left': 'justify-start',
  'bottom-center': 'justify-center',
  'bottom-right': 'justify-end',
};

const PREVIEW_FONT_CLASSES: Record<string, string> = {
  heading: 'font-heading',
  sans: 'font-sans',
  elegant: 'font-light italic',
};

interface ButtonRow extends SlideButton {
  customHref?: boolean;
}

const emptyButton = (): ButtonRow => ({ label: '', href: DESTINATIONS[0].href, variant: 'default' });

const SlideVisualPreview = ({
  imagePath,
  title,
  heading,
  subtitle,
  textPosition,
  fontStyle,
  buttons,
}: {
  imagePath: string;
  title?: string | null;
  heading?: string | null;
  subtitle?: string | null;
  textPosition?: string | null;
  fontStyle?: string | null;
  buttons?: SlideButton[] | null;
}) => {
  const pos = textPosition ?? 'middle-center';
  const posClass = PREVIEW_POSITION_CLASSES[pos] ?? PREVIEW_POSITION_CLASSES['middle-center'];
  const buttonJustify = PREVIEW_BUTTON_JUSTIFY_CLASSES[pos] ?? 'justify-start';
  const fontClass = PREVIEW_FONT_CLASSES[fontStyle ?? 'heading'] ?? PREVIEW_FONT_CLASSES.heading;

  return (
    <div className="relative h-52 overflow-hidden bg-muted sm:h-60">
      <img
        src={imagePath}
        alt={title ?? 'Slajd'}
        className="h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-espresso/20 via-espresso/25 to-espresso/80" />
      <div className={cn('absolute inset-0 flex p-4', posClass)}>
        <div className="max-w-[78%]">
          {heading && (
            <h3 className={cn('text-lg font-bold leading-tight text-white drop-shadow sm:text-xl', fontClass)}>
              {heading}
            </h3>
          )}
          {subtitle && (
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-white/90 drop-shadow">
              {subtitle}
            </p>
          )}
          {buttons && buttons.length > 0 && (
            <div className={cn('mt-3 flex flex-wrap gap-2', buttonJustify)}>
              {buttons.slice(0, 2).map((btn, i) => (
                <span
                  key={`${btn.label}-${i}`}
                  className={cn(
                    'rounded px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.18em]',
                    btn.variant === 'outline'
                      ? 'border border-white/70 bg-white/10 text-white'
                      : 'bg-espresso text-ivory'
                  )}
                >
                  {btn.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Reusable content fields component
const ContentFields = ({
  heading, setHeading,
  subtitle, setSubtitle,
  fontStyle, setFontStyle,
  textPosition, setTextPosition,
  buttons, setButtons,
}: {
  heading: string; setHeading: (v: string) => void;
  subtitle: string; setSubtitle: (v: string) => void;
  fontStyle: string; setFontStyle: (v: string) => void;
  textPosition: string; setTextPosition: (v: string) => void;
  buttons: ButtonRow[]; setButtons: (v: ButtonRow[]) => void;
}) => {
  const addButton = () => setButtons([...buttons, emptyButton()]);
  const removeButton = (i: number) => setButtons(buttons.filter((_, idx) => idx !== i));
  const updateButton = (i: number, patch: Partial<ButtonRow>) =>
    setButtons(buttons.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Nagłówek na zdjęciu (opcjonalny)</label>
        <input
          type="text"
          value={heading}
          onChange={(e) => setHeading(e.target.value)}
          placeholder="np. Odkryj Piękno i Relaks"
          className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Podtytuł (opcjonalny)</label>
        <textarea
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          placeholder="np. Nowoczesny gabinet kosmetologiczny..."
          rows={2}
          className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Styl czcionki</label>
        <select
          value={fontStyle}
          onChange={(e) => setFontStyle(e.target.value)}
          className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="heading">Elegancki (serif)</option>
          <option value="sans">Nowoczesny (sans-serif)</option>
          <option value="elegant">Delikatny (light italic)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Pozycja tekstu</label>
        <div className="inline-grid grid-cols-3 gap-1">
          {POSITION_GRID.map((row) =>
            row.map((pos) => (
              <button
                key={pos}
                type="button"
                onClick={() => setTextPosition(pos)}
                className={cn(
                  'w-10 h-10 text-lg rounded border transition-colors',
                  textPosition === pos
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-muted border-border'
                )}
                title={pos}
              >
                {POSITION_ICONS[pos]}
              </button>
            ))
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Przyciski CTA</label>
        <div className="space-y-2">
          {buttons.map((btn, i) => (
            <div key={i} className="flex flex-wrap gap-2 items-center p-2 border rounded-md bg-muted/30">
              <input
                type="text"
                value={btn.label}
                onChange={(e) => updateButton(i, { label: e.target.value })}
                placeholder="Tekst przycisku"
                className="border rounded px-2 py-1 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary w-36"
              />
              <select
                value={btn.customHref ? '__custom' : btn.href}
                onChange={(e) => {
                  if (e.target.value === '__custom') {
                    updateButton(i, { customHref: true, href: '' });
                  } else {
                    updateButton(i, { customHref: false, href: e.target.value });
                  }
                }}
                className="border rounded px-2 py-1 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {DESTINATIONS.map((d) => (
                  <option key={d.href} value={d.href}>{d.label}</option>
                ))}
                <option value="__custom">Własny URL...</option>
              </select>
              {btn.customHref && (
                <input
                  type="text"
                  value={btn.href}
                  onChange={(e) => updateButton(i, { href: e.target.value })}
                  placeholder="/twoj-url"
                  className="border rounded px-2 py-1 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary w-36"
                />
              )}
              <select
                value={btn.variant}
                onChange={(e) => updateButton(i, { variant: e.target.value as 'default' | 'outline' })}
                className="border rounded px-2 py-1 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="default">Główny</option>
                <option value="outline">Outline</option>
              </select>
              <button
                type="button"
                onClick={() => removeButton(i)}
                className="text-destructive hover:opacity-70 ml-auto"
              >
                <X size={16} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addButton}
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <Plus size={14} />
            Dodaj przycisk
          </button>
        </div>
      </div>
    </div>
  );
};

// Inline edit panel per slide
const SlideEditPanel = ({ slideId, initial }: {
  slideId: string;
  initial: {
    heading?: string | null;
    subtitle?: string | null;
    fontStyle?: string | null;
    textPosition?: string | null;
    buttons?: SlideButton[] | null;
  };
}) => {
  const [heading, setHeading] = useState(initial.heading ?? '');
  const [subtitle, setSubtitle] = useState(initial.subtitle ?? '');
  const [fontStyle, setFontStyle] = useState(initial.fontStyle ?? 'heading');
  const [textPosition, setTextPosition] = useState(initial.textPosition ?? 'middle-center');
  const [buttons, setButtons] = useState<ButtonRow[]>(
    (initial.buttons ?? []).map((b) => ({ ...b, customHref: !DESTINATIONS.some((d) => d.href === b.href) }))
  );

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof heroApi.updateSlide>[1]) => heroApi.updateSlide(slideId, data),
    onSuccess: () => {
      toast.success('Zapisano zmiany');
      queryClient.invalidateQueries({ queryKey: ['hero-slides-all'] });
      queryClient.invalidateQueries({ queryKey: ['hero-slides'] });
    },
    onError: () => toast.error('Błąd podczas zapisywania'),
  });

  const handleSave = () => {
    const cleanButtons: SlideButton[] = buttons
      .filter((b) => b.label.trim() && b.href.trim())
      .map(({ label, href, variant }) => ({ label, href, variant }));
    updateMutation.mutate({
      heading: heading.trim() || undefined,
      subtitle: subtitle.trim() || undefined,
      fontStyle,
      textPosition,
      buttons: cleanButtons.length > 0 ? cleanButtons : null,
    });
  };

  return (
    <div className="p-4 border-t bg-muted/20 space-y-4">
      <ContentFields
        heading={heading} setHeading={setHeading}
        subtitle={subtitle} setSubtitle={setSubtitle}
        fontStyle={fontStyle} setFontStyle={setFontStyle}
        textPosition={textPosition} setTextPosition={setTextPosition}
        buttons={buttons} setButtons={setButtons}
      />
      <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
        {updateMutation.isPending ? 'Zapisywanie...' : 'Zapisz treść'}
      </Button>
    </div>
  );
};

export const AdminHeroSlides = () => {
  const [title, setTitle] = useState('');
  const [heading, setHeading] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [fontStyle, setFontStyle] = useState('heading');
  const [textPosition, setTextPosition] = useState('middle-center');
  const [buttons, setButtons] = useState<ButtonRow[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imgNaturalSize, setImgNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragStart = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: slides = [], isLoading } = useQuery({
    queryKey: ['hero-slides-all'],
    queryFn: heroApi.getAllSlides,
  });

  const createMutation = useMutation({
    mutationFn: (fd: FormData) => heroApi.createSlide(fd),
    onSuccess: () => {
      toast.success('Zdjęcie dodano pomyślnie');
      queryClient.invalidateQueries({ queryKey: ['hero-slides-all'] });
      queryClient.invalidateQueries({ queryKey: ['hero-slides'] });
      setTitle('');
      setHeading('');
      setSubtitle('');
      setFontStyle('heading');
      setTextPosition('middle-center');
      setButtons([]);
      setSelectedFile(null);
      setPreview(null);
      setImgNaturalSize(null);
      setOffset({ x: 0, y: 0 });
    },
    onError: () => toast.error('Błąd podczas dodawania zdjęcia'),
  });

  const setMainMutation = useMutation({
    mutationFn: heroApi.setMain,
    onSuccess: () => {
      toast.success('Ustawiono jako główne');
      queryClient.invalidateQueries({ queryKey: ['hero-slides-all'] });
      queryClient.invalidateQueries({ queryKey: ['hero-slides'] });
    },
    onError: () => toast.error('Błąd'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      heroApi.updateSlide(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hero-slides-all'] });
      queryClient.invalidateQueries({ queryKey: ['hero-slides'] });
    },
    onError: () => toast.error('Błąd'),
  });

  const deleteMutation = useMutation({
    mutationFn: heroApi.deleteSlide,
    onSuccess: () => {
      toast.success('Usunięto');
      queryClient.invalidateQueries({ queryKey: ['hero-slides-all'] });
      queryClient.invalidateQueries({ queryKey: ['hero-slides'] });
    },
    onError: () => toast.error('Błąd podczas usuwania'),
  });

  const imgRatio = imgNaturalSize ? imgNaturalSize.w / imgNaturalSize.h : TARGET_RATIO;
  const isExact169 = imgNaturalSize ? Math.abs(imgRatio - TARGET_RATIO) < 0.02 : false;
  const canDrag = imgNaturalSize != null && !isExact169;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setOffset({ x: 0, y: 0 });
    setImgNaturalSize(null);
    if (file) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      const img = new Image();
      img.onload = () => setImgNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
      img.src = url;
    } else {
      setPreview(null);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!canDrag) return;
    e.preventDefault();
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: offset.x, oy: offset.y };
    setIsDragging(true);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragStart.current || !containerRef.current || !imgNaturalSize) return;
    const cW = containerRef.current.offsetWidth;
    const cH = containerRef.current.offsetHeight;
    const iRatio = imgNaturalSize.w / imgNaturalSize.h;

    let dispW: number, dispH: number;
    if (iRatio > TARGET_RATIO) {
      dispH = cH;
      dispW = cH * iRatio;
    } else {
      dispW = cW;
      dispH = cW / iRatio;
    }

    const dx = e.clientX - dragStart.current.mx;
    const dy = e.clientY - dragStart.current.my;
    let newX = dragStart.current.ox + dx;
    let newY = dragStart.current.oy + dy;
    newX = Math.max(-(dispW - cW), Math.min(0, newX));
    newY = Math.max(-(dispH - cH), Math.min(0, newY));
    setOffset({ x: newX, y: newY });
  }, [imgNaturalSize]);

  const handleMouseUp = useCallback(() => {
    dragStart.current = null;
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!canDrag) return;
    const touch = e.touches[0];
    dragStart.current = { mx: touch.clientX, my: touch.clientY, ox: offset.x, oy: offset.y };
    setIsDragging(true);
  };

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!dragStart.current || !containerRef.current || !imgNaturalSize) return;
    e.preventDefault();
    const touch = e.touches[0];
    const cW = containerRef.current.offsetWidth;
    const cH = containerRef.current.offsetHeight;
    const iRatio = imgNaturalSize.w / imgNaturalSize.h;

    let dispW: number, dispH: number;
    if (iRatio > TARGET_RATIO) {
      dispH = cH;
      dispW = cH * iRatio;
    } else {
      dispW = cW;
      dispH = cW / iRatio;
    }

    const dx = touch.clientX - dragStart.current.mx;
    const dy = touch.clientY - dragStart.current.my;
    let newX = dragStart.current.ox + dx;
    let newY = dragStart.current.oy + dy;
    newX = Math.max(-(dispW - cW), Math.min(0, newX));
    newY = Math.max(-(dispH - cH), Math.min(0, newY));
    setOffset({ x: newX, y: newY });
  }, [imgNaturalSize]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, handleTouchMove, handleMouseUp]);

  const clearFile = () => {
    setSelectedFile(null);
    setPreview(null);
    setImgNaturalSize(null);
    setOffset({ x: 0, y: 0 });
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) { toast.error('Wybierz zdjęcie'); return; }
    const fd = new FormData();
    fd.append('image', selectedFile);
    if (title.trim()) fd.append('title', title.trim());
    if (heading.trim()) fd.append('heading', heading.trim());
    if (subtitle.trim()) fd.append('subtitle', subtitle.trim());
    fd.append('textPosition', textPosition);
    fd.append('fontStyle', fontStyle);
    const cleanButtons: SlideButton[] = buttons
      .filter((b) => b.label.trim() && b.href.trim())
      .map(({ label, href, variant }) => ({ label, href, variant }));
    if (cleanButtons.length > 0) fd.append('buttons', JSON.stringify(cleanButtons));

    let cropX = 50;
    let cropY = 50;
    if (containerRef.current && imgNaturalSize && !isExact169) {
      const cW = containerRef.current.offsetWidth;
      const cH = containerRef.current.offsetHeight;
      const iRatio = imgNaturalSize.w / imgNaturalSize.h;
      if (iRatio > TARGET_RATIO) {
        const dispW = cH * iRatio;
        const maxLeft = dispW - cW;
        if (maxLeft > 0) cropX = Math.round((-offset.x / maxLeft) * 100);
      } else {
        const dispH = cW / iRatio;
        const maxTop = dispH - cH;
        if (maxTop > 0) cropY = Math.round((-offset.y / maxTop) * 100);
      }
    }
    fd.append('cropX', String(cropX));
    fd.append('cropY', String(cropY));
    createMutation.mutate(fd);
  };

  return (
    <div className="space-y-8 animate-enter">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-heading font-bold text-primary">Slider w sekcji głównej</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Slajdy pojawiają się teraz jako kompaktowa karta w prawym panelu strony głównej, obok nagłówka
          i najbliższego terminu. To nie jest już pełnoekranowy baner, więc tekst powinien być krótki i czytelny.
        </p>
      </div>

      {/* Upload form */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-1">Dodaj nowe zdjęcie</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Zalecany rozmiar: <span className="font-medium text-foreground">1920 × 1080 px</span> (proporcje 16:9).
            Na stronie zdjęcie będzie pokazane w mniejszej karcie hero. Zdjęcia w innym formacie — przeciągnij,
            aby wybrać widoczny fragment.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tytuł (opcjonalny, alt-text)</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="np. Promocja letnia"
                className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <ContentFields
              heading={heading} setHeading={setHeading}
              subtitle={subtitle} setSubtitle={setSubtitle}
              fontStyle={fontStyle} setFontStyle={setFontStyle}
              textPosition={textPosition} setTextPosition={setTextPosition}
              buttons={buttons} setButtons={setButtons}
            />

            <div>
              <label className="block text-sm font-medium mb-1">Zdjęcie</label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              {preview ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {canDrag
                      ? 'Przeciągnij zdjęcie aby wybrać kadr'
                      : 'Zdjęcie wypełnia kadr idealnie'}
                  </p>
                  <div className="relative">
                    <div
                      ref={containerRef}
                      className="relative w-full overflow-hidden rounded-lg border bg-muted select-none"
                      style={{
                        aspectRatio: '16/9',
                        cursor: canDrag ? (isDragging ? 'grabbing' : 'grab') : 'default',
                      }}
                      onMouseDown={handleMouseDown}
                      onTouchStart={handleTouchStart}
                    >
                      {imgNaturalSize ? (
                        <img
                          src={preview}
                          alt="podgląd"
                          draggable={false}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            ...(imgRatio > TARGET_RATIO
                              ? { height: '100%', width: 'auto' }
                              : { width: '100%', height: 'auto' }),
                            transform: `translate(${offset.x}px, ${offset.y}px)`,
                            userSelect: 'none',
                            pointerEvents: 'none',
                          }}
                        />
                      ) : (
                        <img
                          src={preview}
                          alt="podgląd"
                          className="w-full h-full object-cover"
                          draggable={false}
                        />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={clearFile}
                      className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-0.5 hover:opacity-80 z-10"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 border-2 border-dashed border-muted-foreground/30 rounded-lg px-6 py-4 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  <Upload size={16} />
                  Kliknij aby wybrać zdjęcie
                </button>
              )}
            </div>

            <Button type="submit" disabled={createMutation.isPending || !selectedFile}>
              {createMutation.isPending ? 'Dodawanie...' : 'Dodaj zdjęcie'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Slides grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Zarządzaj slajdami ({slides.length})</h2>
        {isLoading ? (
          <div className="animate-pulse text-muted-foreground">Ładowanie...</div>
        ) : slides.length === 0 ? (
          <p className="text-muted-foreground">Brak slajdów. Dodaj pierwsze zdjęcie powyżej.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {slides.map((slide) => (
              <Card
                key={slide.id}
                className={cn(
                  'overflow-hidden transition-all',
                  slide.isMain && 'ring-2 ring-primary',
                  !slide.isActive && 'opacity-60'
                )}
              >
                <CardContent className="p-0">
                  <div className="relative bg-muted">
                    <SlideVisualPreview
                      imagePath={slide.imagePath}
                      title={slide.title}
                      heading={slide.heading}
                      subtitle={slide.subtitle}
                      textPosition={slide.textPosition}
                      fontStyle={slide.fontStyle}
                      buttons={slide.buttons}
                    />
                    {slide.isMain && (
                      <div className="absolute top-2 left-2 bg-primary text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Star size={10} fill="white" />
                        Główne
                      </div>
                    )}
                    {!slide.isActive && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="text-white text-sm font-medium bg-black/60 px-3 py-1 rounded-full">Ukryte</span>
                      </div>
                    )}
                  </div>

                  <div className="p-4 space-y-3">
                    {slide.title && (
                      <p className="text-sm font-medium truncate text-muted-foreground">{slide.title}</p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {!slide.isMain && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => setMainMutation.mutate(slide.id)}
                          disabled={setMainMutation.isPending}
                        >
                          <Star size={12} className="mr-1" />
                          Ustaw główne
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => toggleActiveMutation.mutate({ id: slide.id, isActive: !slide.isActive })}
                        disabled={toggleActiveMutation.isPending}
                      >
                        {slide.isActive ? (
                          <><EyeOff size={12} className="mr-1" />Ukryj</>
                        ) : (
                          <><Eye size={12} className="mr-1" />Pokaż</>
                        )}
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => setEditingId(editingId === slide.id ? null : slide.id)}
                      >
                        <Pencil size={12} className="mr-1" />
                        Edytuj treść
                      </Button>

                      <Button
                        size="sm"
                        variant="destructive"
                        className="text-xs ml-auto"
                        onClick={() => { if (confirm('Usunąć ten slajd?')) deleteMutation.mutate(slide.id); }}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 size={12} className="mr-1" />
                        Usuń
                      </Button>
                    </div>
                  </div>

                  {editingId === slide.id && (
                    <SlideEditPanel
                      key={slide.id}
                      slideId={slide.id}
                      initial={{
                        heading: slide.heading,
                        subtitle: slide.subtitle,
                        fontStyle: slide.fontStyle,
                        textPosition: slide.textPosition,
                        buttons: slide.buttons,
                      }}
                    />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
