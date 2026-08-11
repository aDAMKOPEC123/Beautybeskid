import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { ArrowLeft, ArrowRight } from 'lucide-react';

const SALON_ADDRESS = 'Mordarka 505, 34-600 Mordarka';

const GOLD = '#C4965A';
const IVORY = '#F6F2EA';
const NIGHT = '#12291D';

const ACTS = [
  {
    when: 'Teraz',
    title: 'Twoja wizyta czeka na potwierdzenie',
    body: 'Salon sprawdza wybrany termin. Dostaniesz powiadomienie, gdy tylko go potwierdzi — nie musisz nic robić.',
    scene: 'waiting',
  },
  {
    when: 'W dniu wizyty',
    title: 'Dojedź na miejsce',
    body: `${SALON_ADDRESS}. Przyjedź kilka minut wcześniej, żeby spokojnie zacząć.`,
    scene: 'route',
  },
  {
    when: 'Po wizycie',
    title: 'Ciesz się efektem',
    body: 'Zgarniesz punkty lojalnościowe, a kolejny termin umówisz jednym kliknięciem.',
    scene: 'reward',
  },
] as const;

const ACT_MS = 6200;
const OUTRO_MS = 3200;

// ─── Sceny — jedna na akt, każda pokazuje to, o czym mówi tekst ────────────────

function WaitingScene() {
  return (
    <svg viewBox="0 0 120 96" className="h-24 w-full" aria-hidden="true">
      {[0, 1, 2].map((ring) => (
        <motion.circle
          key={ring}
          cx="60"
          cy="48"
          r="16"
          fill="none"
          stroke={GOLD}
          strokeWidth="1"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: [0.6, 2.1], opacity: [0.55, 0] }}
          transition={{ duration: 3.4, repeat: Infinity, delay: ring * 1.1, ease: 'easeOut' }}
          style={{ transformOrigin: '60px 48px' }}
        />
      ))}
      <circle cx="60" cy="48" r="17" fill="none" stroke={GOLD} strokeWidth="1.5" opacity="0.9" />
      <motion.line
        x1="60"
        y1="48"
        x2="60"
        y2="38"
        stroke={GOLD}
        strokeWidth="2"
        strokeLinecap="round"
        style={{ transformOrigin: '60px 48px' }}
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      />
      <motion.line
        x1="60"
        y1="48"
        x2="60"
        y2="41"
        stroke={IVORY}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.75"
        style={{ transformOrigin: '60px 48px' }}
        animate={{ rotate: 360 }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'linear' }}
      />
    </svg>
  );
}

function RouteScene() {
  return (
    <svg viewBox="0 0 220 96" className="h-24 w-full" aria-hidden="true">
      <path
        d="M12 70 C 60 70, 70 34, 116 34 S 178 30, 200 30"
        fill="none"
        stroke="rgba(246,242,234,0.18)"
        strokeWidth="2"
        strokeDasharray="5 7"
        strokeLinecap="round"
      />
      <motion.path
        d="M12 70 C 60 70, 70 34, 116 34 S 178 30, 200 30"
        fill="none"
        stroke={GOLD}
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 3.2, ease: 'easeInOut' }}
      />
      {/* Kropka jedzie po trasie — proste klatki kluczowe, bez offset-path. */}
      <motion.circle
        r="4"
        fill={IVORY}
        initial={{ cx: 12, cy: 70 }}
        animate={{ cx: [12, 52, 90, 132, 172, 200], cy: [70, 64, 40, 33, 31, 30] }}
        transition={{ duration: 3.2, ease: 'easeInOut', times: [0, 0.22, 0.45, 0.68, 0.86, 1] }}
      />
      <motion.g
        initial={{ y: -18, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 2.9, type: 'spring', stiffness: 220, damping: 14 }}
      >
        <path
          d="M200 12 c -7 0 -12 5.4 -12 12 0 8.6 12 20 12 20 s 12 -11.4 12 -20 c 0 -6.6 -5 -12 -12 -12 z"
          fill={GOLD}
        />
        <circle cx="200" cy="24" r="4.4" fill={NIGHT} />
      </motion.g>
    </svg>
  );
}

function RewardScene() {
  const sparks = [
    { x: 44, delay: 0, size: 5 },
    { x: 72, delay: 0.5, size: 3.5 },
    { x: 100, delay: 0.2, size: 6 },
    { x: 128, delay: 0.8, size: 4 },
    { x: 156, delay: 0.35, size: 4.5 },
  ];
  return (
    <svg viewBox="0 0 200 96" className="h-24 w-full" aria-hidden="true">
      <motion.circle
        cx="100"
        cy="52"
        r="24"
        fill="none"
        stroke={GOLD}
        strokeWidth="1.5"
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.9 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        style={{ transformOrigin: '100px 52px' }}
      />
      <motion.text
        x="100"
        y="57"
        textAnchor="middle"
        fill={IVORY}
        style={{ fontSize: 13, fontWeight: 700 }}
        initial={{ opacity: 0, y: 63 }}
        animate={{ opacity: 1, y: 57 }}
        transition={{ delay: 0.35, duration: 0.6 }}
      >
        pkt
      </motion.text>
      {sparks.map((spark) => (
        <motion.rect
          key={spark.x}
          x={spark.x}
          y={78}
          width={spark.size}
          height={spark.size}
          fill={GOLD}
          initial={{ opacity: 0, y: 78, rotate: 45 }}
          animate={{ opacity: [0, 1, 0], y: [78, 14], rotate: 405 }}
          transition={{ duration: 3.6, repeat: Infinity, delay: spark.delay, ease: 'easeOut' }}
          style={{ transformOrigin: 'center' }}
        />
      ))}
    </svg>
  );
}

const SCENES = { waiting: WaitingScene, route: RouteScene, reward: RewardScene };

// ─── Ekran ────────────────────────────────────────────────────────────────────

export function BookingSuccessJourney({
  serviceName,
  date,
  employeeName,
  onFinish,
}: {
  serviceName: string;
  date: Date;
  employeeName?: string | null;
  onFinish: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const [act, setAct] = useState(0);
  // Any manual step takes the wheel — the story stops advancing on its own.
  const [manual, setManual] = useState(false);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  const isLast = act === ACTS.length - 1;

  useEffect(() => {
    if (reduceMotion || manual) return;
    if (!isLast) {
      const timer = window.setTimeout(() => setAct((current) => current + 1), ACT_MS);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => onFinishRef.current(), ACT_MS + OUTRO_MS);
    return () => window.clearTimeout(timer);
  }, [act, isLast, manual, reduceMotion]);

  const goTo = (next: number) => {
    setManual(true);
    setAct(Math.min(ACTS.length - 1, Math.max(0, next)));
  };

  const step = ACTS[act];
  const Scene = SCENES[step.scene];
  const words = step.title.split(' ');

  return (
    <div
      className="fixed inset-0 z-[90] overflow-y-auto"
      style={{ background: NIGHT }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-journey-title"
    >
      {/* Ambient — jedna powolna poświata, zmienia pozycję razem z aktem. */}
      {!reduceMotion && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          animate={{
            background: [
              `radial-gradient(60% 44% at 22% 24%, rgba(196,150,90,0.16), transparent 70%)`,
              `radial-gradient(60% 44% at 78% 62%, rgba(196,150,90,0.16), transparent 70%)`,
              `radial-gradient(60% 44% at 22% 24%, rgba(196,150,90,0.16), transparent 70%)`,
            ],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      <div className="relative mx-auto flex min-h-full w-full max-w-lg flex-col px-6 py-10 sm:py-14">
        <motion.p
          initial={reduceMotion ? false : { opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[10px] font-bold uppercase tracking-[0.22em]"
          style={{ color: GOLD }}
        >
          Rezerwacja przyjęta
        </motion.p>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.55, ease: 'easeOut' }}
          className="mt-4 rounded-2xl px-4 py-3.5"
          style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid rgba(196,150,90,0.28)` }}
        >
          <p className="font-heading text-lg font-bold" style={{ color: IVORY }}>
            {serviceName}
          </p>
          <p className="mt-0.5 text-sm capitalize" style={{ color: 'rgba(246,242,234,0.72)' }}>
            {format(date, 'EEEE, d MMMM', { locale: pl })}, {format(date, 'HH:mm')}
            {employeeName ? ` · ${employeeName}` : ''}
          </p>
        </motion.div>

        {!reduceMotion && (
          <div className="mt-7 h-24">
            <AnimatePresence mode="wait">
              <motion.div
                key={step.scene}
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.04 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
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
            animate={{ scaleY: reduceMotion ? 1 : (act + 1) / ACTS.length }}
            transition={{ duration: reduceMotion ? 0 : 0.9, ease: 'easeInOut' }}
          />

          {ACTS.map((entry, index) => {
            const isActive = reduceMotion || index === act;
            const isPast = index < act;
            return (
              <li key={entry.when} className="relative flex gap-4 pb-8 last:pb-0">
                <motion.span
                  className="relative z-10 mt-1.5 h-[15px] w-[15px] shrink-0 rounded-full"
                  style={{
                    background: isActive || isPast ? GOLD : NIGHT,
                    border: `2px solid ${isActive || isPast ? GOLD : 'rgba(246,242,234,0.28)'}`,
                    boxShadow: isActive && !isPast ? `0 0 0 6px rgba(196,150,90,0.14)` : 'none',
                  }}
                  animate={
                    reduceMotion || !isActive || isPast ? { scale: 1 } : { scale: [1, 1.35, 1] }
                  }
                  transition={{ duration: 2.2, repeat: isActive && !isPast && !reduceMotion ? Infinity : 0 }}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className="text-[10px] font-bold uppercase tracking-[0.18em]"
                    style={{ color: isActive ? GOLD : 'rgba(246,242,234,0.42)' }}
                  >
                    {entry.when}
                  </p>
                  <AnimatePresence mode="wait" initial={false}>
                    {isActive ? (
                      <motion.div key="active" exit={reduceMotion ? undefined : { opacity: 0, y: -10 }}>
                        <h2
                          id={index === act ? 'booking-journey-title' : undefined}
                          className="mt-1 font-heading text-[26px] font-bold leading-tight sm:text-3xl"
                          style={{ color: IVORY }}
                        >
                          {reduceMotion
                            ? entry.title
                            : words.length && index === act
                              ? words.map((word, wordIndex) => (
                                  <motion.span
                                    key={`${word}-${wordIndex}`}
                                    className="inline-block"
                                    initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
                                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                    transition={{ delay: 0.06 * wordIndex, duration: 0.5, ease: 'easeOut' }}
                                  >
                                    {word}&nbsp;
                                  </motion.span>
                                ))
                              : entry.title}
                        </h2>
                        <motion.p
                          className="mt-2 text-sm leading-6"
                          style={{ color: 'rgba(246,242,234,0.74)' }}
                          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.06 * words.length + 0.1, duration: 0.5 }}
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

        {!reduceMotion && (
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
              {ACTS.map((entry, index) => (
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
                      transition={{
                        duration: index === act && !manual ? ACT_MS / 1000 : 0.3,
                        ease: 'linear',
                      }}
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
          onClick={onFinish}
          className="mt-4 min-h-12 w-full rounded-full px-6 text-xs font-semibold transition-opacity hover:opacity-85"
          style={{ background: GOLD, color: NIGHT }}
        >
          Przejdź do moich wizyt
        </button>
      </div>
    </div>
  );
}
