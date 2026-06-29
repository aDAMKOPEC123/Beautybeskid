import { useRef, useEffect } from 'react';
import { Outlet, useLocation, ScrollRestoration } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { FloatingBookingCTA } from '@/components/ui/FloatingBookingCTA';
import { PwaInstallButton } from '@/components/PwaInstallButton';
import { CookieBanner } from '@/components/CookieBanner';

export const PublicLayout = () => {
  const location = useLocation();
  const isFirstRender = useRef(true);
  useEffect(() => { isFirstRender.current = false; }, []);

  return (
    <div className="min-h-screen flex flex-col bg-ivory overflow-x-hidden">
      <Navbar />
      <main
        key={location.pathname}
        className="flex-1 pt-[72px] animate-[fade-in_0.35s_ease-out]"
      >
        <Outlet />
      </main>
      <Footer />
      <FloatingBookingCTA />
      <PwaInstallButton />
      <CookieBanner />
      <ScrollRestoration />
    </div>
  );
};
