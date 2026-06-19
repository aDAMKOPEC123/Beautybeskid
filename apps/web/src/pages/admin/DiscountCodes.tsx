import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { discountCodesApi } from '@/api/discount-codes.api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export const AdminDiscountCodes = () => {
  const queryClient = useQueryClient();

  const [newCode, setNewCode] = useState({ code: '', discountType: 'PERCENTAGE' as 'PERCENTAGE' | 'AMOUNT', discountValue: '', isMultiUse: false });
  const [ambassadorForm, setAmbassadorForm] = useState<{ discountType: 'PERCENTAGE' | 'AMOUNT'; discountValue: string; referrerDiscountType: 'PERCENTAGE' | 'AMOUNT'; referrerDiscountValue: string }>({ discountType: 'PERCENTAGE', discountValue: '', referrerDiscountType: 'PERCENTAGE', referrerDiscountValue: '' });
  const { data: codes = [], isLoading } = useQuery({
    queryKey: ['admin', 'discount-codes'],
    queryFn: discountCodesApi.getAll,
  });

  const { data: ambassadorConfig } = useQuery({
    queryKey: ['admin', 'ambassador-config'],
    queryFn: discountCodesApi.getAmbassadorConfig,
  });

  const createMutation = useMutation({
    mutationFn: discountCodesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'discount-codes'] });
      setNewCode({ code: '', discountType: 'PERCENTAGE', discountValue: '', isMultiUse: false });
      toast.success('Kod rabatowy dodany');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Błąd tworzenia kodu'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => discountCodesApi.toggle(id, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'discount-codes'] }),
    onError: () => toast.error('Błąd zmiany statusu'),
  });

  const removeMutation = useMutation({
    mutationFn: discountCodesApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'discount-codes'] });
      toast.success('Kod dezaktywowany');
    },
    onError: () => toast.error('Błąd usuwania kodu'),
  });

  const ambassadorMutation = useMutation({
    mutationFn: discountCodesApi.updateAmbassadorConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'ambassador-config'] });
      toast.success('Ustawienia ambasadora zapisane');
    },
    onError: () => toast.error('Błąd zapisu ustawień'),
  });

  const handleCreate = () => {
    if (!newCode.code || !newCode.discountValue) return toast.error('Wypełnij wszystkie pola');
    const value = parseFloat(newCode.discountValue);
    if (isNaN(value) || value <= 0) return toast.error('Podaj prawidłową wartość');
    createMutation.mutate({ code: newCode.code.toUpperCase(), discountType: newCode.discountType, discountValue: value, isMultiUse: newCode.isMultiUse });
  };

  const handleAmbassadorSave = () => {
    const value = parseFloat(ambassadorForm.discountValue);
    const referrerValue = parseFloat(ambassadorForm.referrerDiscountValue);
    if (isNaN(value) || value <= 0) return toast.error('Podaj prawidłową wartość dla nowej osoby');
    if (isNaN(referrerValue) || referrerValue <= 0) return toast.error('Podaj prawidłową wartość dla polecającego');
    ambassadorMutation.mutate({ discountType: ambassadorForm.discountType, discountValue: value, referrerDiscountType: ambassadorForm.referrerDiscountType, referrerDiscountValue: referrerValue });
  };

  return (
    <div className="space-y-8 animate-enter">
      <h1 className="text-3xl font-heading font-bold text-primary">Kody Rabatowe</h1>

      {/* Section A: Codes list */}
      <Card>
        <CardHeader>
          <CardTitle>Lista kodów rabatowych</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Create form */}
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Kod</label>
              <Input
                placeholder="np. LATO2025"
                value={newCode.code}
                onChange={e => setNewCode(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                className="uppercase w-40"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Typ rabatu</label>
              <select
                value={newCode.discountType}
                onChange={e => setNewCode(p => ({ ...p, discountType: e.target.value as 'PERCENTAGE' | 'AMOUNT' }))}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="PERCENTAGE">Procentowy</option>
                <option value="AMOUNT">Kwotowy</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Wartość ({newCode.discountType === 'PERCENTAGE' ? '%' : 'zł'})
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="10"
                value={newCode.discountValue}
                onChange={e => setNewCode(p => ({ ...p, discountValue: e.target.value }))}
                className="w-28"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Typ użycia</label>
              <select
                value={newCode.isMultiUse ? 'multi' : 'single'}
                onChange={e => setNewCode(p => ({ ...p, isMultiUse: e.target.value === 'multi' }))}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="single">Jednorazowy</option>
                <option value="multi">Wielorazowy</option>
              </select>
            </div>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>Dodaj kod</Button>
          </div>

          {/* Table */}
          {isLoading ? (
            <p className="text-muted-foreground animate-pulse py-4">Ładowanie...</p>
          ) : codes.length === 0 ? (
            <p className="text-muted-foreground py-4">Brak kodów rabatowych.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-left">
                    <th className="py-2 pr-4 font-medium">Kod</th>
                    <th className="py-2 pr-4 font-medium">Typ rabatu</th>
                    <th className="py-2 pr-4 font-medium">Wartość</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium">Użyć</th>
                    <th className="py-2 pr-4 font-medium">Typ użycia</th>
                    <th className="py-2 font-medium">Akcje</th>
                  </tr>
                </thead>
                <tbody>
                  {codes.map((code: any) => (
                    <tr key={code.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-mono font-bold tracking-wider">{code.code}</td>
                      <td className="py-3 pr-4">{code.discountType === 'PERCENTAGE' ? 'Procentowy' : 'Kwotowy'}</td>
                      <td className="py-3 pr-4">
                        {code.discountType === 'PERCENTAGE'
                          ? `${Number(code.discountValue)}%`
                          : `${Number(code.discountValue).toFixed(2)} zł`}
                      </td>
                      <td className="py-3 pr-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={code.isActive}
                            onChange={e => toggleMutation.mutate({ id: code.id, isActive: e.target.checked })}
                            className="w-4 h-4"
                          />
                          <span className={code.isActive ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                            {code.isActive ? 'Aktywny' : 'Nieaktywny'}
                          </span>
                        </label>
                      </td>
                      <td className="py-3 pr-4">{code._count?.usages ?? 0}</td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${code.isMultiUse ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                          {code.isMultiUse ? 'Wielorazowy' : 'Jednorazowy'}
                        </span>
                      </td>
                      <td className="py-3">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeMutation.mutate(code.id)}
                          disabled={removeMutation.isPending}
                        >
                          Usuń
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section B: Ambassador config */}
      <Card>
        <CardHeader>
          <CardTitle>Ustawienia kodu ambasadorskiego</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <p className="text-sm font-medium">Zniżka dla nowej osoby (rejestrującej się przez kod)</p>
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Typ</label>
                <select
                  value={ambassadorForm.discountType}
                  onChange={e => setAmbassadorForm(p => ({ ...p, discountType: e.target.value as 'PERCENTAGE' | 'AMOUNT' }))}
                  className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="PERCENTAGE">Procentowy</option>
                  <option value="AMOUNT">Kwotowy</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Wartość ({ambassadorForm.discountType === 'PERCENTAGE' ? '%' : 'zł'})
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="10"
                  value={ambassadorForm.discountValue}
                  onChange={e => setAmbassadorForm(p => ({ ...p, discountValue: e.target.value }))}
                  className="w-28"
                />
              </div>
            </div>
            {ambassadorConfig && (
              <p className="text-xs text-muted-foreground">
                Aktualnie: <strong>{ambassadorConfig.discountType === 'PERCENTAGE'
                  ? `${Number(ambassadorConfig.discountValue)}%`
                  : `${Number(ambassadorConfig.discountValue).toFixed(2)} zł`}</strong>
              </p>
            )}
          </div>
          <div className="border-t pt-5 space-y-3">
            <p className="text-sm font-medium">Zniżka dla polecającego (za każde skuteczne polecenie)</p>
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Typ</label>
                <select
                  value={ambassadorForm.referrerDiscountType}
                  onChange={e => setAmbassadorForm(p => ({ ...p, referrerDiscountType: e.target.value as 'PERCENTAGE' | 'AMOUNT' }))}
                  className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="PERCENTAGE">Procentowy</option>
                  <option value="AMOUNT">Kwotowy</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Wartość ({ambassadorForm.referrerDiscountType === 'PERCENTAGE' ? '%' : 'zł'})
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="10"
                  value={ambassadorForm.referrerDiscountValue}
                  onChange={e => setAmbassadorForm(p => ({ ...p, referrerDiscountValue: e.target.value }))}
                  className="w-28"
                />
              </div>
            </div>
            {ambassadorConfig && (
              <p className="text-xs text-muted-foreground">
                Aktualnie: <strong>{ambassadorConfig.referrerDiscountType === 'PERCENTAGE'
                  ? `${Number(ambassadorConfig.referrerDiscountValue)}%`
                  : `${Number(ambassadorConfig.referrerDiscountValue).toFixed(2)} zł`}</strong>
              </p>
            )}
          </div>
          <Button onClick={handleAmbassadorSave} disabled={ambassadorMutation.isPending}>Zapisz ustawienia</Button>
        </CardContent>
      </Card>
    </div>
  );
};
