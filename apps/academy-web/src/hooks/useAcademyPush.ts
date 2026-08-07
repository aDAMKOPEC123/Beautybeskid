import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/axios';

/**
 * Subskrypcja powiadomień push kursantki. Nie pytamy o zgodę przy wejściu —
 * przeglądarki karzą za prośby bez kontekstu, a odmowa jest nieodwracalna
 * bez grzebania w ustawieniach. Prośba wychodzi dopiero z jawnego kliknięcia.
 */

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(normalized);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

export type PushState = 'unsupported' | 'default' | 'granted' | 'denied';

export function useAcademyPush(enabled: boolean) {
  const [state, setState] = useState<PushState>('unsupported');
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  const supported = typeof window !== 'undefined'
    && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

  useEffect(() => {
    if (!enabled || !supported) return;
    setState(Notification.permission as PushState);
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setSubscribed(Boolean(subscription)))
      .catch(() => undefined);
  }, [enabled, supported]);

  const subscribe = useCallback(async () => {
    if (!supported) return;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      setState(permission as PushState);
      if (permission !== 'granted') return;

      const { data } = await api.get('/academy/push/vapid-key');
      const publicKey = data?.data?.publicKey;
      if (!publicKey) return;

      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await api.post('/academy/push/subscribe', subscription.toJSON());
      setSubscribed(true);
    } catch {
      setSubscribed(false);
    } finally {
      setBusy(false);
    }
  }, [supported]);

  const unsubscribe = useCallback(async () => {
    if (!supported) return;
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await api.delete('/academy/push/unsubscribe', { data: { endpoint: subscription.endpoint } }).catch(() => undefined);
        await subscription.unsubscribe();
      }
      setSubscribed(false);
    } finally {
      setBusy(false);
    }
  }, [supported]);

  return { supported, state, subscribed, busy, subscribe, unsubscribe };
}
