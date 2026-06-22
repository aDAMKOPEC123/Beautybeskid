import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { pushApi } from '@/api/push.api';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

function detectIOS(): boolean {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function detectStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

export const usePushSubscription = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const ios = detectIOS();
    const standalone = detectStandalone();
    setIsIOS(ios);
    setIsStandalone(standalone);

    if ('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setIsSubscribed(!!sub);
        });
      }).catch(() => {});
    }
  }, []);

  const subscribe = async () => {
    try {
      // iOS requires the app to be installed as PWA — push doesn't work in Safari browser
      if (isIOS && !isStandalone) {
        toast.info(
          'Na iPhone / iPad powiadomienia działają tylko po dodaniu aplikacji do ekranu głównego: Udostępnij → Dodaj do ekranu głównego',
          { duration: 7000 },
        );
        return;
      }

      // Explicitly request permission before subscribing — required on iOS 16.4+ and Android
      if (Notification.permission === 'default') {
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result !== 'granted') {
          toast.error('Nie udzielono zgody na powiadomienia — sprawdź ustawienia przeglądarki');
          return;
        }
      }

      if (Notification.permission === 'denied') {
        setPermission('denied');
        toast.error('Powiadomienia są zablokowane — odblokuj je w ustawieniach przeglądarki');
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const vapidKey = await pushApi.getVapidKey();
      if (!vapidKey) {
        toast.error('Powiadomienia push nie są skonfigurowane na serwerze');
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as BufferSource,
      });
      await pushApi.subscribe(sub.toJSON());
      setIsSubscribed(true);
      setPermission('granted');
      toast.success('Powiadomienia push włączone');
    } catch (err: any) {
      if (err?.name === 'NotAllowedError') {
        setPermission('denied');
        toast.error('Brak zgody na powiadomienia — sprawdź ustawienia przeglądarki');
      } else {
        console.error('[Push] subscribe error:', err);
        toast.error('Nie udało się włączyć powiadomień push');
      }
    }
  };

  const unsubscribe = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await pushApi.unsubscribe(sub.endpoint);
        await sub.unsubscribe();
      }
      setIsSubscribed(false);
      toast.success('Powiadomienia push wyłączone');
    } catch {
      toast.error('Nie udało się wyłączyć powiadomień push');
    }
  };

  return { permission, isSubscribed, isSupported, isIOS, isStandalone, subscribe, unsubscribe };
};
