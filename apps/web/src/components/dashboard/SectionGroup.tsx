import type { ReactNode } from 'react';
import { TileCarousel, type TileData } from './TileCarousel';

interface SectionGroupProps {
  title: string;
  color: 'green' | 'mint' | 'caramel';
  children?: ReactNode;
  tiles?: TileData[];
}

const tokens = {
  green: {
    dot: '#1A3828',
    titleColor: 'rgba(26,56,40,0.5)',
    headBg: 'rgba(232,243,234,0.8)',
    border: 'rgba(26,56,40,0.22)',
  },
  mint: {
    dot: '#3D7A54',
    titleColor: '#3D7A54',
    headBg: 'rgba(61,122,84,0.06)',
    border: 'rgba(61,122,84,0.28)',
  },
  caramel: {
    dot: '#C4965A',
    titleColor: '#C4965A',
    headBg: 'rgba(196,150,90,0.06)',
    border: 'rgba(196,150,90,0.4)',
  },
};

export function SectionGroup({ title, color, children, tiles }: SectionGroupProps) {
  const t = tokens[color];
  const usesCarousel = tiles && tiles.length > 0;

  return (
    <div
      style={{
        borderRadius: 18,
        border: `1.5px solid ${t.border}`,
        background: '#fff',
        overflow: 'hidden',
      }}
    >
      {/* Nagłówek */}
      <div
        style={{
          background: t.headBg,
          padding: '11px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 7,
        }}
      >
        <div
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: t.dot,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: color === 'green' ? 'rgba(26,56,40,0.68)' : t.titleColor,
          }}
        >
          {title}
        </span>
      </div>

      {/* Treść */}
      {usesCarousel ? (
        <div style={{ padding: '12px' }}>
          <TileCarousel tiles={tiles!} />
        </div>
      ) : (
        <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
          {children}
        </div>
      )}
    </div>
  );
}
