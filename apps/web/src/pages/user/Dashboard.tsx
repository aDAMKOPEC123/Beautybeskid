// filepath: apps/web/src/pages/user/Dashboard.tsx
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { appointmentsApi } from '@/api/appointments.api';
import { DashboardSkeleton } from '@/components/skeletons';
import { RecommendedSlider } from '@/components/dashboard/RecommendedSlider';
import { PendingReviews } from '@/components/reviews/PendingReviews';
import { ReminderCards } from '@/components/reminders/ReminderCards';
import { DashboardNewsBanner } from '@/components/dashboard/DashboardNewsBanner';
import { DecoLine } from '@/components/shared/DecoElements';
import { SkinWeatherWidget } from '@/components/dashboard/SkinWeatherWidget';
import { NextAppointmentHero } from '@/components/dashboard/NextAppointmentHero';
import { LastVisitCard } from '@/components/dashboard/LastVisitCard';
import { JournalPreviewCard } from '@/components/dashboard/JournalPreviewCard';
import { HomecarePreviewCard } from '@/components/dashboard/HomecarePreviewCard';
import { SectionGroup } from '@/components/dashboard/SectionGroup';

export const UserDashboard = () => {
  const { user } = useAuth();

  const { data: appointments = [], isLoading } = useQuery<any[]>({
    queryKey: ['appointments', 'me'],
    queryFn: appointmentsApi.getMy,
  });


  const upcoming = appointments.filter(
    (a: any) => a.status === 'PENDING' || a.status === 'CONFIRMED',
  );

  const lastCompleted = appointments.find((a: any) => a.status === 'COMPLETED') ?? null;

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-3 animate-enter">

      {/* Header */}
      <div>
        <DecoLine width={40} className="mb-3" />
        <h1 className="text-2xl font-heading font-bold" style={{ color: '#1A3828' }}>
          Cześć, {user?.name?.split(' ')[0]}!
        </h1>
        <p className="text-[13px] mt-0.5" style={{ color: 'rgba(20,40,28,0.5)' }}>
          {new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* News banner */}
      <DashboardNewsBanner />


      {/* Hero — next appointment */}
      <NextAppointmentHero upcoming={upcoming} />

      {/* Historia wizyt */}
      <SectionGroup
        title="Historia wizyt"
        color="green"
        tiles={[
          { key: 'last-visit', content: <LastVisitCard appointment={lastCompleted} /> },
          { key: 'reviews', content: <PendingReviews /> },
        ]}
      />

      {/* Pielęgnacja skóry */}
      <SectionGroup
        title="Pielęgnacja skóry"
        color="mint"
        tiles={[
          { key: 'weather', content: <SkinWeatherWidget /> },
          { key: 'homecare', content: <HomecarePreviewCard /> },
          { key: 'reminders', content: <ReminderCards /> },
          { key: 'journal', content: <JournalPreviewCard /> },
        ]}
      />

      {/* Dla Ciebie */}
      <SectionGroup
        title="Dla Ciebie"
        color="caramel"
        tiles={[
          { key: 'recommended', content: <RecommendedSlider /> },
          {
            key: 'ambassador',
            content: (
              <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '10px',
                    background: 'rgba(26,56,40,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Users size={16} style={{ color: '#1A3828' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '11px', color: 'rgba(20,40,28,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '2px' }}>
                      Kod ambasadorski
                    </p>
                    <p style={{ fontFamily: 'monospace', fontSize: '18px', fontWeight: 700, letterSpacing: '0.18em', color: '#C4965A' }}>
                      {user?.ambassadorCode ?? '—'}
                    </p>
                  </div>
                </div>
                <p style={{ fontSize: '12px', color: 'rgba(20,40,28,0.5)', lineHeight: 1.55, marginBottom: '10px' }}>
                  Udostępnij znajomym — przy rejestracji otrzymają kod rabatowy.
                </p>
                <p style={{ fontSize: '12px', color: 'rgba(20,40,28,0.65)' }}>
                  Zaproszono: <span style={{ fontWeight: 700, color: '#1A3828' }}>{user?.referralCount ?? 0}</span> osób
                </p>
              </div>
            ),
          },
        ]}
      />

    </div>
  );
};
