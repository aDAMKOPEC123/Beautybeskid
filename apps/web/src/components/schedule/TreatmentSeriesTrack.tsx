import { Check } from 'lucide-react';
import type { SeriesReminder } from '@/api/reminders.api';

type Props = {
  series: SeriesReminder;
  onBook: (href: string) => void;
};

const buildBookingHref = (series: SeriesReminder) => {
  const params = new URLSearchParams({ serviceId: series.bookingTarget.serviceId });
  if (series.bookingTarget.seriesId) params.set('seriesId', series.bookingTarget.seriesId);
  return `/rezerwacja?${params.toString()}`;
};

export const TreatmentSeriesTrack = ({ series, onBook }: Props) => {
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex items-end min-w-max gap-0">
        {series.steps.map((step, index) => {
          const isCompleted = step.status === 'completed';
          const isScheduled = step.status === 'scheduled';
          const isDue = step.status === 'due';
          const isLast = index === series.steps.length - 1;
          const nextStep = series.steps[index + 1];
          const lineIsGold = isCompleted && nextStep?.status === 'completed';

          let circleStyle: React.CSSProperties;
          if (isCompleted) {
            circleStyle = {
              background: '#C4965A',
              border: '2px solid #C4965A',
            };
          } else if (isScheduled) {
            circleStyle = {
              background: '#fff',
              border: '2px solid #C4965A',
            };
          } else if (isDue) {
            circleStyle = {
              background: '#fff',
              border: '2px solid #DC2626',
            };
          } else {
            circleStyle = {
              background: 'rgba(0,0,0,0.06)',
              border: '2px solid rgba(0,0,0,0.15)',
            };
          }

          return (
            <div key={step.step} className="flex items-end">
              <div className="flex flex-col items-center gap-1">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={circleStyle}
                >
                  {isCompleted && (
                    <Check size={14} color="#fff" strokeWidth={3} />
                  )}
                  {isScheduled && (
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#C4965A', display: 'block' }} />
                  )}
                  {isDue && (
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#DC2626', display: 'block' }} />
                  )}
                </div>

                <span
                  className="text-xs font-semibold"
                  style={{ color: isDue ? '#DC2626' : isCompleted || isScheduled ? '#C4965A' : 'rgba(0,0,0,0.3)' }}
                >
                  {step.step}
                </span>

                {isDue ? (
                  <button
                    onClick={() => onBook(buildBookingHref(series))}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: '#DC2626', color: '#fff', whiteSpace: 'nowrap' }}
                  >
                    Umow
                  </button>
                ) : (
                  <span className="text-[10px]" style={{ color: 'transparent', userSelect: 'none' }}>
                    &nbsp;
                  </span>
                )}
              </div>

              {!isLast && (
                <div
                  className="h-0.5 flex-shrink-0"
                  style={{
                    width: 32,
                    background: lineIsGold ? '#C4965A' : 'rgba(0,0,0,0.12)',
                    marginBottom: 28,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
