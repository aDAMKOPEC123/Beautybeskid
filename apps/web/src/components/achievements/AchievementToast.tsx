// filepath: apps/web/src/components/achievements/AchievementToast.tsx
import { useEffect } from 'react';
import { toast } from 'sonner';
import { useSocket } from '@/hooks/useSocket';

export const useAchievementNotifications = () => {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleAchievement = (payload: { type: string; achievement: { name: string; icon: string; pointsBonus: number } }) => {
      const data = payload.achievement;
      // Trigger confetti
      import('canvas-confetti').then(({ default: confetti }) => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#C4965A', '#D99B68', '#E8BB94', '#3D7A54'],
        });
      }).catch(() => {});

      // Show toast
      toast(
        <div className="text-center">
          <div className="text-4xl mb-2">{data.icon}</div>
          <p className="font-heading font-bold" style={{ color: '#C4965A' }}>
            Nowe odznaczenie!
          </p>
          <p className="text-sm" style={{ color: '#5A7A62' }}>
            "{data.name}"
          </p>
          {data.pointsBonus > 0 && (
            <span
              className="inline-block mt-2 text-xs font-semibold px-3 py-1 rounded-full"
              style={{ background: 'rgba(196,150,90,0.2)', color: '#C4965A' }}
            >
              +{data.pointsBonus} punktów bonusowych
            </span>
          )}
        </div>,
        { duration: 5000 }
      );
    };

    socket.on('notification:achievement' as any, handleAchievement);
    return () => {
      socket.off('notification:achievement' as any, handleAchievement);
    };
  }, [socket]);
};
