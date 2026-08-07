import { Bell, BellOff } from 'lucide-react';
import { useAcademyPush } from '@/hooks/useAcademyPush';

/**
 * Przełącznik powiadomień w profilu. Kursantka dostaje je w dwóch sytuacjach,
 * które sama zainicjowała: gdy prowadząca odpowie na jej pytanie i gdy
 * certyfikat jest gotowy. Nic marketingowego tym kanałem nie idzie.
 */
export function AcademyPushSettings() {
  const { supported, state, subscribed, busy, subscribe, unsubscribe } = useAcademyPush(true);
  if (!supported) return null;

  return (
    <section className="academy-push-settings">
      <div>
        <p className="academy-kicker text-caramel">Powiadomienia</p>
        <h2>Powiadomienia na urządzeniu</h2>
        <p className="academy-push-copy">
          Odezwiemy się, gdy prowadząca odpowie na Twoje pytanie i gdy certyfikat będzie gotowy do pobrania.
        </p>
      </div>

      {state === 'denied' ? (
        <p className="academy-push-blocked">
          Powiadomienia są zablokowane w ustawieniach przeglądarki dla tej strony. Odblokuj je tam, a potem wróć tutaj.
        </p>
      ) : subscribed ? (
        <button type="button" onClick={unsubscribe} disabled={busy} className="academy-push-off">
          <BellOff aria-hidden />{busy ? 'Chwila…' : 'Wyłącz powiadomienia'}
        </button>
      ) : (
        <button type="button" onClick={subscribe} disabled={busy} className="academy-push-on">
          <Bell aria-hidden />{busy ? 'Chwila…' : 'Włącz powiadomienia'}
        </button>
      )}
    </section>
  );
}
