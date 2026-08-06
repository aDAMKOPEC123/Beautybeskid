import { useEffect, useRef } from 'react';

/**
 * Odsłania elementy `[data-reveal]` wewnątrz kontenera przy wejściu w viewport.
 * Bez biblioteki — jeden IntersectionObserver na sekcję, klasa `is-revealed`,
 * reszta w CSS. Przy `prefers-reduced-motion` odsłaniamy wszystko od razu.
 */
export const useReveal = <T extends HTMLElement = HTMLElement>() => {
  const ref = useRef<T>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const targets = root.querySelectorAll<HTMLElement>('[data-reveal]');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      targets.forEach((element) => element.classList.add('is-revealed'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    targets.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return ref;
};
