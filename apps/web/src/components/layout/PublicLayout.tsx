import { lazy, Suspense, useRef, useEffect, useState } from 'react';
import { Outlet, useLocation, ScrollRestoration } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { FloatingBookingCTA } from '@/components/ui/FloatingBookingCTA';
import { CookieBanner } from '@/components/CookieBanner';

const PwaInstallButton = lazy(() =>
  import('@/components/PwaInstallButton').then((module) => ({ default: module.PwaInstallButton })),
);

const DeferredPwaInstallButton = () => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), 1_500);
    return () => window.clearTimeout(id);
  }, []);

  return ready ? (
    <Suspense fallback={null}>
      <PwaInstallButton />
    </Suspense>
  ) : null;
};

export const PublicLayout = () => {
  const location = useLocation();
  const isFirstRender = useRef(true);
  useEffect(() => { isFirstRender.current = false; }, []);

  return (
    <div className="public-site min-h-screen flex flex-col bg-ivory overflow-x-hidden">
      <Navbar />
      <main
        key={location.pathname}
        className="flex-1 animate-[fade-in_0.35s_ease-out]"
        style={{ paddingTop: 'calc(72px + env(safe-area-inset-top))' }}
      >
        <Outlet />
      </main>
      <Footer />
      <FloatingBookingCTA />
      <DeferredPwaInstallButton />
      <CookieBanner />
      <ScrollRestoration />
    </div>
  );
};
