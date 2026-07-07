import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/axios';
import { toast } from 'sonner';

export const AdminLoyalty = () => {
  const queryClient = useQueryClient();
  const [isRewardsModalOpen, setIsRewardsModalOpen] = useState(false);
  const [newReward, setNewReward] = useState<{
    name: string;
    description: string;
    pointsCost: string;
    requiredTier: string;
    isForAllServices: boolean;
    applicableServiceIds: string[];
    discountType: 'PERCENTAGE' | 'AMOUNT' | 'OTHER';
    discountValue: string;
  }>({
    name: '',
    description: '',
    pointsCost: '',
    requiredTier: '',
    isForAllServices: true,
    applicableServiceIds: [],
    discountType: 'AMOUNT',
    discountValue: ''
  });

  const { data: users, isLoading: usersLoading } = useQuery({ 
    queryKey: ['admin', 'users'], 
    queryFn: async () => {
      const res = await api.get('/users');
      return res.data.data.users;
    } 
  });

  const { data: rewards, isLoading: rewardsLoading } = useQuery({
    queryKey: ['admin', 'loyalty-rewards'],
    queryFn: async () => {
      const res = await api.get('/loyalty/rewards');
      return res.data.data.rewards;
    },
    enabled: isRewardsModalOpen
  });

  const { data: services } = useQuery({
    queryKey: ['admin', 'services'],
    queryFn: async () => {
      const res = await api.get('/services');
      return res.data.data.services;
    },
    enabled: isRewardsModalOpen
  });

  const adjustPoints = async (userId: string) => {
    const pointsStr = prompt('Podaj ilość punktów (np. 100 lub -50):');
    if (!pointsStr) return;
    const points = parseInt(pointsStr);
    if (isNaN(points)) return toast.error('Podano nieprawidłową wartość.');

    const description = prompt('Podaj powód modyfikacji:') || 'Ręczna korekta (Admin)';

    try {
      await api.post('/loyalty/adjust', {
        userId,
        points,
        type: points >= 0 ? 'EARN' : 'MANUAL_ADJUST',
        description
      });
      toast.success('Zaktualizowano punkty.');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    } catch (e) {
      toast.error('Wystąpił błąd przy aktualizacji.');
    }
  };

  const updateTier = async (userId: string, tier: string) => {
    try {
      await api.patch(`/loyalty/users/${userId}/tier`, { tier });
      toast.success('Pakiet zaktualizowany.');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    } catch (e) {
      toast.error('Błąd zmiany pakietu.');
    }
  };

  const createRewardMutation = useMutation({
    mutationFn: async () => {
      return api.post('/loyalty/rewards', {
        name: newReward.name,
        description: newReward.description || undefined,
        pointsCost: parseInt(newReward.pointsCost),
        requiredTier: newReward.requiredTier || undefined,
        isForAllServices: newReward.isForAllServices,
        applicableServiceIds: newReward.applicableServiceIds,
        discountType: newReward.discountType,
        discountValue: newReward.discountValue ? parseFloat(newReward.discountValue) : undefined
      });
    },
    onSuccess: () => {
      toast.success('Nagroda dodana.');
      queryClient.invalidateQueries({ queryKey: ['admin', 'loyalty-rewards'] });
      setNewReward({
        name: '', description: '', pointsCost: '', requiredTier: '',
        isForAllServices: true, applicableServiceIds: [],
        discountType: 'AMOUNT', discountValue: ''
      });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Błąd dodawania nagrody.')
  });

  const deleteRewardMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/loyalty/rewards/${id}`);
    },
    onSuccess: () => {
      toast.success('Nagroda usunięta.');
      queryClient.invalidateQueries({ queryKey: ['admin', 'loyalty-rewards'] });
    }
  });

  const handleServiceToggle = (serviceId: string) => {
    setNewReward(prev => ({
      ...prev,
      applicableServiceIds: prev.applicableServiceIds.includes(serviceId)
        ? prev.applicableServiceIds.filter(id => id !== serviceId)
        : [...prev.applicableServiceIds, serviceId]
    }));
  };

  return (
    <div className="space-y-6 animate-enter relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-heading font-bold text-primary">Program Lojalnościowy</h1>
        <Button className="shadow-md" variant="outline" onClick={() => setIsRewardsModalOpen(true)}>
          Zarządzaj Katalogiem Nagród
        </Button>
      </div>

      <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/30 text-muted-foreground uppercase text-xs font-bold border-b">
                <tr>
                  <th className="px-6 py-5">Klient</th>
                  <th className="px-6 py-5">Poziom Lojalnościowy</th>
                  <th className="px-6 py-5 text-center">Punkty Portfela</th>
                  <th className="px-6 py-5 text-right">Punkty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 bg-card">
                {usersLoading ? <tr><td colSpan={4} className="p-12 text-center animate-pulse text-muted-foreground">Pobieranie użytkowników...</td></tr> : users?.map((u: any) => (
                  <tr key={u.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-base text-foreground">{u.name}</p>
                      <p className="text-muted-foreground font-medium text-xs mt-0.5">{u.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        value={u.loyaltyTier}
                        onChange={(e) => updateTier(u.id, e.target.value)}
                        className={`font-black px-3 py-2 rounded-md text-xs shadow-sm cursor-pointer outline-none ring-1 ring-border
                        ${u.loyaltyTier === 'GOLD' ? 'bg-yellow-100 text-yellow-800' : u.loyaltyTier === 'SILVER' ? 'bg-slate-200 text-slate-800' : 'bg-amber-100 text-amber-900'}`}
                      >
                        <option value="BRONZE">BRONZE</option>
                        <option value="SILVER">SILVER</option>
                        <option value="GOLD">GOLD</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-center font-black text-2xl text-primary">{u.loyaltyPoints}</td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="secondary" size="sm" onClick={() => adjustPoints(u.id)} className="shadow-sm font-semibold">Dodaj / Odejmij</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Rewards Management Modal */}
      {isRewardsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-background rounded-2xl shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-muted/20">
              <h2 className="text-2xl font-bold font-heading">Katalog Nagród</h2>
              <button onClick={() => setIsRewardsModalOpen(false)} className="text-muted-foreground hover:text-foreground font-bold text-xl p-2">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Add New Reward Form */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Dodaj nową nagrodę</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Nazwa</label>
                    <Input value={newReward.name} onChange={e => setNewReward({...newReward, name: e.target.value})} placeholder="np. Zniżka 50 zł" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Opcjonalny Opis</label>
                    <Input value={newReward.description} onChange={e => setNewReward({...newReward, description: e.target.value})} placeholder="Krótki wpis..." />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Koszt Punktów</label>
                    <Input type="number" value={newReward.pointsCost} onChange={e => setNewReward({...newReward, pointsCost: e.target.value})} placeholder="np. 500" />
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Typ Zniżki</label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      value={newReward.discountType}
                      onChange={e => setNewReward({...newReward, discountType: e.target.value as 'PERCENTAGE' | 'AMOUNT' | 'OTHER'})}
                    >
                      <option value="AMOUNT">Kwota (zł)</option>
                      <option value="PERCENTAGE">Procent (%)</option>
                      <option value="OTHER">Inna</option>
                    </select>
                  </div>

                  {newReward.discountType !== 'OTHER' && (
                    <div>
                      <label className="text-xs font-semibold uppercase text-muted-foreground">
                        {newReward.discountType === 'PERCENTAGE' ? 'Wartość Zniżki (%) *' : 'Wartość Zniżki (zł) *'}
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step={newReward.discountType === 'PERCENTAGE' ? '1' : '0.01'}
                        value={newReward.discountValue}
                        onChange={e => setNewReward({...newReward, discountValue: e.target.value})}
                        placeholder={newReward.discountType === 'PERCENTAGE' ? 'np. 10' : 'np. 50.00'}
                      />
                    </div>
                  )}
                  
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Wymagany Pakiet (Opcjonalnie)</label>
                    <select 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      value={newReward.requiredTier}
                      onChange={e => setNewReward({...newReward, requiredTier: e.target.value})}
                    >
                      <option value="">Wszystkie (Domyślnie)</option>
                      <option value="BRONZE">BRONZE</option>
                      <option value="SILVER">SILVER</option>
                      <option value="GOLD">GOLD</option>
                    </select>
                  </div>

                  <div className="pt-2 border-t mt-2">
                    <label className="flex items-center space-x-2 cursor-pointer mb-3">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 w-4 h-4"
                        checked={newReward.isForAllServices} 
                        onChange={e => setNewReward({...newReward, isForAllServices: e.target.checked})} 
                      />
                      <span className="text-sm font-medium">Nagroda obowiązuje na wszystkie usługi</span>
                    </label>

                    {!newReward.isForAllServices && (
                      <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-2 bg-muted/10">
                        <p className="text-xs text-muted-foreground mb-2">Zaznacz usługi docelowe:</p>
                        {services?.map((s: any) => (
                          <label key={s.id} className="flex items-center space-x-2 text-sm cursor-pointer">
                            <input 
                              type="checkbox"
                              className="rounded"
                              checked={newReward.applicableServiceIds.includes(s.id)}
                              onChange={() => handleServiceToggle(s.id)}
                            />
                            <span>{s.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button onClick={() => {
                    const discountValue = parseFloat(newReward.discountValue);
                    if (newReward.discountType !== 'OTHER' && (!Number.isFinite(discountValue) || discountValue <= 0)) {
                      toast.error('Podaj wartość zniżki większą od zera');
                      return;
                    }
                    if (newReward.discountType === 'PERCENTAGE' && discountValue > 100) {
                      toast.error('Zniżka procentowa nie może przekraczać 100%');
                      return;
                    }
                    createRewardMutation.mutate();
                  }} disabled={createRewardMutation.isPending || !newReward.name || !newReward.pointsCost} className="w-full mt-4">
                    {createRewardMutation.isPending ? 'Dodawanie...' : 'Utwórz Nagrodę'}
                  </Button>
                </div>
              </div>

              {/* Existing Rewards List */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Istniejące Nagrody</h3>
                {rewardsLoading ? <p>Ładowanie...</p> : (
                  <div className="space-y-3">
                    {rewards?.length === 0 && <p className="text-sm text-muted-foreground">Z katalogu nagród wieje nudą... dodaj pierwszą!</p>}
                    {rewards?.map((r: any) => (
                      <div key={r.id} className="p-3 border rounded-lg bg-card shadow-sm flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold">{r.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{r.pointsCost} punktów</p>
                          </div>
                          <Button variant="destructive" size="sm" className="h-7 text-xs px-2" onClick={() => {
                            if (confirm('Usunąć tę nagrodę?')) deleteRewardMutation.mutate(r.id);
                          }}>Usuń</Button>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {r.requiredTier && (
                            <span className="inline-block text-[10px] font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                              Pakiet: {r.requiredTier}
                            </span>
                          )}
                          {r.discountType && (
                            <span className="inline-block text-[10px] font-bold px-2 py-0.5 bg-green-100 text-green-800 rounded-full">
                              {r.discountType === 'PERCENTAGE'
                                ? `Zniżka ${r.discountValue ?? ''}%`
                                : r.discountType === 'AMOUNT'
                                ? `Zniżka ${r.discountValue ?? ''} zł`
                                : 'Zniżka specjalna'}
                            </span>
                          )}
                        </div>
                        {!r.isForAllServices && r.applicableServices?.length > 0 && (
                          <div className="text-[10px] text-muted-foreground flex flex-wrap gap-1 mt-1">
                            Aplikuje się do: {r.applicableServices.map((s: any) => <span key={s.id} className="bg-muted px-1.5 py-0.5 rounded">{s.name}</span>)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
