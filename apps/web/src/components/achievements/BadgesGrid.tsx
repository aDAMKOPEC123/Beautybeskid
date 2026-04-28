// filepath: apps/web/src/components/achievements/BadgesGrid.tsx
import { useQuery } from '@tanstack/react-query';
import { achievementsApi, Achievement } from '@/api/achievements.api';

export const BadgesGrid = () => {
  const { data: achievements, isLoading } = useQuery({
    queryKey: ['achievements'],
    queryFn: achievementsApi.getAll,
  });

  if (isLoading) return (
    <div className="grid grid-cols-4 gap-4">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div key={i} className="animate-pulse text-center p-4 rounded-2xl" style={{ background: 'rgba(232,243,234,0.5)' }}>
          <div className="w-14 h-14 rounded-full bg-[#E8F3EA] mx-auto mb-2" />
          <div className="h-3 w-16 rounded bg-[#E8F3EA] mx-auto mb-1" />
          <div className="h-2 w-20 rounded bg-[#E8F3EA] mx-auto" />
        </div>
      ))}
    </div>
  );

  if (!achievements) return null;

  const earned = achievements.filter((a) => a.earned).length;

  return (
    <div
      className="rounded-[20px] p-6"
      style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}
    >
      <h3 className="font-heading font-bold text-lg mb-1" style={{ color: '#1A3828' }}>
        Twoje odznaczenia
      </h3>
      <p className="text-sm mb-5" style={{ color: '#5A7A62' }}>
        Zdobyto {earned} z {achievements.length} odznaczeń
      </p>

      <div className="grid grid-cols-4 gap-3">
        {achievements.map((a) => (
          <BadgeItem key={a.id} achievement={a} />
        ))}
      </div>
    </div>
  );
};

const BadgeItem = ({ achievement }: { achievement: Achievement }) => {
  const { earned, progress } = achievement;

  return (
    <div
      className={`text-center p-3 rounded-2xl transition-transform hover:-translate-y-0.5 ${earned ? '' : 'opacity-40'}`}
      style={earned ? { background: 'rgba(196,150,90,0.08)' } : {}}
    >
      <div
        className="w-14 h-14 rounded-full mx-auto mb-2 flex items-center justify-center text-2xl"
        style={
          earned
            ? { background: 'linear-gradient(135deg, #C4965A, #D99B68)', boxShadow: '0 4px 12px rgba(196,150,90,0.3)' }
            : { background: '#E8F3EA' }
        }
      >
        {achievement.icon}
      </div>
      <p className="font-semibold text-xs" style={{ color: '#1A3828' }}>
        {achievement.name}
      </p>
      <p className="text-[11px] mt-0.5" style={{ color: '#5A7A62' }}>
        {achievement.description}
      </p>
      {earned && (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold mt-1" style={{ color: '#C4965A' }}>
          ✓ Zdobyto
        </span>
      )}
      {!earned && progress && progress.required > 0 && (
        <div className="mt-2">
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#E8F3EA' }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, (progress.current / progress.required) * 100)}%`,
                background: 'linear-gradient(90deg, #C4965A, #D99B68)',
              }}
            />
          </div>
          <p className="text-[10px] mt-1 text-right" style={{ color: '#5A7A62' }}>
            {progress.current}/{progress.required}
          </p>
        </div>
      )}
    </div>
  );
};
