import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { academyApi } from '@/api/academy.api';
import { Search, UserCheck, UserX, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { toast } from 'sonner';

export function AdminAccessManager() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [expiryDates, setExpiryDates] = useState<Record<string, string>>({});

  // Debounce
  const handleSearch = (val: string) => {
    setQuery(val);
    clearTimeout((window as any).__academySearchTimer);
    (window as any).__academySearchTimer = setTimeout(() => setDebouncedQuery(val), 400);
  };

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users', 'search', debouncedQuery],
    queryFn: () => academyApi.searchUsers(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  });

  const grantMutation = useMutation({
    mutationFn: ({ userId, expiresAt }: { userId: string; expiresAt?: string }) =>
      academyApi.grantAccess(userId, expiresAt),
    onSuccess: () => {
      toast.success('Dostęp do Akademii nadany');
      queryClient.invalidateQueries({ queryKey: ['users', 'search'] });
    },
    onError: () => toast.error('Błąd podczas nadawania dostępu'),
  });

  const revokeMutation = useMutation({
    mutationFn: (userId: string) => academyApi.revokeAccess(userId),
    onSuccess: () => {
      toast.success('Dostęp cofnięty');
      queryClient.invalidateQueries({ queryKey: ['users', 'search'] });
    },
    onError: () => toast.error('Błąd podczas cofania dostępu'),
  });

  const { data: accessLogs = {} as Record<string, any[]> } = useQuery({
    queryKey: ['academy', 'access-logs', [...expandedLogs].join(',')],
    queryFn: async () => {
      const results: Record<string, any[]> = {};
      await Promise.all(
        [...expandedLogs].map(async (userId) => {
          results[userId] = await academyApi.getAccessLog(userId);
        })
      );
      return results;
    },
    enabled: expandedLogs.size > 0,
  });

  const actionLabel: Record<string, string> = {
    GRANTED: 'Nadano',
    REVOKED: 'Cofnięto',
    EXTENDED: 'Przedłużono',
    EXPIRED: 'Wygasło',
  };

  const toggleLog = (userId: string) => {
    setExpandedLogs((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const getAccessStatus = (user: any): { label: string; color: string } => {
    if (!user.hasAcademyAccess) return { label: 'Brak dostępu', color: 'text-muted-foreground' };
    if (user.academyAccessExpiresAt && new Date(user.academyAccessExpiresAt) < new Date())
      return { label: 'Wygasł', color: 'text-red-600' };
    return { label: 'Aktywny', color: 'text-green-600' };
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Szukaj użytkownika po nazwisku lub emailu (min. 2 znaki)..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {debouncedQuery.length >= 2 && (
        <div className="space-y-2">
          {isLoading && <p className="text-sm text-muted-foreground">Szukam...</p>}
          {!isLoading && users.length === 0 && (
            <p className="text-sm text-muted-foreground">Brak wyników dla „{debouncedQuery}"</p>
          )}
          {users.map((user: any) => {
            const status = getAccessStatus(user);
            const logs = (accessLogs as any)[user.id] ?? [];
            const isExpanded = expandedLogs.has(user.id);

            return (
              <div key={user.id} className="bg-card rounded-lg border overflow-hidden">
                <div className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{user.name}</p>
                      <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    {user.hasAcademyAccess && user.academyAccessExpiresAt && (
                      <p className="text-xs text-muted-foreground">
                        Wygasa: {format(new Date(user.academyAccessExpiresAt), 'd MMM yyyy', { locale: pl })}
                      </p>
                    )}
                    {user.hasAcademyAccess && user.academyGrantedAt && (
                      <p className="text-xs text-muted-foreground">
                        Nadano: {format(new Date(user.academyGrantedAt), 'd MMM yyyy', { locale: pl })}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!user.hasAcademyAccess ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={expiryDates[user.id] ?? ''}
                          onChange={(e) => setExpiryDates((p) => ({ ...p, [user.id]: e.target.value }))}
                          className="text-xs border rounded px-2 py-1 focus:outline-none"
                          placeholder="Wygasa (opcjonalnie)"
                        />
                        <button
                          onClick={() => grantMutation.mutate({ userId: user.id, expiresAt: expiryDates[user.id] || undefined })}
                          disabled={grantMutation.isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          Nadaj dostęp
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => revokeMutation.mutate(user.id)}
                        disabled={revokeMutation.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-destructive text-destructive rounded-md text-xs font-medium hover:bg-destructive/10 transition-colors disabled:opacity-50"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        Cofnij dostęp
                      </button>
                    )}
                    <button
                      onClick={() => toggleLog(user.id)}
                      className="p-1.5 rounded-md hover:bg-accent transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t px-4 py-3 bg-muted/30">
                    {logs.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Brak historii dostępu</p>
                    ) : (
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Historia dostępu</p>
                        {logs.map((log: any) => (
                          <div key={log.id} className="flex items-center gap-3 text-xs">
                            <span className={`font-medium ${log.action === 'GRANTED' ? 'text-green-600' : log.action === 'REVOKED' ? 'text-red-600' : 'text-muted-foreground'}`}>
                              {actionLabel[log.action] ?? log.action}
                            </span>
                            <span className="text-muted-foreground">
                              {format(new Date(log.createdAt), 'd MMM yyyy HH:mm', { locale: pl })}
                            </span>
                            {log.expiresAt && (
                              <span className="text-muted-foreground">
                                · do {format(new Date(log.expiresAt), 'd MMM yyyy', { locale: pl })}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {debouncedQuery.length < 2 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Wpisz co najmniej 2 znaki, aby wyszukać użytkownika
        </p>
      )}
    </div>
  );
}
