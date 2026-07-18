import { useState, useEffect } from 'react';
import { vouchersApi, type Voucher } from '@/api/vouchers.api';
import { loadTrackedVoucherCodes, saveTrackedVoucherCodes } from '@/lib/tracked-vouchers';
import { Gift, Ticket, Clock, CheckCircle, XCircle, ChevronRight, Trash2, FileText, Loader2 } from 'lucide-react';

const VOUCHER_CODE_LENGTH = 11;

function formatVoucherCode(value: string): string {
  const compact = value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, VOUCHER_CODE_LENGTH);

  return [compact.slice(0, 3), compact.slice(3, 7), compact.slice(7, 11)]
    .filter(Boolean)
    .join('-');
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
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const status = voucherStatus(voucher);
  const isCash = voucher.type === 'CASH';
  const amount = Number(voucher.amount ?? 0);
  const remaining = Number(voucher.remainingAmount ?? 0);
  const used = amount - remaining;
  const pct = amount > 0 ? Math.round((remaining / amount) * 100) : 0;

  const handleOpenPdf = async () => {
    const previewWindow = window.open('about:blank', '_blank');
    if (previewWindow) {
      previewWindow.opener = null;
      previewWindow.document.title = 'Ładowanie vouchera…';
    }

    setPdfError('');
    setPdfLoading(true);
    try {
      const pdf = await vouchersApi.getPdfByCode(voucher.code);
      const url = URL.createObjectURL(pdf);

      if (previewWindow) {
        previewWindow.location.href = url;
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.click();
      }

      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      previewWindow?.close();
      setPdfError('Nie udało się otworzyć pliku PDF. Spróbuj ponownie.');
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className={`rounded-xl border bg-card overflow-hidden shadow-sm transition-opacity ${status === 'used' || status === 'expired' ? 'opacity-60' : ''}`}>
      {/* Header bar */}
      <div className="flex flex-col gap-3 border-b border-border/60 bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          {isCash ? (
            <Ticket className="w-4 h-4 text-caramel" />
          ) : (
            <Gift className="w-4 h-4 text-caramel" />
          )}
          <span className="min-w-0 break-all font-mono text-sm font-semibold tracking-wider text-foreground">{voucher.code}</span>
        </div>
        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusColor[status]}`}>
            {statusLabel[status]}
          </span>
          <button
            type="button"
            onClick={onRemove}
            title="Usuń z listy"
            aria-label={`Usuń voucher ${voucher.code} z listy`}
            className="-mr-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive sm:mr-0 sm:min-h-8 sm:min-w-8"
          >
            <Trash2 className="h-4 w-4" />
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
            <div className="mb-1.5 flex flex-col gap-0.5 min-[360px]:flex-row min-[360px]:items-end min-[360px]:justify-between">
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
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 border-t border-border/40 pt-2 text-xs text-muted-foreground">
          <Clock className="w-3 h-3 shrink-0" />
          Ważny do:{' '}
          <span className={new Date(voucher.validUntil) < new Date() ? 'text-destructive font-medium' : 'font-medium text-foreground'}>
            {new Date(voucher.validUntil).toLocaleDateString('pl-PL', { day: '2-digit', month: 'long', year: 'numeric' })}
          </span>
        </div>

        <button
          type="button"
          onClick={handleOpenPdf}
          disabled={pdfLoading}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-caramel/30 bg-caramel/5 px-4 py-2.5 text-sm font-semibold text-caramel transition-colors hover:bg-caramel/10 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
        >
          {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          {pdfLoading ? 'Otwieram PDF…' : 'Zobacz voucher PDF'}
        </button>
        {pdfError && <p className="text-xs text-destructive" role="alert">{pdfError}</p>}
      </div>
    </div>
  );
}

export function UserVouchery() {
  const [trackedCodes, setTrackedCodes] = useState<string[]>(loadTrackedVoucherCodes);
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
  }, [trackedCodes]);

  const handleAdd = async () => {
    const code = formatVoucherCode(codeInput);
    if (!code) return;
    if (trackedCodes.includes(code)) { setError('Ten kod jest już na liście'); return; }
    setError('');
    setLoading(true);
    try {
      const v = await vouchersApi.lookup(code);
      const updated = [code, ...trackedCodes];
      setTrackedCodes(updated);
      saveTrackedVoucherCodes(updated);
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
    saveTrackedVoucherCodes(updated);
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
    <div className="mx-auto w-full max-w-2xl space-y-6 py-4 sm:space-y-8 sm:px-4 sm:py-8">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground sm:text-2xl">
          <Gift className="h-5 w-5 shrink-0 text-caramel sm:h-6 sm:w-6" /> Twoje Vouchery
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Wpisz kod vouchera, aby sprawdzić stan i śledzić jego użycie.
        </p>
      </div>

      {/* Input */}
      <div className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
        <p className="text-sm font-medium text-foreground">Dodaj voucher do śledzenia</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="min-h-11 min-w-0 w-full flex-1 rounded-md border border-border bg-background px-3 py-2 font-mono text-base uppercase tracking-[0.12em] placeholder:font-sans placeholder:text-sm placeholder:normal-case placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-caramel/40 sm:text-sm"
            placeholder="np. VCH-ABCD-1234"
            value={codeInput}
            onChange={(e) => { setCodeInput(formatVoucherCode(e.target.value)); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            maxLength={32}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            aria-label="Kod vouchera"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={loading || !codeInput.trim()}
            className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md bg-caramel px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-walnut disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
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
              <div key={code} className="flex flex-col gap-3 rounded-xl border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <span className="break-all font-mono text-sm text-destructive">{code}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">Nie udało się pobrać danych</p>
                </div>
                <div className="flex items-center justify-between gap-2 sm:justify-end">
                  <button onClick={() => handleRefresh(code)} disabled={refreshing === code} className="min-h-11 text-xs text-caramel hover:underline">{refreshing === code ? 'Odświeżam…' : 'Spróbuj ponownie'}</button>
                  <button onClick={() => handleRemove(code)} aria-label={`Usuń voucher ${code} z listy`} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
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
