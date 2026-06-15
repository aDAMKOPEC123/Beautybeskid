import { useState } from 'react';
import { MarketingTabs } from '@/components/marketing/MarketingTabs';
import { MarketingKalendar } from './marketing/MarketingKalendar';
import { MarketingRolki } from './marketing/MarketingRolki';
import { MarketingKaruzele } from './marketing/MarketingKaruzele';
import { MarketingTrendy } from './marketing/MarketingTrendy';
import { MarketingOpisy } from './marketing/MarketingOpisy';
import { MarketingNagrania } from './marketing/MarketingNagrania';
import { MarketingKampanie } from './marketing/MarketingKampanie';
import { MarketingWyniki } from './marketing/MarketingWyniki';

export const Marketing = () => {
  const [activeTab, setActiveTab] = useState('kalendarz');

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-heading">Marketing</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Planowanie i zarzadzanie contentem social media
        </p>
      </div>

      <MarketingTabs active={activeTab} onChange={setActiveTab} />

      {activeTab === 'kalendarz' && <MarketingKalendar />}
      {activeTab === 'rolki' && <MarketingRolki />}
      {activeTab === 'karuzele' && <MarketingKaruzele />}
      {activeTab === 'trendy' && <MarketingTrendy />}
      {activeTab === 'opisy' && <MarketingOpisy />}
      {activeTab === 'nagrania' && <MarketingNagrania />}
      {activeTab === 'kampanie' && <MarketingKampanie />}
      {activeTab === 'wyniki' && <MarketingWyniki />}
    </div>
  );
};
