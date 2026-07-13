import { api } from '../lib/axios';
import type { Product } from './products.api';

export type FinanceRevenueSource = 'SERVICE' | 'PRODUCT' | 'VOUCHER' | 'OTHER';
export type FinanceCostCategory =
  | 'PRODUCTS'
  | 'MARKETING'
  | 'RENT'
  | 'SALARIES'
  | 'UTILITIES'
  | 'TAXES'
  | 'EQUIPMENT'
  | 'TRAINING'
  | 'SOFTWARE'
  | 'OTHER';
export type FinancePaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'BLIK' | 'OTHER';
export type FinanceSalesChannel = 'WALK_IN' | 'BOOKING' | 'WEBSITE' | 'INSTAGRAM' | 'FACEBOOK' | 'PHONE' | 'REFERRAL' | 'OTHER';
export type FinanceEntryStatus = 'PAID' | 'UNPAID' | 'PARTIAL' | 'REFUNDED';
export type InventoryMovementType = 'PURCHASE' | 'USAGE' | 'SALE' | 'WASTE' | 'CORRECTION';

export type FinanceRevenue = {
  id: string;
  date: string;
  amount: number | string;
  grossAmount: number | string | null;
  discountAmount: number | string;
  tipAmount: number | string;
  quantity: number;
  source: FinanceRevenueSource;
  channel: FinanceSalesChannel;
  status: FinanceEntryStatus;
  description: string | null;
  clientName: string | null;
  paymentMethod: FinancePaymentMethod;
  serviceId: string | null;
  appointmentId: string | null;
  userId: string | null;
  notes: string | null;
  service?: { id: string; name: string; price: number | string } | null;
  appointment?: { id: string; date: string; status: string } | null;
  user?: { id: string; name: string; email: string } | null;
};

export type FinanceCost = {
  id: string;
  date: string;
  amount: number | string;
  category: FinanceCostCategory;
  description: string;
  vendor: string | null;
  invoiceNumber: string | null;
  quantity: number | string | null;
  unitCost: number | string | null;
  isFixed: boolean;
  isRecurring: boolean;
  isPaid: boolean;
  dueDate: string | null;
  paymentMethod: FinancePaymentMethod;
  productId: string | null;
  product?: Pick<Product, 'id' | 'name' | 'brand' | 'stock' | 'unit'> | null;
};

export type InventoryMovement = {
  id: string;
  productId: string;
  type: InventoryMovementType;
  quantity: number;
  date: string;
  note: string | null;
  unitCost: number | string | null;
};

export type InventoryItem = Product & {
  status: 'OK' | 'LOW' | 'OUT';
  daysLeft: number | null;
  reorderQuantity: number;
  inventoryMovements: InventoryMovement[];
};

export type FinanceDashboard = {
  month: string;
  totals: {
    revenue: number;
    costs: number;
    profit: number;
    margin: number;
    previousRevenue: number;
    previousCosts: number;
    previousProfit: number;
    revenueChange: number;
    profitChange: number;
    marketingSpend: number;
    marketingShare: number;
    avgRevenueEntry: number;
    avgClientValue: number;
    paidRevenue: number;
    unpaidRevenue: number;
    unpaidCosts: number;
    fixedCosts: number;
    variableCosts: number;
    discountTotal: number;
    tipTotal: number;
    uniqueClients: number;
    dataCompleteness: number;
  };
  charts: {
    daily: Array<{ date: string; revenue: number; costs: number; profit: number }>;
    categoryCosts: Array<{ label: string; value: number }>;
    revenueBySource: Array<{ label: string; value: number }>;
    revenueByChannel: Array<{ label: string; value: number }>;
    revenueByPaymentMethod: Array<{ label: string; value: number }>;
    topServices: Array<{ label: string; value: number }>;
  };
  inventory: {
    totalProducts: number;
    lowStock: number;
    outOfStock: number;
    stockValue: number;
  };
  recent: {
    revenues: FinanceRevenue[];
    costs: FinanceCost[];
  };
  suggestions: Array<{ type: 'success' | 'warning' | 'danger' | 'info'; title: string; body: string }>;
};

export const financesApi = {
  getDashboard: async (month: string): Promise<FinanceDashboard> => {
    const res = await api.get('/finances/dashboard', { params: { month } });
    return res.data.data;
  },
  getRevenues: async (month: string): Promise<FinanceRevenue[]> => {
    const res = await api.get('/finances/revenues', { params: { month } });
    return res.data.data.revenues;
  },
  createRevenue: async (data: Partial<FinanceRevenue>) => {
    const res = await api.post('/finances/revenues', data);
    return res.data.data.revenue as FinanceRevenue;
  },
  updateRevenue: async (id: string, data: Partial<FinanceRevenue>) => {
    const res = await api.patch(`/finances/revenues/${id}`, data);
    return res.data.data.revenue as FinanceRevenue;
  },
  deleteRevenue: async (id: string) => {
    await api.delete(`/finances/revenues/${id}`);
  },
  getCosts: async (month: string): Promise<FinanceCost[]> => {
    const res = await api.get('/finances/costs', { params: { month } });
    return res.data.data.costs;
  },
  createCost: async (data: Partial<FinanceCost> & { addToStock?: boolean; quantity?: number | string; unitCost?: number | string }) => {
    const res = await api.post('/finances/costs', data);
    return res.data.data.cost as FinanceCost;
  },
  updateCost: async (id: string, data: Partial<FinanceCost>) => {
    const res = await api.patch(`/finances/costs/${id}`, data);
    return res.data.data.cost as FinanceCost;
  },
  deleteCost: async (id: string) => {
    await api.delete(`/finances/costs/${id}`);
  },
  getInventory: async (): Promise<{ items: InventoryItem[]; summary: FinanceDashboard['inventory'] }> => {
    const res = await api.get('/finances/inventory');
    return res.data.data;
  },
  createInventoryMovement: async (data: {
    productId: string;
    type: InventoryMovementType;
    quantity: number;
    date?: string;
    note?: string;
    unitCost?: number;
  }) => {
    const res = await api.post('/finances/inventory/movements', data);
    return res.data.data.movement as InventoryMovement;
  },
  updateInventorySettings: async (
    id: string,
    data: { minStock?: number; unit?: string; monthlyUsageEstimate?: number; supplier?: string; location?: string; expiryDate?: string | null },
  ) => {
    const res = await api.patch(`/finances/inventory/products/${id}/settings`, data);
    return res.data.data.product as Product;
  },
};
