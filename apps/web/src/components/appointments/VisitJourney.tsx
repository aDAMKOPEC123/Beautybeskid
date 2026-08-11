import { type ReactNode, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';

const SALON_ADDRESS = 'Mordarka 505, 34-600 Mordarka';

const GOLD = '#C4965A';
const IVORY = '#F6F2EA';
const NIGHT = '#12291D';
const MUTED = 'rgba(246,242,234,0.72)';

// Wszystko liczy się od długości aktu, żeby sceny, pasek i tekst kończyły się razem.
const ACT_MS = 6200;
const ACT_S = ACT_MS / 1000;
const OUTRO_MS = 3200;
const SWAP_S = 0.45;

export type VisitStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

type SceneKey = 'waiting' | 'route' | 'reward' | 'closed';
type StageState = 'done' | 'current' | 'upcoming';

type Stage = {
  when: string;
  title: string;
  body: string;
  scene: SceneKey;
  state: StageState;
};

const STATUS_PILL: Record<VisitStatus, { label: string; color: string; background: string }> = {
  PENDING: { label: 'Oczekująca', color: '#FFE0B8', background: 'rgba(196,150,90,0.22)' },
  CONFIRMED: { label: 'Potwierdzona', color: '#BFF0CE', background: 'rgba(34,197,94,0.18)' },
  COMPLETED: { label: 'Zakończona', color: '#F0E2CA', background: 'rgba(196,150,90,0.16)' },
  CANCELLED: { label: 'Anulowana', color: '#FFC9C9', background: 'rgba(239,68,68,0.18)' },
  NO_SHOW: { label: 'Nieobecność', color: '#DDE3EA', background: 'rgba(148,163,184,0.2)' },
};

// Przebieg opowiada to, co faktycznie wydarzyło się z wizytą.
function buildStages(status: VisitStatus, address: string): Stage[] {
  const arrival: Stage = {
    when: 'W dniu wizyty',
    title: 'Dojedź na miejsce',
    body: `${address}. Przyjedź kilka minut wcześniej, żeby spokojnie zacząć.`,
    scene: 'route',
    state: 'upcoming',
  };
  const reward: Stage = {
    when: 'Po wizycie',
    title: 'Ciesz się efektem',
    body: 'Zgarniesz punkty lojalnościowe, a kolejny termin umówisz jednym kliknięciem.',
    scene: 'reward',
    state: 'upcoming',
  };

  if (status === 'CANCELLED' || status === 'NO_SHOW') {
    return [
      {
        when: 'Rezerwacja',
        title: 'Termin był zapisany',
        body: 'Ta wizyta figuruje w Twojej historii.',
        scene: 'closed',
        state: 'done',
      },
      {
        when: 'Status',
        title: status === 'CANCELLED' ? 'Wizyta anulowana' : 'Wizyta nieodbyta',
        body:
          status === 'CANCELLED'
            ? 'Termin został zwolniony. Możesz umówić się ponownie, kiedy tylko chcesz.'
            : 'Termin przepadł, bo wizyta się nie odbyła. Umów nowy, gdy będzie Ci pasować.',
        scene: 'closed',
        state: 'current',
      },
    ];
  }

  if (status === 'CONFIRMED') {
    return [
      {
        when: 'Rezerwacja',
        title: 'Termin potwierdzony',
        body: 'Salon potwierdził Twoją wizytę. Rezerwacja jest pewna.',
        scene: 'waiting',
        state: 'done',
      },
      { ...arrival, state: 'current' },
      reward,
    ];
  }

  if (status === 'COMPLETED') {
    return [
      {
        when: 'Rezerwacja',
        title: 'Termin potwierdzony',
        body: 'Salon potwierdził Twoją wizytę.',
        scene: 'waiting',
        state: 'done',
      },
      { ...arrival, when: 'W dniu wizyty', title: 'Byłaś na miejscu', body: `${address}.`, state: 'done' },
      { ...reward, title: 'Wizyta za Tobą', body: 'Punkty za tę wizytę są już na Twoim koncie. Oceń wizytę i umów kolejną.', state: 'current' },
    ];
  }

  return [
    {
      when: 'Teraz',
      title: 'Twoja wizyta czeka na potwierdzenie',
      body: 'Salon sprawdza wybrany termin. Dostaniesz powiadomienie, gdy tylko go potwierdzi — nie musisz nic robić.',
      scene: 'waiting',
      state: 'current',
    },
    arrival,
    reward,
  ];
}

// ─── Sceny — każda zapętla się dokładnie w rytmie aktu ────────────────────────

function WaitingScene() {
  return (
    <svg viewBox="0 0 120 96" className="h-24 w-full" aria-hidden="true">
      {[0, 1, 2].map((ring) => (
        <motion.circle
          key={ring}
          cx="60" cy="48" r="16"
          fill="none" stroke={GOLD} strokeWidth="1"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: [0.6, 2.1], opacity: [0.55, 0] }}
          transition={{ duration: ACT_S / 2, repeat: Infinity, delay: (ring * ACT_S) / 6, ease: 'easeOut' }}
          style={{ transformOrigin: '60px 48px' }}
        />
      ))}
      <circle cx="60" cy="48" r="17" fill="none" stroke={GOLD} strokeWidth="1.5" opacity="0.9" />
      <motion.line
        x1="60" y1="48" x2="60" y2="38"
        stroke={GOLD} strokeWidth="2" strokeLinecap="round"
        style={{ transformOrigin: '60px 48px' }}
        animate={{ rotate: 360 }}
        transition={{ duration: ACT_S * 2, repeat: Infinity, ease: 'linear' }}
      />
      <motion.line
        x1="60" y1="48" x2="60" y2="41"
        stroke={IVORY} strokeWidth="1.5" strokeLinecap="round" opacity="0.75"
        style={{ transformOrigin: '60px 48px' }}
        animate={{ rotate: 360 }}
        transition={{ duration: ACT_S / 2, repeat: Infinity, ease: 'linear' }}
      />
    </svg>
  );
}

function RouteScene() {
  const path = 'M12 70 C 60 70, 70 34, 116 34 S 178 30, 200 30';
  const loop = { duration: ACT_S, repeat: Infinity, ease: 'linear' as const };
  return (
    <svg viewBox="0 0 220 96" className="h-24 w-full" aria-hidden="true">
      <path d={path} fill="none" stroke="rgba(246,242,234,0.18)" strokeWidth="2" strokeDasharray="5 7" strokeLinecap="round" />
      <motion.path
        d={path}
        fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: [0, 1, 1, 0] }}
        transition={{ ...loop, times: [0, 0.5, 0.92, 1] }}
      />
      <motion.circle
        r="4" fill={IVORY}
        initial={{ cx: 12, cy: 70, opacity: 0 }}
        animate={{
          cx: [12, 52, 90, 132, 172, 200, 200],
          cy: [70, 64, 40, 33, 31, 30, 30],
          opacity: [1, 1, 1, 1, 1, 0, 0],
        }}
        transition={{ ...loop, times: [0, 0.11, 0.23, 0.34, 0.43, 0.5, 1] }}
      />
      <motion.g
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: [-20, -20, 0, 0, -20], opacity: [0, 0, 1, 1, 0] }}
        transition={{ ...loop, times: [0, 0.46, 0.56, 0.92, 1] }}
      >
        <path d="M200 12 c -7 0 -12 5.4 -12 12 0 8.6 12 20 12 20 s 12 -11.4 12 -20 c 0 -6.6 -5 -12 -12 -12 z" fill={GOLD} />
        <circle cx="200" cy="24" r="4.4" fill={NIGHT} />
      </motion.g>
    </svg>
  );
}

function RewardScene() {
  const sparks = [
    { x: 44, delay: 0, size: 5 },
    { x: 72, delay: ACT_S / 6, size: 3.5 },
    { x: 100, delay: ACT_S / 12, size: 6 },
    { x: 128, delay: ACT_S / 4, size: 4 },
    { x: 156, delay: ACT_S / 8, size: 4.5 },
  ];
  return (
    <svg viewBox="0 0 200 96" className="h-24 w-full" aria-hidden="true">
      <motion.circle
        cx="100" cy="52" r="24"
        fill="none" stroke={GOLD} strokeWidth="1.5"
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.9 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        style={{ transformOrigin: '100px 52px' }}
      />
      <motion.text
        x="100" y="57" textAnchor="middle" fill={IVORY}
        style={{ fontSize: 13, fontWeight: 700 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.6 }}
      >
        pkt
      </motion.text>
      {sparks.map((spark) => (
        <motion.rect
          key={spark.x}
          x={spark.x} y={78} width={spark.size} height={spark.size} fill={GOLD}
          initial={{ opacity: 0, y: 78, rotate: 45 }}
          animate={{ opacity: [0, 1, 0], y: [78, 14], rotate: 405 }}
          transition={{ duration: ACT_S / 2, repeat: Infinity, delay: spark.delay, ease: 'easeOut' }}
          style={{ transformOrigin: 'center' }}
        />
      ))}
    </svg>
  );
}

function ClosedScene() {
  return (
    <svg viewBox="0 0 120 96" className="h-24 w-full" aria-hidden="true">
      <circle cx="60" cy="48" r="26" fill="none" stroke="rgba(246,242,234,0.22)" strokeWidth="1.5" />
      <motion.path
        d="M48 36 L72 60 M72 36 L48 60"
        stroke="rgba(246,242,234,0.5)" strokeWidth="2.5" strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      />
    </svg>
  );
}

const SCENES: Record<SceneKey, () => JSX.Element> = {
  waiting: WaitingScene,
  route: RouteScene,
  reward: RewardScene,
  closed: ClosedScene,
};

const slide = (direction: number, reduce: boolean | null) => ({
  enter: { opacity: 0, x: reduce ? 0 : direction * 48 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: reduce ? 0 : direction * -48 },
});

export function VisitJourney({
  serviceName,
  date,
  employeeName,
  status = 'PENDING',
  address = SALON_ADDRESS,
  mode = 'booking',
  onFinish,
  onClose,
  children,
}: {
  serviceName: string;
  date: Date;
  employeeName?: string | null;
  status?: VisitStatus;
  address?: string;
  mode?: 'booking' | 'details';
  onFinish?: () => void;
  onClose?: () => void;
  /** Szczegóły wizyty — na jasnej karcie, pod przebiegiem. */
  children?: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const stages = buildStages(status, address);
  const currentIndex = Math.max(0, stages.findIndex((stage) => stage.state === 'current'));

  const [[act, direction], setAct] = useState<[number, number]>([currentIndex, 1]);
  // Ręczny krok przejmuje sterowanie — przebieg przestaje sam się przewijać.
  const [manual, setManual] = useState(mode === 'details');
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  const isLast = act === stages.length - 1;

  useEffect(() => {
    if (reduceMotion || manual) return;
    if (!isLast) {
      const timer = window.setTimeout(() => setAct(([current]) => [current + 1, 1]), ACT_MS);
      return () => window.clearTimeout(timer);
    }
    if (mode !== 'booking') return;
    const timer = window.setTimeout(() => onFinishRef.current?.(), ACT_MS + OUTRO_MS);
    return () => window.clearTimeout(timer);
  }, [act, isLast, manual, mode, reduceMotion]);

  useEffect(() => {
    if (!onClose) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const goTo = (next: number) => {
    const clamped = Math.min(stages.length - 1, Math.max(0, next));
    setManual(true);
    setAct(([current]) => [clamped, clamped >= current ? 1 : -1]);
  };

  const step = stages[act];
  const Scene = SCENES[step.scene];
  const words = step.title.split(' ');
  const pill = STATUS_PILL[status];
  const variants = slide(direction, reduceMotion);

  return (
    <motion.div
      className="fixed inset-0 z-[90] overflow-y-auto"
      style={{ background: NIGHT }}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 18 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 10 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="visit-journey-title"
    >
      {!reduceMotion && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          animate={{
            background: [
              'radial-gradient(60% 44% at 22% 24%, rgba(196,150,90,0.16), transparent 70%)',
              'radial-gradient(60% 44% at 78% 62%, rgba(196,150,90,0.16), transparent 70%)',
              'radial-gradient(60% 44% at 22% 24%, rgba(196,150,90,0.16), transparent 70%)',
            ],
          }}
          transition={{ duration: ACT_S * 3, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      <div className="relative mx-auto flex min-h-full w-full max-w-lg flex-col px-6 py-10 sm:py-14">
        <motion.div
          className="flex items-start justify-between gap-4"
          initial={reduceMotion ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.4 }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: GOLD }}>
              {mode === 'booking' ? 'Rezerwacja przyjęta' : 'Przebieg wizyty'}
            </p>
            <span
              className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em]"
              style={{ color: pill.color, background: pill.background }}
            >
              {pill.label}
            </span>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Zamknij przebieg wizyty"
              className="-mt-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/10"
              style={{ color: MUTED }}
            >
              <X size={20} />
            </button>
          )}
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.18, duration: 0.5, ease: 'easeOut' }}
          className="mt-4 rounded-2xl px-4 py-3.5"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(196,150,90,0.28)' }}
        >
          <p className="font-heading text-lg font-bold" style={{ color: IVORY }}>
            {serviceName}
          </p>
          <p className="mt-0.5 text-sm capitalize" style={{ color: MUTED }}>
            {format(date, 'EEEE, d MMMM yyyy', { locale: pl })}, {format(date, 'HH:mm')}
            {employeeName ? ` · ${employeeName}` : ''}
          </p>
        </motion.div>

        {!reduceMotion && (
          <div className="relative mt-7 h-24 overflow-hidden">
            <AnimatePresence initial={false} custom={direction}>
              <motion.div
                key={`${step.scene}-${act}`}
                className="absolute inset-0"
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: SWAP_S, ease: [0.22, 1, 0.36, 1] }}
              >
                <Scene />
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {/* Droga wizyty — złota linia dociąga się do aktualnego etapu. */}
        <ol className="relative mt-8 flex-1">
          <span
            aria-hidden="true"
            className="absolute left-[7px] top-2 bottom-2 w-px"
            style={{ background: 'rgba(246,242,234,0.16)' }}
          />
          <motion.span
            aria-hidden="true"
            className="absolute left-[7px] top-2 w-px origin-top"
            style={{ background: GOLD, bottom: 8 }}
            initial={reduceMotion ? false : { scaleY: 0 }}
            animate={{ scaleY: reduceMotion ? 1 : (act + 1) / stages.length }}
            transition={{ duration: reduceMotion ? 0 : SWAP_S, ease: 'easeInOut' }}
          />

          {stages.map((entry, index) => {
            const isActive = reduceMotion || index === act;
            const isPast = index < act;
            const pulses = isActive && !isPast && !reduceMotion && entry.scene !== 'closed';
            return (
              <li key={entry.when} className="relative flex gap-4 pb-8 last:pb-0">
                <motion.span
                  className="relative z-10 mt-1.5 h-[15px] w-[15px] shrink-0 rounded-full"
                  style={{
                    background: isActive || isPast ? GOLD : NIGHT,
                    border: `2px solid ${isActive || isPast ? GOLD : 'rgba(246,242,234,0.28)'}`,
                    boxShadow: isActive && !isPast ? '0 0 0 6px rgba(196,150,90,0.14)' : 'none',
                  }}
                  animate={pulses ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                  transition={{ duration: ACT_S / 3, repeat: pulses ? Infinity : 0, ease: 'easeInOut' }}
                />
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p
                    className="text-[10px] font-bold uppercase tracking-[0.18em]"
                    style={{ color: isActive ? GOLD : 'rgba(246,242,234,0.42)' }}
                  >
                    {entry.when}
                  </p>
                  <AnimatePresence mode="wait" initial={false} custom={direction}>
                    {isActive ? (
                      <motion.div
                        key="active"
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: SWAP_S, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <h2
                          id={index === act ? 'visit-journey-title' : undefined}
                          className="mt-1 font-heading text-[26px] font-bold leading-tight sm:text-3xl"
                          style={{ color: IVORY }}
                        >
                          {reduceMotion || index !== act
                            ? entry.title
                            : words.map((word, wordIndex) => (
                                <motion.span
                                  key={`${word}-${wordIndex}`}
                                  className="inline-block"
                                  initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
                                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                  transition={{ delay: 0.04 * wordIndex, duration: 0.42, ease: 'easeOut' }}
                                >
                                  {word}&nbsp;
                                </motion.span>
                              ))}
                        </h2>
                        <motion.p
                          className="mt-2 text-sm leading-6"
                          style={{ color: 'rgba(246,242,234,0.74)' }}
                          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.04 * words.length + 0.1, duration: 0.42 }}
                        >
                          {entry.body}
                        </motion.p>
                      </motion.div>
                    ) : (
                      <motion.p
                        key="idle"
                        initial={false}
                        animate={{ opacity: 1 }}
                        className="mt-1 font-heading text-lg font-bold"
                        style={{ color: isPast ? 'rgba(246,242,234,0.55)' : 'rgba(246,242,234,0.34)' }}
                      >
                        {entry.title}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </li>
            );
          })}
        </ol>

        {children && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.26, duration: 0.5, ease: 'easeOut' }}
            className="rounded-2xl bg-white px-4 pb-4"
          >
            {children}
          </motion.div>
        )}

        {!reduceMotion && stages.length > 1 && (
          <div className="mt-8 flex items-center gap-3">
            <button
              type="button"
              onClick={() => goTo(act - 1)}
              disabled={act === 0}
              aria-label="Wróć do poprzedniego etapu"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-opacity disabled:opacity-30"
              style={{ borderColor: 'rgba(246,242,234,0.28)', color: IVORY }}
            >
              <ArrowLeft size={18} />
            </button>

            <div className="flex flex-1 gap-1.5">
              {stages.map((entry, index) => (
                <button
                  key={entry.when}
                  type="button"
                  onClick={() => goTo(index)}
                  aria-label={`Etap: ${entry.when}`}
                  className="h-9 flex-1"
                >
                  <span
                    className="block h-[3px] w-full overflow-hidden rounded-full"
                    style={{ background: 'rgba(246,242,234,0.18)' }}
                  >
                    <motion.span
                      className="block h-full origin-left"
                      style={{ background: GOLD }}
                      initial={false}
                      animate={{ scaleX: index <= act ? 1 : 0 }}
                      transition={{ duration: index === act && !manual ? ACT_S : 0.3, ease: 'linear' }}
                    />
                  </span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => goTo(act + 1)}
              disabled={isLast}
              aria-label="Przejdź do następnego etapu"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-opacity disabled:opacity-30"
              style={{ borderColor: 'rgba(246,242,234,0.28)', color: IVORY }}
            >
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={mode === 'booking' ? onFinish : onClose}
          className="mt-4 min-h-12 w-full rounded-full px-6 text-xs font-semibold transition-opacity hover:opacity-85"
          style={{ background: GOLD, color: NIGHT }}
        >
          {mode === 'booking' ? 'Przejdź do moich wizyt' : 'Zamknij'}
        </button>
      </div>
    </motion.div>
  );
}
