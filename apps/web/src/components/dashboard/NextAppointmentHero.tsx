import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Calendar, Clock } from 'lucide-react';

interface Props {
  upcoming: any[];
}

export const NextAppointmentHero = ({ upcoming }: Props) => {
  const next = upcoming[0] ?? null;

  if (!next) {
    return (
      <Link
        to="/rezerwacja"
        style={{
          display: 'block',
          background: 'linear-gradient(145deg, #142A1E 0%, #1A3828 55%, #1E4030 100%)',
          borderRadius: '20px',
          padding: '24px 20px',
          position: 'relative',
          overflow: 'hidden',
          textDecoration: 'none',
        }}
      >
        {/* Decorative rings */}
        <span style={{ position:'absolute', top:-48, right:-48, width:160, height:160, borderRadius:'50%', border:'1px solid rgba(196,150,90,0.12)', pointerEvents:'none' }} />
        <span style={{ position:'absolute', top:-24, right:-24, width:100, height:100, borderRadius:'50%', border:'1px solid rgba(196,150,90,0.08)', pointerEvents:'none' }} />

        <p style={{ fontSize:'10px', color:'rgba(196,150,90,0.65)', letterSpacing:'0.18em', textTransform:'uppercase', marginBottom:'12px' }}>
          Twoje konto Cosmo
        </p>
        <p style={{ fontSize:'20px', fontWeight:700, color:'#fff', fontFamily:'var(--font-heading)', lineHeight:1.2, marginBottom:'8px' }}>
          Witaj w Cosmo 💚
        </p>
        <p style={{ fontSize:'13px', color:'rgba(255,255,255,0.5)', lineHeight:1.5, marginBottom:'20px' }}>
          Umów pierwszą wizytę i odkryj zabiegi dopasowane do Twoich potrzeb.
        </p>
        <span style={{
          display:'inline-flex', alignItems:'center', gap:'8px',
          background:'rgba(196,150,90,0.18)', borderRadius:'100px',
          padding:'10px 18px', fontSize:'13px', fontWeight:600, color:'#C4965A',
        }}>
          <span>+</span> Umów wizytę
        </span>
      </Link>
    );
  }

  const date = new Date(next.date);
  const dayLabel = format(date, 'EEEE, d MMMM', { locale: pl });
  const timeLabel = format(date, 'HH:mm', { locale: pl });
  const duration = next.service?.duration ?? null;

  return (
    <Link
      to="/user/wizyty"
      style={{
        display: 'block',
        background: 'linear-gradient(145deg, #142A1E 0%, #1A3828 55%, #1E4030 100%)',
        borderRadius: '20px',
        padding: '22px 20px',
        position: 'relative',
        overflow: 'hidden',
        textDecoration: 'none',
      }}
    >
      {/* Decorative rings */}
      <span style={{ position:'absolute', top:-48, right:-48, width:160, height:160, borderRadius:'50%', border:'1px solid rgba(196,150,90,0.12)', pointerEvents:'none' }} />
      <span style={{ position:'absolute', top:-24, right:-24, width:100, height:100, borderRadius:'50%', border:'1px solid rgba(196,150,90,0.08)', pointerEvents:'none' }} />
      {upcoming.length > 1 && (
        <span style={{
          position:'absolute', top:'18px', right:'18px',
          background:'rgba(196,150,90,0.18)', borderRadius:'100px',
          padding:'3px 8px', fontSize:'10px', color:'rgba(196,150,90,0.85)', fontWeight:600,
        }}>
          +{upcoming.length - 1} więcej
        </span>
      )}

      <p style={{ fontSize:'10px', color:'rgba(196,150,90,0.65)', letterSpacing:'0.18em', textTransform:'uppercase', marginBottom:'12px' }}>
        Twoja następna wizyta
      </p>

      <p style={{ fontSize:'21px', fontWeight:700, color:'#fff', fontFamily:'var(--font-heading)', lineHeight:1.2, marginBottom:'4px' }}>
        {next.service?.name ?? 'Wizyta'}
      </p>
      {next.employee?.name && (
        <p style={{ fontSize:'13px', color:'rgba(255,255,255,0.45)', marginBottom:'18px' }}>
          {next.employee.name}
        </p>
      )}

      <div style={{
        background:'rgba(255,255,255,0.07)',
        borderRadius:'12px',
        padding:'12px 14px',
        display:'flex',
        alignItems:'center',
        gap:'10px',
      }}>
        <Calendar size={15} style={{ color:'#C4965A', flexShrink:0 }} />
        <div style={{ flex:1 }}>
          <p style={{ fontSize:'14px', fontWeight:700, color:'#fff', lineHeight:1 }}>
            {dayLabel}
          </p>
          <p style={{ fontSize:'11px', color:'rgba(255,255,255,0.45)', marginTop:'3px' }}>
            {timeLabel}{duration ? ` · ${duration} min` : ''}
          </p>
        </div>
        <Clock size={13} style={{ color:'rgba(255,255,255,0.3)', flexShrink:0 }} />
      </div>
    </Link>
  );
};
