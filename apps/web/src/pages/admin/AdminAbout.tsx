import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { aboutApi, type FeatureCard } from '@/api/about.api';
import { ImageUpload } from '@/components/shared/ImageUpload';
import { RichTextEditor } from '@/components/shared/RichTextEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Label = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <label className={`text-sm font-medium text-foreground ${className ?? ''}`}>{children}</label>
);

const Textarea = ({
  value, onChange, placeholder, rows,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
}) => (
  <textarea
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    rows={rows ?? 3}
    className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  />
);

const ICON_OPTIONS = [
  { value: 'calendar', label: '📅 Kalendarz' },
  { value: 'star', label: '⭐ Gwiazdka' },
  { value: 'shield', label: '🛡 Bezpieczeństwo' },
  { value: 'heart', label: '❤️ Serce' },
  { value: 'sparkles', label: '✨ Błysk' },
  { value: 'zap', label: '⚡ Błyskawica' },
  { value: 'award', label: '🏆 Nagroda' },
  { value: 'users', label: '👥 Użytkownicy' },
  { value: 'clock', label: '🕐 Zegar' },
  { value: 'smile', label: '😊 Uśmiech' },
  { value: 'check-circle', label: '✅ Zaznaczenie' },
  { value: 'badge', label: '🔖 Odznaka' },
];

export const AdminAbout = () => {
  const queryClient = useQueryClient();
  const { data: about, isLoading } = useQuery({ queryKey: ['about'], queryFn: aboutApi.get });

  // Salon fields
  const [salonTagline, setSalonTagline] = useState('');
  const [salonDescription, setSalonDescription] = useState('');
  const [salonCoverFile, setSalonCoverFile] = useState<File | null>(null);

  // Owner fields
  const [ownerName, setOwnerName] = useState('');
  const [ownerTitle, setOwnerTitle] = useState('');
  const [ownerBio, setOwnerBio] = useState('');
  const [ownerPhotoFile, setOwnerPhotoFile] = useState<File | null>(null);

  // Features fields
  const [featuresTitle, setFeaturesTitle] = useState('');
  const [features, setFeatures] = useState<FeatureCard[]>([]);
  const [appDescription, setAppDescription] = useState('');

  useEffect(() => {
    if (!about) return;
    setSalonTagline(about.salonTagline);
    setSalonDescription(about.salonDescription);
    setOwnerName(about.ownerName);
    setOwnerTitle(about.ownerTitle);
    setOwnerBio(about.ownerBio);
    setFeaturesTitle(about.featuresTitle);
    setFeatures(about.features ?? []);
    setAppDescription(about.appDescription);
  }, [about]);

  const mutation = useMutation({
    mutationFn: (fd: FormData) => aboutApi.update(fd),
    onSuccess: (updatedAbout) => {
      queryClient.setQueryData(['about'], updatedAbout);
      queryClient.invalidateQueries({ queryKey: ['about'] });
      setSalonCoverFile(null);
      setOwnerPhotoFile(null);
      toast.success('Zapisano zmiany');
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Błąd podczas zapisywania'),
  });

  const handleSave = () => {
    const fd = new FormData();
    fd.append(
      'data',
      JSON.stringify({ salonTagline, salonDescription, ownerName, ownerTitle, ownerBio, featuresTitle, features, appDescription }),
    );
    if (salonCoverFile) fd.append('salonCoverImage', salonCoverFile);
    if (ownerPhotoFile) fd.append('ownerPhoto', ownerPhotoFile);
    mutation.mutate(fd);
  };

  const addFeature = () => {
    setFeatures((prev) => [...prev, { id: crypto.randomUUID(), icon: 'star', title: '', description: '' }]);
  };

  const updateFeature = (id: string, field: keyof FeatureCard, value: string) => {
    setFeatures((prev) => prev.map((f) => (f.id === id ? { ...f, [field]: value } : f)));
  };

  const removeFeature = (id: string) => {
    setFeatures((prev) => prev.filter((f) => f.id !== id));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Strona „O nas"</h1>
          <p className="text-sm text-muted-foreground mt-1">Edytuj treść wyświetlaną na stronie /o-nas</p>
        </div>
        <Button onClick={handleSave} disabled={mutation.isPending}>
          {mutation.isPending ? 'Zapisywanie...' : 'Zapisz zmiany'}
        </Button>
      </div>

      {/* ── SEKCJA: SALON ── */}
      <Card>
        <CardHeader>
          <CardTitle>Informacje o salonie</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <ImageUpload
            value={salonCoverFile}
            onChange={setSalonCoverFile}
            currentImage={about?.salonCoverImage ?? undefined}
            label="Zdjęcie salonu"
          />
          <div className="space-y-2">
            <Label>Tagline (krótkie hasło)</Label>
            <Input
              value={salonTagline}
              onChange={(e) => setSalonTagline(e.target.value)}
              placeholder="np. Twoje piękno, nasza pasja"
            />
          </div>
          <div className="space-y-2">
            <Label>Opis salonu</Label>
            <RichTextEditor content={salonDescription} onChange={setSalonDescription} />
          </div>
        </CardContent>
      </Card>

      {/* ── SEKCJA: WŁAŚCICIELKA ── */}
      <Card>
        <CardHeader>
          <CardTitle>Właścicielka</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <ImageUpload
            value={ownerPhotoFile}
            onChange={setOwnerPhotoFile}
            currentImage={about?.ownerPhoto ?? undefined}
            label="Zdjęcie właścicielki"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Imię i nazwisko</Label>
              <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Wiktoria Ćwik" />
            </div>
            <div className="space-y-2">
              <Label>Tytuł / rola</Label>
              <Input value={ownerTitle} onChange={(e) => setOwnerTitle(e.target.value)} placeholder="Właścicielka & Kosmetolożka" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Bio</Label>
            <RichTextEditor content={ownerBio} onChange={setOwnerBio} />
          </div>
        </CardContent>
      </Card>

      {/* ── SEKCJA: APLIKACJA / WYRÓŻNIKI ── */}
      <Card>
        <CardHeader>
          <CardTitle>Wyróżniki i aplikacja</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Tytuł sekcji</Label>
            <Input value={featuresTitle} onChange={(e) => setFeaturesTitle(e.target.value)} placeholder="Dlaczego warto wybrać BeautyBeskid?" />
          </div>

          <div className="space-y-3">
            <Label>Karty wyróżników</Label>
            {features.map((f, idx) => (
              <div key={f.id} className="rounded-lg border p-4 space-y-3 bg-muted/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <GripVertical className="h-3 w-3" />
                    Wyróżnik {idx + 1}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => removeFeature(f.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Ikona</Label>
                    <select
                      value={f.icon}
                      onChange={(e) => updateFeature(f.id, 'icon', e.target.value)}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    >
                      {ICON_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs">Tytuł</Label>
                    <Input
                      value={f.title}
                      onChange={(e) => updateFeature(f.id, 'title', e.target.value)}
                      placeholder="np. Łatwa rezerwacja online"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Opis</Label>
                  <Textarea
                    value={f.description}
                    onChange={(e) => updateFeature(f.id, 'description', e.target.value)}
                    placeholder="Krótki opis wyróżnika..."
                    rows={2}
                  />
                </div>
              </div>
            ))}
            <Button variant="outline" onClick={addFeature} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Dodaj wyróżnik
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Dodatkowy opis (pod kartami)</Label>
            <RichTextEditor content={appDescription} onChange={setAppDescription} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pb-8">
        <Button onClick={handleSave} disabled={mutation.isPending} size="lg">
          {mutation.isPending ? 'Zapisywanie...' : 'Zapisz zmiany'}
        </Button>
      </div>
    </div>
  );
};
