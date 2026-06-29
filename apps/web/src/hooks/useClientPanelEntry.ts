import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useClientPanelTransitionStore, type ClientPanelTheme } from '@/store/clientPanelTransition.store';

const MOBILE_BREAKPOINT_QUERY = '(max-width: 767px)';
const MOBILE_NAVIGATION_DELAY_MS = 90;
const DESKTOP_NAVIGATION_DELAY_MS = 150;

type PanelEntryOptions = {
  closeMenu?: () => void;
};

type DocumentWithViewTransition = Document & {
  startViewTransition?: (updateCallback: () => void) => void;
};

export const useClientPanelEntry = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const shouldReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const { isAuthenticated, isAdmin, isEmployee } = useAuth();
  const start = useClientPanelTransitionStore((state) => state.start);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  return ({ closeMenu }: PanelEntryOptions = {}) => {
    const isMobile = window.matchMedia(MOBILE_BREAKPOINT_QUERY).matches;
    const navigationDelay = isMobile ? MOBILE_NAVIGATION_DELAY_MS : DESKTOP_NAVIGATION_DELAY_MS;
    const appPath = isAdmin ? '/admin' : isEmployee ? '/employee' : '/user';
    const destination = isAuthenticated ? appPath : '/auth/login';

    if (!isAuthenticated && location.pathname === '/auth/login') {
      closeMenu?.();
      return;
    }

    const theme: ClientPanelTheme = isAdmin ? 'admin' : isEmployee ? 'employee' : 'client';
    const label = isAdmin ? 'Panel admina' : isEmployee ? 'Panel pracownika' : 'Panel klienta';
    const subtitle = isAuthenticated
      ? isAdmin
        ? 'ustawienia, zespół i kalendarz'
        : isEmployee
          ? 'grafik, wizyty i wiadomości'
          : 'wizyty, konto i zalecenia'
      : 'logowanie, wizyty i Twoje konto';
    const navigationState = isAuthenticated
      ? undefined
      : {
          from: appPath,
          panelEntry: true,
          sourcePath: location.pathname + location.search,
        };

    closeMenu?.();
    timersRef.current.forEach((timer) => window.clearTimeout(timer));

    if (shouldReduce || isMobile) {
      navigate(destination, { state: navigationState });
      return;
    }

    start({ label, subtitle, theme });

    const navTimer = window.setTimeout(() => {
      const doc = document as DocumentWithViewTransition;
      const shouldUseNativeViewTransition = !isMobile && typeof doc.startViewTransition === 'function';

      if (shouldUseNativeViewTransition) {
        doc.startViewTransition(() => {
          navigate(destination, { state: navigationState });
        });
      } else {
        navigate(destination, { state: navigationState });
      }
    }, navigationDelay);

    timersRef.current = [navTimer];
  };
};
