import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { servicesApi } from '@/api/services.api';
import { RichTextEditor } from '@/components/shared/RichTextEditor';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { queryClient } from '@/lib/queryClient';
import { Season } from '@cosmo/shared';

export const AdminServiceDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const [content, setContent] = useState('');
  const [routineFirst48h, setRoutineFirst48h] = useState('');
  const [routineFollowingDays, setRoutineFollowingDays] = useState('');
  const [routineProducts, setRoutineProducts] = useState('');
  const [seasons, setSeasons] = useState<Season[]>([]);

  const { data: service, isLoading } = useQuery({
    queryKey: ['service', slug],
    queryFn: () => servicesApi.getOne(slug!),
    enabled: !!slug,
  });

  useEffect(() => {
    if (service?.detailedContent) {
      setContent(service.detailedContent);
    }
    setRoutineFirst48h(service?.routineFirst48h ?? '');
    setRoutineFollowingDays(service?.routineFollowingDays ?? '');
    setRoutineProducts(service?.routineProducts ?? '');
    setSeasons((service?.seasons as Season[]) ?? []);
  }, [service]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const formData = new FormData();
      formData.append(
        'data',
        JSON.stringify({ detailedContent: content, routineFirst48h, routineFollowingDays, routineProducts, seasons }),
      );
      return servicesApi.update(service!.id, formData);
    },
    onSuccess: () => {
      toast.success('Zmiany zostały zapisane.');
      queryClient.invalidateQueries({ queryKey: ['service', slug] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
    onError: () => toast.error('Nie udało się zapisać zmian.'),
  });

  if (isLoading) return <div className="animate-pulse p-8">Wczytywanie...</div>;
  if (!service) return <div className="p-8">Usługa nie została znaleziona.</div>;

  return (
    <div className="space-y-6 animate-enter max-w-4xl">
      <div className="flex items-center gap-4">
        <Link to="/admin/uslugi">
          <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft size={16} className="mr-1" /> Wróć do usług
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-heading font-bold text-primary">{service.name}</h1>
        <p className="text-sm text-muted-foreground mt-1">Edytuj szczegółowy opis usługi widoczny na stronie publicznej.</p>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium">Szczegółowy opis</label>
        <RichTextEditor
          content={content}
          onChange={setContent}
          onImageUpload={servicesApi.uploadImage}
        />
      </div>

      <div className="space-y-4 pt-4 border-t" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
        <div>
          <h2 className="text-base font-semibold">Rutyna pielęgnacyjna - szablon domyślny</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Szablon wypełniany automatycznie przy zamknięciu wizyty. Pracownik może go edytować przed wysłaniem klientce.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Pierwsze 48 godzin</label>
            <textarea
              value={routineFirst48h}
              onChange={(e) => setRoutineFirst48h(e.target.value)}
              rows={4}
              className="mt-1 w-full text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-y"
              placeholder="Co klientka powinna robić w ciągu pierwszych 48h po zabiegu..."
            />
          </div>
          <div>
            <label className="text-sm font-medium">Kolejne dni</label>
            <textarea
              value={routineFollowingDays}
              onChange={(e) => setRoutineFollowingDays(e.target.value)}
              rows={4}
              className="mt-1 w-full text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-y"
              placeholder="Codzienna rutyna pielęgnacyjna na kolejne tygodnie..."
            />
          </div>
          <div>
            <label className="text-sm font-medium">Zalecane produkty</label>
            <textarea
              value={routineProducts}
              onChange={(e) => setRoutineProducts(e.target.value)}
              rows={3}
              className="mt-1 w-full text-sm border border-input rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-y"
              placeholder="Polecane produkty do pielęgnacji domowej..."
            />
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
        <div>
          <h2 className="text-base font-semibold">Sezonowość</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Zaznacz pory roku, w których ta usługa pojawi się w sekcji rekomendacji na stronie głównej.
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          {([
            { value: Season.SPRING, label: 'Wiosna' },
            { value: Season.SUMMER, label: 'Lato' },
            { value: Season.AUTUMN, label: 'Jesień' },
            { value: Season.WINTER, label: 'Zima' },
          ] as const).map(({ value, label }) => (
            <label key={value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={seasons.includes(value)}
                onChange={(e) =>
                  setSeasons((prev) =>
                    e.target.checked ? [...prev, value] : prev.filter((s) => s !== value)
                  )
                }
                className="w-4 h-4 rounded"
                style={{ accentColor: '#C4965A' }}
              />
              <span className="text-sm font-medium">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="px-8"
        >
          {saveMutation.isPending ? 'Zapisywanie...' : 'Zapisz'}
        </Button>
      </div>
    </div>
  );
};
