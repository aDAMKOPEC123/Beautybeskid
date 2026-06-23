import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useReducedMotion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useClientPanelTransitionStore, type ClientPanelTheme } from '@/store/clientPanelTransition.store';

const NAVIGATION_DELAY_MS = 150;
const TRANSITION_RESET_MS = 960;

type PanelEntryOptions = {
  closeMenu?: () => void;
};

type DocumentWithViewTransition = Document & {
  startViewTransition?: (updateCallback: () => void) => void;
};

export const useClientPanelEntry = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const shouldReduce = useReducedMotion();
  const { isAuthenticated, isAdmin, isEmployee } = useAuth();
  const start = useClientPanelTransitionStore((state) => state.start);
  const finish = useClientPanelTransitionStore((state) => state.finish);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  return ({ closeMenu }: PanelEntryOptions = {}) => {
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

    if (shouldReduce) {
      navigate(destination, { state: navigationState });
      return;
    }

    start({ label, subtitle, theme });

    const navTimer = window.setTimeout(() => {
      const doc = document as DocumentWithViewTransition;
      if (typeof doc.startViewTransition === 'function') {
        doc.startViewTransition(() => {
          navigate(destination, { state: navigationState });
        });
      } else {
        navigate(destination, { state: navigationState });
      }
    }, NAVIGATION_DELAY_MS);

    const resetTimer = window.setTimeout(() => {
      finish();
    }, TRANSITION_RESET_MS);

    timersRef.current = [navTimer, resetTimer];
  };
};
