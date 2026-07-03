// filepath: apps/web/src/pages/user/Dashboard.tsx
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Bell, CalendarDays, Star, Users, Share2, Copy } from 'lucide-react';
import { toast } from 'sonner';
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
import { useUserMenuBadges } from '@/hooks/useUserMenuBadges';

export const UserDashboard = () => {
  const { user } = useAuth();

  const handleAmbassadorShare = async () => {
    const code = user?.ambassadorCode;
    if (!code) return;
    const text = `Dołącz do BeskidStudio By Wiktoria Cwik z moim kodem polecenia: ${code}`;
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        // fall through to clipboard
      }
    }
    await navigator.clipboard.writeText(code);
    toast.success('Kod skopiowany do schowka!');
  };
  const { getBadgeCount } = useUserMenuBadges();

  const { data: appointments = [], isLoading } = useQuery<any[]>({
    queryKey: ['appointments', 'me'],
    queryFn: appointmentsApi.getMy,
  });


  const upcoming = appointments.filter(
    (a: any) => a.status === 'PENDING' || a.status === 'CONFIRMED',
  );

  const lastCompleted = appointments.find((a: any) => a.status === 'COMPLETED') ?? null;
  const notificationCount = getBadgeCount('/user/powiadomienia');

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-5 animate-enter">

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

      {/* Hero — next appointment */}
      <NextAppointmentHero upcoming={upcoming} />

      {/* Najważniejsze skróty */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3" aria-label="Najważniejsze informacje">
        {[
          {
            to: '/user/wizyty',
            icon: CalendarDays,
            label: 'Nadchodzące wizyty',
            shortLabel: 'Wizyty',
            value: upcoming.length,
          },
          {
            to: '/user/lojalnosc',
            icon: Star,
            label: 'Punkty lojalnościowe',
            shortLabel: 'Punkty',
            value: user?.loyaltyPoints ?? 0,
          },
          {
            to: '/user/powiadomienia',
            icon: Bell,
            label: 'Nowe powiadomienia',
            shortLabel: 'Nowe',
            value: notificationCount,
          },
        ].map(({ to, icon: Icon, label, shortLabel, value }) => (
          <Link
            key={to}
            to={to}
            className="group flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border bg-white px-2 py-3 text-center transition-all hover:-translate-y-0.5 hover:shadow-sm sm:min-h-20 sm:flex-row sm:justify-start sm:px-4 sm:text-left"
            style={{ borderColor: 'rgba(26,56,40,0.12)' }}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10" style={{ background: 'rgba(196,150,90,0.12)', color: '#A87538' }}>
              <Icon size={19} />
            </span>
            <span className="min-w-0">
              <strong className="block text-lg leading-none sm:text-xl" style={{ color: '#1A3828' }}>{value}</strong>
              <span className="mt-1 block text-xs sm:hidden" style={{ color: 'rgba(20,40,28,0.68)' }}>{shortLabel}</span>
              <span className="mt-1 hidden text-sm sm:block" style={{ color: 'rgba(20,40,28,0.66)' }}>{label}</span>
            </span>
          </Link>
        ))}
      </div>

      {/* Historia wizyt */}
      <SectionGroup
        title="Historia wizyt"
        color="green"
        tiles={[
          { key: 'last-visit', content: <LastVisitCard appointment={lastCompleted} /> },
          { key: 'reviews', content: <PendingReviews /> },
        ]}
      />

      {/* Aktualności są dodatkiem, nie głównym zadaniem użytkownika */}
      <DashboardNewsBanner />

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
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button
                    onClick={handleAmbassadorShare}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      background: '#1A3828', color: '#fff', borderRadius: '100px',
                      fontSize: '12px', fontWeight: 600, padding: '8px 12px', border: 'none', cursor: 'pointer',
                      minHeight: '36px',
                    }}
                  >
                    <Share2 size={13} />
                    Udostępnij
                  </button>
                  <button
                    onClick={async () => {
                      if (!user?.ambassadorCode) return;
                      await navigator.clipboard.writeText(user.ambassadorCode);
                      toast.success('Skopiowano!');
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '1px solid rgba(26,56,40,0.2)', borderRadius: '100px',
                      padding: '8px 12px', cursor: 'pointer', background: 'transparent', color: '#1A3828',
                      minHeight: '36px',
                    }}
                    title="Kopiuj kod"
                  >
                    <Copy size={13} />
                  </button>
                </div>
              </div>
            ),
          },
        ]}
      />

    </div>
  );
};
