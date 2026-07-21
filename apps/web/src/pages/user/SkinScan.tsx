import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertCircle, ArrowLeft, ArrowRight, Camera, CheckCircle2, Clock3, Info,
  Loader2, LockKeyhole, RotateCcw, ShieldCheck, Sparkles, Sun, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SkinScanCamera } from '@/components/skin-scan/SkinScanCamera';
import { SkinScanOverlayViewer } from '@/components/skin-scan/SkinScanOverlayViewer';
import { SkinScanZoneMap } from '@/components/skin-scan/SkinScanZoneMap';
import {
  skinScansApi,
  type SkinScanAngle,
  type SkinScanMetric,
  type SkinScanSession,
  type SkinScanStatus,
} from '@/api/skin-scans.api';

const ANGLES: SkinScanAngle[] = ['FRONT', 'LEFT', 'RIGHT'];

const ANGLE_LABELS: Record<SkinScanAngle, string> = {
  FRONT: 'Na wprost', LEFT: 'Lewy półprofil', RIGHT: 'Prawy półprofil',
};

const STATUS_COPY: Record<SkinScanStatus, { label: string; className: string }> = {
  DRAFT: { label: 'Rozpoczęty', className: 'bg-stone-100 text-stone-700' },
  CAPTURING: { label: 'Zdjęcia zapisane', className: 'bg-sky-50 text-sky-700' },
  NEEDS_RETAKE: { label: 'Wymaga powtórki', className: 'bg-amber-50 text-amber-800' },
  COMPLETED: { label: 'Gotowy', className: 'bg-emerald-50 text-emerald-700' },
  FAILED: { label: 'Błąd analizy', className: 'bg-red-50 text-red-700' },
};

const METRIC_LABELS = {
  acne: 'Trądzik i zmiany', pigmentation: 'Przebarwienia', redness: 'Rumień',
  wrinkles: 'Zmarszczki', pores: 'Widoczność porów', spfCoverage: 'Pokrycie SPF',
} as const;

type Capture = { file: File; previewUrl: string };
type Stage = 'intro' | 'capture' | 'report';

const formatDate = (date: string) => new Intl.DateTimeFormat('pl-PL', {
  day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
}).format(new Date(date));

const formatMetricValue = (metric: SkinScanMetric) => {
  if (metric.value === null) return null;
  if (metric.unit === 'stopień 1-4') return `${metric.value}/4`;
  return `${metric.value}${metric.unit ? ` ${metric.unit}` : ''}`;
};

const ResultReport = ({ session, onNewScan }: { session: SkinScanSession; onNewScan: () => void }) => {
  const summary = session.qualitySummary;
  const analysis = session.analysis;
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-[#C4965A]/25 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-[#173526] to-[#284b38] px-6 py-7 text-white sm:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#D9B57B]">Raport skanu</p>
              <h1 className="mt-2 font-heading text-2xl font-semibold">Raport analizy skóry gotowy</h1>
              <p className="mt-2 text-sm text-white/70">{formatDate(session.createdAt)}</p>
            </div>
            <div className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-full border border-white/20 bg-white/10">
              <span className="text-3xl font-semibold">{summary?.averageScore ?? '—'}</span>
              <span className="text-[10px] uppercase tracking-wider text-white/60">jakość / 100</span>
            </div>
          </div>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-3 sm:p-7">
          {ANGLES.map((angle) => {
            const image = session.images.find((item) => item.angle === angle);
            return (
              <div key={angle} className="rounded-2xl border border-border/70 bg-[#FAF9F6] p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-[#1A3828]">{ANGLE_LABELS[angle]}</span>
                  {image?.quality.passed
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    : <AlertCircle className="h-4 w-4 text-amber-600" />}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Jakość: <strong className="text-foreground">{image?.quality.score ?? '—'}/100</strong></p>
                {image?.quality.issues.map((item) => <p key={item.code} className="mt-2 text-xs text-amber-800">{item.message}</p>)}
              </div>
            );
          })}
        </div>
      </div>

      <section className="rounded-3xl border border-border bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-[#C4965A]/10 p-3 text-[#9A6C32]"><Sparkles className="h-5 w-5" /></div>
          <div>
            <h2 className="font-heading text-xl font-semibold text-[#1A3828]">Analiza skóry</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {analysis?.mode === 'COSMETOLOGY_RESEARCH'
                ? 'Badawcza analiza obrazu z użyciem modeli trądziku, zmarszczek i segmentacji twarzy.'
                : 'Usługa modeli nie jest skonfigurowana — dostępna jest wyłącznie kontrola jakości zdjęć.'}
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {analysis && Object.entries(analysis.metrics).map(([key, metric]) => {
            const available = metric.status === 'AVAILABLE';
            const value = formatMetricValue(metric);
            const countEstimate = key === 'acne' && typeof metric.details?.countEstimate === 'number'
              ? metric.details.countEstimate
              : null;
            return (
              <div key={key} className={`rounded-2xl border p-4 ${available ? 'border-emerald-200 bg-emerald-50/40' : 'border-border/70'}`}>
                <div className="flex items-center gap-2">
                  {available
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    : <LockKeyhole className="h-4 w-4 text-[#9A6C32]" />}
                  <h3 className="text-sm font-semibold text-[#1A3828]">{METRIC_LABELS[key as keyof typeof METRIC_LABELS]}</h3>
                </div>
                {value && <p className="mt-3 text-2xl font-semibold text-[#1A3828]">{value}</p>}
                {countEstimate !== null && <p className="mt-1 text-xs font-medium text-emerald-900">Szacowana liczba zmian: {countEstimate}</p>}
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{metric.message}</p>
                {available && metric.confidence !== null && (
                  <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                    Pewność modelu: {Math.round(metric.confidence * 100)}%
                  </p>
                )}
              </div>
            );
          })}
        </div>
        {analysis?.mode === 'COSMETOLOGY_RESEARCH' && (
          <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
            Wersje: {Object.entries(analysis.modelVersions).map(([name, version]) => `${name}: ${version}`).join(' • ')}
          </p>
        )}
        {analysis && (
          <div className="mt-5 flex items-start gap-2 rounded-2xl bg-sky-50 p-4 text-xs leading-relaxed text-sky-900">
            <Info className="mt-0.5 h-4 w-4 shrink-0" /><span>{analysis.disclaimer}</span>
          </div>
        )}
      </section>
      <SkinScanOverlayViewer session={session} />
      {analysis && <SkinScanZoneMap analysis={analysis} />}
      <div className="flex justify-center"><Button type="button" onClick={onNewScan}><RotateCcw className="mr-2 h-4 w-4" /> Nowy skan</Button></div>
    </div>
  );
};

export function UserSkinScan() {
  const queryClient = useQueryClient();
  const previewUrlsRef = useRef<Set<string>>(new Set());
  const [stage, setStage] = useState<Stage>('intro');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [reportSession, setReportSession] = useState<SkinScanSession | null>(null);
  const [retakeSession, setRetakeSession] = useState<SkinScanSession | null>(null);
  const [activeAngle, setActiveAngle] = useState<SkinScanAngle>('FRONT');
  const [captures, setCaptures] = useState<Partial<Record<SkinScanAngle, Capture>>>({});
  const [makeup, setMakeup] = useState(false);
  const [spfApplied, setSpfApplied] = useState(false);
  const [recentTreatment, setRecentTreatment] = useState(false);
  const [recentTreatmentNotes, setRecentTreatmentNotes] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [limitationsAccepted, setLimitationsAccepted] = useState(false);

  const sessionsQuery = useQuery({ queryKey: ['skin-scans'], queryFn: skinScansApi.list });
  const createMutation = useMutation({
    mutationFn: () => skinScansApi.create({
      makeup, spfApplied, recentTreatment,
      recentTreatmentNotes: recentTreatment ? recentTreatmentNotes.trim() || undefined : undefined,
    }),
    onSuccess: (session) => {
      setSessionId(session.id);
      setActiveAngle('FRONT');
      setStage('capture');
      void queryClient.invalidateQueries({ queryKey: ['skin-scans'] });
    },
    onError: () => toast.error('Nie udało się rozpocząć skanu. Spróbuj ponownie.'),
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      if (!sessionId) throw new Error('Brak aktywnej sesji');
      const files = Object.fromEntries(
        Object.entries(captures).map(([angle, capture]) => [angle, capture.file]),
      ) as Partial<Record<SkinScanAngle, File>>;
      await skinScansApi.uploadImages(sessionId, files);
      return skinScansApi.complete(sessionId);
    },
    onSuccess: (session) => {
      void queryClient.invalidateQueries({ queryKey: ['skin-scans'] });
      if (session.status === 'NEEDS_RETAKE') {
        setRetakeSession(session);
        setActiveAngle(session.qualitySummary?.failedAngles[0] ?? 'FRONT');
        toast.warning('Niektóre zdjęcia wymagają powtórzenia.');
        return;
      }
      setRetakeSession(null);
      setReportSession(session);
      setStage('report');
      toast.success('Skan został zapisany.');
    },
    onError: () => toast.error('Nie udało się przesłać lub sprawdzić zdjęć.'),
  });

  const deleteMutation = useMutation({
    mutationFn: skinScansApi.delete,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['skin-scans'] });
      toast.success('Skan i powiązane zdjęcia zostały usunięte.');
    },
    onError: () => toast.error('Nie udało się usunąć skanu.'),
  });

  const capturedCount = Object.keys(captures).length;
  const activeIndex = ANGLES.indexOf(activeAngle);
  const allCaptured = capturedCount === ANGLES.length;
  const failedByAngle = useMemo(() => {
    const failedAngles = new Set(retakeSession?.qualitySummary?.failedAngles ?? []);
    return new Map(
      (retakeSession?.images ?? [])
        .filter((image) => failedAngles.has(image.angle))
        .map((image) => [image.angle, image.quality.issues]),
    );
  }, [retakeSession]);

  useEffect(() => () => {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrlsRef.current.clear();
  }, []);

  const replaceCapture = (angle: SkinScanAngle, file: File) => {
    const previewUrl = URL.createObjectURL(file);
    previewUrlsRef.current.add(previewUrl);
    setCaptures((current) => {
      const oldUrl = current[angle]?.previewUrl;
      if (oldUrl) {
        URL.revokeObjectURL(oldUrl);
        previewUrlsRef.current.delete(oldUrl);
      }
      return { ...current, [angle]: { file, previewUrl } };
    });
    setRetakeSession((current) => current?.qualitySummary ? {
      ...current,
      qualitySummary: { ...current.qualitySummary, failedAngles: current.qualitySummary.failedAngles.filter((item) => item !== angle) },
    } : current);
    const nextAngle = ANGLES[activeIndex + 1];
    if (nextAngle) window.setTimeout(() => setActiveAngle(nextAngle), 250);
  };

  const resetScan = () => {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrlsRef.current.clear();
    setCaptures({});
    setSessionId(null);
    setReportSession(null);
    setRetakeSession(null);
    setActiveAngle('FRONT');
    setConsentAccepted(false);
    setLimitationsAccepted(false);
    setStage('intro');
  };

  if (stage === 'report' && reportSession) {
    return <div className="mx-auto max-w-4xl px-1 py-3 sm:py-6"><ResultReport session={reportSession} onNewScan={resetScan} /></div>;
  }

  if (stage === 'capture') {
    const activeIssues = failedByAngle.get(activeAngle) ?? [];
    return (
      <div className="mx-auto max-w-4xl px-1 py-3 sm:py-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <Button type="button" variant="ghost" onClick={resetScan}><ArrowLeft className="mr-2 h-4 w-4" /> Anuluj</Button>
          <div className="text-right text-xs text-muted-foreground">{capturedCount}/3 ujęcia zapisane</div>
        </div>
        <div className="mb-5 grid grid-cols-3 gap-2">
          {ANGLES.map((angle) => {
            const isFailed = retakeSession?.qualitySummary?.failedAngles.includes(angle);
            const stateClass = activeAngle === angle
              ? 'border-[#C4965A] bg-[#C4965A]/10 text-[#7D5428]'
              : isFailed ? 'border-amber-300 bg-amber-50 text-amber-900'
                : captures[angle] ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-border bg-white text-muted-foreground';
            return (
              <button key={angle} type="button" onClick={() => setActiveAngle(angle)} className={`min-h-12 rounded-2xl border px-2 py-2 text-xs font-semibold ${stateClass}`}>
                {captures[angle] && <CheckCircle2 className="mx-auto mb-1 h-4 w-4" />}{ANGLE_LABELS[angle]}
              </button>
            );
          })}
        </div>
        {activeIssues.length > 0 && (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <div className="flex items-center gap-2 font-semibold"><AlertCircle className="h-4 w-4" /> Powtórz to ujęcie</div>
            {activeIssues.map((item) => <p key={item.code} className="mt-1 text-xs">{item.message}</p>)}
          </div>
        )}
        <SkinScanCamera angle={activeAngle} previewUrl={captures[activeAngle]?.previewUrl} onCapture={(file) => replaceCapture(activeAngle, file)} />
        <div className="mt-6 flex flex-col-reverse items-center justify-between gap-3 border-t pt-5 sm:flex-row">
          <Button type="button" variant="outline" disabled={activeIndex === 0} onClick={() => setActiveAngle(ANGLES[activeIndex - 1])}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Poprzednie
          </Button>
          {allCaptured ? (
            <Button type="button" onClick={() => analyzeMutation.mutate()} disabled={analyzeMutation.isPending}>
              {analyzeMutation.isPending
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analizuję skórę…</>
                : <><Sparkles className="mr-2 h-4 w-4" /> Zapisz i analizuj skan</>}
            </Button>
          ) : (
            <Button type="button" disabled={!captures[activeAngle] || activeIndex === ANGLES.length - 1} onClick={() => setActiveAngle(ANGLES[activeIndex + 1])}>
              Następne <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-7 px-1 py-3 sm:py-6">
      <section className="overflow-hidden rounded-3xl border border-[#C4965A]/20 bg-gradient-to-br from-[#F8F4EC] via-white to-[#EEF4EF] shadow-sm">
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#1A3828]/5 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1A3828]">
              <Camera className="h-4 w-4" /> Skan skóry — wersja badawcza
            </div>
            <h1 className="font-heading text-3xl font-semibold leading-tight text-[#1A3828] sm:text-4xl">Porównywalne zdjęcia twarzy w trzech ujęciach</h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Aparat poprowadzi Cię przez zdjęcie na wprost i dwa półprofile. System sprawdzi jakość, wytnie skórę twarzy i przygotuje badawczą ocenę zmian trądzikowych, przebarwień, zaczerwienienia oraz zmarszczek.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Sun, label: 'Kontrola światła' }, { icon: Camera, label: '3 kąty twarzy' },
              { icon: ShieldCheck, label: 'Prywatne zdjęcia' }, { icon: Clock3, label: 'Historia skanów' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="rounded-2xl border border-white/70 bg-white/70 p-4 text-center shadow-sm">
                <Icon className="mx-auto h-5 w-5 text-[#9A6C32]" /><p className="mt-2 text-xs font-semibold text-[#1A3828]">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-white p-5 shadow-sm sm:p-7">
        <h2 className="font-heading text-xl font-semibold text-[#1A3828]">Przygotowanie do skanu</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            'Zdejmij okulary i odsuń włosy od twarzy.',
            'Stań przodem do okna, bez ostrego słońca i cieni.',
            'Nie używaj filtra upiększającego ani trybu portretowego.',
          ].map((item, index) => (
            <div key={item} className="flex gap-3 rounded-2xl bg-[#FAF9F6] p-4 text-sm text-[#30483A]">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1A3828] text-xs font-semibold text-white">{index + 1}</span>{item}
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border p-4">
            <input type="checkbox" checked={makeup} onChange={(event) => setMakeup(event.target.checked)} className="mt-1 h-4 w-4 accent-[#1A3828]" />
            <span><strong className="block text-sm text-[#1A3828]">Mam makijaż</strong><span className="mt-1 block text-xs text-muted-foreground">Najlepiej wykonać skan bez makijażu.</span></span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border p-4">
            <input type="checkbox" checked={spfApplied} onChange={(event) => setSpfApplied(event.target.checked)} className="mt-1 h-4 w-4 accent-[#1A3828]" />
            <span><strong className="block text-sm text-[#1A3828]">Mam nałożony SPF</strong><span className="mt-1 block text-xs text-muted-foreground">Kamera RGB nie oceni pokrycia, ale zapiszemy kontekst.</span></span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border p-4 sm:col-span-2">
            <input type="checkbox" checked={recentTreatment} onChange={(event) => setRecentTreatment(event.target.checked)} className="mt-1 h-4 w-4 accent-[#1A3828]" />
            <span className="min-w-0 flex-1">
              <strong className="block text-sm text-[#1A3828]">Niedawny zabieg lub silna reakcja skóry</strong>
              <span className="mt-1 block text-xs text-muted-foreground">Zaznacz, jeśli dotyczy ostatnich 7 dni.</span>
              {recentTreatment && <textarea value={recentTreatmentNotes} onChange={(event) => setRecentTreatmentNotes(event.target.value)} maxLength={500} rows={2} className="mt-3 w-full rounded-xl border border-border px-3 py-2 text-sm" placeholder="Opcjonalnie: jaki zabieg lub reakcja?" />}
            </span>
          </label>
        </div>
        <div className="mt-6 space-y-3 rounded-2xl border border-[#C4965A]/25 bg-[#FBF8F2] p-4">
          <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-[#30483A]">
            <input type="checkbox" checked={consentAccepted} onChange={(event) => setConsentAccepted(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[#1A3828]" />
            <span>Wyrażam zgodę na wykonanie i przetwarzanie zdjęć twarzy w celu utworzenia prywatnego raportu. Wiem, że mogę usunąć sesję wraz ze zdjęciami.</span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-[#30483A]">
            <input type="checkbox" checked={limitationsAccepted} onChange={(event) => setLimitationsAccepted(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[#1A3828]" />
            <span>Rozumiem, że wynik jest badawczą oceną obrazu, nie diagnozą medyczną, oraz że zwykła kamera RGB nie mierzy rzeczywistego pokrycia SPF.</span>
          </label>
        </div>
        <div className="mt-6 flex justify-center">
          <Button type="button" disabled={!consentAccepted || !limitationsAccepted || createMutation.isPending} onClick={() => createMutation.mutate()}>
            {createMutation.isPending
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Tworzę sesję…</>
              : <><Camera className="mr-2 h-4 w-4" /> Uruchom skan</>}
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9A6C32]">Prywatna historia</p><h2 className="mt-1 font-heading text-xl font-semibold text-[#1A3828]">Poprzednie skany</h2></div>
        {sessionsQuery.isLoading && <div className="rounded-2xl border bg-white p-8 text-center text-sm text-muted-foreground"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Ładowanie historii…</div>}
        {!sessionsQuery.isLoading && (sessionsQuery.data?.length ?? 0) === 0 && <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-sm text-muted-foreground">Nie masz jeszcze zapisanych skanów.</div>}
        {sessionsQuery.data?.map((session) => {
          const status = STATUS_COPY[session.status];
          return (
            <div key={session.id} className="flex flex-col gap-4 rounded-2xl border bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${status.className}`}>{status.label}</span><span className="text-xs text-muted-foreground">{session.images.length}/3 ujęcia</span></div>
                <p className="mt-2 text-sm font-semibold text-[#1A3828]">{formatDate(session.createdAt)}</p>
                {session.qualitySummary && <p className="mt-1 text-xs text-muted-foreground">Jakość: {session.qualitySummary.averageScore}/100</p>}
              </div>
              <div className="flex items-center gap-2">
                {session.status === 'COMPLETED' && <Button type="button" variant="outline" size="sm" onClick={() => { setReportSession(session); setStage('report'); }}>Zobacz raport</Button>}
                <Button type="button" variant="ghost" size="icon" aria-label="Usuń skan" disabled={deleteMutation.isPending} onClick={() => {
                  if (window.confirm('Usunąć tę sesję i wszystkie jej zdjęcia? Tej operacji nie można cofnąć.')) deleteMutation.mutate(session.id);
                }}><Trash2 className="h-4 w-4 text-red-600" /></Button>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
