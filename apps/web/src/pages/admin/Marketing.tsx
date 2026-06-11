import { useState } from 'react';
import { MarketingTabs } from '@/components/marketing/MarketingTabs';
import { MarketingKalendar } from './marketing/MarketingKalendar';
import { MarketingRolki } from './marketing/MarketingRolki';

const AVAILABLE_TABS = ['kalendarz', 'rolki'];

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

      {!AVAILABLE_TABS.includes(activeTab) && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-4xl mb-4">🚧</div>
          <h3 className="text-lg font-semibold mb-2">Wkrotce</h3>
          <p className="text-muted-foreground text-sm">Ta sekcja jest w trakcie budowy.</p>
        </div>
      )}
    </div>
  );
};
