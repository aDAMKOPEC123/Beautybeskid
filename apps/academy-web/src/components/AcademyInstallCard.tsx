import { Download, Share, X } from 'lucide-react';
import { useAcademyInstall } from '@/hooks/useAcademyInstall';
import { getBottomNavMetrics } from '@/components/AcademyBottomNav';

/**
 * Zachęta do instalacji. Siada nad dolnym paskiem, nie na nim, i znika na
 * 30 dni po odrzuceniu — jedna prośba, nie kampania.
 */
export function AcademyInstallCard() {
  const { available, platform, install, dismiss } = useAcademyInstall();
  if (!available) return null;

  const metrics = getBottomNavMetrics();

  return (
    <div className="academy-install" style={{ bottom: `calc(${metrics.contentHeight}px + 12px + env(safe-area-inset-bottom))` }} role="complementary" aria-label="Zainstaluj Akademię">
      <span className="academy-install-mark" aria-hidden><Download /></span>
      <div>
        <strong>Akademia na ekranie głównym</strong>
        {platform === 'ios'
          ? <p>Otwórz menu udostępniania <Share className="academy-install-inline" aria-label="Udostępnij" /> i wybierz „Do ekranu początkowego”.</p>
          : <p>Otwierasz jednym dotknięciem, bez szukania w przeglądarce.</p>}
      </div>
      {platform === 'android' && <button type="button" className="academy-install-cta" onClick={install}>Zainstaluj</button>}
      <button type="button" className="academy-install-close" onClick={dismiss} aria-label="Nie pokazuj tej propozycji"><X aria-hidden /></button>
    </div>
  );
}
