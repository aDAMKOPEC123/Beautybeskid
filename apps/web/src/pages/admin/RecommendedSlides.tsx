import { useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Eye, EyeOff, Pencil, Trash2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { recommendedSlidesApi, RecommendedSlide } from '@/api/recommended-slides.api';
import { servicesApi } from '@/api/services.api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { queryClient } from '@/lib/queryClient';

const TARGET_RATIO = 16 / 9;
const MAX_UPLOAD_MB = 5;

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

  const activeServices = services.filter((service: any) => service.isActive);

  const clearSelectedImage = () => {
    if (preview?.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }
    setSelectedFile(null);
    setPreview(null);
    setImgNaturalSize(null);
    setOffset({ x: 0, y: 0 });
    if (fileRef.current) fileRef.current.value = '';
  };

  const resetForm = () => {
    clearSelectedImage();
    setServiceId('');
    setDescription('');
  };

  const createMutation = useMutation({
    mutationFn: (fd: FormData) => recommendedSlidesApi.createSlide(fd),
    onSuccess: () => {
      toast.success('Dodano polecany zabieg');
      queryClient.invalidateQueries({ queryKey: ['recommended-slides-all'] });
      queryClient.invalidateQueries({ queryKey: ['recommended-slides'] });
      resetForm();
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Błąd podczas dodawania'),
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

  const getCropPercent = () => {
    if (!imgNaturalSize || !containerRef.current) return { cropX: 50, cropY: 50 };

    const containerWidth = containerRef.current.offsetWidth;
    const containerHeight = containerWidth / TARGET_RATIO;
    const imageRatio = imgNaturalSize.w / imgNaturalSize.h;

    if (imageRatio > TARGET_RATIO) {
      const displayedImgHeight = containerHeight;
      const displayedImgWidth = displayedImgHeight * imageRatio;
      const maxOffsetX = displayedImgWidth - containerWidth;
      const cropX = maxOffsetX > 0 ? Math.round((Math.max(0, Math.min(offset.x, maxOffsetX)) / maxOffsetX) * 100) : 50;
      return { cropX, cropY: 50 };
    }

    const displayedImgWidth = containerWidth;
    const displayedImgHeight = displayedImgWidth / imageRatio;
    const maxOffsetY = displayedImgHeight - containerHeight;
    const cropY = maxOffsetY > 0 ? Math.round((Math.max(0, Math.min(offset.y, maxOffsetY)) / maxOffsetY) * 100) : 50;
    return { cropX: 50, cropY };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      toast.error(`Plik jest za duży. Maksymalny rozmiar to ${MAX_UPLOAD_MB} MB.`);
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    if (preview?.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }

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

    const containerWidth = containerRef.current.offsetWidth;
    const containerHeight = containerWidth / TARGET_RATIO;
    const imageRatio = imgNaturalSize.w / imgNaturalSize.h;
    const deltaX = e.clientX - dragStart.current.mx;
    const deltaY = e.clientY - dragStart.current.my;

    if (imageRatio > TARGET_RATIO) {
      const displayedImgHeight = containerHeight;
      const displayedImgWidth = displayedImgHeight * imageRatio;
      const maxOffsetX = displayedImgWidth - containerWidth;
      setOffset({
        x: Math.max(0, Math.min(dragStart.current.ox - deltaX, maxOffsetX)),
        y: 0,
      });
      return;
    }

    const displayedImgWidth = containerWidth;
    const displayedImgHeight = displayedImgWidth / imageRatio;
    const maxOffsetY = displayedImgHeight - containerHeight;
    setOffset({
      x: 0,
      y: Math.max(0, Math.min(dragStart.current.oy - deltaY, maxOffsetY)),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragStart.current = null;
  };

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
    const index = sorted.findIndex((item) => item.id === slide.id);
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= sorted.length) return;

    const other = sorted[swapIndex];
    updateMutation.mutate({ id: slide.id, data: { order: other.order } });
    updateMutation.mutate({ id: other.id, data: { order: slide.order } });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Polecane zabiegi</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Zabiegi widoczne w dashboardzie klienta jako slider nad przyciskiem rezerwacji.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <h2 className="mb-4 text-lg font-semibold">Dodaj polecany zabieg</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Zabieg</label>
              <select
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                required
              >
                <option value="">-- wybierz zabieg --</option>
                {activeServices.map((service: any) => (
                  <option key={service.id} value={service.id}>
                    {service.name} ({service.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Dlaczego teraz? (krótki opis)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="np. Idealne na wiosnę - oczyszcza i rozświetla skórę po zimie"
                rows={2}
                maxLength={150}
                className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">{description.length}/150</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Zdjęcie tła (16:9, max 5 MB)</label>
              {!preview ? (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 text-center text-sm text-muted-foreground transition-colors hover:bg-muted/30"
                >
                  <Upload size={24} />
                  Kliknij aby wybrać zdjęcie
                </button>
              ) : (
                <div className="space-y-2">
                  <div
                    ref={containerRef}
                    className="relative w-full select-none overflow-hidden rounded-lg bg-[#111] cursor-grab active:cursor-grabbing"
                    style={{ aspectRatio: '16/9' }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                  >
                    {imgNaturalSize && containerRef.current && (() => {
                      const containerWidth = containerRef.current.offsetWidth;
                      const containerHeight = containerWidth / TARGET_RATIO;
                      const imageRatio = imgNaturalSize.w / imgNaturalSize.h;
                      let imageWidth: number;
                      let imageHeight: number;

                      if (imageRatio > TARGET_RATIO) {
                        imageHeight = containerHeight;
                        imageWidth = containerHeight * imageRatio;
                      } else {
                        imageWidth = containerWidth;
                        imageHeight = containerWidth / imageRatio;
                      }

                      return (
                        <img
                          src={preview}
                          alt="Podgląd"
                          draggable={false}
                          style={{
                            position: 'absolute',
                            width: imageWidth,
                            height: imageHeight,
                            left: -offset.x,
                            top: -offset.y,
                            pointerEvents: 'none',
                          }}
                        />
                      );
                    })()}
                    <div className="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-primary/50" />
                    <p className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded bg-black/60 px-2 py-1 text-xs text-white">
                      Przeciągnij aby wybrać kadr
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={clearSelectedImage}
                    className="flex items-center gap-1 text-sm text-destructive hover:underline"
                  >
                    <X size={14} />
                    Usuń zdjęcie
                  </button>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Dodawanie...' : 'Dodaj polecany zabieg'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Aktywne slajdy ({slides.length})</h2>
        {isLoading && <p className="text-sm text-muted-foreground">Ładowanie...</p>}
        {slides.length === 0 && !isLoading && (
          <p className="text-sm text-muted-foreground">Brak polecanych zabiegów. Dodaj pierwszy powyżej.</p>
        )}
        {[...slides].sort((a, b) => a.order - b.order).map((slide, index, array) => (
          <Card key={slide.id} className={!slide.isActive ? 'opacity-60' : ''}>
            <CardContent className="pb-4 pt-4">
              <div className="flex items-start gap-3">
                <img
                  src={slide.imagePath}
                  alt={slide.service.name}
                  className="h-14 w-24 shrink-0 rounded-md object-cover"
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{slide.service.name}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{slide.description}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    od {Number(slide.service.price).toFixed(0)} zł · {slide.service.category}
                  </p>
                </div>

                <div className="shrink-0">
                  <div className="flex gap-1">
                    <button
                      title="W górę"
                      disabled={index === 0}
                      onClick={() => moveSlide(slide, 'up')}
                      className="rounded p-1.5 hover:bg-muted disabled:opacity-30"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      title="W dół"
                      disabled={index === array.length - 1}
                      onClick={() => moveSlide(slide, 'down')}
                      className="rounded p-1.5 hover:bg-muted disabled:opacity-30"
                    >
                      <ChevronDown size={14} />
                    </button>
                    <button
                      title={slide.isActive ? 'Ukryj' : 'Pokaż'}
                      onClick={() => updateMutation.mutate({ id: slide.id, data: { isActive: !slide.isActive } })}
                      className="rounded p-1.5 hover:bg-muted"
                    >
                      {slide.isActive ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <button
                      title="Edytuj opis"
                      onClick={() => {
                        setEditingId(editingId === slide.id ? null : slide.id);
                        setEditDesc(slide.description);
                      }}
                      className="rounded p-1.5 hover:bg-muted"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      title="Usuń"
                      onClick={() => {
                        if (confirm('Usunąć ten polecany zabieg?')) {
                          deleteMutation.mutate(slide.id);
                        }
                      }}
                      className="rounded p-1.5 text-destructive hover:bg-muted"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {editingId === slide.id && (
                <div className="mt-3 space-y-2 border-t pt-3">
                  <textarea
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    rows={2}
                    maxLength={150}
                    className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
