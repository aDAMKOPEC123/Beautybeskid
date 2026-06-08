import type { ReactNode } from 'react';

interface SectionGroupProps {
  title: string;
  color: 'green' | 'mint' | 'caramel';
  children: ReactNode;
}

const tokens = {
  green: {
    dot: '#1A3828',
    titleColor: 'rgba(26,56,40,0.5)',
    headBg: 'rgba(232,243,234,0.8)',
    border: 'rgba(26,56,40,0.08)',
  },
  mint: {
    dot: '#3D7A54',
    titleColor: '#3D7A54',
    headBg: 'rgba(61,122,84,0.06)',
    border: 'rgba(61,122,84,0.1)',
  },
  caramel: {
    dot: '#C4965A',
    titleColor: '#C4965A',
    headBg: 'rgba(196,150,90,0.06)',
    border: 'rgba(196,150,90,0.15)',
  },
};

export function SectionGroup({ title, color, children }: SectionGroupProps) {
  const t = tokens[color];
  return (
    <div style={{ borderRadius: 18, border: `1.5px solid ${t.border}`, background: '#fff', overflow: 'hidden' }}>
      <div style={{ background: t.headBg, padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 7 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: t.dot, flexShrink: 0 }} />
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: t.titleColor }}>
          {title}
        </span>
      </div>
      <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
        {children}
      </div>
    </div>
  );
}
