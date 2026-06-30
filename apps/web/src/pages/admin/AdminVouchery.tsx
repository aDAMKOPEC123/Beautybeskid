import { useState, useEffect } from 'react';
import { vouchersApi, type Voucher, type CreateVoucherPayload } from '@/api/vouchers.api';
import { servicesApi } from '@/api/services.api';
import { api } from '@/lib/axios';
import { VoucherPreview } from '@/components/voucher/VoucherPreview';

const downloadPdf = async (voucherId: string, code: string) => {
  const res = await api.get(`/vouchers/${voucherId}/pdf`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `voucher-${code}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
};

type Service = { id: string; name: string; isActive: boolean };

const defaultValidUntil = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
};

export function AdminVouchery() {
  const [tab, setTab] = useState<'generator' | 'historia'>('generator');

  // Generator state
  const [type, setType] = useState<'SERVICE' | 'CASH'>('SERVICE');
  const [serviceId, setServiceId] = useState('');
  const [amount, setAmount] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [senderName, setSenderName] = useState('');
  const [message, setMessage] = useState('');
  const [validUntil, setValidUntil] = useState(defaultValidUntil());
  const [services, setServices] = useState<Service[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  // Historia state
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    servicesApi.getAll()
      .then(all => setServices(all.filter(s => s.isActive)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === 'historia') loadVouchers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, page]);

  const loadVouchers = async () => {
    setLoadingHistory(true);
    try {
      const res = await vouchersApi.list(page);
      setVouchers(res.data);
      setTotalPages(res.totalPages);
    } catch {
      setVouchers([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const selectedService = services.find(s => s.id === serviceId);

  const handleGenerate = async () => {
    setError('');
    setGenerating(true);
    try {
      const payload: CreateVoucherPayload = {
        type,
        serviceId: type === 'SERVICE' ? serviceId : undefined,
        amount: type === 'CASH' ? Number(amount) : undefined,
        recipientName: recipientName || undefined,
        senderName: senderName || undefined,
        message: message || undefined,
        validUntil: new Date(validUntil).toISOString(),
      };
      const voucher = await vouchersApi.create(payload);
      await downloadPdf(voucher.id, voucher.code);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message ?? 'Błąd generowania vouchera');
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await vouchersApi.delete(id);
      setDeleteConfirm(null);
      loadVouchers();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      alert(e?.response?.data?.message ?? 'Nie można usunąć vouchera');
    }
  };

  const inputCls = 'w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-caramel/40';
  const labelCls = 'block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider';

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold text-foreground mb-1">Vouchery Prezentowe</h1>
      <p className="text-sm text-muted-foreground mb-6">Generuj vouchery na usługi lub gotówkowe w formacie PDF A5</p>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-6">
        {(['generator', 'historia'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t
                ? 'border-caramel text-caramel'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'generator' ? '🎁 Generator' : '📋 Historia'}
          </button>
        ))}
      </div>

      {/* GENERATOR TAB */}
      {tab === 'generator' && (
        <div className="flex gap-8">
          <div className="flex-1 space-y-4">
            <div>
              <label className={labelCls}>Typ vouchera</label>
              <div className="flex gap-2">
                {(['SERVICE', 'CASH'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-colors ${
                      type === t
                        ? 'border-caramel bg-caramel/10 text-caramel'
                        : 'border-border text-muted-foreground hover:border-caramel/50'
                    }`}
                  >
                    {t === 'SERVICE' ? '✦ Na usługę (100% rabat)' : '💵 Gotówkowy'}
                  </button>
                ))}
              </div>
            </div>

            {type === 'SERVICE' ? (
              <div>
                <label className={labelCls}>Usługa *</label>
                <select className={inputCls} value={serviceId} onChange={e => setServiceId(e.target.value)}>
                  <option value="">— wybierz usługę —</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            ) : (
              <div>
                <label className={labelCls}>Kwota (zł) *</label>
                <input
                  type="number" min={1} max={9999} step={1}
                  className={inputCls}
                  placeholder="np. 200"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
              </div>
            )}

            <hr className="border-border" />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Dla kogo (opcjonalnie)</label>
                <input className={inputCls} maxLength={80} placeholder="Ania" value={recipientName} onChange={e => setRecipientName(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Od kogo (opcjonalnie)</label>
                <input className={inputCls} maxLength={80} placeholder="Mama" value={senderName} onChange={e => setSenderName(e.target.value)} />
              </div>
            </div>

            <div>
              <label className={labelCls}>Wiadomość (opcjonalnie)</label>
              <textarea
                className={inputCls}
                rows={2}
                maxLength={120}
                placeholder="Z okazji urodzin!"
                value={message}
                onChange={e => setMessage(e.target.value)}
              />
              <p className="text-xs text-muted-foreground text-right mt-0.5">{message.length}/120</p>
            </div>

            <div>
              <label className={labelCls}>Ważny do</label>
              <input type="date" className={inputCls} value={validUntil} onChange={e => setValidUntil(e.target.value)} />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <button
              onClick={handleGenerate}
              disabled={generating || (type === 'SERVICE' && !serviceId) || (type === 'CASH' && !amount)}
              className="w-full py-2.5 rounded-md bg-caramel text-white text-sm font-semibold uppercase tracking-wider hover:bg-walnut transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? 'Generowanie...' : '⬇ Generuj PDF i pobierz'}
            </button>
          </div>

          {/* Live Preview */}
          <div className="w-80 flex-shrink-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Podgląd</p>
            <VoucherPreview
              type={type}
              serviceName={selectedService?.name}
              amount={amount ? Number(amount) : undefined}
              recipientName={recipientName || undefined}
              senderName={senderName || undefined}
              message={message || undefined}
              validUntil={validUntil}
            />
          </div>
        </div>
      )}

      {/* HISTORIA TAB */}
      {tab === 'historia' && (
        <div>
          {loadingHistory ? (
            <p className="text-sm text-muted-foreground">Ładowanie...</p>
          ) : vouchers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Brak wygenerowanych voucherów.</p>
          ) : (
            <>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    {['Typ', 'Usługa / Kwota', 'Pozostało', 'Dla', 'Kod', 'Wystawiony', 'Ważny do', 'Akcje'].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vouchers.map(v => (
                    <tr key={v.id} className="border-b border-border/50 hover:bg-accent/30">
                      <td className="py-2 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                          v.type === 'SERVICE' ? 'bg-caramel/15 text-caramel' : 'bg-caramel/10 text-caramel'
                        }`}
                          style={v.type !== 'SERVICE' ? { background: 'rgba(196,150,90,0.15)', color: '#C4965A' } : undefined}
                        >
                          {v.type === 'SERVICE' ? 'Usługa' : 'Gotówk.'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-foreground">
                        {v.service?.name ?? (v.amount ? `${Number(v.amount).toFixed(0)} zł` : '—')}
                      </td>
                      <td className="py-2 px-3 text-xs">
                        {v.type === 'CASH' && v.remainingAmount != null ? (
                          <span className={Number(v.remainingAmount) <= 0 ? 'text-muted-foreground line-through' : Number(v.remainingAmount) < Number(v.amount) ? 'text-amber-600 font-medium' : 'text-green-700 font-medium'}>
                            {Number(v.remainingAmount).toFixed(0)} zł
                          </span>
                        ) : '—'}
                      </td>
                      <td className="py-2 px-3 text-muted-foreground text-xs">
                        {[v.recipientName, v.senderName ? `od: ${v.senderName}` : null].filter(Boolean).join(' · ') || '—'}
                      </td>
                      <td className="py-2 px-3 font-mono text-xs text-caramel">{v.code}</td>
                      <td className="py-2 px-3 text-xs text-muted-foreground">
                        {new Date(v.createdAt).toLocaleDateString('pl-PL')}
                      </td>
                      <td className="py-2 px-3 text-xs text-muted-foreground">
                        {new Date(v.validUntil).toLocaleDateString('pl-PL')}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => downloadPdf(v.id, v.code)}
                            className="text-xs px-2 py-1 rounded border border-border hover:bg-accent text-foreground"
                          >
                            ⬇ PDF
                          </button>
                          {deleteConfirm === v.id ? (
                            <>
                              <button onClick={() => handleDelete(v.id)} className="text-xs px-2 py-1 rounded bg-destructive text-white">Tak, usuń</button>
                              <button onClick={() => setDeleteConfirm(null)} className="text-xs px-2 py-1 rounded border border-border">Anuluj</button>
                            </>
                          ) : (
                            <button onClick={() => setDeleteConfirm(v.id)} className="text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:text-destructive hover:border-destructive">✕</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div className="flex gap-2 mt-4 justify-center">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 text-sm border rounded disabled:opacity-40">←</button>
                  <span className="px-3 py-1 text-sm text-muted-foreground">{page} / {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 text-sm border rounded disabled:opacity-40">→</button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
