export type TourSide = 'top' | 'right' | 'bottom' | 'left';

export type TourStep = {
  path?: string;
  selector?: string;
  side?: TourSide;
  title: string;
  description: string;
  nextLabel?: string;
};

export const TOUR_STEPS: TourStep[] = [
  {
    title: 'Witaj w BeskidStudio By Wiktoria Ćwik! 💆‍♀️',
    description: 'Pokażemy Ci najważniejsze miejsca w aplikacji. Przewodnik możesz zamknąć w dowolnej chwili.',
    nextLabel: 'Zaczynamy →',
  },
  {
    selector: '[data-tour="sidebar-booking-btn"]',
    side: 'right',
    title: 'Rezerwacja wizyty',
    description: 'Tutaj rozpoczniesz rezerwację wizyty. Wszystkie etapy pokażemy Ci na następnym ekranie.',
  },
  {
    path: '/rezerwacja',
    selector: '[data-tour="booking-wizard"]',
    side: 'right',
    title: 'Kreator rezerwacji',
    description: 'Wybierz zabieg, termin i pracownika. Kreator przeprowadzi Cię krok po kroku przez cały proces.',
  },
  {
    path: '/user/wizyty',
    selector: '[data-tour="appointments-list"]',
    side: 'right',
    title: 'Moje wizyty',
    description: 'Tutaj znajdziesz wizyty nadchodzące i historyczne oraz opcje anulowania lub zmiany terminu.',
  },
  {
    path: '/user/lojalnosc',
    selector: '[data-tour="loyalty-points-bar"]',
    side: 'right',
    title: 'Program lojalnościowy',
    description: 'Za wizyty zbierasz punkty, które możesz wymieniać na nagrody i rabaty.',
  },
  {
    path: '/user/chat',
    selector: '[data-tour="chat-window"]',
    side: 'right',
    title: 'Czat z salonem',
    description: 'Masz pytanie? Napisz do nas bezpośrednio — odpowiemy najszybciej, jak możemy.',
  },
  {
    path: '/user/dziennik',
    selector: '[data-tour="skin-journal"]',
    side: 'right',
    title: 'Dziennik skóry',
    description: 'Dodawaj zdjęcia, nastrój i notatki, aby śledzić postępy swojej pielęgnacji.',
  },
  {
    path: '/user/profil',
    selector: '[data-tour="profile-form"]',
    side: 'right',
    title: 'Mój profil',
    description: 'Uzupełnij dane i zarządzaj zgodami oraz ustawieniami powiadomień.',
  },
  {
    title: 'Gotowe! 🎉',
    description: 'To wszystko! Do przewodnika możesz wrócić w dowolnym momencie z poziomu swojego profilu.',
    nextLabel: 'Zacznij korzystać →',
  },
];
