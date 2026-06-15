// filepath: apps/web/src/pages/admin/Metamorphoses.tsx
import { useRef, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { metamorphosesApi } from '@/api/metamorphoses.api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { queryClient } from '@/lib/queryClient';
import { BeforeAfterSlider } from '@/components/shared/BeforeAfterSlider';
import { X } from 'lucide-react';

export const AdminMetamorphoses = () => {
  const { data: items, isLoading } = useQuery({ queryKey: ['metamorphoses'], queryFn: metamorphosesApi.getAll });

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [beforePreview, setBeforePreview] = useState<string | null>(null);
  const [afterPreview, setAfterPreview] = useState<string | null>(null);

  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);

  const deleteMutation = useMutation({
    mutationFn: metamorphosesApi.remove,
    onSuccess: () => {
      toast.success('Zdjęcia usunięto pomyślnie');
      queryClient.invalidateQueries({ queryKey: ['metamorphoses'] });
    }
  });

  const createMutation = useMutation({
    mutationFn: metamorphosesApi.create,
    onSuccess: () => {
      toast.success('Metamorfoza dodana pomyślnie');
      queryClient.invalidateQueries({ queryKey: ['metamorphoses'] });
      resetForm();
    },
    onError: () => {
      toast.error('Nie udało się dodać metamorfozy');
    }
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setBeforeFile(null);
    setAfterFile(null);
    setBeforePreview(null);
    setAfterPreview(null);
    setShowForm(false);
  };

  const handleFileChange = (side: 'before' | 'after', file: File | null) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (side === 'before') {
      setBeforeFile(file);
      setBeforePreview(url);
    } else {
      setAfterFile(file);
      setAfterPreview(url);
    }
  };

  const handleSubmit = () => {
    if (!title.trim()) { toast.error('Tytuł jest wymagany'); return; }
    if (!beforeFile) { toast.error('Zdjęcie PRZED jest wymagane'); return; }
    if (!afterFile) { toast.error('Zdjęcie PO jest wymagane'); return; }
    const fd = new FormData();
    fd.append('title', title.trim());
    if (description.trim()) fd.append('description', description.trim());
    fd.append('beforeImage', beforeFile);
    fd.append('afterImage', afterFile);
    createMutation.mutate(fd);
  };

  return (
    <div className="space-y-6 animate-enter">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-heading font-bold text-primary">Galeria Metamorfoz</h1>
        <Button className="shadow-md" onClick={() => setShowForm(v => !v)}>
          {showForm ? 'Anuluj' : 'Dodaj nowe zdjęcia'}
        </Button>
      </div>

      {showForm && (
        <Card className="border-border/50 rounded-2xl shadow-md">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-heading font-bold text-primary">Dodaj nową metamorfozę</h2>
              <Button variant="ghost" size="icon" onClick={resetForm}><X className="w-4 h-4" /></Button>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Tytuł <span className="text-destructive">*</span></label>
              <Input
                placeholder="Np. Koloryzacja + strzyżenie"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Opis <span className="text-muted-foreground">(opcjonalny)</span></label>
              <textarea
                placeholder="Krótki opis zabiegu..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Before */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Zdjęcie PRZED <span className="text-destructive">*</span></label>
                <input
                  ref={beforeInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => handleFileChange('before', e.target.files?.[0] ?? null)}
                />
                {beforePreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-border/50 bg-black">
                    <img src={beforePreview} alt="Przed" className="w-full object-contain max-h-64" loading="lazy" />
                    <button
                      onClick={() => { setBeforeFile(null); setBeforePreview(null); if (beforeInputRef.current) beforeInputRef.current.value = ''; }}
                      className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => beforeInputRef.current?.click()}
                    className="min-h-32 rounded-xl border-2 border-dashed border-border hover:border-primary/60 flex items-center justify-center cursor-pointer text-muted-foreground hover:text-primary transition-colors text-sm"
                  >
                    Kliknij, aby dodać zdjęcie
                  </div>
                )}
              </div>

              {/* After */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Zdjęcie PO <span className="text-destructive">*</span></label>
                <input
                  ref={afterInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => handleFileChange('after', e.target.files?.[0] ?? null)}
                />
                {afterPreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-border/50 bg-black">
                    <img src={afterPreview} alt="Po" className="w-full object-contain max-h-64" loading="lazy" />
                    <button
                      onClick={() => { setAfterFile(null); setAfterPreview(null); if (afterInputRef.current) afterInputRef.current.value = ''; }}
                      className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => afterInputRef.current?.click()}
                    className="min-h-32 rounded-xl border-2 border-dashed border-border hover:border-primary/60 flex items-center justify-center cursor-pointer text-muted-foreground hover:text-primary transition-colors text-sm"
                  >
                    Kliknij, aby dodać zdjęcie
                  </div>
                )}
              </div>
            </div>

            {beforePreview && afterPreview && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Podgląd suwaka</p>
                <div className="rounded-xl overflow-hidden border border-border/50">
                  <BeforeAfterSlider
                    beforeSrc={beforePreview}
                    afterSrc={afterPreview}
                    hover
                  />
                </div>
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={!title.trim() || !beforeFile || !afterFile || createMutation.isPending}
            >
              {createMutation.isPending ? 'Dodawanie...' : 'Dodaj metamorfozę'}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? <div className="animate-pulse p-4">Ładowanie...</div> : items?.map((m: any) => (
          <Card key={m.id} className="overflow-hidden hover:shadow-xl transition-shadow border-border/50 rounded-2xl">
            <CardContent className="p-0 flex flex-col h-full">
              <div className="grid grid-cols-2 overflow-hidden bg-black relative group" style={{ minHeight: '120px', maxHeight: '200px' }}>
                <img src={m.beforeImage} alt="Przed" className="object-contain w-full h-full border-r border-background/20" style={{ maxHeight: '200px' }} loading="lazy" />
                <img src={m.afterImage} alt="Po" className="object-contain w-full h-full" style={{ maxHeight: '200px' }} loading="lazy" />
                <div className="absolute inset-x-0 bottom-0 py-1 bg-black/60 text-white text-[10px] font-bold flex justify-between px-4 uppercase tracking-wider backdrop-blur-sm">
                  <span>Przed</span>
                  <span>Po</span>
                </div>
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                   <Button variant="destructive" onClick={() => {
                     if(confirm('Na pewno usunąć?')) deleteMutation.mutate(m.id);
                   }} className="shadow-2xl">Usuń wpis</Button>
                </div>
              </div>
              <div className="p-5 bg-card flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-lg leading-tight">{m.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-3 mt-2 leading-relaxed">{m.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {items?.length === 0 && <div className="col-span-full text-muted-foreground p-16 bg-card border-2 border-dashed rounded-3xl text-center shadow-sm">Brak zdjęć w galerii. Dodaj pierwszą metamorfozę!</div>}
      </div>
    </div>
  );
};
