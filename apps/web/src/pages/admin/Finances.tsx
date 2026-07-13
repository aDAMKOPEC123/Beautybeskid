import { FormEvent, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Banknote,
  CalendarDays,
  Check,
  CreditCard,
  Landmark,
  Lightbulb,
  Package,
  PackageCheck,
  PackageMinus,
  PackagePlus,
  Plus,
  ReceiptText,
  Save,
  Search,
  ShoppingBag,
  Sparkles,
  Trash2,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  financesApi,
  type FinanceCostCategory,
  type FinanceDashboard,
  type FinanceEntryStatus,
  type FinancePaymentMethod,
  type FinanceRevenue,
  type FinanceRevenueSource,
  type FinanceSalesChannel,
  type InventoryItem,
  type InventoryMovementType,
} from '@/api/finances.api';
import { servicesApi } from '@/api/services.api';
import { usersApi } from '@/api/users.api';
import { productsApi } from '@/api/products.api';

type Tab = 'dashboard' | 'revenues' | 'costs' | 'inventory';

const revenueSources: Array<{ value: FinanceRevenueSource; label: string; icon: typeof Sparkles }> = [
  { value: 'SERVICE', label: 'Usługa', icon: Sparkles },
  { value: 'PRODUCT', label: 'Produkt', icon: ShoppingBag },
  { value: 'VOUCHER', label: 'Voucher', icon: ReceiptText },
  { value: 'OTHER', label: 'Inne', icon: Plus },
];

const costCategories: Array<{ value: FinanceCostCategory; label: string; hint: string }> = [
  { value: 'PRODUCTS', label: 'Produkty', hint: 'kosmetyki, materiały, zatowarowanie' },
  { value: 'MARKETING', label: 'Marketing', hint: 'reklamy, sesje, materiały promocyjne' },
  { value: 'RENT', label: 'Czynsz', hint: 'lokal i opłaty stałe' },
  { value: 'SALARIES', label: 'Wynagrodzenia', hint: 'pracownicy i zlecenia' },
  { value: 'UTILITIES', label: 'Media', hint: 'prąd, woda, ogrzewanie' },
  { value: 'TAXES', label: 'Podatki/ZUS', hint: 'podatki, składki, księgowość' },
  { value: 'EQUIPMENT', label: 'Sprzęt', hint: 'urządzenia, narzędzia, serwis' },
  { value: 'TRAINING', label: 'Szkolenia', hint: 'kursy i rozwój' },
  { value: 'SOFTWARE', label: 'Software', hint: 'aplikacje, subskrypcje' },
  { value: 'OTHER', label: 'Inne', hint: 'pozostałe koszty' },
];

const paymentMethods: Array<{ value: FinancePaymentMethod; label: string; icon: typeof CreditCard }> = [
  { value: 'CARD', label: 'Karta', icon: CreditCard },
  { value: 'CASH', label: 'Gotówka', icon: Banknote },
  { value: 'BLIK', label: 'BLIK', icon: Wallet },
  { value: 'TRANSFER', label: 'Przelew', icon: Landmark },
  { value: 'OTHER', label: 'Inne', icon: Plus },
];

const channels: Array<{ value: FinanceSalesChannel; label: string }> = [
  { value: 'WALK_IN', label: 'Na miejscu' },
  { value: 'BOOKING', label: 'Rezerwacja' },
  { value: 'WEBSITE', label: 'Strona' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'PHONE', label: 'Telefon' },
  { value: 'REFERRAL', label: 'Polecenie' },
  { value: 'OTHER', label: 'Inne' },
];

const entryStatuses: Array<{ value: FinanceEntryStatus; label: string }> = [
  { value: 'PAID', label: 'Opłacone' },
  { value: 'PARTIAL', label: 'Częściowo' },
  { value: 'UNPAID', label: 'Do zapłaty' },
  { value: 'REFUNDED', label: 'Zwrot' },
];

const movementTypes: Array<{ value: InventoryMovementType; label: string; icon: typeof PackagePlus }> = [
  { value: 'PURCHASE', label: 'Dostawa', icon: PackagePlus },
  { value: 'USAGE', label: 'Zużycie', icon: PackageMinus },
  { value: 'SALE', label: 'Sprzedaż', icon: ShoppingBag },
  { value: 'WASTE', label: 'Strata', icon: AlertTriangle },
  { value: 'CORRECTION', label: 'Korekta', icon: PackageCheck },
];

const money = (value: number | string | null | undefined) =>
  new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(Number(value ?? 0));

const today = () => new Date().toISOString().slice(0, 10);
const currentMonth = () => today().slice(0, 7);
const monthStart = (month: string) => `${month}-01`;
const percent = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
const num = (value: string) => Number(value || 0);

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
    <div className="space-y-5 animate-enter">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Panel admina</p>
          <h1 className="mt-1 text-3xl font-heading font-bold">Finanse</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Sprzedaż, koszty, marża, cashflow i magazyn w jednym miejscu. Im pełniej uzupełnisz wpisy, tym dokładniejsze będą rekomendacje.
          </p>
        </div>
        <label className="w-full max-w-xs text-sm font-medium">
          Badany miesiąc
          <input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="mt-1 h-10 w-full rounded-lg border bg-background px-3"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2 rounded-lg border bg-card p-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold transition-colors ${
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

function DashboardTab({ dashboard }: { dashboard: UseQueryResult<FinanceDashboard> }) {
  if (dashboard.isLoading) return <div className="h-72 rounded-lg border bg-card animate-pulse" />;
  if (!dashboard.data) return <p className="text-sm text-muted-foreground">Nie udało się pobrać danych.</p>;

  const data = dashboard.data;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Metric label="Przychód" value={money(data.totals.revenue)} hint={`${percent(data.totals.revenueChange)} vs poprzedni miesiąc`} tone="good" />
        <Metric label="Zysk" value={money(data.totals.profit)} hint={`${percent(data.totals.profitChange)} vs poprzedni miesiąc`} tone={data.totals.profit >= 0 ? 'good' : 'bad'} />
        <Metric label="Marża" value={`${data.totals.margin.toFixed(1)}%`} hint={`Stałe: ${money(data.totals.fixedCosts)}`} tone={data.totals.margin >= 35 ? 'good' : data.totals.margin < 20 ? 'bad' : 'neutral'} />
        <Metric label="Do zebrania" value={money(data.totals.unpaidRevenue)} hint={`Koszty do zapłaty: ${money(data.totals.unpaidCosts)}`} tone={data.totals.unpaidRevenue > 0 ? 'bad' : 'neutral'} />
        <Metric label="Jakość danych" value={`${data.totals.dataCompleteness}%`} hint={`${data.totals.uniqueClients} klientek`} tone={data.totals.dataCompleteness >= 80 ? 'good' : 'neutral'} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_.9fr]">
        <DailyChart data={data.charts.daily} />
        <section className="rounded-lg border bg-card p-4">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><Lightbulb size={18} /> Decyzje na ten miesiąc</h2>
          <div className="space-y-2">
            {data.suggestions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Dodaj kilka przychodów i kosztów, a system zacznie podpowiadać decyzje.</p>
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
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        <Panel title="Top usługi"><BarList data={data.charts.topServices} /></Panel>
        <Panel title="Kanały przychodu"><BarList data={data.charts.revenueByChannel.map((item) => ({ ...item, label: labelForChannel(item.label as FinanceSalesChannel) }))} /></Panel>
        <Panel title="Koszty"><BarList data={data.charts.categoryCosts.map((item) => ({ ...item, label: labelForCost(item.label as FinanceCostCategory) }))} /></Panel>
        <Panel title="Kontrola">
          <div className="space-y-3 text-sm">
            <Line label="Rabaty" value={money(data.totals.discountTotal)} />
            <Line label="Napiwki" value={money(data.totals.tipTotal)} />
            <Line label="Średnio / klientka" value={money(data.totals.avgClientValue)} />
            <Line label="Braki magazynowe" value={String(data.inventory.lowStock + data.inventory.outOfStock)} danger={data.inventory.lowStock + data.inventory.outOfStock > 0} />
          </div>
        </Panel>
      </div>
    </div>
  );
}

function RevenuesTab({ month }: { month: string }) {
  const queryClient = useQueryClient();
  const [clientQuery, setClientQuery] = useState('');
  const [form, setForm] = useState({
    date: today(),
    source: 'SERVICE' as FinanceRevenueSource,
    serviceId: '',
    clientName: '',
    grossAmount: '',
    discountAmount: '0',
    tipAmount: '0',
    quantity: '1',
    channel: 'BOOKING' as FinanceSalesChannel,
    status: 'PAID' as FinanceEntryStatus,
    paymentMethod: 'CARD' as FinancePaymentMethod,
    description: '',
    notes: '',
  });

  useEffect(() => {
    if (!form.date.startsWith(month)) setForm((current) => ({ ...current, date: monthStart(month) }));
  }, [month, form.date]);

  const revenues = useQuery({ queryKey: ['finances', 'revenues', month], queryFn: () => financesApi.getRevenues(month) });
  const services = useQuery({ queryKey: ['services'], queryFn: servicesApi.getAll });
  const users = useQuery({
    queryKey: ['users', 'search', clientQuery],
    queryFn: () => usersApi.search(clientQuery),
    enabled: clientQuery.trim().length >= 2,
  });

  const finalAmount = Math.max(0, num(form.grossAmount) - num(form.discountAmount) + num(form.tipAmount));
  const selectedUser = users.data?.find((user) => user.name === form.clientName);

  const createMutation = useMutation({
    mutationFn: financesApi.createRevenue,
    onSuccess: () => {
      invalidateFinance(queryClient, month);
      setForm((current) => ({
        ...current,
        grossAmount: '',
        discountAmount: '0',
        tipAmount: '0',
        quantity: '1',
        clientName: '',
        description: '',
        notes: '',
      }));
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

  const submit = (event: FormEvent) => {
    event.preventDefault();
    createMutation.mutate({
      ...form,
      amount: finalAmount,
      grossAmount: num(form.grossAmount),
      discountAmount: num(form.discountAmount),
      tipAmount: num(form.tipAmount),
      quantity: Number(form.quantity || 1),
      serviceId: form.serviceId || null,
      userId: selectedUser?.id ?? null,
    });
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[460px_1fr]">
      <form onSubmit={submit} className="h-fit space-y-4 rounded-lg border bg-card p-4 shadow-sm">
        <FormHeader icon={ArrowUpRight} title="Nowy przychód" value={money(finalAmount)} />

        <div className="grid grid-cols-2 gap-2">
          {revenueSources.map(({ value, label, icon: Icon }) => (
            <ChoiceButton
              key={value}
              active={form.source === value}
              onClick={() => setForm({ ...form, source: value })}
              icon={Icon}
              label={label}
            />
          ))}
        </div>

        <FieldGroup title="Sprzedaż">
          <label className="block text-sm font-medium">
            Usługa z cennika
            <select
              value={form.serviceId}
              onChange={(event) => {
                const service = services.data?.find((item) => item.id === event.target.value);
                setForm({
                  ...form,
                  serviceId: event.target.value,
                  source: service ? 'SERVICE' : form.source,
                  grossAmount: service ? String(Number(service.price)) : form.grossAmount,
                  description: service ? service.name : form.description,
                });
              }}
              className="mt-1 h-10 w-full rounded-lg border bg-background px-3"
            >
              <option value="">Bez powiązania</option>
              {services.data?.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
            </select>
          </label>
          <Input label="Opis / za co" value={form.description} onChange={(value) => setForm({ ...form, description: value })} placeholder="np. oczyszczanie + konsultacja" />
          <div className="grid grid-cols-3 gap-2">
            <Input label="Cena brutto" type="number" step="0.01" value={form.grossAmount} onChange={(value) => setForm({ ...form, grossAmount: value })} required />
            <Input label="Rabat" type="number" step="0.01" value={form.discountAmount} onChange={(value) => setForm({ ...form, discountAmount: value })} />
            <Input label="Napiwek" type="number" step="0.01" value={form.tipAmount} onChange={(value) => setForm({ ...form, tipAmount: value })} />
          </div>
        </FieldGroup>

        <FieldGroup title="Klientka i płatność">
          <label className="block text-sm font-medium">
            Klientka
            <div className="relative mt-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={form.clientName}
                list="finance-clients"
                onChange={(event) => {
                  setForm({ ...form, clientName: event.target.value });
                  setClientQuery(event.target.value);
                }}
                className="h-10 w-full rounded-lg border bg-background pl-9 pr-3"
                placeholder="imię, telefon albo email"
              />
            </div>
            <datalist id="finance-clients">
              {users.data?.map((user) => <option key={user.id} value={user.name}>{user.email}</option>)}
            </datalist>
          </label>
          <Segmented
            label="Status"
            value={form.status}
            options={entryStatuses}
            onChange={(value) => setForm({ ...form, status: value as FinanceEntryStatus })}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <Select label="Kanał" value={form.channel} onChange={(value) => setForm({ ...form, channel: value as FinanceSalesChannel })} options={channels} />
            <Select label="Płatność" value={form.paymentMethod} onChange={(value) => setForm({ ...form, paymentMethod: value as FinancePaymentMethod })} options={paymentMethods} />
          </div>
        </FieldGroup>

        <Input label="Notatka wewnętrzna" value={form.notes} onChange={(value) => setForm({ ...form, notes: value })} placeholder="np. klientka z reklamy IG, wraca za 4 tygodnie" />

        <button disabled={createMutation.isPending || finalAmount <= 0} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          <Save size={16} />
          Zapisz przychód
        </button>
      </form>

      <RevenueList revenues={revenues.data ?? []} onDelete={(id) => deleteMutation.mutate(id)} />
    </div>
  );
}

function CostsTab({ month }: { month: string }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    date: today(),
    amount: '',
    category: 'PRODUCTS' as FinanceCostCategory,
    description: '',
    vendor: '',
    invoiceNumber: '',
    isFixed: false,
    isRecurring: false,
    isPaid: true,
    dueDate: '',
    paymentMethod: 'TRANSFER' as FinancePaymentMethod,
    productId: '',
    addToStock: true,
    quantity: '',
    unitCost: '',
  });

  useEffect(() => {
    if (!form.date.startsWith(month)) setForm((current) => ({ ...current, date: monthStart(month) }));
  }, [month, form.date]);

  const costs = useQuery({ queryKey: ['finances', 'costs', month], queryFn: () => financesApi.getCosts(month) });
  const inventory = useQuery({ queryKey: ['finances', 'inventory'], queryFn: financesApi.getInventory });

  const createMutation = useMutation({
    mutationFn: financesApi.createCost,
    onSuccess: () => {
      invalidateFinance(queryClient, month);
      queryClient.invalidateQueries({ queryKey: ['finances', 'inventory'] });
      setForm((current) => ({ ...current, amount: '', description: '', vendor: '', invoiceNumber: '', quantity: '', unitCost: '' }));
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
      amount: num(form.amount),
      productId: form.productId || null,
      quantity: form.quantity,
      unitCost: form.unitCost,
      dueDate: form.dueDate || null,
    });
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[460px_1fr]">
      <form onSubmit={submit} className="h-fit space-y-4 rounded-lg border bg-card p-4 shadow-sm">
        <FormHeader icon={ArrowDownRight} title="Nowy koszt" value={money(form.amount)} />

        <FieldGroup title="Kategoria">
          <div className="grid grid-cols-2 gap-2">
            {costCategories.map((category) => (
              <button
                key={category.value}
                type="button"
                onClick={() => setForm({ ...form, category: category.value, isFixed: ['RENT', 'SALARIES', 'UTILITIES', 'SOFTWARE', 'TAXES'].includes(category.value) })}
                className={`rounded-lg border p-3 text-left transition-colors ${form.category === category.value ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-accent'}`}
              >
                <span className="block text-sm font-semibold">{category.label}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{category.hint}</span>
              </button>
            ))}
          </div>
        </FieldGroup>

        <FieldGroup title="Dokument i płatność">
          <div className="grid gap-2 sm:grid-cols-2">
            <Input label="Data kosztu" type="date" value={form.date} onChange={(value) => setForm({ ...form, date: value })} required />
            <Input label="Kwota" type="number" step="0.01" value={form.amount} onChange={(value) => setForm({ ...form, amount: value })} required />
          </div>
          <Input label="Opis" value={form.description} onChange={(value) => setForm({ ...form, description: value })} placeholder="np. kremy do zabiegów / reklama Meta" required />
          <div className="grid gap-2 sm:grid-cols-2">
            <Input label="Dostawca" value={form.vendor} onChange={(value) => setForm({ ...form, vendor: value })} />
            <Input label="Faktura / numer" value={form.invoiceNumber} onChange={(value) => setForm({ ...form, invoiceNumber: value })} />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Select label="Płatność" value={form.paymentMethod} onChange={(value) => setForm({ ...form, paymentMethod: value as FinancePaymentMethod })} options={paymentMethods} />
            <Input label="Termin płatności" type="date" value={form.dueDate} onChange={(value) => setForm({ ...form, dueDate: value })} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Toggle active={form.isFixed} onClick={() => setForm({ ...form, isFixed: !form.isFixed })} label="Stały" />
            <Toggle active={form.isRecurring} onClick={() => setForm({ ...form, isRecurring: !form.isRecurring })} label="Cykliczny" />
            <Toggle active={form.isPaid} onClick={() => setForm({ ...form, isPaid: !form.isPaid })} label={form.isPaid ? 'Opłacony' : 'Do zapłaty'} />
          </div>
        </FieldGroup>

        <FieldGroup title="Magazyn">
          <label className="block text-sm font-medium">
            Produkt
            <select value={form.productId} onChange={(event) => setForm({ ...form, productId: event.target.value })} className="mt-1 h-10 w-full rounded-lg border bg-background px-3">
              <option value="">Nie dotyczy</option>
              {inventory.data?.items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          {form.productId && (
            <>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.addToStock} onChange={(event) => setForm({ ...form, addToStock: event.target.checked })} />
                Dodaj zakup do stanu magazynowego
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input label="Ilość" type="number" step="0.001" value={form.quantity} onChange={(value) => setForm({ ...form, quantity: value })} />
                <Input label="Koszt jednostkowy" type="number" step="0.01" value={form.unitCost} onChange={(value) => setForm({ ...form, unitCost: value })} />
              </div>
            </>
          )}
        </FieldGroup>

        <button disabled={createMutation.isPending || num(form.amount) <= 0 || !form.description.trim()} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          <Save size={16} />
          Zapisz koszt
        </button>
      </form>

      <CostList costs={costs.data ?? []} onDelete={(id) => deleteMutation.mutate(id)} />
    </div>
  );
}

function InventoryTab() {
  const queryClient = useQueryClient();
  const inventory = useQuery({ queryKey: ['finances', 'inventory'], queryFn: financesApi.getInventory });
  const [filter, setFilter] = useState<'all' | 'alerts'>('alerts');
  const [settings, setSettings] = useState<Record<string, { minStock: string; monthlyUsageEstimate: string; unit: string; supplier: string; location: string; expiryDate: string }>>({});
  const [productForm, setProductForm] = useState({
    name: '',
    brand: '',
    description: '',
    price: '',
    stock: '0',
    unit: 'szt.',
    minStock: '5',
    monthlyUsageEstimate: '0',
    supplier: '',
    location: '',
    expiryDate: '',
  });
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
          supplier: item.supplier ?? '',
          location: item.location ?? '',
          expiryDate: item.expiryDate ? item.expiryDate.slice(0, 10) : '',
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

  const createProductMutation = useMutation({
    mutationFn: (data: typeof productForm) => {
      const formData = new FormData();
      formData.append('name', data.name.trim());
      formData.append('brand', data.brand.trim());
      formData.append('description', data.description.trim());
      formData.append('price', String(Number(data.price)));
      formData.append('stock', String(Number(data.stock)));
      formData.append('unit', data.unit.trim() || 'szt.');
      formData.append('minStock', String(Number(data.minStock)));
      formData.append('monthlyUsageEstimate', String(Number(data.monthlyUsageEstimate)));
      formData.append('supplier', data.supplier.trim());
      formData.append('location', data.location.trim());
      if (data.expiryDate) formData.append('expiryDate', data.expiryDate);
      formData.append('isActive', 'true');
      return productsApi.create(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['finances'] });
      setProductForm({
        name: '',
        brand: '',
        description: '',
        price: '',
        stock: '0',
        unit: 'szt.',
        minStock: '5',
        monthlyUsageEstimate: '0',
        supplier: '',
        location: '',
        expiryDate: '',
      });
      setFilter('all');
      toast.success('Produkt dodany do magazynu');
    },
    onError: () => toast.error('Nie udalo sie dodac produktu'),
  });

  const settingsMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { minStock: number; monthlyUsageEstimate: number; unit: string; supplier: string; location: string; expiryDate: string | null } }) =>
      financesApi.updateInventorySettings(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finances', 'inventory'] });
      toast.success('Ustawienia produktu zapisane');
    },
    onError: () => toast.error('Nie udało się zapisać ustawień'),
  });

  const items = (inventory.data?.items ?? []).filter((item) => filter === 'all' || item.status !== 'OK');

  const submitMovement = (event: FormEvent) => {
    event.preventDefault();
    movementMutation.mutate({
      productId: movement.productId,
      type: movement.type,
      quantity: Number(movement.quantity),
      note: movement.note,
    });
  };

  const submitProduct = (event: FormEvent) => {
    event.preventDefault();
    if (!productForm.name.trim()) {
      toast.error('Podaj nazwe produktu');
      return;
    }
    if (Number(productForm.price) <= 0) {
      toast.error('Podaj cene produktu');
      return;
    }
    createProductMutation.mutate(productForm);
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="Produkty" value={String(inventory.data?.summary.totalProducts ?? 0)} />
        <Metric label="Niski stan" value={String(inventory.data?.summary.lowStock ?? 0)} tone={(inventory.data?.summary.lowStock ?? 0) > 0 ? 'bad' : 'good'} />
        <Metric label="Brak" value={String(inventory.data?.summary.outOfStock ?? 0)} tone={(inventory.data?.summary.outOfStock ?? 0) > 0 ? 'bad' : 'good'} />
        <Metric label="Wartość" value={money(inventory.data?.summary.stockValue ?? 0)} />
      </div>

      <form onSubmit={submitProduct} className="space-y-4 rounded-lg border bg-card p-4">
        <FormHeader icon={PackagePlus} title="Dodaj produkt do magazynu" value={money(Number(productForm.price || 0) * Number(productForm.stock || 0))} />

        <FieldGroup title="Dane produktu">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Input label="Nazwa produktu" value={productForm.name} onChange={(value) => setProductForm({ ...productForm, name: value })} placeholder="np. Krem regenerujacy" required />
            <Input label="Marka" value={productForm.brand} onChange={(value) => setProductForm({ ...productForm, brand: value })} placeholder="np. Image Skincare" />
            <Input label="Cena" type="number" step="0.01" value={productForm.price} onChange={(value) => setProductForm({ ...productForm, price: value })} placeholder="0.00" required />
            <Input label="Stan poczatkowy" type="number" step="0.01" value={productForm.stock} onChange={(value) => setProductForm({ ...productForm, stock: value })} required />
            <Input label="Jednostka" value={productForm.unit} onChange={(value) => setProductForm({ ...productForm, unit: value })} placeholder="szt., ml, op." />
            <Input label="Prog minimalny" type="number" step="0.01" value={productForm.minStock} onChange={(value) => setProductForm({ ...productForm, minStock: value })} />
            <Input label="Zuzycie / mies." type="number" step="0.01" value={productForm.monthlyUsageEstimate} onChange={(value) => setProductForm({ ...productForm, monthlyUsageEstimate: value })} />
            <Input label="Wazne do" type="date" value={productForm.expiryDate} onChange={(value) => setProductForm({ ...productForm, expiryDate: value })} />
          </div>
        </FieldGroup>

        <FieldGroup title="Organizacja">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_2fr]">
            <Input label="Dostawca" value={productForm.supplier} onChange={(value) => setProductForm({ ...productForm, supplier: value })} placeholder="hurtownia lub opiekun" />
            <Input label="Miejsce w salonie" value={productForm.location} onChange={(value) => setProductForm({ ...productForm, location: value })} placeholder="np. szafka A2" />
            <Input label="Opis / zastosowanie" value={productForm.description} onChange={(value) => setProductForm({ ...productForm, description: value })} placeholder="do jakich zabiegow, uwagi zakupowe" />
          </div>
        </FieldGroup>

        <button disabled={createProductMutation.isPending || !productForm.name.trim() || Number(productForm.price) <= 0} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50 md:w-auto">
          <PackagePlus size={16} />
          Dodaj produkt
        </button>
      </form>

      <form onSubmit={submitMovement} className="grid gap-3 rounded-lg border bg-card p-4 lg:grid-cols-[1.3fr_1fr_.7fr_1.4fr_auto] lg:items-end">
        <label className="block text-sm font-medium">
          Ruch dla produktu
          <select required value={movement.productId} onChange={(event) => setMovement({ ...movement, productId: event.target.value })} className="mt-1 h-10 w-full rounded-lg border bg-background px-3">
            <option value="">Wybierz produkt</option>
            {inventory.data?.items.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.stock} {item.unit})</option>)}
          </select>
        </label>
        <Select label="Typ" value={movement.type} onChange={(value) => setMovement({ ...movement, type: value as InventoryMovementType })} options={movementTypes} />
        <Input label="Ilość" type="number" value={movement.quantity} onChange={(value) => setMovement({ ...movement, quantity: value })} required />
        <Input label="Notatka" value={movement.note} onChange={(value) => setMovement({ ...movement, note: value })} placeholder="np. zużyto do zabiegu" />
        <button disabled={movementMutation.isPending || !movement.productId || Number(movement.quantity) <= 0} className="flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          <Save size={16} />
          Zapisz
        </button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Widok"
          value={filter}
          options={[
            { value: 'alerts', label: 'Tylko braki' },
            { value: 'all', label: 'Wszystkie' },
          ]}
          onChange={(value) => setFilter(value as 'all' | 'alerts')}
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {items.map((item) => {
          const draft = settings[item.id] ?? draftFromItem(item);
          return (
            <article key={item.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{item.name}</h3>
                  <p className="text-xs text-muted-foreground">{item.brand || 'Bez marki'} · {money(item.price)} · {draft.location || 'brak lokalizacji'}</p>
                </div>
                <StockBadge item={item} />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                <MiniStat label="Stan" value={`${item.stock} ${draft.unit}`} />
                <MiniStat label="Próg" value={`${item.minStock} ${draft.unit}`} />
                <MiniStat label="Wystarczy" value={item.daysLeft === null ? 'brak danych' : `${item.daysLeft} dni`} />
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <Input label="Próg min." type="number" value={draft.minStock} onChange={(value) => setSettings({ ...settings, [item.id]: { ...draft, minStock: value } })} />
                <Input label="Zużycie / mies." type="number" value={draft.monthlyUsageEstimate} onChange={(value) => setSettings({ ...settings, [item.id]: { ...draft, monthlyUsageEstimate: value } })} />
                <Input label="Jednostka" value={draft.unit} onChange={(value) => setSettings({ ...settings, [item.id]: { ...draft, unit: value } })} />
                <Input label="Dostawca" value={draft.supplier} onChange={(value) => setSettings({ ...settings, [item.id]: { ...draft, supplier: value } })} />
                <Input label="Miejsce" value={draft.location} onChange={(value) => setSettings({ ...settings, [item.id]: { ...draft, location: value } })} />
                <Input label="Ważne do" type="date" value={draft.expiryDate} onChange={(value) => setSettings({ ...settings, [item.id]: { ...draft, expiryDate: value } })} />
              </div>

              <button
                type="button"
                onClick={() => settingsMutation.mutate({
                  id: item.id,
                  data: {
                    minStock: Number(draft.minStock),
                    monthlyUsageEstimate: Number(draft.monthlyUsageEstimate),
                    unit: draft.unit,
                    supplier: draft.supplier,
                    location: draft.location,
                    expiryDate: draft.expiryDate || null,
                  },
                })}
                className="mt-4 flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold hover:bg-accent"
              >
                <Save size={16} />
                Zapisz ustawienia
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function RevenueList({ revenues, onDelete }: { revenues: FinanceRevenue[]; onDelete: (id: string) => void }) {
  const total = revenues.reduce((sum, item) => sum + Number(item.amount), 0);
  return (
    <Panel title="Przychody miesiąca" action={money(total)}>
      <div className="space-y-2">
        {revenues.length === 0 ? <EmptyState text="Brak przychodów w tym miesiącu." /> : revenues.map((item) => (
          <EntryRow
            key={item.id}
            date={item.date}
            title={item.description || item.service?.name || labelForRevenue(item.source)}
            subtitle={`${item.clientName || item.user?.name || 'bez klientki'} · ${labelForChannel(item.channel)} · ${labelForStatus(item.status)}`}
            amount={Number(item.amount)}
            aside={Number(item.discountAmount) > 0 ? `rabat ${money(item.discountAmount)}` : labelForPayment(item.paymentMethod)}
            onDelete={() => onDelete(item.id)}
          />
        ))}
      </div>
    </Panel>
  );
}

function CostList({ costs, onDelete }: { costs: Array<any>; onDelete: (id: string) => void }) {
  const total = costs.reduce((sum, item) => sum + Number(item.amount), 0);
  return (
    <Panel title="Koszty miesiąca" action={money(total)}>
      <div className="space-y-2">
        {costs.length === 0 ? <EmptyState text="Brak kosztów w tym miesiącu." /> : costs.map((item) => (
          <EntryRow
            key={item.id}
            date={item.date}
            title={item.description}
            subtitle={`${labelForCost(item.category)}${item.vendor ? ` · ${item.vendor}` : ''}${item.isFixed ? ' · stały' : ''}${!item.isPaid ? ' · do zapłaty' : ''}`}
            amount={Number(item.amount)}
            aside={item.invoiceNumber || labelForPayment(item.paymentMethod)}
            onDelete={() => onDelete(item.id)}
            negative
          />
        ))}
      </div>
    </Panel>
  );
}

function DailyChart({ data }: { data: Array<{ date: string; revenue: number; costs: number }> }) {
  const max = Math.max(...data.flatMap((item) => [item.revenue, item.costs]), 1);
  const revenuePoints = data.map((item, index) => {
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
    <section className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Przepływ dzienny</h2>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-600" /> Przychody</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Koszty</span>
        </div>
      </div>
      <svg viewBox="0 0 100 104" className="h-52 w-full overflow-visible" preserveAspectRatio="none">
        <polyline fill="none" stroke="#059669" strokeWidth="2.2" points={revenuePoints.join(' ')} vectorEffect="non-scaling-stroke" />
        <polyline fill="none" stroke="#ef4444" strokeWidth="2.2" points={costPoints.join(' ')} vectorEffect="non-scaling-stroke" />
      </svg>
    </section>
  );
}

function Metric({ label, value, hint, tone = 'neutral' }: { label: string; value: string; hint?: string; tone?: 'neutral' | 'good' | 'bad' }) {
  const color = tone === 'good' ? 'text-emerald-700' : tone === 'bad' ? 'text-red-700' : 'text-primary';
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Panel({ title, action, children }: { title: string; action?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-semibold">{title}</h2>
        {action && <span className="text-sm font-bold text-primary">{action}</span>}
      </div>
      {children}
    </section>
  );
}

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3 rounded-lg border bg-background/40 p-3">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</legend>
      {children}
    </fieldset>
  );
}

function FormHeader({ icon: Icon, title, value }: { icon: typeof ArrowUpRight; title: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 font-semibold"><Icon size={18} /> {title}</h2>
      <span className="rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-bold text-primary">{value}</span>
    </div>
  );
}

function ChoiceButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof Sparkles; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-11 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors ${active ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-accent'}`}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

function Toggle({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors ${active ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-accent'}`}
    >
      {active && <Check size={15} />}
      {label}
    </button>
  );
}

function Segmented({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return (
    <div>
      <p className="mb-1 text-sm font-medium">{label}</p>
      <div className="flex flex-wrap gap-1 rounded-lg border bg-background p-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`h-8 rounded-md px-2.5 text-xs font-semibold transition-colors ${value === option.value ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text', step, placeholder, required = false }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  step?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        type={type}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="mt-1 h-10 w-full rounded-lg border bg-background px-3"
      />
    </label>
  );
}

function Select({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-10 w-full rounded-lg border bg-background px-3">
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function EntryRow({ date, title, subtitle, amount, aside, onDelete, negative = false }: {
  date: string;
  title: string;
  subtitle: string;
  amount: number;
  aside: string;
  onDelete: () => void;
  negative?: boolean;
}) {
  return (
    <div className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[92px_1fr_auto_auto] sm:items-center">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <CalendarDays size={14} />
        {new Date(date).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="text-left sm:text-right">
        <p className={`text-sm font-bold ${negative ? 'text-red-700' : 'text-emerald-700'}`}>{negative ? '-' : ''}{money(amount)}</p>
        <p className="text-xs text-muted-foreground">{aside}</p>
      </div>
      <button type="button" onClick={onDelete} className="h-9 w-9 rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-600" aria-label="Usuń wpis">
        <Trash2 size={16} className="mx-auto" />
      </button>
    </div>
  );
}

function BarList({ data }: { data: Array<{ label: string; value: number }> }) {
  const max = Math.max(...data.map((item) => item.value), 1);
  if (data.length === 0) return <EmptyState text="Brak danych." />;
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

function Line({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold ${danger ? 'text-red-700' : ''}`}>{value}</span>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function StockBadge({ item }: { item: InventoryItem }) {
  const className = item.status === 'OK' ? 'bg-emerald-100 text-emerald-700' : item.status === 'LOW' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-700';
  const label = item.status === 'OK' ? 'OK' : item.status === 'LOW' ? 'Niski stan' : 'Brak';
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>{label}</span>;
}

function EmptyState({ text }: { text: string }) {
  return <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{text}</p>;
}

const draftFromItem = (item: InventoryItem) => ({
  minStock: String(item.minStock),
  monthlyUsageEstimate: String(item.monthlyUsageEstimate),
  unit: item.unit,
  supplier: item.supplier ?? '',
  location: item.location ?? '',
  expiryDate: item.expiryDate ? item.expiryDate.slice(0, 10) : '',
});

const invalidateFinance = (queryClient: ReturnType<typeof useQueryClient>, month: string) => {
  queryClient.invalidateQueries({ queryKey: ['finances', 'dashboard', month] });
  queryClient.invalidateQueries({ queryKey: ['finances', 'revenues', month] });
  queryClient.invalidateQueries({ queryKey: ['finances', 'costs', month] });
  queryClient.invalidateQueries({ queryKey: ['finances', 'inventory'] });
};

const labelForCost = (value: FinanceCostCategory) => costCategories.find((item) => item.value === value)?.label ?? value;
const labelForRevenue = (value: FinanceRevenueSource) => revenueSources.find((item) => item.value === value)?.label ?? value;
const labelForChannel = (value: FinanceSalesChannel) => channels.find((item) => item.value === value)?.label ?? value;
const labelForStatus = (value: FinanceEntryStatus) => entryStatuses.find((item) => item.value === value)?.label ?? value;
const labelForPayment = (value: FinancePaymentMethod) => paymentMethods.find((item) => item.value === value)?.label ?? value;
