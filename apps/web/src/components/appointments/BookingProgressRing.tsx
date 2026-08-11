import { motion } from 'framer-motion';

const GOLD = '#C4965A';
const IVORY = '#F6F2EA';
const NIGHT = '#12291D';

const R = 46;
const CIRCUMFERENCE = 2 * Math.PI * R;

/**
 * Pełnoekranowe koło ładowania między kliknięciem "Potwierdź" a przebiegiem wizyty.
 * `done` domyka pierścień i rysuje ptaszka — to samo koło, bez przeskoku.
 */
export function BookingProgressRing({ done = false }: { done?: boolean }) {
  return (
    <motion.div
      className="fixed inset-0 z-[95] flex flex-col items-center justify-center gap-7"
      style={{ background: NIGHT }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      role="status"
      aria-live="polite"
    >
      <div className="relative h-[120px] w-[120px]">
        <svg viewBox="0 0 120 120" className="h-full w-full">
          <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(246,242,234,0.14)" strokeWidth="3" />

          {/* Łuk kręci się w kółko, dopóki trwa zapis. */}
          {!done && (
            <motion.circle
              cx="60" cy="60" r={R}
              fill="none" stroke={GOLD} strokeWidth="3" strokeLinecap="round"
              strokeDasharray={`${CIRCUMFERENCE * 0.28} ${CIRCUMFERENCE}`}
              style={{ transformOrigin: '60px 60px' }}
              animate={{ rotate: 360 }}
              transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
            />
          )}

          {/* Po zapisie pierścień domyka się w jednym ruchu. */}
          {done && (
            <motion.circle
              cx="60" cy="60" r={R}
              fill="none" stroke={GOLD} strokeWidth="3" strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              style={{ transformOrigin: '60px 60px', rotate: -90 }}
              initial={{ strokeDashoffset: CIRCUMFERENCE }}
              animate={{ strokeDashoffset: 0 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
            />
          )}

          {done && (
            <motion.path
              d="M42 61 L54 73 L79 48"
              fill="none"
              stroke={IVORY}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.42, ease: 'easeOut' }}
            />
          )}
        </svg>

        {!done && (
          <motion.span
            aria-hidden="true"
            className="absolute inset-0 rounded-full"
            style={{ border: `1px solid ${GOLD}` }}
            animate={{ scale: [1, 1.18], opacity: [0.35, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
      </div>

      <div className="px-8 text-center">
        <motion.p
          key={done ? 'done' : 'loading'}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-heading text-xl font-bold"
          style={{ color: IVORY }}
        >
          {done ? 'Termin zapisany' : 'Rezerwujemy Twój termin'}
        </motion.p>
        <p className="mt-1.5 text-sm" style={{ color: 'rgba(246,242,234,0.6)' }}>
          {done ? 'Za chwilę pokażemy, co dalej.' : 'To potrwa moment.'}
        </p>
      </div>
    </motion.div>
  );
}
