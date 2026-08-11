import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

const SALON_ADDRESS = 'Mordarka 505, 34-600 Mordarka';

const ACTS = [
  {
    when: 'Teraz',
    title: 'Twoja wizyta czeka na potwierdzenie',
    body: 'Salon sprawdza wybrany termin. Dostaniesz powiadomienie, gdy tylko go potwierdzi — nie musisz nic robić.',
  },
  {
    when: 'W dniu wizyty',
    title: 'Dojedź na miejsce',
    body: `${SALON_ADDRESS}. Przyjedź kilka minut wcześniej, żeby spokojnie zacząć.`,
  },
  {
    when: 'Po wizycie',
    title: 'Ciesz się efektem',
    body: 'Zgarniesz punkty lojalnościowe, a kolejny termin umówisz jednym kliknięciem.',
  },
] as const;

const ACT_MS = 3400;
const OUTRO_MS = 1600;

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
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  // With reduced motion the whole route is shown at once and the client decides when to move on.
  useEffect(() => {
    if (reduceMotion) return;
    if (act < ACTS.length - 1) {
      const timer = window.setTimeout(() => setAct((current) => current + 1), ACT_MS);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => onFinishRef.current(), OUTRO_MS + ACT_MS);
    return () => window.clearTimeout(timer);
  }, [act, reduceMotion]);

  return (
    <div
      className="fixed inset-0 z-[90] overflow-y-auto"
      style={{ background: '#12291D' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-journey-title"
    >
      <div className="mx-auto flex min-h-full w-full max-w-lg flex-col px-6 py-10 sm:py-14">
        <motion.p
          initial={reduceMotion ? false : { opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[10px] font-bold uppercase tracking-[0.22em]"
          style={{ color: '#C4965A' }}
        >
          Rezerwacja przyjęta
        </motion.p>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="mt-4 rounded-2xl px-4 py-3.5"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(196,150,90,0.28)' }}
        >
          <p className="font-heading text-lg font-bold" style={{ color: '#F6F2EA' }}>
            {serviceName}
          </p>
          <p className="mt-0.5 text-sm capitalize" style={{ color: 'rgba(246,242,234,0.72)' }}>
            {format(date, 'EEEE, d MMMM', { locale: pl })}, {format(date, 'HH:mm')}
            {employeeName ? ` · ${employeeName}` : ''}
          </p>
        </motion.div>

        {/* Droga wizyty — the line draws itself forward as the story advances. */}
        <ol className="relative mt-9 flex-1">
          <span
            aria-hidden="true"
            className="absolute left-[7px] top-2 bottom-2 w-px"
            style={{ background: 'rgba(246,242,234,0.16)' }}
          />
          <motion.span
            aria-hidden="true"
            className="absolute left-[7px] top-2 w-px origin-top"
            style={{ background: '#C4965A', bottom: 8 }}
            initial={reduceMotion ? false : { scaleY: 0 }}
            animate={{ scaleY: reduceMotion ? 1 : (act + 1) / ACTS.length }}
            transition={{ duration: reduceMotion ? 0 : 0.7, ease: 'easeInOut' }}
          />

          {ACTS.map((step, index) => {
            const isActive = reduceMotion || index === act;
            const isPast = index < act;
            return (
              <li key={step.when} className="relative flex gap-4 pb-8 last:pb-0">
                <motion.span
                  className="relative z-10 mt-1.5 h-[15px] w-[15px] shrink-0 rounded-full"
                  style={{
                    background: isActive || isPast ? '#C4965A' : '#12291D',
                    border: `2px solid ${isActive || isPast ? '#C4965A' : 'rgba(246,242,234,0.28)'}`,
                  }}
                  animate={
                    reduceMotion || !isActive || isPast
                      ? { scale: 1 }
                      : { scale: [1, 1.35, 1] }
                  }
                  transition={{ duration: 1.6, repeat: isActive && !isPast && !reduceMotion ? Infinity : 0 }}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className="text-[10px] font-bold uppercase tracking-[0.18em]"
                    style={{ color: isActive ? '#C4965A' : 'rgba(246,242,234,0.42)' }}
                  >
                    {step.when}
                  </p>
                  <AnimatePresence mode="wait" initial={false}>
                    {isActive ? (
                      <motion.div
                        key="active"
                        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
                        transition={{ duration: 0.45, ease: 'easeOut' }}
                      >
                        <h2
                          id={index === act ? 'booking-journey-title' : undefined}
                          className="mt-1 font-heading text-[26px] font-bold leading-tight sm:text-3xl"
                          style={{ color: '#F6F2EA' }}
                        >
                          {step.title}
                        </h2>
                        <p className="mt-2 text-sm leading-6" style={{ color: 'rgba(246,242,234,0.74)' }}>
                          {step.body}
                        </p>
                      </motion.div>
                    ) : (
                      <motion.p
                        key="idle"
                        initial={false}
                        animate={{ opacity: 1 }}
                        className="mt-1 font-heading text-lg font-bold"
                        style={{ color: isPast ? 'rgba(246,242,234,0.55)' : 'rgba(246,242,234,0.34)' }}
                      >
                        {step.title}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-10 flex items-center gap-3">
          {!reduceMotion && (
            <div className="flex flex-1 gap-1.5" aria-hidden="true">
              {ACTS.map((step, index) => (
                <span
                  key={step.when}
                  className="h-[3px] flex-1 overflow-hidden rounded-full"
                  style={{ background: 'rgba(246,242,234,0.18)' }}
                >
                  <motion.span
                    className="block h-full origin-left"
                    style={{ background: '#C4965A' }}
                    initial={{ scaleX: index < act ? 1 : 0 }}
                    animate={{ scaleX: index <= act ? 1 : 0 }}
                    transition={{ duration: index === act ? ACT_MS / 1000 : 0, ease: 'linear' }}
                  />
                </span>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={onFinish}
            className="min-h-12 shrink-0 rounded-full px-6 text-xs font-semibold transition-opacity hover:opacity-85"
            style={{ background: '#C4965A', color: '#12291D' }}
          >
            Przejdź do moich wizyt
          </button>
        </div>
      </div>
    </div>
  );
}
