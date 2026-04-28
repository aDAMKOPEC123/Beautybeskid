// filepath: apps/web/src/components/loyalty/LoyaltyBadge.tsx
import { Crown } from 'lucide-react';

const TIER_CONFIG = {
  BRONZE: { bg: 'rgba(180,120,60,0.15)', color: '#92400E', name: 'Brąz' },
  SILVER: { bg: 'rgba(100,116,139,0.12)', color: '#475569', name: 'Srebro' },
  GOLD: { bg: 'rgba(196,150,90,0.2)', color: '#C4965A', name: 'Złoto' },
};

export const LoyaltyBadge = ({ tier }: { tier: 'BRONZE' | 'SILVER' | 'GOLD' }) => {
  const config = TIER_CONFIG[tier] ?? TIER_CONFIG.BRONZE;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
      style={{ background: config.bg, color: config.color }}
    >
      <Crown size={13} />
      {config.name}
    </span>
  );
};
