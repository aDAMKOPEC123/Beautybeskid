// apps/web/src/tours/cosmo-tour.ts
import { type DriveStep } from 'driver.js';
import { waitForElement } from './utils';

async function navigateTo(path: string) {
  const { router } = await import('@/router');
  await router.navigate(path);
}

/**
 * Builds the 9-step onboarding tour steps.
 * @param onTourEnd - called when the tour is finished or skipped (marks onboardingCompleted)
 */
export function buildTourSteps(_onTourEnd: () => void): DriveStep[] {
  return [
    // Step 1 — Welcome overlay (no element)
    {
      popover: {
        title: 'Witaj w BeskidStudio By Wiktoria Ćwik! 💆‍♀️',
        description: 'Pokażemy Ci jak działa aplikacja. Możesz pominąć tour w dowolnej chwili.',
        nextBtnText: 'Zaczynamy →',
        doneBtnText: 'Pomiń tour',
      },
    },

    // Step 2 — Sidebar booking button (UserLayout)
    {
      element: '[data-tour="sidebar-booking-btn"]',
      popover: {
        title: 'Rezerwacja wizyty',
        description: 'Kliknij tutaj, żeby zarezerwować wizytę. Możesz też przeglądać wszystkie nasze zabiegi w zakładce "Usługi".',
        nextBtnText: 'Dalej →',
        doneBtnText: 'Pomiń tour',
        onNextClick: async () => {
          await navigateTo('/rezerwacja');
          await waitForElement('[data-tour="booking-wizard"]');
          (window as any).__cosmoDriver?.moveNext();
        },
      },
    },

    // Step 3 — BookingWizard (UserLayout /rezerwacja)
    {
      element: '[data-tour="booking-wizard"]',
      popover: {
        title: 'Kreator rezerwacji',
        description: 'Wybierz zabieg, termin i pracownika. Kreator przeprowadzi Cię krok po kroku przez cały proces.',
        nextBtnText: 'Dalej →',
        doneBtnText: 'Pomiń tour',
        onNextClick: async () => {
          await navigateTo('/user/wizyty');
          await waitForElement('[data-tour="appointments-list"]');
          (window as any).__cosmoDriver?.moveNext();
        },
      },
    },

    // Step 4 — Appointments list
    {
      element: '[data-tour="appointments-list"]',
      popover: {
        title: 'Moje wizyty',
        description: 'Tutaj znajdziesz wszystkie swoje wizyty — nadchodzące i historyczne. Możesz też anulować lub przełożyć wizytę.',
        nextBtnText: 'Dalej →',
        doneBtnText: 'Pomiń tour',
        onNextClick: async () => {
          await navigateTo('/user/lojalnosc');
          await waitForElement('[data-tour="loyalty-points-bar"]');
          (window as any).__cosmoDriver?.moveNext();
        },
      },
    },

    // Step 5 — Loyalty points bar
    {
      element: '[data-tour="loyalty-points-bar"]',
      popover: {
        title: 'Program lojalnościowy',
        description: 'Za każdą wizytę zbierasz punkty. Wymieniaj je na nagrody i rabaty w naszym programie lojalnościowym.',
        nextBtnText: 'Dalej →',
        doneBtnText: 'Pomiń tour',
        onNextClick: async () => {
          await navigateTo('/user/chat');
          await waitForElement('[data-tour="chat-window"]');
          (window as any).__cosmoDriver?.moveNext();
        },
      },
    },

    // Step 6 — Chat window
    {
      element: '[data-tour="chat-window"]',
      popover: {
        title: 'Czat z salonem',
        description: 'Masz pytanie? Napisz do nas bezpośrednio — odpowiemy najszybciej jak możemy.',
        nextBtnText: 'Dalej →',
        doneBtnText: 'Pomiń tour',
        onNextClick: async () => {
          await navigateTo('/user/dziennik');
          await waitForElement('[data-tour="skin-journal"]');
          (window as any).__cosmoDriver?.moveNext();
        },
      },
    },

    // Step 7 — Skin journal
    {
      element: '[data-tour="skin-journal"]',
      popover: {
        title: 'Dziennik skóry',
        description: 'Prowadź swój osobisty dziennik skóry — dodawaj zdjęcia, nastrój i notatki, żeby śledzić postępy pielęgnacji.',
        nextBtnText: 'Dalej →',
        doneBtnText: 'Pomiń tour',
        onNextClick: async () => {
          await navigateTo('/user/profil');
          await waitForElement('[data-tour="profile-form"]');
          (window as any).__cosmoDriver?.moveNext();
        },
      },
    },

    // Step 8 — Profile form
    {
      element: '[data-tour="profile-form"]',
      popover: {
        title: 'Mój profil',
        description: 'Uzupełnij swoje dane, zarządzaj zgodami i ustawieniami powiadomień. Tu znajdziesz też historię wizyt i kartę klienta.',
        nextBtnText: 'Dalej →',
        doneBtnText: 'Pomiń tour',
        onNextClick: async () => {
          (window as any).__cosmoDriver?.moveNext();
        },
      },
    },

    // Step 9 — Finish overlay (no element)
    {
      popover: {
        title: 'Gotowe! 🎉',
        description: 'To wszystko! Zapraszamy na pierwszą wizytę. Możesz wrócić do tego przewodnika w ustawieniach profilu.',
        nextBtnText: 'Zacznij korzystać →',
        doneBtnText: 'Zamknij',
        onNextClick: () => {
          (window as any).__cosmoDriver?.moveNext();
        },
      },
    },
  ];
}
