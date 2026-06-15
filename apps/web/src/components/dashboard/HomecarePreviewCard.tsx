import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, ArrowRight } from 'lucide-react';
import { homecareApi } from '@/api/homecare.api';

type HomecareRoutineItem = {
  id: string;
  appointmentId: string;
  first48h: string;
  followingDays: string;
  products: string;
  sentAt: string;
  appointment: {
    id: string;
    date: string;
    service: { id: string; name: string };
  };
};

export const HomecarePreviewCard = () => {
  const { data: routines = [] } = useQuery<HomecareRoutineItem[]>({
    queryKey: ['homecare', 'my'],
    queryFn: homecareApi.getMy,
    staleTime: 60_000,
  });

  const active = routines[0] ?? null;
  if (!active) return null;

  const snippet = active.first48h || active.followingDays || '';
  const preview = snippet.length > 80 ? snippet.slice(0, 80).trimEnd() + '…' : snippet;

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(196,150,90,0.04) 0%, rgba(196,150,90,0.08) 100%)',
        border: '1px solid rgba(196,150,90,0.2)',
        borderRadius: '18px',
        padding: '16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
          background: 'rgba(196,150,90,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Sparkles size={17} style={{ color: '#C4965A' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '11px', color: 'rgba(20,40,28,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '2px' }}>
            Moja rutyna
          </p>
          <p style={{ fontSize: '14px', fontWeight: 700, color: '#1A3828', lineHeight: 1.2 }}>
            {active.appointment?.service?.name ?? 'Pielęgnacja domowa'}
          </p>
        </div>
      </div>

      {preview && (
        <p style={{ fontSize: '12px', color: 'rgba(20,40,28,0.55)', lineHeight: 1.55, marginBottom: '14px' }}>
          {preview}
        </p>
      )}

      <Link
        to="/user/rutyna"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          fontSize: '12px', fontWeight: 600, color: '#C4965A', textDecoration: 'none',
        }}
      >
        Pełna rutyna <ArrowRight size={12} />
      </Link>
    </div>
  );
};
