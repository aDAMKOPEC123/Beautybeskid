import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { CheckCircle2, RotateCcw } from 'lucide-react';

interface Props {
  appointment: any;
}

export const LastVisitCard = ({ appointment }: Props) => {
  if (!appointment) return null;

  const date = new Date(appointment.date);
  const dateLabel = format(date, 'd MMMM yyyy', { locale: pl });

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.06)',
        borderRadius: '18px',
        overflow: 'hidden',
      }}
    >
      {/* Top accent strip */}
      <div style={{ height: '3px', background: 'linear-gradient(90deg, #1A3828, #C4965A)' }} />

      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
            background: 'rgba(26,56,40,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CheckCircle2 size={17} style={{ color: '#1A3828' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '11px', color: 'rgba(20,40,28,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '2px' }}>
              Ostatnia wizyta
            </p>
            <p style={{ fontSize: '15px', fontWeight: 700, color: '#1A3828', lineHeight: 1.2, marginBottom: '2px' }}>
              {appointment.service?.name ?? 'Wizyta'}
            </p>
            <p style={{ fontSize: '12px', color: 'rgba(20,40,28,0.45)' }}>
              {dateLabel}{appointment.employee?.name ? ` · ${appointment.employee.name}` : ''}
            </p>
          </div>
        </div>

        <div style={{ marginTop: '14px', display: 'flex', gap: '8px' }}>
          <Link
            to="/rezerwacja"
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              padding: '10px 0', borderRadius: '100px',
              background: '#1A3828', color: '#fff',
              fontSize: '13px', fontWeight: 600, textDecoration: 'none',
            }}
          >
            <RotateCcw size={13} />
            Umów znowu
          </Link>
        </div>
      </div>
    </div>
  );
};
