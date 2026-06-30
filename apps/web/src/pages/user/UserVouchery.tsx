import { useState, useEffect } from 'react';
import { vouchersApi, type Voucher } from '@/api/vouchers.api';
import { Gift, Ticket, Clock, CheckCircle, XCircle, ChevronRight, Trash2 } from 'lucide-react';

const STORAGE_KEY = 'cosmo_tracked_vouchers';

function loadTracked(): string[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveTracked(codes: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(codes));
}

function voucherStatus(v: Voucher): 'active' | 'partial' | 'used' | 'expired' {
  if (new Date(v.validUntil) < new Date()) return 'expired';
  if (v.type === 'CASH') {
    const rem = Number(v.remainingAmount ?? 0);
    if (rem <= 0) return 'used';
    if (rem < Number(v.amount ?? 0)) return 'partial';
  }
  return 'active';
}

const statusLabel: Record<string, string> = {
  active: 'Aktywny',
  partial: 'Częściowo użyty',
  used: 'Wykorzystany',
  expired: 'Wygasł',
};

const statusColor: Record<string, string> = {
  active: 'text-green-700 bg-green-50 border-green-200',
  partial: 'text-amber-700 bg-amber-50 border-amber-200',
  used: 'text-muted-foreground bg-muted/40 border-border',
  expired: 'text-destructive bg-destructive/5 border-destructive/20',
};

function VoucherCard({ voucher, onRemove }: { voucher: Voucher; onRemove: () => void }) {
  const status = voucherStatus(voucher);
  const isCash = voucher.type === 'CASH';
  const amount = Number(voucher.amount ?? 0);
  const remaining = Number(voucher.remainingAmount ?? 0);
  const used = amount - remaining;
  const pct = amount > 0 ? Math.round((remaining / amount) * 100) : 0;

  return (
    <div className={`rounded-xl border bg-card overflow-hidden shadow-sm transition-opacity ${status === 'used' || status === 'expired' ? 'opacity-60' : ''}`}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/30">
        <div className="flex items-center gap-2">
          {isCash ? (
            <Ticket className="w-4 h-4 text-caramel" />
          ) : (
            <Gift className="w-4 h-4 text-caramel" />
          )}
          <span className="font-mono text-sm font-semibold tracking-wider text-foreground">{voucher.code}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusColor[status]}`}>
            {statusLabel[status]}
          </span>
          <button onClick={onRemove} title="Usuń z listy" className="text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* Recipient / Sender */}
        {(voucher.recipientName || voucher.senderName) && (
          <p className="text-xs text-muted-foreground">
            {voucher.recipientName && <span>Dla: <strong>{voucher.recipientName}</strong></span>}
            {voucher.recipientName && voucher.senderName && <span className="mx-1.5">·</span>}
            {voucher.senderName && <span>Od: <strong>{voucher.senderName}</strong></span>}
          </p>
        )}

        {/* Message */}
        {voucher.message && (
          <p className="text-xs text-muted-foreground italic">„{voucher.message}"</p>
        )}

        {/* Value */}
        {isCash ? (
          <div>
            <div className="flex justify-between items-end mb-1.5">
              <span className="text-xs text-muted-foreground">Pozostało</span>
              <span className="text-lg font-bold text-foreground">
                {remaining.toFixed(0)} <span className="text-sm font-normal text-muted-foreground">/ {amount.toFixed(0)} zł</span>
              </span>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${pct}%`,
                  background: pct > 50 ? '#3D7A54' : pct > 0 ? '#C4965A' : '#ccc',
                }}
              />
            </div>
            {used > 0 && (
              <p className="text-xs text-muted-foreground mt-1 text-right">Wykorzystano: {used.toFixed(0)} zł</p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-caramel shrink-0" />
            <span className="text-sm font-medium text-foreground">
              {voucher.service?.name ?? 'Usługa'}
            </span>
            <span className="ml-auto text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">GRATIS</span>
          </div>
        )}

        {/* Validity */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1 border-t border-border/40">
          <Clock className="w-3 h-3 shrink-0" />
          Ważny do:{' '}
          <span className={new Date(voucher.validUntil) < new Date() ? 'text-destructive font-medium' : 'font-medium text-foreground'}>
            {new Date(voucher.validUntil).toLocaleDateString('pl-PL', { day: '2-digit', month: 'long', year: 'numeric' })}
          </span>
        </div>
      </div>
    </div>
  );
}

export function UserVouchery() {
  const [trackedCodes, setTrackedCodes] = useState<string[]>(loadTracked);
  const [vouchers, setVouchers] = useState<Record<string, Voucher | 'error'>>({});
  const [codeInput, setCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState<string | null>(null);

  // Load all tracked vouchers on mount and after tracking changes
  useEffect(() => {
    trackedCodes.forEach((code) => {
      if (vouchers[code] !== undefined) return;
      vouchersApi.lookup(code)
        .then((v) => setVouchers((prev) => ({ ...prev, [code]: v })))
        .catch(() => setVouchers((prev) => ({ ...prev, [code]: 'error' })));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackedCodes]);

  const handleAdd = async () => {
    const code = codeInput.trim().toUpperCase();
    if (!code) return;
    if (trackedCodes.includes(code)) { setError('Ten kod jest już na liście'); return; }
    setError('');
    setLoading(true);
    try {
      const v = await vouchersApi.lookup(code);
      const updated = [code, ...trackedCodes];
      setTrackedCodes(updated);
      saveTracked(updated);
      setVouchers((prev) => ({ ...prev, [code]: v }));
      setCodeInput('');
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Nie znaleziono vouchera o podanym kodzie');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async (code: string) => {
    setRefreshing(code);
    try {
      const v = await vouchersApi.lookup(code);
      setVouchers((prev) => ({ ...prev, [code]: v }));
    } catch {
      setVouchers((prev) => ({ ...prev, [code]: 'error' }));
    } finally {
      setRefreshing(null);
    }
  };

  const handleRemove = (code: string) => {
    const updated = trackedCodes.filter((c) => c !== code);
    setTrackedCodes(updated);
    saveTracked(updated);
    setVouchers((prev) => { const n = { ...prev }; delete n[code]; return n; });
  };

  const active = trackedCodes.filter((c) => {
    const v = vouchers[c];
    if (!v || v === 'error') return true;
    const s = voucherStatus(v);
    return s === 'active' || s === 'partial';
  });
  const inactive = trackedCodes.filter((c) => {
    const v = vouchers[c];
    if (!v || v === 'error') return false;
    const s = voucherStatus(v);
    return s === 'used' || s === 'expired';
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
          <Gift className="w-6 h-6 text-caramel" /> Twoje Vouchery
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Wpisz kod vouchera, aby sprawdzić stan i śledzić jego użycie.
        </p>
      </div>

      {/* Input */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <p className="text-sm font-medium text-foreground">Dodaj voucher do śledzenia</p>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm font-mono tracking-widest uppercase placeholder:normal-case placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-caramel/40"
            placeholder="np. VCH-ABCD-1234"
            value={codeInput}
            onChange={(e) => { setCodeInput(e.target.value); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            maxLength={20}
          />
          <button
            onClick={handleAdd}
            disabled={loading || !codeInput.trim()}
            className="px-4 py-2 rounded-md bg-caramel text-white text-sm font-semibold hover:bg-walnut transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {loading ? 'Sprawdzam…' : <><ChevronRight className="w-4 h-4" /> Dodaj</>}
          </button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      {trackedCodes.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Gift className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nie śledzisz jeszcze żadnych voucherów.</p>
          <p className="text-xs mt-1">Wpisz kod vouchera powyżej, aby go dodać.</p>
        </div>
      )}

      {/* Active vouchers */}
      {active.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" /> Aktywne ({active.length})
          </h2>
          {active.map((code) => {
            const v = vouchers[code];
            if (!v) return (
              <div key={code} className="rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground animate-pulse">
                Ładowanie {code}…
              </div>
            );
            if (v === 'error') return (
              <div key={code} className="rounded-xl border bg-card px-4 py-3 flex items-center justify-between">
                <div>
                  <span className="font-mono text-sm text-destructive">{code}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">Nie udało się pobrać danych</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleRefresh(code)} disabled={refreshing === code} className="text-xs text-caramel hover:underline">{refreshing === code ? 'Odświeżam…' : 'Spróbuj ponownie'}</button>
                  <button onClick={() => handleRemove(code)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            );
            return (
              <div key={code}>
                <VoucherCard voucher={v} onRemove={() => handleRemove(code)} />
                <button onClick={() => handleRefresh(code)} disabled={refreshing === code} className="text-xs text-muted-foreground hover:text-caramel mt-1 ml-1 transition-colors">
                  {refreshing === code ? 'Odświeżam…' : '↻ Odśwież stan'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Inactive vouchers */}
      {inactive.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <XCircle className="w-4 h-4 text-muted-foreground" /> Archiwum ({inactive.length})
          </h2>
          {inactive.map((code) => {
            const v = vouchers[code];
            if (!v || v === 'error') return null;
            return <VoucherCard key={code} voucher={v} onRemove={() => handleRemove(code)} />;
          })}
        </div>
      )}
    </div>
  );
}
