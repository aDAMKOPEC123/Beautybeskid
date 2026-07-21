import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertCircle, ArrowLeft, ArrowRight, Camera, CheckCircle2, Clock3, Info,
  Loader2, RotateCcw, ShieldCheck, Sparkles, Sun, Trash2,
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
import { SkinScanComparison } from '@/components/skin-scan/SkinScanComparison';

const ANGLES: SkinScanAngle[] = ['FRONT', 'FOREHEAD', 'LEFT_CHEEK', 'RIGHT_CHEEK', 'CHIN', 'NECK'];

const ANGLE_LABELS: Record<SkinScanAngle, string> = {
  FRONT: 'Twarz',
  LEFT: 'Lewy profil',
  RIGHT: 'Prawy profil',
  FOREHEAD: 'Czoło',
  LEFT_CHEEK: 'L. policzek',
  RIGHT_CHEEK: 'P. policzek',
  CHIN: 'Broda',
  NECK: 'Szyja',
};

const ANGLE_HINTS: Partial<Record<SkinScanAngle, string>> = {
  FRONT: 'Zrób zdjęcie całej twarzy na wprost, na wyciągnięcie ręki.',
  FOREHEAD: 'Zbliż aparat do czoła na ok. 15 cm. Odsuń włosy.',
  LEFT_CHEEK: 'Zbliż aparat do lewego policzka na ok. 15 cm.',
  RIGHT_CHEEK: 'Zbliż aparat do prawego policzka na ok. 15 cm.',
  CHIN: 'Zbliż aparat do brody i okolic ust na ok. 15 cm.',
  NECK: 'Zbliż aparat do szyi na ok. 15 cm. Odchyl głowę do tyłu.',
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

const VISIBLE_METRICS = ['acne', 'pigmentation', 'redness', 'wrinkles'] as const;

const SCORE_CLASSIFICATION = [
  { min: 85, label: 'Skóra w świetnej kondycji', color: '#16a34a' },
  { min: 70, label: 'Dobra kondycja, drobne problemy', color: '#65a30d' },
  { min: 50, label: 'Wymaga uwagi', color: '#d97706' },
  { min: 30, label: 'Widoczne problemy', color: '#ea580c' },
  { min: 0, label: 'Wymaga intensywnej pielęgnacji', color: '#dc2626' },
] as const;

const getScoreClassification = (score: number) =>
  SCORE_CLASSIFICATION.find((c) => score >= c.min) ?? SCORE_CLASSIFICATION[SCORE_CLASSIFICATION.length - 1];

const ResultReport = ({ session, onNewScan }: { session: SkinScanSession; onNewScan: () => void }) => {
  const comparisonQuery = useQuery({
    queryKey: ['skin-scans', 'comparison'],
    queryFn: skinScansApi.comparison,
  });
  const [showComparison, setShowComparison] = useState(false);
  const hasComparison = comparisonQuery.data?.first != null && comparisonQuery.data?.latest != null;

  const analysis = session.analysis;
  const detectedLesions = analysis?.metrics.acne?.status === 'AVAILABLE'
    ? (analysis.metrics.acne.details?.detectedLesions as number | undefined) ?? null
    : null;
  return (
    <div className="space-y-4">
      {/* Compact header */}
      <div className="overflow-hidden rounded-2xl border border-[#C4965A]/25 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-[#173526] to-[#284b38] px-4 py-5 text-white sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-heading text-lg font-semibold sm:text-xl">Raport analizy skóry</h1>
              <p className="mt-1 text-xs text-white/60">{formatDate(session.createdAt)}</p>
            </div>
            {analysis?.skinScore != null ? (
              <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-full border-2 sm:h-16 sm:w-16"
                style={{ borderColor: getScoreClassification(analysis.skinScore).color }}>
                <span className="text-lg font-bold sm:text-xl">{analysis.skinScore}</span>
                <span className="text-[8px] uppercase tracking-wider text-white/50">pkt</span>
              </div>
            ) : (
              <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-full border border-white/20 bg-white/10 sm:h-16 sm:w-16">
                <span className="text-lg font-bold sm:text-xl">—</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Classification label */}
      {analysis?.skinScore != null && (() => {
        const cls = getScoreClassification(analysis.skinScore);
        return (
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-white px-3 py-2 shadow-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: cls.color }} />
            <span className="text-sm font-semibold text-[#1A3828]">{cls.label}</span>
          </div>
        );
      })()}

      {/* Comparison button */}
      {hasComparison && !showComparison && (
        <button type="button" onClick={() => setShowComparison(true)}
          className="w-full rounded-xl border border-[#C4965A]/30 bg-[#FAF9F6] px-4 py-3 text-sm font-semibold text-[#1A3828] transition-colors hover:bg-[#F0EDE6]">
          Zobacz zmianę
        </button>
      )}

      {showComparison && comparisonQuery.data && (
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-6">
          <SkinScanComparison comparison={comparisonQuery.data} onClose={() => setShowComparison(false)} />
        </div>
      )}

      {/* Key metrics — compact horizontal cards */}
      {analysis && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {VISIBLE_METRICS.map((key) => {
            const m = analysis.metrics[key];
            if (!m || m.status !== 'AVAILABLE') return null;
            const value = formatMetricValue(m);
            return (
              <div key={key} className="rounded-2xl border border-border/70 bg-white p-3 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{METRIC_LABELS[key]}</p>
                {value && <p className="mt-1 text-xl font-bold text-[#1A3828]">{value}</p>}
                {key === 'acne' && detectedLesions != null && detectedLesions > 0 && (
                  <p className="mt-0.5 text-[10px] font-semibold text-amber-700">Wykryto {detectedLesions} zmian</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Zone analysis — most important section */}
      {analysis && <SkinScanZoneMap analysis={analysis} session={session} />}

      {/* Overlay viewer */}
      <SkinScanOverlayViewer session={session} />

      {/* Disclaimer */}
      {analysis && (
        <div className="flex items-start gap-2 rounded-xl bg-gray-50 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>{analysis.disclaimer}</span>
        </div>
      )}

      <div className="flex justify-center pb-4"><Button type="button" onClick={onNewScan}><RotateCcw className="mr-2 h-4 w-4" /> Nowy skan</Button></div>
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
      <div className="mx-auto max-w-4xl px-1 py-2 sm:py-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={resetScan}><ArrowLeft className="mr-1 h-4 w-4" /> Anuluj</Button>
          <div className="text-right text-xs text-muted-foreground">{capturedCount}/{ANGLES.length}</div>
        </div>
        {/* Step indicator — scrollable on mobile */}
        <div className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {ANGLES.map((angle, i) => {
            const isFailed = retakeSession?.qualitySummary?.failedAngles.includes(angle);
            const isActive = activeAngle === angle;
            const isDone = !!captures[angle];
            return (
              <button key={angle} type="button" onClick={() => setActiveAngle(angle)} className={`flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                isActive ? 'border-[#C4965A] bg-[#C4965A]/10 text-[#7D5428]'
                  : isFailed ? 'border-amber-300 bg-amber-50 text-amber-900'
                    : isDone ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-border bg-white text-muted-foreground'
              }`}>
                {isDone ? <CheckCircle2 className="h-3 w-3" /> : <span className="flex h-4 w-4 items-center justify-center rounded-full bg-current/10 text-[9px]">{i + 1}</span>}
                {ANGLE_LABELS[angle]}
              </button>
            );
          })}
        </div>
        {ANGLE_HINTS[activeAngle] && (
          <div className="mb-4 rounded-2xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">
            <div className="flex items-center gap-2 font-semibold"><Info className="h-4 w-4" /> Wskazówka</div>
            <p className="mt-1">{ANGLE_HINTS[activeAngle]}</p>
          </div>
        )}
        {activeIssues.length > 0 && (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <div className="flex items-center gap-2 font-semibold"><AlertCircle className="h-4 w-4" /> Powtórz to ujęcie</div>
            {activeIssues.map((item) => <p key={item.code} className="mt-1 text-xs">{item.message}</p>)}
          </div>
        )}
        <SkinScanCamera angle={activeAngle} previewUrl={captures[activeAngle]?.previewUrl} onCapture={(file) => replaceCapture(activeAngle, file)} />
        <div className="mt-4 flex items-center justify-between gap-2 border-t pt-4">
          <Button type="button" variant="ghost" size="sm" disabled={activeIndex === 0} onClick={() => setActiveAngle(ANGLES[activeIndex - 1])}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Wstecz
          </Button>
          {allCaptured ? (
            <Button type="button" size="sm" onClick={() => analyzeMutation.mutate()} disabled={analyzeMutation.isPending}>
              {analyzeMutation.isPending
                ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Analizuję…</>
                : <><Sparkles className="mr-1 h-4 w-4" /> Analizuj</>}
            </Button>
          ) : (
            <Button type="button" size="sm" disabled={!captures[activeAngle] || activeIndex === ANGLES.length - 1} onClick={() => setActiveAngle(ANGLES[activeIndex + 1])}>
              Dalej <ArrowRight className="ml-1 h-4 w-4" />
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
            <h1 className="font-heading text-3xl font-semibold leading-tight text-[#1A3828] sm:text-4xl">Szczegółowy skan stref twarzy</h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Aparat poprowadzi Cię przez zdjęcie ogólne i zbliżenia 5 stref twarzy (czoło, policzki, broda, szyja). Dzięki zbliżeniom system widzi nawet najsubtelniejsze zmiany.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Sun, label: 'Kontrola światła' }, { icon: Camera, label: '6 zdjęć stref' },
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
            'Zbliżenia rób z odległości ok. 15 cm od skóry, bez filtrów.',
          ].map((item, index) => (
            <div key={item} className="flex gap-3 rounded-2xl bg-[#FAF9F6] p-4 text-sm text-[#30483A]">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1A3828] text-xs font-semibold text-white">{index + 1}</span>{item}
            </div>
          ))}
        </div>
        <div className="mt-6 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Zaznacz, co dotyczy Twojej skóry teraz</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <label className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 transition-colors ${makeup ? 'border-[#C4965A] bg-[#FBF8F2]' : 'border-border'}`}>
              <input type="checkbox" checked={makeup} onChange={(e) => setMakeup(e.target.checked)} className="h-4 w-4 accent-[#1A3828]" />
              <span className="text-sm font-medium text-[#1A3828]">Makijaż</span>
            </label>
            <label className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 transition-colors ${spfApplied ? 'border-[#C4965A] bg-[#FBF8F2]' : 'border-border'}`}>
              <input type="checkbox" checked={spfApplied} onChange={(e) => setSpfApplied(e.target.checked)} className="h-4 w-4 accent-[#1A3828]" />
              <span className="text-sm font-medium text-[#1A3828]">Nałożony SPF</span>
            </label>
            <label className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 transition-colors ${recentTreatment ? 'border-[#C4965A] bg-[#FBF8F2]' : 'border-border'}`}>
              <input type="checkbox" checked={recentTreatment} onChange={(e) => setRecentTreatment(e.target.checked)} className="h-4 w-4 accent-[#1A3828]" />
              <span className="text-sm font-medium text-[#1A3828]">Zabieg &lt;7 dni</span>
            </label>
          </div>
          {recentTreatment && (
            <textarea value={recentTreatmentNotes} onChange={(e) => setRecentTreatmentNotes(e.target.value)} maxLength={500} rows={2} className="w-full rounded-xl border border-border px-3 py-2 text-sm" placeholder="Opcjonalnie: jaki zabieg?" />
          )}
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
