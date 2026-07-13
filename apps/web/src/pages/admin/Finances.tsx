import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  ClipboardList,
  Lightbulb,
  Package,
  Plus,
  Save,
  Trash2,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { financesApi, type FinanceCostCategory, type FinancePaymentMethod, type FinanceRevenueSource, type InventoryMovementType } from '@/api/finances.api';
import { servicesApi } from '@/api/services.api';
import { usersApi } from '@/api/users.api';

type Tab = 'dashboard' | 'revenues' | 'costs' | 'inventory';

const revenueSources: Array<{ value: FinanceRevenueSource; label: string }> = [
  { value: 'SERVICE', label: 'Usługa' },
  { value: 'PRODUCT', label: 'Produkt' },
  { value: 'VOUCHER', label: 'Voucher' },
  { value: 'OTHER', label: 'Inne' },
];

const costCategories: Array<{ value: FinanceCostCategory; label: string }> = [
  { value: 'PRODUCTS', label: 'Produkty i magazyn' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'RENT', label: 'Czynsz' },
  { value: 'SALARIES', label: 'Wynagrodzenia' },
  { value: 'UTILITIES', label: 'Media' },
  { value: 'TAXES', label: 'Podatki/ZUS' },
  { value: 'EQUIPMENT', label: 'Sprzęt' },
  { value: 'TRAINING', label: 'Szkolenia' },
  { value: 'SOFTWARE', label: 'Oprogramowanie' },
  { value: 'OTHER', label: 'Inne' },
];

const paymentMethods: Array<{ value: FinancePaymentMethod; label: string }> = [
  { value: 'CARD', label: 'Karta' },
  { value: 'CASH', label: 'Gotówka' },
  { value: 'BLIK', label: 'BLIK' },
  { value: 'TRANSFER', label: 'Przelew' },
  { value: 'OTHER', label: 'Inne' },
];

const movementTypes: Array<{ value: InventoryMovementType; label: string }> = [
  { value: 'PURCHASE', label: 'Zakup / dostawa' },
  { value: 'USAGE', label: 'Zużycie do zabiegu' },
  { value: 'SALE', label: 'Sprzedaż produktu' },
  { value: 'WASTE', label: 'Strata / przeterminowane' },
  { value: 'CORRECTION', label: 'Korekta dodatnia' },
];

const money = (value: number | string | null | undefined) =>
  new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(Number(value ?? 0));

const percent = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

function MetricCard({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'neutral' | 'good' | 'bad';
}) {
  const toneClass = tone === 'good' ? 'text-emerald-700' : tone === 'bad' ? 'text-red-700' : 'text-primary';
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${toneClass}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function BarList({ data }: { data: Array<{ label: string; value: number }> }) {
  const max = Math.max(...data.map((item) => item.value), 1);
  if (data.length === 0) return <p className="text-sm text-muted-foreground">Brak danych w tym miesiącu.</p>;
  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="truncate font-medium">{item.label}</span>
            <span className="shrink-0 text-muted-foreground">{money(item.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(6, (item.value / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function DailyChart({ data }: { data: Array<{ date: string; revenue: number; costs: number }> }) {
  const max = Math.max(...data.flatMap((item) => [item.revenue, item.costs]), 1);
  const points = data.map((item, index) => {
    const x = data.length <= 1 ? 0 : (index / (data.length - 1)) * 100;
    const y = 100 - (item.revenue / max) * 88;
    return `${x},${y}`;
  });
  const costPoints = data.map((item, index) => {
    const x = data.length <= 1 ? 0 : (index / (data.length - 1)) * 100;
    const y = 100 - (item.costs / max) * 88;
    return `${x},${y}`;
  });
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">Przepływ dzienny</h3>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-600" /> Przychody</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Koszty</span>
        </div>
      </div>
      <svg viewBox="0 0 100 104" className="h-52 w-full overflow-visible" preserveAspectRatio="none">
        <polyline fill="none" stroke="#059669" strokeWidth="2.2" points={points.join(' ')} vectorEffect="non-scaling-stroke" />
        <polyline fill="none" stroke="#ef4444" strokeWidth="2.2" points={costPoints.join(' ')} vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

export function AdminFinances() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [month, setMonth] = useState(currentMonth);

  const dashboard = useQuery({
    queryKey: ['finances', 'dashboard', month],
    queryFn: () => financesApi.getDashboard(month),
  });

  const tabs: Array<{ id: Tab; label: string; icon: typeof BarChart3 }> = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'revenues', label: 'Przychody', icon: ArrowUpRight },
    { id: 'costs', label: 'Koszty', icon: ArrowDownRight },
    { id: 'inventory', label: 'Magazyn', icon: Package },
  ];

  return (
    <div className="space-y-6 animate-enter">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Administracja</p>
          <h1 className="mt-1 text-3xl font-heading font-bold">Finanse</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Ręczne przychody, koszty, rentowność miesiąca, rekomendacje budżetowe i kontrola stanów magazynowych.
          </p>
        </div>
        <label className="w-full max-w-xs text-sm font-medium">
          Badany miesiąc
          <input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2 rounded-lg border bg-card p-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold transition-colors ${
              tab === id ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-accent'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && <DashboardTab dashboard={dashboard} />}
      {tab === 'revenues' && <RevenuesTab month={month} />}
      {tab === 'costs' && <CostsTab month={month} />}
      {tab === 'inventory' && <InventoryTab />}
    </div>
  );
}

function DashboardTab({ dashboard }: { dashboard: UseQueryResult<Awaited<ReturnType<typeof financesApi.getDashboard>>> }) {
  if (dashboard.isLoading) return <div className="h-72 rounded-lg border bg-card animate-pulse" />;
  if (!dashboard.data) return <p className="text-sm text-muted-foreground">Nie udało się pobrać danych.</p>;

  const data = dashboard.data;
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Przychód" value={money(data.totals.revenue)} hint={`${percent(data.totals.revenueChange)} vs poprzedni miesiąc`} tone="good" />
        <MetricCard label="Koszty" value={money(data.totals.costs)} hint={`Marketing: ${money(data.totals.marketingSpend)}`} tone={data.totals.costs > data.totals.revenue ? 'bad' : 'neutral'} />
        <MetricCard label="Zysk" value={money(data.totals.profit)} hint={`${percent(data.totals.profitChange)} vs poprzedni miesiąc`} tone={data.totals.profit >= 0 ? 'good' : 'bad'} />
        <MetricCard label="Marża" value={`${data.totals.margin.toFixed(1)}%`} hint={`Średni wpis: ${money(data.totals.avgRevenueEntry)}`} tone={data.totals.margin >= 35 ? 'good' : data.totals.margin < 20 ? 'bad' : 'neutral'} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <DailyChart data={data.charts.daily} />
        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-3 font-semibold">Wnioski i decyzje</h3>
          <div className="space-y-3">
            {data.suggestions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Dodaj przychody i koszty, a system przygotuje rekomendacje.</p>
            ) : (
              data.suggestions.map((item) => (
                <div key={item.title} className="rounded-lg border p-3">
                  <div className="flex items-start gap-2">
                    {item.type === 'danger' ? <AlertTriangle size={17} className="mt-0.5 text-red-600" /> : <Lightbulb size={17} className="mt-0.5 text-primary" />}
                    <div>
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.body}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-4 font-semibold">Najmocniejsze usługi</h3>
          <BarList data={data.charts.topServices} />
        </div>
        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-4 font-semibold">Koszty wg kategorii</h3>
          <BarList data={data.charts.categoryCosts.map((item) => ({ ...item, label: labelForCost(item.label as FinanceCostCategory) }))} />
        </div>
        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-4 font-semibold">Magazyn</h3>
          <div className="grid grid-cols-2 gap-3">
            <MetricCard label="Produkty" value={String(data.inventory.totalProducts)} />
            <MetricCard label="Braki" value={String(data.inventory.lowStock + data.inventory.outOfStock)} tone={data.inventory.lowStock + data.inventory.outOfStock > 0 ? 'bad' : 'good'} />
            <MetricCard label="Wartość" value={money(data.inventory.stockValue)} />
            <MetricCard label="Marketing" value={`${data.totals.marketingShare.toFixed(1)}%`} hint="udział w przychodzie" />
          </div>
        </div>
      </div>
    </div>
  );
}

function RevenuesTab({ month }: { month: string }) {
  const queryClient = useQueryClient();
  const [clientQuery, setClientQuery] = useState('');
  const [form, setForm] = useState({
    date: `${month}-01`,
    amount: '',
    source: 'SERVICE' as FinanceRevenueSource,
    serviceId: '',
    clientName: '',
    description: '',
    paymentMethod: 'CARD' as FinancePaymentMethod,
  });

  useEffect(() => setForm((current) => ({ ...current, date: `${month}-01` })), [month]);

  const revenues = useQuery({ queryKey: ['finances', 'revenues', month], queryFn: () => financesApi.getRevenues(month) });
  const services = useQuery({ queryKey: ['services'], queryFn: servicesApi.getAll });
  const users = useQuery({
    queryKey: ['users', 'search', clientQuery],
    queryFn: () => usersApi.search(clientQuery),
    enabled: clientQuery.trim().length >= 2,
  });

  const createMutation = useMutation({
    mutationFn: financesApi.createRevenue,
    onSuccess: () => {
      invalidateFinance(queryClient, month);
      setForm((current) => ({ ...current, amount: '', clientName: '', description: '' }));
      toast.success('Przychód zapisany');
    },
    onError: () => toast.error('Nie udało się zapisać przychodu'),
  });

  const deleteMutation = useMutation({
    mutationFn: financesApi.deleteRevenue,
    onSuccess: () => {
      invalidateFinance(queryClient, month);
      toast.success('Przychód usunięty');
    },
    onError: () => toast.error('Nie udało się usunąć przychodu'),
  });

  const selectedUser = users.data?.find((user) => user.name === form.clientName);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    createMutation.mutate({
      ...form,
      amount: Number(form.amount),
      serviceId: form.serviceId || null,
      userId: selectedUser?.id ?? null,
    });
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
      <form onSubmit={submit} className="h-fit rounded-lg border bg-card p-4 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 font-semibold"><Plus size={17} /> Dodaj przychód</h2>
        <div className="space-y-3">
          <Input label="Data" type="date" value={form.date} onChange={(value) => setForm({ ...form, date: value })} />
          <Input label="Kwota" type="number" step="0.01" value={form.amount} onChange={(value) => setForm({ ...form, amount: value })} />
          <Select label="Źródło" value={form.source} onChange={(value) => setForm({ ...form, source: value as FinanceRevenueSource })} options={revenueSources} />
          <label className="block text-sm font-medium">
            Usługa z cennika
            <select
              value={form.serviceId}
              onChange={(event) => {
                const service = services.data?.find((item) => item.id === event.target.value);
                setForm({
                  ...form,
                  serviceId: event.target.value,
                  amount: service ? String(Number(service.price)) : form.amount,
                  description: service ? service.name : form.description,
                });
              }}
              className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
            >
              <option value="">Bez powiązania</option>
              {services.data?.map((service) => (
                <option key={service.id} value={service.id}>{service.name}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Klientka
            <input
              value={form.clientName}
              list="finance-clients"
              onChange={(event) => {
                setForm({ ...form, clientName: event.target.value });
                setClientQuery(event.target.value);
              }}
              className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
              placeholder="Zacznij wpisywać imię lub email"
            />
            <datalist id="finance-clients">
              {users.data?.map((user) => <option key={user.id} value={user.name}>{user.email}</option>)}
            </datalist>
          </label>
          <Input label="Za co / notatka" value={form.description} onChange={(value) => setForm({ ...form, description: value })} />
          <Select label="Płatność" value={form.paymentMethod} onChange={(value) => setForm({ ...form, paymentMethod: value as FinancePaymentMethod })} options={paymentMethods} />
          <button disabled={createMutation.isPending} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            <Save size={16} /> Zapisz przychód
          </button>
        </div>
      </form>
      <EntriesTable
        title="Przychody miesiąca"
        rows={(revenues.data ?? []).map((item) => ({
          id: item.id,
          date: item.date,
          main: item.description || item.service?.name || item.source,
          sub: item.clientName || item.user?.name || labelForRevenue(item.source),
          amount: Number(item.amount),
        }))}
        onDelete={(id) => deleteMutation.mutate(id)}
      />
    </div>
  );
}

function CostsTab({ month }: { month: string }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    date: `${month}-01`,
    amount: '',
    category: 'PRODUCTS' as FinanceCostCategory,
    description: '',
    vendor: '',
    paymentMethod: 'TRANSFER' as FinancePaymentMethod,
    productId: '',
    addToStock: true,
    quantity: '',
  });

  useEffect(() => setForm((current) => ({ ...current, date: `${month}-01` })), [month]);

  const costs = useQuery({ queryKey: ['finances', 'costs', month], queryFn: () => financesApi.getCosts(month) });
  const inventory = useQuery({ queryKey: ['finances', 'inventory'], queryFn: financesApi.getInventory });

  const createMutation = useMutation({
    mutationFn: financesApi.createCost,
    onSuccess: () => {
      invalidateFinance(queryClient, month);
      queryClient.invalidateQueries({ queryKey: ['finances', 'inventory'] });
      setForm((current) => ({ ...current, amount: '', description: '', vendor: '', quantity: '' }));
      toast.success('Koszt zapisany');
    },
    onError: () => toast.error('Nie udało się zapisać kosztu'),
  });

  const deleteMutation = useMutation({
    mutationFn: financesApi.deleteCost,
    onSuccess: () => {
      invalidateFinance(queryClient, month);
      toast.success('Koszt usunięty');
    },
    onError: () => toast.error('Nie udało się usunąć kosztu'),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    createMutation.mutate({
      ...form,
      amount: Number(form.amount),
      productId: form.productId || null,
      quantity: form.quantity ? Number(form.quantity) : undefined,
    });
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
      <form onSubmit={submit} className="h-fit rounded-lg border bg-card p-4 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 font-semibold"><Wallet size={17} /> Dodaj koszt</h2>
        <div className="space-y-3">
          <Input label="Data" type="date" value={form.date} onChange={(value) => setForm({ ...form, date: value })} />
          <Input label="Kwota" type="number" step="0.01" value={form.amount} onChange={(value) => setForm({ ...form, amount: value })} />
          <Select label="Kategoria" value={form.category} onChange={(value) => setForm({ ...form, category: value as FinanceCostCategory })} options={costCategories} />
          <Input label="Opis kosztu" value={form.description} onChange={(value) => setForm({ ...form, description: value })} />
          <Input label="Dostawca / miejsce" value={form.vendor} onChange={(value) => setForm({ ...form, vendor: value })} />
          <Select label="Płatność" value={form.paymentMethod} onChange={(value) => setForm({ ...form, paymentMethod: value as FinancePaymentMethod })} options={paymentMethods} />
          <label className="block text-sm font-medium">
            Produkt magazynowy
            <select value={form.productId} onChange={(event) => setForm({ ...form, productId: event.target.value })} className="mt-1 w-full rounded-lg border bg-background px-3 py-2">
              <option value="">Bez produktu</option>
              {inventory.data?.items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.addToStock} onChange={(event) => setForm({ ...form, addToStock: event.target.checked })} />
            Dodaj zakup do stanu magazynowego
          </label>
          {form.addToStock && form.productId && (
            <Input label="Ilość kupiona" type="number" value={form.quantity} onChange={(value) => setForm({ ...form, quantity: value })} />
          )}
          <button disabled={createMutation.isPending} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            <Save size={16} /> Zapisz koszt
          </button>
        </div>
      </form>
      <EntriesTable
        title="Koszty miesiąca"
        rows={(costs.data ?? []).map((item) => ({
          id: item.id,
          date: item.date,
          main: item.description,
          sub: `${labelForCost(item.category)}${item.vendor ? ` · ${item.vendor}` : ''}`,
          amount: Number(item.amount),
        }))}
        onDelete={(id) => deleteMutation.mutate(id)}
      />
    </div>
  );
}

function InventoryTab() {
  const queryClient = useQueryClient();
  const inventory = useQuery({ queryKey: ['finances', 'inventory'], queryFn: financesApi.getInventory });
  const [settings, setSettings] = useState<Record<string, { minStock: string; monthlyUsageEstimate: string; unit: string }>>({});
  const [movement, setMovement] = useState({ productId: '', type: 'USAGE' as InventoryMovementType, quantity: '', note: '' });

  useEffect(() => {
    if (!inventory.data) return;
    setSettings((current) => {
      const next = { ...current };
      for (const item of inventory.data.items) {
        next[item.id] ??= {
          minStock: String(item.minStock),
          monthlyUsageEstimate: String(item.monthlyUsageEstimate),
          unit: item.unit,
        };
      }
      return next;
    });
  }, [inventory.data]);

  const movementMutation = useMutation({
    mutationFn: financesApi.createInventoryMovement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finances'] });
      setMovement({ productId: '', type: 'USAGE', quantity: '', note: '' });
      toast.success('Ruch magazynowy zapisany');
    },
    onError: () => toast.error('Nie udało się zapisać ruchu'),
  });

  const settingsMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { minStock: number; monthlyUsageEstimate: number; unit: string } }) =>
      financesApi.updateInventorySettings(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finances', 'inventory'] });
      toast.success('Ustawienia produktu zapisane');
    },
    onError: () => toast.error('Nie udało się zapisać ustawień'),
  });

  const submitMovement = (event: FormEvent) => {
    event.preventDefault();
    movementMutation.mutate({
      productId: movement.productId,
      type: movement.type,
      quantity: Number(movement.quantity),
      note: movement.note,
    });
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Produkty" value={String(inventory.data?.summary.totalProducts ?? 0)} />
        <MetricCard label="Niski stan" value={String(inventory.data?.summary.lowStock ?? 0)} tone={(inventory.data?.summary.lowStock ?? 0) > 0 ? 'bad' : 'good'} />
        <MetricCard label="Brak" value={String(inventory.data?.summary.outOfStock ?? 0)} tone={(inventory.data?.summary.outOfStock ?? 0) > 0 ? 'bad' : 'good'} />
        <MetricCard label="Wartość magazynu" value={money(inventory.data?.summary.stockValue ?? 0)} />
      </div>

      <form onSubmit={submitMovement} className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-[1.4fr_1fr_1fr_1.4fr_auto] md:items-end">
        <label className="block text-sm font-medium">
          Produkt
          <select required value={movement.productId} onChange={(event) => setMovement({ ...movement, productId: event.target.value })} className="mt-1 w-full rounded-lg border bg-background px-3 py-2">
            <option value="">Wybierz produkt</option>
            {inventory.data?.items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <Select label="Typ ruchu" value={movement.type} onChange={(value) => setMovement({ ...movement, type: value as InventoryMovementType })} options={movementTypes} />
        <Input label="Ilość" type="number" value={movement.quantity} onChange={(value) => setMovement({ ...movement, quantity: value })} />
        <Input label="Notatka" value={movement.note} onChange={(value) => setMovement({ ...movement, note: value })} />
        <button className="flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">
          <Save size={16} /> Zapisz
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <div className="grid min-w-[820px] grid-cols-[1.4fr_.7fr_.7fr_.8fr_.8fr_auto] gap-3 border-b bg-muted/40 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <span>Produkt</span>
          <span>Stan</span>
          <span>Próg</span>
          <span>Zużycie / mies.</span>
          <span>Status</span>
          <span />
        </div>
        <div className="divide-y">
          {inventory.data?.items.map((item) => {
            const draft = settings[item.id] ?? { minStock: String(item.minStock), monthlyUsageEstimate: String(item.monthlyUsageEstimate), unit: item.unit };
            return (
              <div key={item.id} className="grid min-w-[820px] grid-cols-[1.4fr_.7fr_.7fr_.8fr_.8fr_auto] gap-3 px-4 py-3 text-sm">
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.brand || 'Bez marki'} · {money(item.price)}</p>
                </div>
                <div className="font-semibold">{item.stock} {draft.unit}</div>
                <input value={draft.minStock} onChange={(event) => setSettings({ ...settings, [item.id]: { ...draft, minStock: event.target.value } })} className="h-9 rounded-md border bg-background px-2" />
                <input value={draft.monthlyUsageEstimate} onChange={(event) => setSettings({ ...settings, [item.id]: { ...draft, monthlyUsageEstimate: event.target.value } })} className="h-9 rounded-md border bg-background px-2" />
                <div>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.status === 'OK' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {item.status === 'OK' ? 'OK' : item.status === 'LOW' ? 'Niski' : 'Brak'}
                  </span>
                  {item.daysLeft !== null && <p className="mt-1 text-xs text-muted-foreground">ok. {item.daysLeft} dni</p>}
                </div>
                <button
                  type="button"
                  onClick={() => settingsMutation.mutate({
                    id: item.id,
                    data: {
                      minStock: Number(draft.minStock),
                      monthlyUsageEstimate: Number(draft.monthlyUsageEstimate),
                      unit: draft.unit,
                    },
                  })}
                  className="flex h-9 items-center gap-1 rounded-md border px-3 text-xs font-semibold hover:bg-accent"
                >
                  <Save size={14} /> Zapisz
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EntriesTable({
  title,
  rows,
  onDelete,
}: {
  title: string;
  rows: Array<{ id: string; date: string; main: string; sub: string; amount: number }>;
  onDelete: (id: string) => void;
}) {
  const total = useMemo(() => rows.reduce((sum, row) => sum + row.amount, 0), [rows]);
  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="flex items-center gap-2 font-semibold"><ClipboardList size={17} /> {title}</h2>
        <span className="text-sm font-bold text-primary">{money(total)}</span>
      </div>
      <div className="divide-y overflow-x-auto">
        {rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Brak wpisów w wybranym miesiącu.</div>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="grid min-w-[640px] grid-cols-[120px_1fr_auto_auto] items-center gap-3 px-4 py-3 text-sm">
              <span className="text-muted-foreground">{new Date(row.date).toLocaleDateString('pl-PL')}</span>
              <div className="min-w-0">
                <p className="truncate font-semibold">{row.main}</p>
                <p className="truncate text-xs text-muted-foreground">{row.sub}</p>
              </div>
              <span className="font-bold">{money(row.amount)}</span>
              <button type="button" onClick={() => onDelete(row.id)} className="rounded-md p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600">
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = 'text',
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  step?: string;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        type={type}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
        required={label === 'Kwota' || label === 'Data' || label === 'Opis kosztu' || label === 'Ilość'}
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border bg-background px-3 py-2">
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

const invalidateFinance = (queryClient: ReturnType<typeof useQueryClient>, month: string) => {
  queryClient.invalidateQueries({ queryKey: ['finances', 'dashboard', month] });
  queryClient.invalidateQueries({ queryKey: ['finances', 'revenues', month] });
  queryClient.invalidateQueries({ queryKey: ['finances', 'costs', month] });
};

const labelForCost = (value: FinanceCostCategory) => costCategories.find((item) => item.value === value)?.label ?? value;
const labelForRevenue = (value: FinanceRevenueSource) => revenueSources.find((item) => item.value === value)?.label ?? value;
