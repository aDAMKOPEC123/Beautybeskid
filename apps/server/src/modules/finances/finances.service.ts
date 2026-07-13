import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/error.middleware';
import type {
  FinanceCostCategory,
  FinanceEntryStatus,
  FinancePaymentMethod,
  FinanceRevenueSource,
  FinanceSalesChannel,
  InventoryMovementType,
  Prisma,
} from '@prisma/client';

type RevenueInput = {
  date: string;
  amount: number | string;
  grossAmount?: number | string;
  discountAmount?: number | string;
  tipAmount?: number | string;
  quantity?: number | string;
  source?: FinanceRevenueSource;
  channel?: FinanceSalesChannel;
  status?: FinanceEntryStatus;
  description?: string;
  clientName?: string;
  paymentMethod?: FinancePaymentMethod;
  serviceId?: string | null;
  appointmentId?: string | null;
  userId?: string | null;
  notes?: string;
};

type CostInput = {
  date: string;
  amount: number | string;
  category: FinanceCostCategory;
  description: string;
  vendor?: string;
  invoiceNumber?: string;
  quantity?: number | string;
  unitCost?: number | string;
  isFixed?: boolean;
  isRecurring?: boolean;
  isPaid?: boolean;
  dueDate?: string | null;
  paymentMethod?: FinancePaymentMethod;
  productId?: string | null;
  addToStock?: boolean;
};

type MovementInput = {
  productId: string;
  type: InventoryMovementType;
  quantity: number | string;
  date?: string;
  note?: string;
  unitCost?: number | string;
};

const monthRange = (month?: string) => {
  const match = month?.match(/^(\d{4})-(\d{2})$/);
  const now = new Date();
  const year = match ? Number(match[1]) : now.getFullYear();
  const monthIndex = match ? Number(match[2]) - 1 : now.getMonth();
  const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0));
  const previousStart = new Date(Date.UTC(year, monthIndex - 1, 1, 0, 0, 0, 0));
  return { start, end, previousStart, key: `${year}-${String(monthIndex + 1).padStart(2, '0')}` };
};

const toNumber = (value: unknown) => Number(value ?? 0);

const decimal = (value: number | string | undefined, field: string) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new AppError(`${field}: podaj prawidlowa kwote`, 400);
  return parsed;
};

const quantity = (value: number | string | undefined, field = 'Ilosc') => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new AppError(`${field}: podaj dodatnia liczbe calkowita`, 400);
  return parsed;
};

const cleanOptional = (value?: string | null) => {
  const text = value?.trim();
  return text ? text : undefined;
};

const revenueInclude = {
  service: { select: { id: true, name: true, price: true } },
  appointment: { select: { id: true, date: true, status: true } },
  user: { select: { id: true, name: true, email: true } },
} satisfies Prisma.FinanceRevenueInclude;

const costInclude = {
  product: { select: { id: true, name: true, brand: true, stock: true, unit: true } },
} satisfies Prisma.FinanceCostInclude;

export const listRevenues = async (month: string) => {
  const { start, end } = monthRange(month);
  return prisma.financeRevenue.findMany({
    where: { date: { gte: start, lt: end } },
    include: revenueInclude,
    orderBy: { date: 'desc' },
  });
};

export const createRevenue = async (data: RevenueInput) => {
  const grossAmount = decimal(data.grossAmount ?? data.amount, 'Kwota brutto');
  const discountAmount = decimal(data.discountAmount ?? 0, 'Rabat');
  const tipAmount = decimal(data.tipAmount ?? 0, 'Napiwek');
  const finalAmount = data.amount !== undefined
    ? decimal(data.amount, 'Przychod')
    : Math.max(0, grossAmount - discountAmount + tipAmount);

  return prisma.financeRevenue.create({
    data: {
      date: new Date(data.date),
      amount: finalAmount,
      grossAmount,
      discountAmount,
      tipAmount,
      quantity: quantity(data.quantity ?? 1, 'Ilosc'),
      source: data.source ?? 'SERVICE',
      channel: data.channel ?? 'WALK_IN',
      status: data.status ?? 'PAID',
      description: cleanOptional(data.description),
      clientName: cleanOptional(data.clientName),
      paymentMethod: data.paymentMethod ?? 'CARD',
      serviceId: data.serviceId || undefined,
      appointmentId: data.appointmentId || undefined,
      userId: data.userId || undefined,
      notes: cleanOptional(data.notes),
    },
    include: revenueInclude,
  });
};

export const updateRevenue = async (id: string, data: Partial<RevenueInput>) => {
  await ensureRevenue(id);
  return prisma.financeRevenue.update({
    where: { id },
    data: {
      ...(data.date !== undefined && { date: new Date(data.date) }),
      ...(data.amount !== undefined && { amount: decimal(data.amount, 'Przychod') }),
      ...(data.grossAmount !== undefined && { grossAmount: decimal(data.grossAmount, 'Kwota brutto') }),
      ...(data.discountAmount !== undefined && { discountAmount: decimal(data.discountAmount, 'Rabat') }),
      ...(data.tipAmount !== undefined && { tipAmount: decimal(data.tipAmount, 'Napiwek') }),
      ...(data.quantity !== undefined && { quantity: quantity(data.quantity, 'Ilosc') }),
      ...(data.source !== undefined && { source: data.source }),
      ...(data.channel !== undefined && { channel: data.channel }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.description !== undefined && { description: cleanOptional(data.description) ?? null }),
      ...(data.clientName !== undefined && { clientName: cleanOptional(data.clientName) ?? null }),
      ...(data.paymentMethod !== undefined && { paymentMethod: data.paymentMethod }),
      ...(data.serviceId !== undefined && { serviceId: data.serviceId || null }),
      ...(data.appointmentId !== undefined && { appointmentId: data.appointmentId || null }),
      ...(data.userId !== undefined && { userId: data.userId || null }),
      ...(data.notes !== undefined && { notes: cleanOptional(data.notes) ?? null }),
    },
    include: revenueInclude,
  });
};

export const deleteRevenue = async (id: string) => {
  await ensureRevenue(id);
  await prisma.financeRevenue.delete({ where: { id } });
};

export const listCosts = async (month: string) => {
  const { start, end } = monthRange(month);
  return prisma.financeCost.findMany({
    where: { date: { gte: start, lt: end } },
    include: costInclude,
    orderBy: { date: 'desc' },
  });
};

export const createCost = async (data: CostInput) => {
  const amount = decimal(data.amount, 'Koszt');
  const costQuantity = data.quantity !== undefined && data.quantity !== '' ? decimal(data.quantity, 'Ilosc') : undefined;
  const unitCost = data.unitCost !== undefined && data.unitCost !== '' ? decimal(data.unitCost, 'Koszt jednostkowy') : undefined;
  return prisma.$transaction(async (tx) => {
    const cost = await tx.financeCost.create({
      data: {
        date: new Date(data.date),
        amount,
        category: data.category,
        description: data.description.trim(),
        vendor: cleanOptional(data.vendor),
        invoiceNumber: cleanOptional(data.invoiceNumber),
        quantity: costQuantity,
        unitCost,
        isFixed: Boolean(data.isFixed),
        isRecurring: Boolean(data.isRecurring),
        isPaid: data.isPaid ?? true,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        paymentMethod: data.paymentMethod ?? 'TRANSFER',
        productId: data.productId || undefined,
      },
      include: costInclude,
    });

    if (data.addToStock && data.productId) {
      const qty = quantity(data.quantity, 'Ilosc zakupu');
      await tx.product.update({ where: { id: data.productId }, data: { stock: { increment: qty } } });
      await tx.inventoryMovement.create({
        data: {
          productId: data.productId,
          type: 'PURCHASE',
          quantity: qty,
          date: new Date(data.date),
          note: `Zakup: ${data.description.trim()}`,
          unitCost: unitCost ?? amount / qty,
          costId: cost.id,
        },
      });
    }

    return cost;
  });
};

export const updateCost = async (id: string, data: Partial<CostInput>) => {
  await ensureCost(id);
  return prisma.financeCost.update({
    where: { id },
    data: {
      ...(data.date !== undefined && { date: new Date(data.date) }),
      ...(data.amount !== undefined && { amount: decimal(data.amount, 'Koszt') }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.description !== undefined && { description: data.description.trim() }),
      ...(data.vendor !== undefined && { vendor: cleanOptional(data.vendor) ?? null }),
      ...(data.invoiceNumber !== undefined && { invoiceNumber: cleanOptional(data.invoiceNumber) ?? null }),
      ...(data.quantity !== undefined && { quantity: data.quantity === '' ? null : decimal(data.quantity, 'Ilosc') }),
      ...(data.unitCost !== undefined && { unitCost: data.unitCost === '' ? null : decimal(data.unitCost, 'Koszt jednostkowy') }),
      ...(data.isFixed !== undefined && { isFixed: data.isFixed }),
      ...(data.isRecurring !== undefined && { isRecurring: data.isRecurring }),
      ...(data.isPaid !== undefined && { isPaid: data.isPaid }),
      ...(data.dueDate !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate) : null }),
      ...(data.paymentMethod !== undefined && { paymentMethod: data.paymentMethod }),
      ...(data.productId !== undefined && { productId: data.productId || null }),
    },
    include: costInclude,
  });
};

export const deleteCost = async (id: string) => {
  await ensureCost(id);
  await prisma.financeCost.delete({ where: { id } });
};

export const getInventory = async () => {
  const products = await prisma.product.findMany({
    orderBy: { name: 'asc' },
    include: {
      inventoryMovements: {
        orderBy: { date: 'desc' },
        take: 8,
      },
    },
  });

  const items = products.map((product) => {
    const daysLeft =
      product.monthlyUsageEstimate > 0
        ? Math.floor(product.stock / (product.monthlyUsageEstimate / 30))
        : null;
    const status = product.stock <= 0 ? 'OUT' : product.stock <= product.minStock ? 'LOW' : 'OK';
    return {
      ...product,
      status,
      daysLeft,
      reorderQuantity: Math.max(product.minStock * 2 - product.stock, 0),
    };
  });

  return {
    items,
    summary: {
      totalProducts: items.length,
      lowStock: items.filter((item) => item.status === 'LOW').length,
      outOfStock: items.filter((item) => item.status === 'OUT').length,
      stockValue: items.reduce((sum, item) => sum + item.stock * item.price, 0),
    },
  };
};

export const createInventoryMovement = async (data: MovementInput) => {
  const qty = quantity(data.quantity);
  const product = await prisma.product.findUnique({ where: { id: data.productId } });
  if (!product) throw new AppError('Produkt nie znaleziony', 404);

  const delta = ['PURCHASE', 'CORRECTION'].includes(data.type) ? qty : -qty;
  if (product.stock + delta < 0) throw new AppError('Ruch magazynowy obnizylby stan ponizej zera', 400);

  return prisma.$transaction(async (tx) => {
    await tx.product.update({ where: { id: data.productId }, data: { stock: { increment: delta } } });
    return tx.inventoryMovement.create({
      data: {
        productId: data.productId,
        type: data.type,
        quantity: qty,
        date: data.date ? new Date(data.date) : new Date(),
        note: cleanOptional(data.note),
        unitCost: data.unitCost !== undefined ? decimal(data.unitCost, 'Koszt jednostkowy') : undefined,
      },
      include: { product: { select: { id: true, name: true, stock: true, unit: true } } },
    });
  });
};

export const updateInventorySettings = async (
  id: string,
  data: {
    minStock?: number | string;
    unit?: string;
    monthlyUsageEstimate?: number | string;
    supplier?: string | null;
    location?: string | null;
    expiryDate?: string | null;
  },
) => {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new AppError('Produkt nie znaleziony', 404);
  return prisma.product.update({
    where: { id },
    data: {
      ...(data.minStock !== undefined && { minStock: Math.max(0, Number(data.minStock)) }),
      ...(data.unit !== undefined && { unit: data.unit.trim() || 'szt.' }),
      ...(data.monthlyUsageEstimate !== undefined && {
        monthlyUsageEstimate: Math.max(0, Number(data.monthlyUsageEstimate)),
      }),
      ...(data.supplier !== undefined && { supplier: cleanOptional(data.supplier) ?? null }),
      ...(data.location !== undefined && { location: cleanOptional(data.location) ?? null }),
      ...(data.expiryDate !== undefined && { expiryDate: data.expiryDate ? new Date(data.expiryDate) : null }),
    },
  });
};

export const getDashboard = async (month: string) => {
  const { start, end, previousStart, key } = monthRange(month);
  const [revenues, costs, previousRevenues, previousCosts, inventory, completedAppointments] = await Promise.all([
    prisma.financeRevenue.findMany({
      where: { date: { gte: start, lt: end } },
      include: revenueInclude,
      orderBy: { date: 'asc' },
    }),
    prisma.financeCost.findMany({
      where: { date: { gte: start, lt: end } },
      include: costInclude,
      orderBy: { date: 'asc' },
    }),
    prisma.financeRevenue.findMany({ where: { date: { gte: previousStart, lt: start } } }),
    prisma.financeCost.findMany({ where: { date: { gte: previousStart, lt: start } } }),
    getInventory(),
    prisma.appointment.findMany({
      where: { status: 'COMPLETED', date: { gte: start, lt: end } },
      include: { service: { select: { id: true, name: true, price: true } } },
    }),
  ]);

  const revenueTotal = revenues.reduce((sum, item) => sum + toNumber(item.amount), 0);
  const costTotal = costs.reduce((sum, item) => sum + toNumber(item.amount), 0);
  const previousRevenueTotal = previousRevenues.reduce((sum, item) => sum + toNumber(item.amount), 0);
  const previousCostTotal = previousCosts.reduce((sum, item) => sum + toNumber(item.amount), 0);
  const profit = revenueTotal - costTotal;
  const previousProfit = previousRevenueTotal - previousCostTotal;
  const margin = revenueTotal > 0 ? (profit / revenueTotal) * 100 : 0;
  const paidRevenue = revenues
    .filter((revenue) => revenue.status === 'PAID' || revenue.status === 'PARTIAL')
    .reduce((sum, item) => sum + toNumber(item.amount), 0);
  const unpaidRevenue = revenues
    .filter((revenue) => revenue.status === 'UNPAID')
    .reduce((sum, item) => sum + toNumber(item.amount), 0);
  const discountTotal = revenues.reduce((sum, item) => sum + toNumber(item.discountAmount), 0);
  const tipTotal = revenues.reduce((sum, item) => sum + toNumber(item.tipAmount), 0);
  const unpaidCosts = costs
    .filter((cost) => !cost.isPaid)
    .reduce((sum, item) => sum + toNumber(item.amount), 0);
  const fixedCosts = costs
    .filter((cost) => cost.isFixed)
    .reduce((sum, item) => sum + toNumber(item.amount), 0);
  const variableCosts = costTotal - fixedCosts;
  const uniqueClients = new Set(
    revenues
      .map((revenue) => revenue.userId ?? revenue.clientName?.trim().toLowerCase())
      .filter(Boolean),
  ).size;
  const marketingSpend = costs
    .filter((cost) => cost.category === 'MARKETING')
    .reduce((sum, item) => sum + toNumber(item.amount), 0);

  const categoryCosts = groupBy(costs, (cost) => cost.category, (cost) => toNumber(cost.amount));
  const revenueBySource = groupBy(revenues, (revenue) => revenue.source, (revenue) => toNumber(revenue.amount));
  const revenueByChannel = groupBy(revenues, (revenue) => revenue.channel, (revenue) => toNumber(revenue.amount));
  const revenueByPaymentMethod = groupBy(revenues, (revenue) => revenue.paymentMethod, (revenue) => toNumber(revenue.amount));
  const topServices = groupBy(
    revenues.filter((revenue) => revenue.service),
    (revenue) => revenue.service?.name ?? 'Inne',
    (revenue) => toNumber(revenue.amount),
  )
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const daily = buildDailySeries(start, end, revenues, costs);
  const suggestions = buildSuggestions({
    revenueTotal,
    costTotal,
    profit,
    previousProfit,
    margin,
    marketingSpend,
    inventoryWarnings: inventory.summary.lowStock + inventory.summary.outOfStock,
    unpaidRevenue,
    unpaidCosts,
    discountTotal,
    uniqueClients,
    completedAppointments: completedAppointments.length,
    manualRevenueCount: revenues.length,
    appointmentRevenueEstimate: completedAppointments.reduce((sum, item) => sum + toNumber(item.service.price), 0),
  });

  return {
    month: key,
    totals: {
      revenue: revenueTotal,
      costs: costTotal,
      profit,
      margin,
      previousRevenue: previousRevenueTotal,
      previousCosts: previousCostTotal,
      previousProfit,
      revenueChange: percentChange(revenueTotal, previousRevenueTotal),
      profitChange: percentChange(profit, previousProfit),
      marketingSpend,
      marketingShare: revenueTotal > 0 ? (marketingSpend / revenueTotal) * 100 : 0,
      avgRevenueEntry: revenues.length > 0 ? revenueTotal / revenues.length : 0,
      avgClientValue: uniqueClients > 0 ? revenueTotal / uniqueClients : 0,
      paidRevenue,
      unpaidRevenue,
      unpaidCosts,
      fixedCosts,
      variableCosts,
      discountTotal,
      tipTotal,
      uniqueClients,
      dataCompleteness: calculateDataCompleteness(revenues, costs),
    },
    charts: {
      daily,
      categoryCosts,
      revenueBySource,
      revenueByChannel,
      revenueByPaymentMethod,
      topServices,
    },
    inventory: inventory.summary,
    recent: {
      revenues: revenues.slice(-5).reverse(),
      costs: costs.slice(-5).reverse(),
    },
    suggestions,
  };
};

const ensureRevenue = async (id: string) => {
  const item = await prisma.financeRevenue.findUnique({ where: { id }, select: { id: true } });
  if (!item) throw new AppError('Przychod nie znaleziony', 404);
};

const ensureCost = async (id: string) => {
  const item = await prisma.financeCost.findUnique({ where: { id }, select: { id: true } });
  if (!item) throw new AppError('Koszt nie znaleziony', 404);
};

const groupBy = <T>(items: T[], keyFn: (item: T) => string, valueFn: (item: T) => number) => {
  const totals = new Map<string, number>();
  for (const item of items) {
    const key = keyFn(item);
    totals.set(key, (totals.get(key) ?? 0) + valueFn(item));
  }
  return Array.from(totals.entries()).map(([label, value]) => ({ label, value }));
};

const buildDailySeries = (
  start: Date,
  end: Date,
  revenues: Array<{ date: Date; amount: Prisma.Decimal }>,
  costs: Array<{ date: Date; amount: Prisma.Decimal }>,
) => {
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    const key = date.toISOString().slice(0, 10);
    const revenue = revenues
      .filter((item) => item.date.toISOString().slice(0, 10) === key)
      .reduce((sum, item) => sum + toNumber(item.amount), 0);
    const cost = costs
      .filter((item) => item.date.toISOString().slice(0, 10) === key)
      .reduce((sum, item) => sum + toNumber(item.amount), 0);
    return { date: key, revenue, costs: cost, profit: revenue - cost };
  });
};

const percentChange = (current: number, previous: number) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
};

const buildSuggestions = (input: {
  revenueTotal: number;
  costTotal: number;
  profit: number;
  previousProfit: number;
  margin: number;
  marketingSpend: number;
  inventoryWarnings: number;
  unpaidRevenue: number;
  unpaidCosts: number;
  discountTotal: number;
  uniqueClients: number;
  completedAppointments: number;
  manualRevenueCount: number;
  appointmentRevenueEstimate: number;
}) => {
  const items: Array<{ type: 'success' | 'warning' | 'danger' | 'info'; title: string; body: string }> = [];

  if (input.manualRevenueCount === 0 && input.completedAppointments > 0) {
    items.push({
      type: 'warning',
      title: 'Uzupelnij reczne przychody',
      body: `W tym miesiacu jest ${input.completedAppointments} zakonczonych wizyt. Szacowana wartosc z cennika to ${Math.round(input.appointmentRevenueEstimate)} zl, ale rentownosc liczona jest z recznych wpisow.`,
    });
  }
  if (input.unpaidRevenue > 0) {
    items.push({
      type: 'warning',
      title: 'Sa nieoplacone przychody',
      body: `Do zebrania zostalo ${Math.round(input.unpaidRevenue)} zl. Oddzielaj przychod wykonany od pieniedzy faktycznie w kasie, bo inaczej cashflow bedzie zbyt optymistyczny.`,
    });
  }
  if (input.unpaidCosts > 0) {
    items.push({
      type: 'info',
      title: 'Masz koszty do zaplaty',
      body: `Nadchodzace lub nieoplacone koszty to ${Math.round(input.unpaidCosts)} zl. Uwzglednij je przed zwiekszeniem budzetu reklamowego.`,
    });
  }
  if (input.discountTotal > input.revenueTotal * 0.12 && input.revenueTotal > 0) {
    items.push({
      type: 'warning',
      title: 'Rabaty zjadaja przychod',
      body: 'Rabat przekracza 12% przychodu. Lepiej dawac bonus do kolejnej wizyty albo pakiety niz stale obnizac cene top uslug.',
    });
  }
  if (input.margin < 20 && input.revenueTotal > 0) {
    items.push({
      type: 'danger',
      title: 'Marza jest za niska',
      body: 'Sprawdz najwieksze kategorie kosztow i ceny uslug. Przy marzy ponizej 20% kazda promocja powinna miec limit lub minimalna wartosc wizyty.',
    });
  } else if (input.margin >= 45) {
    items.push({
      type: 'success',
      title: 'Rentownosc wyglada zdrowo',
      body: 'Mozesz bezpieczniej testowac kampanie reklamowe, ale trzymaj budzet marketingu w relacji do przychodow i mierz efekty po uslugach.',
    });
  }
  if (input.marketingSpend === 0 && input.revenueTotal > 0) {
    items.push({
      type: 'info',
      title: 'Brak kosztow marketingu',
      body: 'Jezeli pozyskujesz klientki z reklam, wpisuj je jako koszt MARKETING. Bez tego system nie policzy, czy warto zwiekszac budzet.',
    });
  } else if (input.revenueTotal > 0 && input.marketingSpend / input.revenueTotal > 0.18) {
    items.push({
      type: 'warning',
      title: 'Marketing mocno obciaza miesiac',
      body: 'Koszt marketingu przekracza 18% przychodu. Zostaw budzet tylko na kampanie, ktore przynosza wizyty na uslugi z wysoka marza.',
    });
  }
  if (input.marketingSpend > 0 && input.uniqueClients > 0) {
    const marketingPerClient = input.marketingSpend / input.uniqueClients;
    if (marketingPerClient > 80) {
      items.push({
        type: 'warning',
        title: 'Koszt pozyskania klientki jest wysoki',
        body: `Marketing kosztuje ok. ${Math.round(marketingPerClient)} zl na klientke w tym miesiacu. Przesun budzet na kanaly, ktore daja drozsze uslugi lub powroty.`,
      });
    }
  }
  if (input.profit < input.previousProfit) {
    items.push({
      type: 'warning',
      title: 'Zysk spadl wzgledem poprzedniego miesiaca',
      body: 'Porownaj dzienne przychody z kosztami stalymi. Najpierw ogranicz koszty uznaniowe, potem sprawdz oblozenie kalendarza i top uslugi.',
    });
  }
  if (input.inventoryWarnings > 0) {
    items.push({
      type: 'warning',
      title: 'Magazyn wymaga uzupelnienia',
      body: `${input.inventoryWarnings} produktow jest ponizej progu lub ma stan zero. Zaplanuj zakupy przed promocjami i popularnymi zabiegami.`,
    });
  }
  if (input.costTotal === 0 && input.revenueTotal > 0) {
    items.push({
      type: 'info',
      title: 'Dodaj koszty stale',
      body: 'Do dokladnej rentownosci wpisz czynsz, media, ZUS/podatki, wyplaty, produkty i narzedzia. Sam przychod zawyza obraz biznesu.',
    });
  }

  return items.slice(0, 6);
};

const calculateDataCompleteness = (
  revenues: Array<{ serviceId: string | null; userId: string | null; clientName: string | null; channel: string | null; paymentMethod: string | null }>,
  costs: Array<{ category: string | null; vendor: string | null; isPaid: boolean | null }>,
) => {
  const checks: boolean[] = [];
  for (const revenue of revenues) {
    checks.push(Boolean(revenue.serviceId || revenue.clientName || revenue.userId));
    checks.push(Boolean(revenue.channel));
    checks.push(Boolean(revenue.paymentMethod));
  }
  for (const cost of costs) {
    checks.push(Boolean(cost.category));
    checks.push(cost.isPaid !== null);
  }
  if (checks.length === 0) return 0;
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
};
