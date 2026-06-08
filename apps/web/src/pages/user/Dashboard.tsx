// filepath: apps/web/src/pages/user/Dashboard.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { appointmentsApi } from '@/api/appointments.api';
import { discountCodesApi } from '@/api/discount-codes.api';
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
  const [ambassadorOpen, setAmbassadorOpen] = useState(false);

  const { data: appointments = [], isLoading } = useQuery<any[]>({
    queryKey: ['appointments', 'me'],
    queryFn: appointmentsApi.getMy,
  });

  const { data: welcomeCoupon } = useQuery<any | null>({
    queryKey: ['discount-codes', 'welcome'],
    queryFn: discountCodesApi.getWelcomeCoupon,
    staleTime: 60_000,
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

      {/* Welcome coupon */}
      {welcomeCoupon && (
        <div
          style={{
            borderRadius: '18px',
            overflow: 'hidden',
            border: '1px solid rgba(196,150,90,0.2)',
            background: 'rgba(196,150,90,0.04)',
          }}
        >
          <div style={{ height: '2px', background: 'linear-gradient(90deg, #C4965A, #E8BC82)' }} />
          <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <p style={{ fontSize: '11px', color: 'rgba(20,40,28,0.45)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '2px' }}>
                Twój kod powitalny
              </p>
              <p style={{ fontFamily: 'monospace', fontSize: '18px', fontWeight: 700, letterSpacing: '0.2em', color: '#C4965A', marginBottom: '2px' }}>
                {welcomeCoupon.code}
              </p>
              <p style={{ fontSize: '11px', color: 'rgba(20,40,28,0.5)' }}>
                {welcomeCoupon.discountType === 'PERCENTAGE'
                  ? `${welcomeCoupon.discountValue}% zniżki`
                  : `${Number(welcomeCoupon.discountValue).toFixed(2)} zł zniżki`} · wpisz przy rezerwacji
              </p>
            </div>
            <Link
              to="/rezerwacja"
              style={{
                flexShrink: 0, padding: '9px 14px', borderRadius: '100px',
                background: '#1A3828', color: '#fff',
                fontSize: '12px', fontWeight: 600, textDecoration: 'none',
              }}
            >
              Użyj
            </Link>
          </div>
        </div>
      )}

      {/* Hero — next appointment */}
      <NextAppointmentHero upcoming={upcoming} />

      {/* Historia wizyt */}
      <SectionGroup title="Historia wizyt" color="green">
        <LastVisitCard appointment={lastCompleted} />
        <PendingReviews />
      </SectionGroup>

      {/* Pielęgnacja skóry */}
      <SectionGroup title="Pielęgnacja skóry" color="mint">
        <SkinWeatherWidget />
        <HomecarePreviewCard />
        <ReminderCards />
        <JournalPreviewCard />
      </SectionGroup>

      {/* Dla Ciebie */}
      <SectionGroup title="Dla Ciebie" color="caramel">
        <RecommendedSlider />
        <div
          style={{
            borderRadius: '14px',
            overflow: 'hidden',
            background: 'white',
            border: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          <button
            onClick={() => setAmbassadorOpen((v) => !v)}
            className="w-full flex items-center justify-between p-4 text-left transition-colors hover:bg-gray-50"
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                width: '32px', height: '32px', borderRadius: '9px',
                background: 'rgba(26,56,40,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Users size={15} style={{ color: '#1A3828' }} />
              </span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#1A3828' }}>
                Kod ambasadorski
              </span>
            </span>
            {ambassadorOpen
              ? <ChevronUp size={16} style={{ color: 'rgba(20,40,28,0.35)', flexShrink: 0 }} />
              : <ChevronDown size={16} style={{ color: 'rgba(20,40,28,0.35)', flexShrink: 0 }} />
            }
          </button>

          {ambassadorOpen && (
            <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
              <p style={{ fontFamily: 'monospace', fontSize: '22px', fontWeight: 700, letterSpacing: '0.2em', color: '#C4965A', marginTop: '14px', marginBottom: '4px' }}>
                {user?.ambassadorCode ?? '—'}
              </p>
              <p style={{ fontSize: '12px', color: 'rgba(20,40,28,0.5)', lineHeight: 1.5, marginBottom: '6px' }}>
                Udostępnij znajomym — przy rejestracji otrzymają kod rabatowy.
              </p>
              <p style={{ fontSize: '12px', color: 'rgba(20,40,28,0.65)' }}>
                Zaproszono:{' '}
                <span style={{ fontWeight: 700, color: '#1A3828' }}>{user?.referralCount ?? 0}</span> osób
              </p>
            </div>
          )}
        </div>
      </SectionGroup>

    </div>
  );
};
