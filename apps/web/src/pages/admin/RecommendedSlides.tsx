import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { recommendedSlidesApi, RecommendedSlide } from '@/api/recommended-slides.api';
import { servicesApi } from '@/api/services.api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { queryClient } from '@/lib/queryClient';
import { Trash2, Eye, EyeOff, Upload, X, Pencil, ChevronUp, ChevronDown } from 'lucide-react';

const TARGET_RATIO = 16 / 9;

export const AdminRecommendedSlides = () => {
  const [serviceId, setServiceId] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imgNaturalSize, setImgNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const dragStart = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: slides = [], isLoading } = useQuery({
    queryKey: ['recommended-slides-all'],
    queryFn: recommendedSlidesApi.getAllSlides,
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: servicesApi.getAll,
  });

  const activeServices = services.filter((s: any) => s.isActive);

  const createMutation = useMutation({
    mutationFn: (fd: FormData) => recommendedSlidesApi.createSlide(fd),
    onSuccess: () => {
      toast.success('Dodano polecany zabieg');
      queryClient.invalidateQueries({ queryKey: ['recommended-slides-all'] });
      queryClient.invalidateQueries({ queryKey: ['recommended-slides'] });
      setServiceId('');
      setDescription('');
      setSelectedFile(null);
      setPreview(null);
      setImgNaturalSize(null);
      setOffset({ x: 0, y: 0 });
    },
    onError: () => toast.error('Błąd podczas dodawania'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof recommendedSlidesApi.updateSlide>[1] }) =>
      recommendedSlidesApi.updateSlide(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recommended-slides-all'] });
      queryClient.invalidateQueries({ queryKey: ['recommended-slides'] });
    },
    onError: () => toast.error('Błąd'),
  });

  const deleteMutation = useMutation({
    mutationFn: recommendedSlidesApi.deleteSlide,
    onSuccess: () => {
      toast.success('Usunięto');
      queryClient.invalidateQueries({ queryKey: ['recommended-slides-all'] });
      queryClient.invalidateQueries({ queryKey: ['recommended-slides'] });
    },
    onError: () => toast.error('Błąd podczas usuwania'),
  });

  // --- Crop logic ---
  const getCropPercent = () => {
    if (!imgNaturalSize || !containerRef.current) return { cropX: 50, cropY: 50 };
    const cw = containerRef.current.offsetWidth;
    const ch = cw / TARGET_RATIO;
    const imgRatio = imgNaturalSize.w / imgNaturalSize.h;
    if (imgRatio > TARGET_RATIO) {
      const displayedImgH = ch;
      const displayedImgW = displayedImgH * imgRatio;
      const maxOx = displayedImgW - cw;
      const cropX = maxOx > 0 ? Math.round((Math.max(0, Math.min(offset.x, maxOx)) / maxOx) * 100) : 50;
      return { cropX, cropY: 50 };
    } else {
      const displayedImgW = cw;
      const displayedImgH = displayedImgW / imgRatio;
      const maxOy = displayedImgH - ch;
      const cropY = maxOy > 0 ? Math.round((Math.max(0, Math.min(offset.y, maxOy)) / maxOy) * 100) : 50;
      return { cropX: 50, cropY };
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setOffset({ x: 0, y: 0 });
    const url = URL.createObjectURL(file);
    setPreview(url);
    const img = new Image();
    img.onload = () => setImgNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = url;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: offset.x, oy: offset.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStart.current || !imgNaturalSize || !containerRef.current) return;
    const cw = containerRef.current.offsetWidth;
    const ch = cw / TARGET_RATIO;
    const imgRatio = imgNaturalSize.w / imgNaturalSize.h;
    const dx = e.clientX - dragStart.current.mx;
    const dy = e.clientY - dragStart.current.my;
    if (imgRatio > TARGET_RATIO) {
      const displayedImgH = ch;
      const displayedImgW = displayedImgH * imgRatio;
      const maxOx = displayedImgW - cw;
      setOffset({ x: Math.max(0, Math.min(dragStart.current.ox - dx, maxOx)), y: 0 });
    } else {
      const displayedImgW = cw;
      const displayedImgH = displayedImgW / imgRatio;
      const maxOy = displayedImgH - ch;
      setOffset({ x: 0, y: Math.max(0, Math.min(dragStart.current.oy - dy, maxOy)) });
    }
  };

  const handleMouseUp = () => { setIsDragging(false); dragStart.current = null; };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !serviceId || !description.trim()) {
      toast.error('Wypełnij wszystkie pola i dodaj zdjęcie');
      return;
    }
    const { cropX, cropY } = getCropPercent();
    const fd = new FormData();
    fd.append('image', selectedFile);
    fd.append('serviceId', serviceId);
    fd.append('description', description.trim());
    fd.append('cropX', String(cropX));
    fd.append('cropY', String(cropY));
    createMutation.mutate(fd);
  };

  const moveSlide = (slide: RecommendedSlide, direction: 'up' | 'down') => {
    const sorted = [...slides].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((s) => s.id === slide.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const other = sorted[swapIdx];
    updateMutation.mutate({ id: slide.id, data: { order: other.order } });
    updateMutation.mutate({ id: other.id, data: { order: slide.order } });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Polecane zabiegi</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Zabiegi widoczne w dashboardzie klienta jako slider nad przyciskiem rezerwacji.
        </p>
      </div>

      {/* Add form */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-4">Dodaj polecany zabieg</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Zabieg</label>
              <select
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                required
              >
                <option value="">— wybierz zabieg —</option>
                {activeServices.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Dlaczego teraz? (krótki opis)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="np. Idealne na wiosnę — oczyszcza i rozświetla skórę po zimie"
                rows={2}
                maxLength={150}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">{description.length}/150</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Zdjęcie tła (16:9)</label>
              {!preview ? (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full border-2 border-dashed rounded-lg p-8 text-center text-sm text-muted-foreground hover:bg-muted/30 transition-colors flex flex-col items-center gap-2"
                >
                  <Upload size={24} />
                  Kliknij aby wybrać zdjęcie
                </button>
              ) : (
                <div className="space-y-2">
                  <div
                    ref={containerRef}
                    className="relative w-full overflow-hidden rounded-lg cursor-grab active:cursor-grabbing select-none"
                    style={{ aspectRatio: '16/9', background: '#111' }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                  >
                    {imgNaturalSize && containerRef.current && (() => {
                      const cw = containerRef.current!.offsetWidth;
                      const ch = cw / TARGET_RATIO;
                      const imgRatio = imgNaturalSize.w / imgNaturalSize.h;
                      let imgW: number, imgH: number;
                      if (imgRatio > TARGET_RATIO) {
                        imgH = ch; imgW = ch * imgRatio;
                      } else {
                        imgW = cw; imgH = cw / imgRatio;
                      }
                      return (
                        <img
                          src={preview}
                          alt="preview"
                          draggable={false}
                          style={{
                            position: 'absolute',
                            width: imgW,
                            height: imgH,
                            left: -offset.x,
                            top: -offset.y,
                            pointerEvents: 'none',
                          }}
                        />
                      );
                    })()}
                    <div className="absolute inset-0 ring-2 ring-primary/50 rounded-lg pointer-events-none" />
                    <p className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs bg-black/60 text-white px-2 py-1 rounded pointer-events-none">
                      Przeciągnij aby wybrać kadr
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedFile(null); setPreview(null); setImgNaturalSize(null); setOffset({ x: 0, y: 0 }); }}
                    className="flex items-center gap-1 text-sm text-destructive hover:underline"
                  >
                    <X size={14} /> Usuń zdjęcie
                  </button>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>

            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Dodawanie...' : 'Dodaj polecany zabieg'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Slides list */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Aktywne slajdy ({slides.length})</h2>
        {isLoading && <p className="text-sm text-muted-foreground">Ładowanie...</p>}
        {slides.length === 0 && !isLoading && (
          <p className="text-sm text-muted-foreground">Brak polecanych zabiegów. Dodaj pierwszy powyżej.</p>
        )}
        {[...slides].sort((a, b) => a.order - b.order).map((slide, idx, arr) => (
          <Card key={slide.id} className={!slide.isActive ? 'opacity-60' : ''}>
            <CardContent className="pt-4 pb-4">
              <div className="flex gap-3 items-start">
                {/* Thumbnail */}
                <img
                  src={slide.imagePath}
                  alt={slide.service.name}
                  className="w-24 h-14 object-cover rounded-md shrink-0"
                />
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{slide.service.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{slide.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    od {Number(slide.service.price).toFixed(0)} zł · {slide.service.category}
                  </p>
                </div>
                {/* Actions */}
                <div className="flex flex-col gap-1 shrink-0">
                  <div className="flex gap-1">
                    <button
                      title="W górę"
                      disabled={idx === 0}
                      onClick={() => moveSlide(slide, 'up')}
                      className="p-1.5 rounded hover:bg-muted disabled:opacity-30"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      title="W dół"
                      disabled={idx === arr.length - 1}
                      onClick={() => moveSlide(slide, 'down')}
                      className="p-1.5 rounded hover:bg-muted disabled:opacity-30"
                    >
                      <ChevronDown size={14} />
                    </button>
                    <button
                      title={slide.isActive ? 'Ukryj' : 'Pokaż'}
                      onClick={() => updateMutation.mutate({ id: slide.id, data: { isActive: !slide.isActive } })}
                      className="p-1.5 rounded hover:bg-muted"
                    >
                      {slide.isActive ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <button
                      title="Edytuj opis"
                      onClick={() => { setEditingId(editingId === slide.id ? null : slide.id); setEditDesc(slide.description); }}
                      className="p-1.5 rounded hover:bg-muted"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      title="Usuń"
                      onClick={() => { if (confirm('Usunąć ten polecany zabieg?')) deleteMutation.mutate(slide.id); }}
                      className="p-1.5 rounded hover:bg-muted text-destructive"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Inline edit panel */}
              {editingId === slide.id && (
                <div className="mt-3 pt-3 border-t space-y-2">
                  <textarea
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    rows={2}
                    maxLength={150}
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      updateMutation.mutate({ id: slide.id, data: { description: editDesc.trim() } });
                      setEditingId(null);
                      toast.success('Zapisano');
                    }}
                    disabled={updateMutation.isPending}
                  >
                    Zapisz opis
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
