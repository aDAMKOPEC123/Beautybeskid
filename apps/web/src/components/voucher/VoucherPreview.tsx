import React from 'react';

type Props = {
  type: 'SERVICE' | 'CASH';
  serviceName?: string;
  amount?: number;
  recipientName?: string;
  senderName?: string;
  message?: string;
  validUntil?: string;
  code?: string;
};

export const VoucherPreview: React.FC<Props> = ({
  type,
  serviceName,
  amount,
  recipientName,
  senderName,
  message,
  validUntil,
  code = 'VCH-????-????',
}) => {
  const toFrom = [
    recipientName ? `Dla: ${recipientName}` : null,
    senderName ? `Od: ${senderName}` : null,
  ].filter(Boolean).join('  ·  ');

  const dateStr = validUntil
    ? new Date(validUntil).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—';

  return (
    <div
      className="w-full overflow-hidden rounded-lg shadow-xl"
      style={{ aspectRatio: '210/148', display: 'flex', fontSize: '12px' }}
    >
      {/* Left panel — Ivory */}
      <div
        className="flex flex-col justify-between"
        style={{
          width: '62%',
          background: '#F4F9F5',
          padding: '7% 7% 6%',
          boxSizing: 'border-box',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative circle */}
        <div style={{
          position: 'absolute', top: '-15%', left: '-8%',
          width: '35%', height: 0, paddingBottom: '35%',
          borderRadius: '50%', background: '#E8F3EA',
        }} />

        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: '0.6em', fontWeight: 700, letterSpacing: '0.18em', color: '#3D7A54', textTransform: 'uppercase' }}>
            BeskidStudio
          </div>
          <div style={{ fontSize: '0.5em', color: '#5A7A62', letterSpacing: '0.05em', marginTop: '1px' }}>
            BeskidStudio By Wiktoria Ćwik
          </div>
          <hr style={{ border: 'none', borderTop: '0.5px solid #C8E0CC', margin: '5% 0 4%' }} />
          <div style={{ fontSize: '0.52em', fontWeight: 700, letterSpacing: '0.18em', color: '#C4965A', textTransform: 'uppercase' }}>
            Voucher Prezentowy
          </div>
          {toFrom && (
            <div style={{ fontSize: '0.5em', color: '#C4965A', marginTop: '1px' }}>{toFrom}</div>
          )}
        </div>

        <div>
          {type === 'SERVICE' ? (
            <>
              <div style={{ fontSize: '1.1em', fontWeight: 700, color: '#1A3828', lineHeight: 1.2 }}>
                {serviceName || <span style={{ color: '#aaa' }}>— wybierz usługę —</span>}
              </div>
              <div style={{ fontSize: '0.65em', fontWeight: 700, color: '#3D7A54', letterSpacing: '0.2em', marginTop: '2px' }}>
                GRATIS
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: '1.5em', fontWeight: 700, color: '#1A3828' }}>
                {amount ? `${amount} zł` : <span style={{ color: '#aaa' }}>— kwota —</span>}
              </div>
              <div style={{ fontSize: '0.55em', color: '#5A7A62', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Voucher Gotówkowy
              </div>
            </>
          )}
          {message && (
            <div style={{ fontSize: '0.5em', color: '#5A7A62', fontStyle: 'italic', marginTop: '3px' }}>
              &ldquo;{message.slice(0, 60)}{message.length > 60 ? '…' : ''}&rdquo;
            </div>
          )}
        </div>

        <div>
          <div style={{ fontSize: '0.48em', fontWeight: 700, letterSpacing: '0.15em', color: '#5A7A62', textTransform: 'uppercase', marginBottom: '2px' }}>
            Kod realizacji
          </div>
          <div style={{
            display: 'inline-block',
            background: '#E8F3EA',
            border: '0.5px solid #B5D8BB',
            borderRadius: '3px',
            padding: '2px 6px',
            fontFamily: 'monospace',
            fontSize: '0.65em',
            fontWeight: 700,
            letterSpacing: '0.12em',
            color: '#1A3828',
          }}>
            {code}
          </div>
          <div style={{ fontSize: '0.45em', color: '#5A7A62', marginTop: '2px' }}>
            Ważny do: {dateStr}
          </div>
        </div>
      </div>

      {/* Right panel — Forest Green */}
      <div
        className="flex flex-col items-center justify-center"
        style={{
          width: '38%',
          background: '#2A5C3E',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{
          position: 'absolute', inset: 0,
          background: 'repeating-linear-gradient(45deg, rgba(196,150,90,0.03) 0, rgba(196,150,90,0.03) 1px, transparent 0, transparent 50%)',
          backgroundSize: '14px 14px',
        }} />
        <div style={{ textAlign: 'center', position: 'relative', zIndex: 1, padding: '0 8%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Decorative dot-dash row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
            <div style={{ width: '14px', height: '0.5px', background: 'rgba(196,150,90,0.45)' }} />
            <div style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#C4965A', opacity: 0.75 }} />
            <div style={{ width: '14px', height: '0.5px', background: 'rgba(196,150,90,0.45)' }} />
          </div>
          {/* Monogram circle */}
          <div style={{
            width: '42px', height: '42px', borderRadius: '50%',
            border: '1px solid rgba(196,150,90,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(196,150,90,0.08)',
            marginBottom: '7px',
          }}>
            <span style={{ fontSize: '0.95em', fontWeight: 800, color: '#C4965A', letterSpacing: '0.02em' }}>BS</span>
          </div>
          {/* Studio name */}
          <div style={{ fontSize: '0.48em', fontWeight: 700, letterSpacing: '0.22em', color: '#F4F9F5', textTransform: 'uppercase', lineHeight: 1.45 }}>
            Beskid<br />Studio
          </div>
          <div style={{ fontSize: '0.35em', color: 'rgba(196,150,90,0.88)', marginTop: '3px', fontStyle: 'italic', letterSpacing: '0.04em' }}>
            by Wiktoria Ćwik
          </div>
          <div style={{ width: '28px', height: '0.5px', background: 'rgba(196,150,90,0.35)', margin: '7px auto 5px' }} />
          <div style={{ fontSize: '0.32em', color: 'rgba(244,249,245,0.3)', letterSpacing: '0.04em', wordBreak: 'break-all' }}>
            kosmetologwiktoriacwik.pl
          </div>
        </div>
      </div>
    </div>
  );
};
