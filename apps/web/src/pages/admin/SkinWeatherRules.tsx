import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X, Loader2, Cloud, RefreshCw, ChevronDown, ChevronUp, Save, Sparkles, FlaskConical, Ban, Scissors, Sun, Droplets } from 'lucide-react';
import { isAxiosError } from 'axios';
import { skinWeatherApi } from '@/api/skin-weather.api';

// --- Types

type ParamKey = 'temperature' | 'uv' | 'humidity' | 'aqi' | 'precip';
interface ParamRange { min: number; max: number; }

interface SkinWeatherRule {
  id: string; label: string; recommendation: string;
  isActive: boolean; sortOrder: number;
  conditions: string[]; thresholds: Record<string, ParamRange>;
  createdAt: string; updatedAt: string;
}

interface ParamConfig {
  key: ParamKey; label: string; icon: string; unit: string;
  absMin: number; absMax: number; step: number;
  defaultMin: number; defaultMax: number;
  color: string; selectedBorder: string; selectedBg: string; chipColor: string;
}

const PARAM_PRESETS: ParamConfig[] = [
  { key: 'temperature', label: 'Temperatura',  icon: '🌡️', unit: '°C',  absMin: -20, absMax: 45,  step: 1,  defaultMin: 10, defaultMax: 25,  color: 'text-orange-500', selectedBorder: 'border-orange-400', selectedBg: 'bg-orange-400/10', chipColor: 'bg-orange-400/15 text-orange-400 border-orange-400/30' },
  { key: 'uv',          label: 'UV',            icon: '☀️',   unit: '',    absMin: 0,   absMax: 11,  step: 1,  defaultMin: 3,  defaultMax: 7,   color: 'text-amber-400',  selectedBorder: 'border-amber-400',  selectedBg: 'bg-amber-400/10',  chipColor: 'bg-amber-400/15 text-amber-400 border-amber-400/30'   },
  { key: 'humidity',    label: 'Wilgotność',    icon: '💧', unit: '%',   absMin: 0,   absMax: 100, step: 5,  defaultMin: 40, defaultMax: 70,  color: 'text-teal-400',   selectedBorder: 'border-teal-400',   selectedBg: 'bg-teal-400/10',   chipColor: 'bg-teal-400/15 text-teal-400 border-teal-400/30'     },
  { key: 'aqi',         label: 'AQI',           icon: '🌫️', unit: 'AQI', absMin: 0,   absMax: 300, step: 10, defaultMin: 0,  defaultMax: 100, color: 'text-slate-400',  selectedBorder: 'border-slate-400',  selectedBg: 'bg-slate-400/10',  chipColor: 'bg-slate-400/15 text-slate-400 border-slate-400/30'  },
  { key: 'precip',      label: 'Opady',          icon: '🌧️', unit: '%',   absMin: 0,   absMax: 100, step: 5,  defaultMin: 0,  defaultMax: 40,  color: 'text-blue-400',   selectedBorder: 'border-blue-400',   selectedBg: 'bg-blue-400/10',   chipColor: 'bg-blue-400/15 text-blue-400 border-blue-400/30'     },
];

type FormState = {
  label: string; recommendation: string; isActive: boolean;
  conditions: ParamKey[]; thresholds: Record<ParamKey, ParamRange>;
};

const buildDefaultThresholds = (): Record<ParamKey, ParamRange> =>
  Object.fromEntries(PARAM_PRESETS.map(p => [p.key, { min: p.defaultMin, max: p.defaultMax }])) as Record<ParamKey, ParamRange>;

const EMPTY_FORM: FormState = { label: '', recommendation: '', isActive: true, conditions: [], thresholds: buildDefaultThresholds() };
// --- RangeInput

function RangeInput({ preset, range, onChange }: {
  preset: ParamConfig; range: ParamRange; onChange: (r: ParamRange) => void;
}) {
  const setMin = (v: number) => onChange({ min: Math.min(v, range.max - preset.step), max: range.max });
  const setMax = (v: number) => onChange({ min: range.min, max: Math.max(v, range.min + preset.step) });
  return (
    <div className="px-3 py-3 rounded-xl bg-muted/40 border border-border/50">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{preset.icon}</span>
        <span className={`text-xs font-semibold ${preset.color}`}>{preset.label}</span>
        <span className="ml-auto text-sm font-bold tabular-nums">{range.min}{preset.unit} – {range.max}{preset.unit}</span>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-muted-foreground w-5 shrink-0">od</span>
          <input type="range" min={preset.absMin} max={preset.absMax} step={preset.step} value={range.min}
            onChange={e => setMin(Number(e.target.value))} className="flex-1 h-1.5 rounded-full cursor-pointer" />
          <span className={`text-xs font-medium tabular-nums w-14 text-right ${preset.color}`}>{range.min}{preset.unit}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-muted-foreground w-5 shrink-0">do</span>
          <input type="range" min={preset.absMin} max={preset.absMax} step={preset.step} value={range.max}
            onChange={e => setMax(Number(e.target.value))} className="flex-1 h-1.5 rounded-full cursor-pointer" />
          <span className={`text-xs font-medium tabular-nums w-14 text-right ${preset.color}`}>{range.max}{preset.unit}</span>
        </div>
      </div>
    </div>
  );
}
// --- RuleForm

function RuleForm({ initial, onClose, onSave, isPending }: {
  initial: FormState; onClose: () => void; onSave: (data: FormState) => void; isPending: boolean;
}) {
  const [form, setForm] = useState<FormState>(initial);

  const toggleParam = (key: ParamKey) => {
    setForm(f => ({ ...f, conditions: f.conditions.includes(key) ? f.conditions.filter(c => c !== key) : [...f.conditions, key] }));
  };
  const setRange = (key: ParamKey, range: ParamRange) => {
    setForm(f => ({ ...f, thresholds: { ...f.thresholds, [key]: range } }));
  };

  const preview = form.conditions.length === 0 ? null
    : form.conditions.map(k => {
        const p = PARAM_PRESETS.find(p => p.key === k)!;
        const r = form.thresholds[k];
        return `${p.label}: ${r.min}${p.unit}–${r.max}${p.unit}`;
      }).join(' ORAZ ');

  const valid = form.label.trim() && form.recommendation.trim() && form.conditions.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="font-heading font-semibold text-base">{initial.label ? 'Edytuj regułę' : 'Nowa reguła'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted/40 transition-colors"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-6 py-5 space-y-5">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Nazwa reguły</label>
            <input type="text" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              placeholder="np. Łagodna temperatura z umiarkowanym UV"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-foreground/30" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-3">
              Parametry pogodowe <span className="font-normal">(zaznacz i ustaw zakres od–do; wszystkie muszą być spełnione jednocześnie)</span>
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
              {PARAM_PRESETS.map(preset => {
                const selected = form.conditions.includes(preset.key);
                return (
                  <button key={preset.key} type="button" onClick={() => toggleParam(preset.key)}
                    className={`relative flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center ${selected ? `${preset.selectedBorder} ${preset.selectedBg}` : 'border-border/40 hover:border-border bg-transparent'}`}
                  >
                    {selected && <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-foreground text-background text-[9px] flex items-center justify-center font-bold">✓</span>}
                    <span className="text-xl leading-none">{preset.icon}</span>
                    <span className={`text-[11px] font-semibold ${selected ? preset.color : 'text-muted-foreground'}`}>{preset.label}</span>
                  </button>
                );
              })}
            </div>
            {form.conditions.length > 0 && (
              <div className="space-y-2">
                {form.conditions.map(key => {
                  const preset = PARAM_PRESETS.find(p => p.key === key)!;
                  return <RangeInput key={key} preset={preset} range={form.thresholds[key]} onChange={r => setRange(key, r)} />;
                })}
              </div>
            )}
            {preview && (
              <div className="mt-3 px-3 py-2 bg-foreground/5 border border-border/40 rounded-lg">
                <p className="text-xs"><span className="text-muted-foreground">Aktywuje się gdy: </span><span className="font-semibold">{preview}</span></p>
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Rekomendacja dla klienta</label>
            <textarea value={form.recommendation} onChange={e => setForm(f => ({ ...f, recommendation: e.target.value }))}
              rows={3} placeholder="Szczegółowy tekst porady..."
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-foreground/30 resize-none" />
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
              className={`relative rounded-full transition-colors shrink-0 ${form.isActive ? 'bg-foreground' : 'bg-border'}`}
              style={{ width: '2rem', height: '1rem' }}>
              <span className={`absolute top-0.5 left-0.5 w-3 h-3 bg-background rounded-full shadow transition-transform ${form.isActive ? 'translate-x-4' : ''}`} />
            </button>
            <span className="text-sm text-muted-foreground">Reguła aktywna</span>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted/40 transition-colors">Anuluj</button>
          <button onClick={() => onSave(form)} disabled={!valid || isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-40">
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Zapisz
          </button>
        </div>
      </div>
    </div>
  );
}
// --- RuleCard

function RuleCard({ rule, onEdit, onDelete }: { rule: SkinWeatherRule; onEdit: () => void; onDelete: () => void }) {
  const conditions = rule.conditions ?? [];
  const thresholds = rule.thresholds ?? {};
  return (
    <div className={`p-4 rounded-xl border-l-4 transition-all ${rule.isActive ? 'border-l-foreground/40 border-border/50 bg-card' : 'border-l-border border-border/30 bg-muted/20 opacity-60'}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="text-sm font-semibold">{rule.label}</span>
            {!rule.isActive && <span className="text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">nieaktywna</span>}
          </div>
          {conditions.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {conditions.map((key: string) => {
                const preset = PARAM_PRESETS.find(p => p.key === key);
                if (!preset) return null;
                const range: ParamRange | undefined = thresholds[key];
                return (
                  <span key={key} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${preset.chipColor}`}>
                    <span>{preset.icon}</span>
                    <span>{preset.label}</span>
                    {range && <span className="font-medium">{range.min}–{range.max}{preset.unit}</span>}
                  </span>
                );
              })}
            </div>
          ) : <p className="text-xs text-muted-foreground italic mb-2">Brak parametrów</p>}
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{rule.recommendation}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>
    </div>
  );
}
// --- SkinTypeAdviceTab

const SKIN_TYPE_ADVICE_META = [
  { key: 'SUCHA',    label: 'Sucha',    emoji: '🌵', color: 'text-amber-600 dark:text-amber-400',    bg: 'bg-amber-50 dark:bg-amber-900/20',    border: 'border-amber-200 dark:border-amber-800',    accent: 'bg-amber-500',    desc: 'Łuszczy się, ciągnie, potrzebuje nawilżenia' },
  { key: 'TLUSTA',   label: 'Tłusta',   emoji: '✨', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800', accent: 'bg-emerald-500', desc: 'Połysk, rozszerzone pory, przetłuszczanie' },
  { key: 'MIESZANA', label: 'Mieszana', emoji: '⚖️', color: 'text-violet-600 dark:text-violet-400',  bg: 'bg-violet-50 dark:bg-violet-900/20',  border: 'border-violet-200 dark:border-violet-800',  accent: 'bg-violet-500',  desc: 'Strefa T tłusta, reszta normalna lub sucha' },
  { key: 'NORMALNA', label: 'Normalna', emoji: '🌸', color: 'text-rose-600 dark:text-rose-400',      bg: 'bg-rose-50 dark:bg-rose-900/20',      border: 'border-rose-200 dark:border-rose-800',      accent: 'bg-rose-500',    desc: 'Zrównoważona, bez problemów' },
  { key: 'WRAZLIWA', label: 'Wrażliwa', emoji: '🌹', color: 'text-pink-600 dark:text-pink-400',      bg: 'bg-pink-50 dark:bg-pink-900/20',      border: 'border-pink-200 dark:border-pink-800',      accent: 'bg-pink-500',    desc: 'Reaktywna, łatwo się czerwieni, podrażniona' },
];

interface SkinAdviceData {
  charakterystyka: string;
  pielegnacja: string;
  skladniki: string;
  unikaj: string;
  zabiegi: string;
  sezonowe: string;
}

const EMPTY_ADVICE: SkinAdviceData = {
  charakterystyka: '',
  pielegnacja: '',
  skladniki: '',
  unikaj: '',
  zabiegi: '',
  sezonowe: '',
};

const ADVICE_CATEGORIES: { key: keyof SkinAdviceData; label: string; placeholder: string; icon: React.ReactNode; hint: string }[] = [
  {
    key: 'charakterystyka',
    label: 'Charakterystyka skóry',
    placeholder: 'Opisz cechy charakterystyczne tego typu skóry, objawy, wygląd, odczucia klientki...',
    icon: <Sparkles className="h-4 w-4" />,
    hint: 'Opis ogólny dla klientki — co czuje, co widzi'
  },
  {
    key: 'pielegnacja',
    label: 'Podstawowa pielęgnacja',
    placeholder: 'Krok po kroku: oczyszczanie, tonizacja, serum, krem... Porady dotyczące rutyny pielęgnacyjnej.',
    icon: <Droplets className="h-4 w-4" />,
    hint: 'Rutyna dzienna i wieczorna — co stosować i w jakiej kolejności'
  },
  {
    key: 'skladniki',
    label: 'Polecane składniki aktywne',
    placeholder: 'Np. kwas hialuronowy, ceramidy, niacynamid, retinol — jakie składniki działają najlepiej i dlaczego.',
    icon: <FlaskConical className="h-4 w-4" />,
    hint: 'Składniki INCI, które warto szukać w kosmetykach'
  },
  {
    key: 'unikaj',
    label: 'Czego unikać',
    placeholder: 'Składniki drażniące, nieodpowiednie tekstury, błędy pielęgnacyjne, których klientka powinna się wystrzegać...',
    icon: <Ban className="h-4 w-4" />,
    hint: 'Składniki i nawyki, które mogą zaszkodzić'
  },
  {
    key: 'zabiegi',
    label: 'Polecane zabiegi salonowe',
    placeholder: 'Np. mikrodermabrazja, mezoterapia, peeling chemiczny, oczyszczanie manualne — które zabiegi z oferty salonu są najodpowiedniejsze.',
    icon: <Scissors className="h-4 w-4" />,
    hint: 'Zabiegi z oferty salonu dedykowane temu typowi skóry'
  },
  {
    key: 'sezonowe',
    label: 'Porady sezonowe',
    placeholder: 'Jak zmienia się pielęgnacja latem vs zimą, jak reaguje skóra na słońce, mróz, wiatr, klimatyzację...',
    icon: <Sun className="h-4 w-4" />,
    hint: 'Zmiany rutyny w zależności od pory roku i pogody'
  },
];

function parseAdviceContent(raw: string): SkinAdviceData {
  if (!raw) return { ...EMPTY_ADVICE };
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && 'charakterystyka' in parsed) {
      return { ...EMPTY_ADVICE, ...parsed };
    }
    // Legacy plain text — put into charakterystyka
    return { ...EMPTY_ADVICE, charakterystyka: raw };
  } catch {
    return { ...EMPTY_ADVICE, charakterystyka: raw };
  }
}

function SkinTypeCard({ meta, adviceList, onSave, isSaving }: {
  meta: typeof SKIN_TYPE_ADVICE_META[0];
  adviceList: Array<{ skinType: string; content: string; updatedAt: string }>;
  onSave: (skinType: string, content: string) => void;
  isSaving: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [advice, setAdvice] = useState<SkinAdviceData>({ ...EMPTY_ADVICE });
  const [dirty, setDirty] = useState(false);

  const raw = adviceList.find(i => i.skinType === meta.key)?.content ?? '';
  const updatedAt = adviceList.find(i => i.skinType === meta.key)?.updatedAt ?? null;

  useEffect(() => {
    setAdvice(parseAdviceContent(raw));
    setDirty(false);
  }, [raw]);

  const setField = (key: keyof SkinAdviceData, value: string) => {
    setAdvice(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const filledCount = Object.values(advice).filter(v => v.trim().length > 0).length;

  const handleSave = () => {
    onSave(meta.key, JSON.stringify(advice));
    setDirty(false);
  };

  return (
    <div className={`rounded-xl border ${meta.border} overflow-hidden transition-all`}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className={`w-full flex items-center gap-3 px-5 py-4 ${meta.bg} text-left transition-colors hover:opacity-90`}
      >
        <span className="text-2xl leading-none">{meta.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-semibold ${meta.color}`}>Skóra {meta.label}</span>
            {dirty && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-600 dark:text-amber-400 border border-amber-400/30">
                Niezapisane zmiany
              </span>
            )}
            {!dirty && filledCount > 0 && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-foreground/8 text-muted-foreground border border-border/40">
                {filledCount}/{ADVICE_CATEGORIES.length} kategorii
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{meta.desc}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {updatedAt && !expanded && (
            <span className="text-[11px] text-muted-foreground hidden sm:block">
              {new Date(updatedAt).toLocaleDateString('pl-PL')}
            </span>
          )}
          {/* Progress dots */}
          <div className="hidden sm:flex items-center gap-0.5">
            {ADVICE_CATEGORIES.map((cat) => (
              <span
                key={cat.key}
                className={`w-1.5 h-1.5 rounded-full transition-all ${advice[cat.key]?.trim() ? meta.accent : 'bg-border'}`}
              />
            ))}
          </div>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="bg-card">
          <div className="px-5 pt-4 pb-2 border-t border-border/40">
            <p className="text-xs text-muted-foreground">
              Wypełnij poniższe kategorie porad kosmetologicznych dla skóry {meta.label.toLowerCase()}.
              Porady są widoczne dla klientek w panelu użytkownika w zakładce &ldquo;Twoja Skóra&rdquo;.
            </p>
          </div>
          <div className="divide-y divide-border/30">
            {ADVICE_CATEGORIES.map(cat => (
              <div key={cat.key} className="px-5 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`${meta.color} opacity-80`}>{cat.icon}</span>
                  <label className="text-xs font-semibold text-foreground">{cat.label}</label>
                  <span className="ml-auto text-[10px] text-muted-foreground">{cat.hint}</span>
                </div>
                <textarea
                  rows={4}
                  value={advice[cat.key]}
                  onChange={e => setField(cat.key, e.target.value)}
                  placeholder={cat.placeholder}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-foreground/20 resize-none transition-colors placeholder:text-muted-foreground/50"
                />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between px-5 py-3 bg-muted/20 border-t border-border/40">
            {updatedAt ? (
              <span className="text-xs text-muted-foreground">
                Ostatni zapis: {new Date(updatedAt).toLocaleString('pl-PL')}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">Brak zapisanych porad</span>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving || !dirty}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {isSaving ? 'Zapisywanie...' : 'Zapisz porady'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SkinTypeAdviceTab() {
  const qc = useQueryClient();

  const { data: adviceList = [], isLoading } = useQuery({
    queryKey: ['admin', 'skin-type-advice'],
    queryFn: skinWeatherApi.getSkinTypeAdvice,
  });

  const saveMutation = useMutation({
    mutationFn: ({ skinType, content }: { skinType: string; content: string }) =>
      skinWeatherApi.updateSkinTypeAdvice(skinType, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'skin-type-advice'] });
      toast.success('Porady zapisane');
    },
    onError: () => toast.error('Błąd zapisu'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-8">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Ładowanie porad...</span>
      </div>
    );
  }

  const filledTotal = adviceList.filter((item: { content: string }) => {
    try {
      const p = JSON.parse(item.content);
      return Object.values(p).some((v: unknown) => typeof v === 'string' && v.trim().length > 0);
    } catch {
      return item.content?.trim().length > 0;
    }
  }).length;

  return (
    <div className="space-y-3">
      {/* Summary bar */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/30 border border-border/40">
        <div className="flex-1">
          <p className="text-xs font-medium text-foreground">Porady kosmetologiczne dla typów skóry</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Rozwiń każdy typ skóry, aby edytować porady w 6 kategoriach. Porady są wyświetlane klientkom w panelu &ldquo;Twoja Skóra&rdquo;.
          </p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-lg font-bold text-foreground">{filledTotal}</span>
          <span className="text-xs text-muted-foreground">/{SKIN_TYPE_ADVICE_META.length}</span>
          <p className="text-[10px] text-muted-foreground">uzupełnionych</p>
        </div>
      </div>

      {/* Cards */}
      {SKIN_TYPE_ADVICE_META.map(meta => (
        <SkinTypeCard
          key={meta.key}
          meta={meta}
          adviceList={adviceList as Array<{ skinType: string; content: string; updatedAt: string }>}
          onSave={(skinType, content) => saveMutation.mutate({ skinType, content })}
          isSaving={saveMutation.isPending}
        />
      ))}
    </div>
  );
}

// --- Main Page

export const SkinWeatherRules = () => {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'rules' | 'advice'>('rules');
  const [formOpen, setFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<SkinWeatherRule | null>(null);

  const { data: rules = [], isLoading } = useQuery<SkinWeatherRule[]>({
    queryKey: ['skin-weather', 'rules'],
    queryFn: skinWeatherApi.getRules,
  });

  const createMutation = useMutation({
    mutationFn: (data: FormState) => skinWeatherApi.createRule(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['skin-weather', 'rules'] }); setFormOpen(false); toast.success('Reguła dodana'); },
    onError: () => toast.error('Błąd zapisu'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormState }) => skinWeatherApi.updateRule(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['skin-weather', 'rules'] }); setEditingRule(null); setFormOpen(false); toast.success('Reguła zaktualizowana'); },
    onError: () => toast.error('Błąd zapisu'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => skinWeatherApi.deleteRule(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['skin-weather', 'rules'] }); toast.success('Reguła usunięta'); },
    onError: () => toast.error('Błąd usuwania'),
  });

  const generateAllMutation = useMutation({
    mutationFn: skinWeatherApi.generateAllReports,
    onSuccess: () => toast.success('Raporty wygenerowane i powiadomienia wysłane'),
    onError: (err) => { const msg = isAxiosError(err) ? err.response?.data?.message : null; toast.error(msg ?? 'Błąd generowania'); },
  });

  const handleSave = (form: FormState) => {
    if (editingRule) updateMutation.mutate({ id: editingRule.id, data: form });
    else createMutation.mutate(form);
  };

  const openEdit = (rule: SkinWeatherRule) => { setEditingRule(rule); setFormOpen(true); };
  const openCreate = () => { setEditingRule(null); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditingRule(null); };

  const formInitial: FormState = editingRule
    ? {
        label: editingRule.label,
        recommendation: editingRule.recommendation,
        isActive: editingRule.isActive,
        conditions: (editingRule.conditions ?? []) as ParamKey[],
        thresholds: { ...buildDefaultThresholds(), ...(editingRule.thresholds ?? {}) },
      }
    : EMPTY_FORM;

  return (
    <div className="max-w-3xl p-0 md:p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sky-100 dark:bg-sky-900/30 rounded-xl"><Cloud className="h-5 w-5 text-sky-600 dark:text-sky-400" /></div>
          <div>
            <h1 className="font-heading text-xl font-semibold">Twoja Skóra</h1>
            <p className="text-sm text-muted-foreground">Reguły z zakresami parametrów pogodowych od–do</p>
          </div>
        </div>
        {activeTab === 'rules' && (
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
            <button onClick={() => generateAllMutation.mutate()} disabled={generateAllMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-xl hover:bg-muted/40 transition-colors disabled:opacity-50">
              {generateAllMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Generuj dziś
            </button>
            <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-foreground text-background text-sm font-medium rounded-xl hover:opacity-90 transition-opacity">
              <Plus className="h-4 w-4" /> Dodaj regułę
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-1 p-1 bg-muted/30 rounded-xl border w-fit mb-6">
        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-1.5 text-sm rounded-lg transition-all ${activeTab === 'rules' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Reguły pogodowe
        </button>
        <button
          onClick={() => setActiveTab('advice')}
          className={`px-4 py-1.5 text-sm rounded-lg transition-all ${activeTab === 'advice' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Porady dla typów skóry
        </button>
      </div>

      {activeTab === 'rules' ? (
        <>
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-8"><Loader2 className="h-4 w-4 animate-spin" /><span className="text-sm">Ładowanie reguł...</span></div>
          ) : rules.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-2xl">
              <Cloud className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">Brak reguł</p>
              <p className="text-xs text-muted-foreground mt-1">Dodaj pierwszą regułę, aby system zaczął generować raporty.</p>
              <button onClick={openCreate} className="mt-4 flex items-center gap-2 px-4 py-2 bg-foreground text-background text-sm rounded-xl hover:opacity-90 transition-opacity mx-auto">
                <Plus className="h-4 w-4" /> Dodaj regułę
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {rules.map(rule => (
                <RuleCard key={rule.id} rule={rule} onEdit={() => openEdit(rule)}
                  onDelete={() => { if (confirm(`Usunąć regułę "${rule.label}"?`)) deleteMutation.mutate(rule.id); }} />
              ))}
            </div>
          )}
          {formOpen && (
            <RuleForm initial={formInitial} onClose={closeForm} onSave={handleSave}
              isPending={createMutation.isPending || updateMutation.isPending} />
          )}
        </>
      ) : (
        <SkinTypeAdviceTab />
      )}
    </div>
  );
};

export default SkinWeatherRules;
