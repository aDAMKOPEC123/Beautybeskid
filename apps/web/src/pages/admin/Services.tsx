// filepath: apps/web/src/pages/admin/Services.tsx
import { useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Plus, Upload, X } from 'lucide-react';
import { servicesApi } from '@/api/services.api';
import { employeesApi } from '@/api/employees.api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RichTextEditor } from '@/components/shared/RichTextEditor';
import { formatPrice } from '@/lib/utils';
import { toast } from 'sonner';
import { queryClient } from '@/lib/queryClient';

type ModalState = { type: 'closed' } | { type: 'create' } | { type: 'edit'; service: any };

interface FormValues {
  name: string;
  category: string;
  description: string;
  detailedContent: string;
  price: string;
  durationMinutes: string;
  displayOrder: string;
  isActive: boolean;
  recommendedIntervalDays: string;
  isMultiVisit: boolean;
  seriesIntervalsDays: string[];
  selectedEmployeeIds: string[];
  imageFile: File | null;
  imagePreview: string | null;
  routineFirst48h: string;
  routineFollowingDays: string;
  routineProducts: string;
}

const EMPTY_FORM: FormValues = {
  name: '',
  category: '',
  description: '',
  detailedContent: '',
  price: '',
  durationMinutes: '',
  displayOrder: '1',
  isActive: true,
  recommendedIntervalDays: '',
  isMultiVisit: false,
  seriesIntervalsDays: ['14'],
  selectedEmployeeIds: [],
  imageFile: null,
  imagePreview: null,
  routineFirst48h: '',
  routineFollowingDays: '',
  routineProducts: '',
};

function ServiceForm({
  initial,
  employees,
  onSubmit,
  onCancel,
  isPending,
}: {
  initial: FormValues;
  employees: any[];
  onSubmit: (values: FormValues) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [values, setValues] = useState<FormValues>(initial);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof FormValues>(field: K, value: FormValues[K]) =>
    setValues((prev) => ({ ...prev, [field]: value }));

  const handleFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Plik jest za duzy (max 5 MB)');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Dozwolone formaty: JPG, PNG, WebP');
      return;
    }

    setValues((prev) => ({
      ...prev,
      imageFile: file,
      imagePreview: URL.createObjectURL(file),
    }));
  };

  const toggleEmployee = (id: string) => {
    setValues((prev) => ({
      ...prev,
      selectedEmployeeIds: prev.selectedEmployeeIds.includes(id)
        ? prev.selectedEmployeeIds.filter((entry) => entry !== id)
        : [...prev.selectedEmployeeIds, id],
    }));
  };

  const updateSeriesInterval = (index: number, value: string) => {
    setValues((prev) => ({
      ...prev,
      seriesIntervalsDays: prev.seriesIntervalsDays.map((entry, entryIndex) =>
        entryIndex === index ? value : entry,
      ),
    }));
  };

  const addSeriesInterval = () => {
    setValues((prev) => ({
      ...prev,
      seriesIntervalsDays: [...prev.seriesIntervalsDays, '14'],
    }));
  };

  const removeSeriesInterval = (index: number) => {
    setValues((prev) => ({
      ...prev,
      seriesIntervalsDays: prev.seriesIntervalsDays.filter((_, entryIndex) => entryIndex !== index),
    }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (values.name.trim().length < 3) {
      toast.error('Nazwa musi miec co najmniej 3 znaki');
      return;
    }
    if (values.description.trim().length < 10) {
      toast.error('Opis musi miec co najmniej 10 znakow');
      return;
    }
    if (!values.price || Number(values.price) <= 0) {
      toast.error('Podaj poprawna cene');
      return;
    }
    if (!values.durationMinutes || Number(values.durationMinutes) <= 0) {
      toast.error('Podaj czas trwania');
      return;
    }
    if (values.category.trim().length < 2) {
      toast.error('Kategoria jest wymagana');
      return;
    }
    if (!Number.isInteger(Number(values.displayOrder)) || Number(values.displayOrder) <= 0) {
      toast.error('Kolejnosc musi byc dodatnia liczba calkowita');
      return;
    }

    if (values.isMultiVisit) {
      const numericIntervals = values.seriesIntervalsDays.map((entry) => Number(entry));
      if (numericIntervals.length === 0 || numericIntervals.some((entry) => !Number.isInteger(entry) || entry <= 0)) {
        toast.error('Seria musi miec dodatnie interwaly dla wszystkich etapow');
        return;
      }
    } else if (values.recommendedIntervalDays.trim().length > 0) {
      const interval = Number(values.recommendedIntervalDays);
      if (!Number.isInteger(interval) || interval <= 0) {
        toast.error('Interwal przypomnienia musi byc dodatnia liczba calkowita');
        return;
      }
    }

    onSubmit(values);
  };

  const previewSrc = values.imagePreview ?? initial.imagePreview;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium">Nazwa uslugi *</label>
        <input
          value={values.name}
          onChange={(event) => set('name', event.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="np. Usuwanie brodawek"
          required
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Kategoria *</label>
        <input
          value={values.category}
          onChange={(event) => set('category', event.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="np. Dermatologia"
          required
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Opis *</label>
        <textarea
          value={values.description}
          onChange={(event) => set('description', event.target.value)}
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Opis uslugi"
          required
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Szczegółowy opis (widoczny na stronie usługi)</label>
        <RichTextEditor
          content={values.detailedContent}
          onChange={(val) => set('detailedContent', val)}
          onImageUpload={servicesApi.uploadImage}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">Cena (zl) *</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={values.price}
            onChange={(event) => set('price', event.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Czas (min) *</label>
          <input
            type="number"
            min="1"
            step="1"
            value={values.durationMinutes}
            onChange={(event) => set('durationMinutes', event.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Kolejnosc wyswietlania *</label>
        <input
          type="number"
          min="1"
          step="1"
          value={values.displayOrder}
          onChange={(event) => set('displayOrder', event.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          required
        />
        <p className="text-xs text-muted-foreground">
          Im mniejszy numer, tym wyzej usluga pojawi sie w ofercie i podczas rezerwacji.
        </p>
      </div>

      {!values.isMultiVisit && (
        <div className="space-y-1">
          <label className="text-sm font-medium">Przypomnienie po ilu dniach</label>
          <input
            type="number"
            min="1"
            step="1"
            value={values.recommendedIntervalDays}
            onChange={(event) => set('recommendedIntervalDays', event.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="np. 30"
          />
          <p className="text-xs text-muted-foreground">
            Dla uslug jednowizytowych klient dostanie przypomnienie o ponownym umowieniu po tym czasie.
          </p>
        </div>
      )}

      <div className="space-y-3 rounded-xl border border-border p-4">
        <label className="flex items-center gap-3 text-sm font-medium">
          <input
            type="checkbox"
            checked={values.isActive}
            onChange={(event) => set('isActive', event.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Aktywna (widoczna w ofercie)
        </label>

        <label className="flex items-center gap-3 text-sm font-medium">
          <input
            type="checkbox"
            checked={values.isMultiVisit}
            onChange={(event) =>
              setValues((prev) => ({
                ...prev,
                isMultiVisit: event.target.checked,
                seriesIntervalsDays:
                  event.target.checked && prev.seriesIntervalsDays.length === 0
                    ? ['14']
                    : event.target.checked
                    ? prev.seriesIntervalsDays
                    : [],
              }))
            }
            className="h-4 w-4 accent-primary"
          />
          Usluga wielowizytowa
        </label>

        {values.isMultiVisit && (
          <div className="space-y-3 rounded-xl bg-muted/30 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Interwaly serii</p>
                <p className="text-xs text-muted-foreground">
                  Ustal po ilu dniach klient powinien umowic kolejna wizyte.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addSeriesInterval}>
                <Plus size={14} className="mr-1" /> Dodaj etap
              </Button>
            </div>

            <div className="space-y-2">
              {values.seriesIntervalsDays.map((interval, index) => (
                <div key={`interval-${index}`} className="flex items-center gap-2">
                  <div className="flex-1 rounded-lg border border-border bg-background px-3 py-2">
                    <label className="block text-xs font-medium text-muted-foreground">
                      Po wizycie {index + 1} -&gt; {index + 2}
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={interval}
                      onChange={(event) => updateSeriesInterval(index, event.target.value)}
                      className="mt-1 w-full border-0 bg-transparent p-0 text-sm focus:outline-none"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">dni</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={values.seriesIntervalsDays.length === 1}
                    onClick={() => removeSeriesInterval(index)}
                  >
                    <X size={14} />
                  </Button>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              Liczba wizyt w serii: {values.seriesIntervalsDays.length + 1}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Zdjecie</label>
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed rounded-lg p-4 cursor-pointer hover:border-primary/50 hover:bg-accent/20 transition-colors"
        >
          {previewSrc ? (
            <div className="flex items-center gap-3">
              <img src={previewSrc} alt="Podglad" className="w-16 h-16 object-cover rounded-md border" loading="lazy" />
              <div className="flex-1 text-sm text-muted-foreground">
                {values.imageFile ? values.imageFile.name : 'Aktualne zdjecie'}
              </div>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setValues((prev) => ({ ...prev, imageFile: null, imagePreview: null }));
                }}
                className="p-1 hover:bg-destructive/10 rounded text-destructive"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-muted-foreground">
              <Upload size={20} />
              <span className="text-sm">Kliknij aby wybrac zdjecie (JPG, PNG, WebP, max 5 MB)</span>
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>

      {employees.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Przypisani pracownicy</label>
          <div className="border rounded-md divide-y max-h-40 overflow-y-auto">
            {employees.map((employee: any) => (
              <label
                key={employee.id}
                className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-accent/30"
              >
                <input
                  type="checkbox"
                  checked={values.selectedEmployeeIds.includes(employee.id)}
                  onChange={() => toggleEmployee(employee.id)}
                  className="h-4 w-4 accent-primary"
                />
                <div className="w-7 h-7 rounded-full overflow-hidden bg-muted shrink-0">
                  {employee.avatarPath ? (
                    <img
                      src={employee.avatarPath}
                      alt={employee.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs">U</div>
                  )}
                </div>
                <span className="text-sm">{employee.name}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Brak zaznaczenia = usluga dostepna u wszystkich pracownikow
          </p>
        </div>
      )}

      <div className="space-y-3 rounded-xl border border-border p-4">
        <div>
          <p className="text-sm font-semibold">Rutyna pielęgnacyjna — szablon</p>
          <p className="text-xs text-muted-foreground">Prefill przy zamknięciu wizyty. Pracownik może edytować przed wysłaniem.</p>
        </div>
        <div className="space-y-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Pierwsze 48 godzin</label>
            <textarea
              value={values.routineFirst48h}
              onChange={(e) => set('routineFirst48h', e.target.value)}
              rows={3}
              className="mt-0.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Co klientka powinna robić w pierwszych 48h..."
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Kolejne dni</label>
            <textarea
              value={values.routineFollowingDays}
              onChange={(e) => set('routineFollowingDays', e.target.value)}
              rows={3}
              className="mt-0.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Codzienna pielęgnacja na kolejne tygodnie..."
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Zalecane produkty</label>
            <textarea
              value={values.routineProducts}
              onChange={(e) => set('routineProducts', e.target.value)}
              rows={2}
              className="mt-0.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Polecane produkty do pielęgnacji domowej..."
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Anuluj
        </Button>
        <Button type="submit" disabled={isPending} className="flex-1">
          {isPending ? 'Zapisywanie...' : 'Zapisz usluge'}
        </Button>
      </div>
    </form>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-2xl max-h-[calc(100dvh-72px)] overflow-y-auto rounded-t-2xl bg-background shadow-xl sm:max-h-[90vh] sm:rounded-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-4 py-4 sm:px-6">
          <h2 className="text-lg font-semibold font-heading">{title}</h2>
          <button onClick={onClose} className="p-2 rounded hover:bg-accent" aria-label="Zamknij formularz usługi">
            <X size={18} />
          </button>
        </div>
        <div className="px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6">{children}</div>
      </div>
    </div>
  );
}

function ServiceOrderControl({ service }: { service: any }) {
  const [value, setValue] = useState(String(service.displayOrder ?? 1));

  const mutation = useMutation<any, Error, number>({
    mutationFn: (displayOrder) => {
      const formData = new FormData();
      formData.append('data', JSON.stringify({ displayOrder }));
      return servicesApi.update(service.id, formData);
    },
    onSuccess: () => {
      toast.success('Kolejnosc zostala zapisana.');
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
    onError: (error: any) => {
      setValue(String(service.displayOrder ?? 1));
      toast.error(error?.response?.data?.message || 'Nie udalo sie zapisac kolejnosci.');
    },
  });

  const numericValue = Number(value);
  const isValid = Number.isInteger(numericValue) && numericValue > 0;
  const isUnchanged = numericValue === Number(service.displayOrder);

  return (
    <form
      className="w-full space-y-1"
      onSubmit={(event) => {
        event.preventDefault();
        if (!isValid) {
          toast.error('Kolejnosc musi byc dodatnia liczba calkowita');
          return;
        }
        mutation.mutate(numericValue);
      }}
    >
      <label className="block text-xs font-medium text-muted-foreground">Kolejnosc</label>
      <div className="flex gap-2">
        <input
          type="number"
          min="1"
          step="1"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-label={`Kolejnosc uslugi ${service.name}`}
          className="min-w-0 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <Button type="submit" size="sm" disabled={mutation.isPending || !isValid || isUnchanged}>
          {mutation.isPending ? '...' : 'Zapisz'}
        </Button>
      </div>
    </form>
  );
}

export const AdminServices = () => {
  const [modal, setModal] = useState<ModalState>({ type: 'closed' });

  const { data: services = [], isLoading } = useQuery<any[]>({
    queryKey: ['services'],
    queryFn: servicesApi.getAll,
  });

  const { data: employees = [] } = useQuery<any[]>({
    queryKey: ['employees'],
    queryFn: employeesApi.getAll,
  });

  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: servicesApi.remove,
    onSuccess: () => {
      toast.success('Usluga zostala usunieta z oferty.');
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });

  const createMutation = useMutation<any, Error, FormData>({
    mutationFn: servicesApi.create,
    onSuccess: () => {
      toast.success('Usluga zostala dodana.');
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setModal({ type: 'closed' });
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || 'Nie udalo sie dodac uslugi.'),
  });

  const updateMutation = useMutation<any, Error, { id: string; formData: FormData }>({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) =>
      servicesApi.update(id, formData),
    onSuccess: () => {
      toast.success('Usluga zostala zaktualizowana.');
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setModal({ type: 'closed' });
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || 'Nie udalo sie zaktualizowac uslugi.'),
  });

  const buildFormData = (values: FormValues) => {
    const formData = new FormData();
    formData.append(
      'data',
      JSON.stringify({
        name: values.name.trim(),
        description: values.description.trim(),
        price: Number(values.price),
        durationMinutes: Number(values.durationMinutes),
        displayOrder: Number(values.displayOrder),
        category: values.category.trim(),
        isActive: values.isActive,
        recommendedIntervalDays:
          values.isMultiVisit || values.recommendedIntervalDays.trim().length === 0
            ? null
            : Number(values.recommendedIntervalDays),
        isMultiVisit: values.isMultiVisit,
        seriesIntervalsDays: values.isMultiVisit
          ? values.seriesIntervalsDays.map((entry) => Number(entry))
          : [],
        detailedContent: values.detailedContent || null,
        routineFirst48h: values.routineFirst48h || null,
        routineFollowingDays: values.routineFollowingDays || null,
        routineProducts: values.routineProducts || null,
      }),
    );
    formData.append('employeeIds', JSON.stringify(values.selectedEmployeeIds));
    if (values.imageFile) formData.append('image', values.imageFile);
    return formData;
  };

  const getInitialValues = (service?: any): FormValues => {
    if (!service) return EMPTY_FORM;

    return {
      name: service.name ?? '',
      category: service.category ?? '',
      description: service.description ?? '',
      price: String(Number(service.price)),
      durationMinutes: String(service.durationMinutes),
      displayOrder: String(service.displayOrder ?? 1),
      isActive: service.isActive ?? true,
      recommendedIntervalDays:
        service.recommendedIntervalDays !== null && service.recommendedIntervalDays !== undefined
          ? String(service.recommendedIntervalDays)
          : '',
      isMultiVisit: service.isMultiVisit ?? false,
      seriesIntervalsDays:
        service.isMultiVisit && Array.isArray(service.seriesIntervalsDays) && service.seriesIntervalsDays.length > 0
          ? service.seriesIntervalsDays.map((entry: number) => String(entry))
          : ['14'],
      selectedEmployeeIds: (service.employees ?? []).map((employee: any) => employee.id),
      imageFile: null,
      imagePreview: service.imagePath ?? null,
      detailedContent: service.detailedContent ?? '',
      routineFirst48h: service.routineFirst48h ?? '',
      routineFollowingDays: service.routineFollowingDays ?? '',
      routineProducts: service.routineProducts ?? '',
    };
  };

  return (
    <div className="space-y-6 animate-enter">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-heading font-bold text-primary">Zarzadzanie Uslugami</h1>
        <Button className="shadow-md" onClick={() => setModal({ type: 'create' })}>
          Dodaj nowa usluge
        </Button>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          <div className="animate-pulse p-4">Ladowanie...</div>
        ) : (
          services.map((service: any) => (
            <Card key={service.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-0 flex flex-col sm:flex-row sm:items-center">
                {service.imagePath && (
                  <div className="w-full sm:w-40 h-32 sm:h-28 bg-muted shrink-0 border-r">
                    <img src={service.imagePath} alt={service.name} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                )}
                <div className="p-5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-lg font-heading text-primary">{service.name}</h3>
                    {!service.isActive && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border">
                        Nieaktywna
                      </span>
                    )}
                    {service.isMultiVisit && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/10">
                        Seria: {service.seriesIntervalsDays.length + 1} wizyt
                      </span>
                    )}
                    {!service.isMultiVisit && service.recommendedIntervalDays && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border">
                        Przypomnienie: co {service.recommendedIntervalDays} dni
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{service.description}</p>

                  <div className="text-sm font-semibold mt-3 flex flex-wrap gap-3 bg-muted/40 w-fit px-3 py-1.5 rounded-md">
                    <span className="text-foreground">{formatPrice(service.price)}</span>
                    <span className="text-muted-foreground border-l pl-3">{service.durationMinutes} min</span>
                    {service.isMultiVisit && (
                      <span className="text-muted-foreground border-l pl-3">
                        co {service.seriesIntervalsDays.join(' / ')} dni
                      </span>
                    )}
                    {!service.isMultiVisit && service.recommendedIntervalDays && (
                      <span className="text-muted-foreground border-l pl-3">
                        przypomnienie po {service.recommendedIntervalDays} dniach
                      </span>
                    )}
                  </div>

                  {service.employees?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {service.employees.map((employee: any) => (
                        <span
                          key={employee.id}
                          className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full"
                        >
                          {employee.avatarPath && (
                            <img
                              src={employee.avatarPath}
                              alt={employee.name}
                              className="w-4 h-4 rounded-full object-cover"
                            />
                          )}
                          {employee.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex h-full flex-col justify-center gap-2 border-t bg-muted/10 p-4 sm:-ml-px sm:border-l sm:border-t-0 sm:p-5">
                  <ServiceOrderControl key={`${service.id}-${service.displayOrder}`} service={service} />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full bg-background"
                    onClick={() => setModal({ type: 'edit', service })}
                  >
                    Edytuj
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      if (confirm(`Czy na pewno usunac usluge "${service.name}"?`)) {
                        deleteMutation.mutate(service.id);
                      }
                    }}
                  >
                    Usun
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {modal.type === 'create' && (
        <Modal title="Dodaj nowa usluge" onClose={() => setModal({ type: 'closed' })}>
          <ServiceForm
            initial={EMPTY_FORM}
            employees={employees}
            onSubmit={(values) => createMutation.mutate(buildFormData(values))}
            onCancel={() => setModal({ type: 'closed' })}
            isPending={createMutation.isPending}
          />
        </Modal>
      )}

      {modal.type === 'edit' && (
        <Modal title="Edytuj usluge" onClose={() => setModal({ type: 'closed' })}>
          <ServiceForm
            initial={getInitialValues(modal.service)}
            employees={employees}
            onSubmit={(values) =>
              updateMutation.mutate({ id: modal.service.id, formData: buildFormData(values) })
            }
            onCancel={() => setModal({ type: 'closed' })}
            isPending={updateMutation.isPending}
          />
        </Modal>
      )}
    </div>
  );
};
