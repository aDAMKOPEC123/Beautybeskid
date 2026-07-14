import { lazy, Suspense, type FormEvent, type ReactNode, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Footprints,
  Hand,
  HeartHandshake,
  Leaf,
  LayoutDashboard,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
  Timer,
  Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageSEO } from '@/components/shared/SEO';
import { HeroSlider } from '@/components/public/HeroSlider';
import { googleReviewsApi, type GoogleReviewsData } from '@/api/google-reviews.api';
import { employeesApi } from '@/api/employees.api';
import { useAuth } from '@/hooks/useAuth';
import { useClientPanelEntry } from '@/hooks/useClientPanelEntry';
import type { Season as SeasonType, Service } from '@cosmo/shared';
import { servicesApi } from '@/api/services.api';

const heroImage = '/images/beautybeskid-hero-premium.webp';
const ConsultationModal = lazy(() =>
  import('@/components/public/ConsultationModal').then((module) => ({ default: module.ConsultationModal })),
);
const Season = {
  SPRING: 'SPRING' as SeasonType,
  SUMMER: 'SUMMER' as SeasonType,
  AUTUMN: 'AUTUMN' as SeasonType,
  WINTER: 'WINTER' as SeasonType,
} as const;
type Season = SeasonType;

const faqItems = [
  {
    '@type': 'Question',
    name: 'Gdzie działa salon kosmetologiczny BeskidStudio By Wiktoria Ćwik?',
    acceptedAnswer: {
      '@type': 'Answer',
      text: 'BeskidStudio By Wiktoria Ćwik to salon kosmetologiczny w Mordarce 505 koło Limanowej prowadzony przez Wiktorię Ćwik, dyplomowanego kosmetologa. Na stronie znajdziesz aktualne zabiegi, wolne terminy, konsultacje i informacje potrzebne przed wizytą.',
    },
  },
  {
    '@type': 'Question',
    name: 'Jakie zabiegi są dostępne w BeskidStudio By Wiktoria Ćwik Limanowa?',
    acceptedAnswer: {
      '@type': 'Answer',
      text: 'Sekcja zabiegów pokazuje aktualne usługi dostępne do rezerwacji w BeskidStudio By Wiktoria Ćwik Limanowa. Ceny, czas zabiegów i terminy są aktualizowane na bieżąco w systemie rezerwacji.',
    },
  },
  {
    '@type': 'Question',
    name: 'Czy mogę sprawdzić wolne terminy bez logowania?',
    acceptedAnswer: {
      '@type': 'Answer',
      text: 'Tak. W BeskidStudio By Wiktoria Ćwik możesz sprawdzić wolne terminy w interaktywnym kalendarzu bez logowania. Konto jest potrzebne dopiero wtedy, gdy chcesz potwierdzić rezerwację wizyty.',
    },
  },
  {
    '@type': 'Question',
    name: 'Czy mogę umówić konsultację kosmetologiczną w Limanowej?',
    acceptedAnswer: {
      '@type': 'Answer',
      text: 'Tak. Nowe klientki mogą umówić bezpłatną konsultację kosmetologiczną w BeskidStudio By Wiktoria Ćwik Limanowa. Podczas konsultacji dobieramy kierunek zabiegowy do potrzeb skóry oraz aktualnie dostępnych zabiegów bez presji i zobowiązań.',
    },
  },
  {
    '@type': 'Question',
    name: 'Dla jakich miejscowości jest BeskidStudio By Wiktoria Ćwik Limanowa?',
    acceptedAnswer: {
      '@type': 'Answer',
      text: 'BeskidStudio By Wiktoria Ćwik przyjmuje klientki z Limanowej i okolic, między innymi z Mordarki, Laskowej, Słopnic, Mszany Dolnej, Tymbarku, Dobrej, Jodłownika oraz Nowego Sącza.',
    },
  },
];

const buildFaqSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqItems,
});

const heroTrust = [
  { value: '4.9/5', label: 'ocena Google', Icon: Star },
  { value: '500+', label: 'zaopiekowanych klientek', Icon: HeartHandshake },
  { value: '5+', label: 'lat doświadczenia', Icon: BadgeCheck },
  { value: '0 zł', label: 'konsultacja dla nowych klientek', Icon: Sparkles },
];

const benefits = [
  'komfortowa atmosfera',
  'indywidualnie dobrane zabiegi',
  'Opieka Dyplomowanego Kosmetologa',
  'efekty bez przypadkowych decyzji',
];

const upcomingServiceCards = [
  {
    title: 'Podologia — planowana usługa',
    shortTitle: 'Podologia w przygotowaniu',
    description: 'Usługa jest jeszcze niedostępna. Przygotowujemy ją tak, aby była prowadzona spokojnie, bezpiecznie i profesjonalnie.',
    price: 'wkrótce',
    time: 'zapisy wkrótce',
    effect: 'lista zainteresowanych',
    cta: 'Wkrótce dostępne',
    Icon: Footprints,
    matchers: ['podolog', 'podologia'],
    availableSoon: true,
  },
  {
    title: 'Kosmetologia Limanowa',
    shortTitle: 'Kosmetologia',
    description: 'Pełna oferta kosmetologiczna jest jeszcze niedostępna. Wkrótce pojawi się jako osobna, dopracowana ścieżka zabiegowa.',
    price: 'wkrótce',
    time: 'zapisy wkrótce',
    effect: 'plan w przygotowaniu',
    cta: 'Wkrótce dostępne',
    Icon: Leaf,
    matchers: ['kosmetolog', 'kosmetologia'],
    availableSoon: true,
  },
];

const testimonials = [
  {
    quote: 'Bardzo spokojna konsultacja i jasny plan. Wiedziałam, co wybieram i dlaczego, bez presji ani pośpiechu.',
    author: 'Katarzyna M.',
    detail: 'konsultacja beauty',
  },
  {
    quote: 'Zabieg był wykonany dokładnie, czysto i w miłej atmosferze. Efekt wygląda elegancko na co dzień.',
    author: 'Anna W.',
    detail: 'zabieg z aktualnej oferty',
  },
  {
    quote: 'Cała wizyta była spokojna i profesjonalna. Najbardziej doceniam dokładność oraz ciepłą atmosferę.',
    author: 'Marta K.',
    detail: 'wizyta beauty',
  },
];

const processSteps = [
  {
    num: '01',
    title: 'Analiza',
    desc: 'Rozmawiamy o potrzebach, przeciwwskazaniach i tym, jaki efekt będzie dla Ciebie realny oraz komfortowy.',
    Icon: MessageCircle,
  },
  {
    num: '02',
    title: 'Plan',
    desc: 'Dobieramy zabieg, częstotliwość i pielęgnację tak, aby decyzja była spokojna, świadoma i dopasowana.',
    Icon: Wand2,
  },
  {
    num: '03',
    title: 'Zabieg',
    desc: 'Pracujemy dokładnie, w czystych warunkach i z uważnością na Twój komfort w trakcie wizyty.',
    Icon: Sparkles,
  },
  {
    num: '04',
    title: 'Opieka po',
    desc: 'Otrzymujesz zalecenia po zabiegu i jasną informację, kiedy warto wrócić na kolejną wizytę.',
    Icon: ShieldCheck,
  },
];

const consultationArguments = [
  'dobierzemy aktywną usługę do Twoich potrzeb',
  'bez presji i zobowiązań',
  'otrzymasz jasny plan działania',
];

function getCurrentSeason(): Season {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return Season.SPRING;
  if (month >= 5 && month <= 7) return Season.SUMMER;
  if (month >= 8 && month <= 10) return Season.AUTUMN;
  return Season.WINTER;
}

const SEASON_LABELS: Record<string, string> = {
  [Season.SPRING]: 'Wiosna',
  [Season.SUMMER]: 'Lato',
  [Season.AUTUMN]: 'Jesień',
  [Season.WINTER]: 'Zima',
};

const formatNextSlot = (date: string, time: string) => {
  const d = new Date(`${date}T${time}`);
  if (Number.isNaN(d.getTime())) {
    return { day: date, time };
  }

  const day = d.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' });
  return { day, time };
};

function getBookingDaysSummary(availableDays: number | undefined): { text: string; className: string } | null {
  if (availableDays === undefined || availableDays === 0) return null;
  if (availableDays === 1) {
    return { text: '1 dzień z możliwością rezerwacji w tym tygodniu', className: 'text-[#A44437]' };
  }
  return { text: `${availableDays} dni z możliwością rezerwacji w tym tygodniu`, className: 'text-mink' };
}

type DayStatus = 'off' | 'none' | 'partial' | 'available';
type AvailabilitySlot = { time: string; available: boolean };

const normalizeText = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const getActiveAdminServices = (availableServices: Service[]) =>
  availableServices
    .filter((service) => service.isActive)
    .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name, 'pl'));

const getServiceCategories = (services: Service[]) =>
  Array.from(new Set(services.map((service) => service.category).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, 'pl'));

const serviceMatches = (service: Service, matchers: string[]) => {
  const haystack = normalizeText(`${service.name} ${service.category ?? ''} ${service.description ?? ''}`);
  return matchers.some((matcher) => haystack.includes(matcher));
};

const formatAdminServicePrice = (service: Service) => `od ${Number(service.price).toFixed(0)} zł`;

const getServiceIcon = (service: Service) => {
  const haystack = normalizeText(`${service.name} ${service.category ?? ''}`);
  if (haystack.includes('rz') || haystack.includes('oko') || haystack.includes('brwi')) return Eye;
  if (haystack.includes('manicure') || haystack.includes('paznok')) return Hand;
  if (haystack.includes('podolog') || haystack.includes('stop')) return Footprints;
  if (haystack.includes('kosmetolog') || haystack.includes('twarz')) return Leaf;
  return Sparkles;
};

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatAvailabilityDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

const getMonthStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

const addCalendarMonths = (date: Date, amount: number) =>
  new Date(date.getFullYear(), date.getMonth() + amount, 1);

const getCalendarMonth = (viewMonth: Date) => {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = Array.from({ length: daysInMonth }, (_, index) => new Date(year, month, index + 1));

  return { firstDayOffset, days };
};

const formatMonthLabel = (date: Date) =>
  date.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });

const isAvailableDay = (status: DayStatus | undefined) => status === 'available' || status === 'partial';

const buildReservationTarget = (serviceId?: string, date?: string | null, time?: string | null) => {
  const params = new URLSearchParams();
  if (serviceId) {
    params.set('serviceId', serviceId);
    if (date) params.set('date', date);
    if (time) params.set('time', time);
  }
  const query = params.toString();
  return query ? `/rezerwacja?${query}` : '/rezerwacja';
};

type BookingState = { from: string } | undefined;

type AvailabilityRequest = {
  serviceId: string;
  label: string;
};

type FadeUpProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

const FadeUp = ({ children, className }: FadeUpProps) => (
  <div className={className}>{children}</div>
);

const SectionIntro = ({
  eyebrow,
  title,
  description,
  align = 'center',
}: {
  eyebrow: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
}) => (
  <div className={align === 'center' ? 'mx-auto mb-10 max-w-3xl text-center' : 'mb-10 max-w-2xl'}>
    <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.32em] text-oak">{eyebrow}</p>
    <h2 className="font-heading text-3xl font-bold leading-tight text-espresso md:text-4xl">{title}</h2>
    {description && (
      <p className="mt-4 text-base leading-relaxed text-espresso/75 md:text-lg">{description}</p>
    )}
  </div>
);

const StarRow = ({ compact = false }: { compact?: boolean }) => (
  <div className="flex items-center gap-1 text-oak" role="img" aria-label="Ocena 5 na 5">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star key={star} className={compact ? 'h-3.5 w-3.5 fill-current' : 'h-4 w-4 fill-current'} />
    ))}
  </div>
);

const BookingButton = ({
  to,
  state,
  label = 'Umów wizytę',
  className,
}: {
  to: string;
  state?: BookingState;
  label?: string;
  className?: string;
}) => (
  <Button
    size="lg"
    className={`premium-shine gap-2 bg-oak text-espresso shadow-[0_18px_45px_rgba(196,150,90,0.35)] hover:bg-oak/90 ${className ?? ''}`}
    asChild
  >
    <Link to={to} state={state}>
      {label}
      <ArrowRight className="h-4 w-4" />
    </Link>
  </Button>
);

const MobileClientPanelCard = ({
  isAuthenticated,
  onOpenClientPanel,
}: {
  isAuthenticated: boolean;
  onOpenClientPanel: () => void;
}) => (
    <button
      type="button"
      onClick={onOpenClientPanel}
      className="mt-4 flex w-full items-center gap-4 rounded-lg border border-espresso/12 bg-espresso p-4 text-left text-ivory shadow-[0_18px_48px_rgba(26,56,40,0.18)] active:scale-[0.985] transition-transform md:hidden"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-oak/18 text-[#DDB87F]">
        <LayoutDashboard className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#DDB87F]">Panel klienta</span>
        <span className="mt-1 block font-heading text-2xl font-bold leading-none">
          {isAuthenticated ? 'Wróć do swojego konta' : 'Otwórz swoje konto'}
        </span>
        <span className="mt-2 block text-sm leading-relaxed text-ivory/72">
          {isAuthenticated
            ? 'Wizyty, historia, zalecenia i czat w jednym miejscu.'
            : 'Zaloguj się i przejdź od razu do wizyt, historii oraz zaleceń.'}
        </span>
      </span>
      <span aria-hidden="true" className="shrink-0 text-[#DDB87F]">
        <ArrowRight className="h-5 w-5" />
      </span>
    </button>
);

const NextSlotCard = ({
  nextSlotLoading,
  formattedSlot,
  bookingDaysSummary,
  bookingTo,
  bookingState,
  isAuthenticated,
  onCheckAvailability,
}: {
  nextSlotLoading: boolean;
  formattedSlot: { day: string; time: string } | null;
  bookingDaysSummary: { text: string; className: string } | null;
  bookingTo: string;
  bookingState?: BookingState;
  isAuthenticated: boolean;
  onCheckAvailability: () => void;
}) => (
  <div className="relative overflow-hidden rounded-lg border border-oak/25 bg-white p-5 shadow-[0_22px_70px_rgba(26,56,40,0.16)]">
    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-oak via-caramel to-oak" aria-hidden="true" />
    <div className="flex items-start gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-espresso text-ivory">
        <CalendarCheck className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-oak">Najbliższy termin</p>
        {nextSlotLoading ? (
          <p className="mt-2 font-heading text-2xl font-bold text-espresso">Sprawdzam terminarz...</p>
        ) : formattedSlot ? (
          <>
            <p className="mt-2 font-heading text-3xl font-bold leading-none text-espresso">{formattedSlot.day}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-espresso/70">
              <Clock className="h-4 w-4 text-oak" />
              <span>{formattedSlot.time}</span>
              {bookingDaysSummary && <span className={`text-xs ${bookingDaysSummary.className}`}>{bookingDaysSummary.text}</span>}
            </div>
          </>
        ) : (
          <>
            <p className="mt-2 font-heading text-2xl font-bold text-espresso">Dobierzemy termin</p>
            <p className="mt-2 text-sm leading-relaxed text-espresso/60">
              Zostaw kontakt, a wrócimy z najlepszą propozycją wizyty.
            </p>
          </>
        )}
      </div>
    </div>
    {isAuthenticated ? (
      <Button className="mt-5 w-full gap-2 bg-espresso text-ivory hover:bg-espresso/90" asChild>
        <Link to={bookingTo} state={bookingState}>
          Rezerwuj ten termin
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    ) : (
      <Button
        type="button"
        onClick={onCheckAvailability}
        className="mt-5 w-full gap-2 bg-espresso text-ivory hover:bg-espresso/90"
      >
        Sprawdź termin bez logowania
        <ArrowRight className="h-4 w-4" />
      </Button>
    )}
    <p className="mt-3 text-center text-xs text-espresso/55">Bezpłatna konsultacja dla nowych klientek</p>
  </div>
);

const HeroSection = ({
  nextSlotLoading,
  formattedSlot,
  bookingDaysSummary,
  bookingTo,
  bookingState,
  isAuthenticated,
  onConsultationClick,
  onCheckAvailability,
  onOpenClientPanel,
  googleRating,
}: {
  nextSlotLoading: boolean;
  formattedSlot: { day: string; time: string } | null;
  bookingDaysSummary: { text: string; className: string } | null;
  bookingTo: string;
  bookingState?: BookingState;
  isAuthenticated: boolean;
  googleRating?: number;
  onConsultationClick: () => void;
  onCheckAvailability: () => void;
  onOpenClientPanel: () => void;
}) => (
  <section className="premium-home-bg premium-animated-light relative overflow-hidden grain-overlay">
    <div className="container relative z-10 max-w-7xl px-5 py-10 md:py-16">
      <div className="grid items-center gap-8 lg:grid-cols-[1.02fr_0.98fr] lg:gap-12">
        <FadeUp>
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-oak/25 bg-white/70 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-espresso/70 shadow-sm backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-oak" />
              Wiktoria Ćwik · BeskidStudio By Wiktoria Ćwik Limanowa
            </div>

            <h1 className="font-heading text-4xl font-bold leading-[1.08] text-espresso sm:text-5xl lg:text-6xl">
              BeskidStudio By Wiktoria Ćwik Limanowa. Zabiegi, terminy i rezerwacja w jednym miejscu.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-relaxed text-espresso/68 md:text-lg">
              Zobacz aktualną ofertę salonu, sprawdź wolne godziny w interaktywnym kalendarzu,
              umów konsultację i poznaj najważniejsze informacje przed wizytą u Wiktorii Ćwik.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <BookingButton to={bookingTo} state={bookingState} />
              <Button variant="outline" size="lg" className="gap-2 border-espresso/20 bg-white/50 text-espresso hover:bg-white" asChild>
                <a href="#zabiegi">
                  Zobacz zabiegi
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </div>

            <MobileClientPanelCard
              isAuthenticated={isAuthenticated}
              onOpenClientPanel={onOpenClientPanel}
            />

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-espresso/60">
              <button
                type="button"
                onClick={onConsultationClick}
                className="inline-flex items-center gap-2 font-semibold text-espresso transition-colors hover:text-oak"
              >
                <CheckCircle2 className="h-4 w-4 text-oak" />
                Bezpłatna konsultacja dla nowych klientek
              </button>
              {!isAuthenticated && (
                <Link
                  to="/auth/register"
                  state={{ from: '/rezerwacja' }}
                  className="inline-flex min-h-11 items-center gap-1 font-semibold text-oak hover:text-espresso"
                >
                  Zarejestruj się
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>

            <div className="mt-5 lg:hidden">
              <NextSlotCard
                nextSlotLoading={nextSlotLoading}
                formattedSlot={formattedSlot}
                bookingDaysSummary={bookingDaysSummary}
                bookingTo={bookingTo}
                bookingState={bookingState}
                isAuthenticated={isAuthenticated}
                onCheckAvailability={onCheckAvailability}
              />
            </div>

            <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4">
              {heroTrust.map(({ value, label, Icon }) => (
                <div key={label} className="rounded-lg border border-espresso/10 bg-white/65 p-3 shadow-sm backdrop-blur">
                  <Icon className="mb-2 h-4 w-4 text-oak" />
                  <p className="font-heading text-xl font-bold text-espresso">
                    {label === 'ocena Google' && googleRating ? googleRating.toFixed(1) + '/5' : value}
                  </p>
                  <p className="mt-1 text-xs leading-snug text-espresso/58">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </FadeUp>

        <FadeUp delay={0.1}>
          <div className="grid gap-4">
            <div className="relative overflow-hidden rounded-lg border border-white/70 bg-white shadow-[0_24px_90px_rgba(26,56,40,0.18)]">
              <HeroSlider
                variant="hero-card"
                fallback={
                  <>
                    <picture>
                      <source media="(max-width: 768px)" srcSet="/images/beautybeskid-hero-mobile.webp" type="image/webp" />
                      <img
                        src={heroImage}
                        alt="Elegancki gabinet BeskidStudio By Wiktoria Ćwik w Limanowej"
                        className="h-[320px] w-full object-cover sm:h-[420px] lg:h-[540px]"
                        loading="eager"
                        decoding="sync"
                        fetchPriority="high"
                        width={1400}
                        height={747}
                      />
                    </picture>
                    <div className="absolute bottom-4 left-4 right-4 rounded-lg border border-white/45 bg-espresso/82 p-4 text-ivory shadow-lg backdrop-blur">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#DDB87F]">Premium care</p>
                          <p className="mt-1 font-heading text-xl font-bold">Prowadzimy Cię krok po kroku</p>
                        </div>
                        <ShieldCheck className="h-7 w-7 shrink-0 text-[#DDB87F]" />
                      </div>
                    </div>
                  </>
                }
              />
            </div>
            <div className="hidden lg:block">
              <NextSlotCard
                nextSlotLoading={nextSlotLoading}
                formattedSlot={formattedSlot}
                bookingDaysSummary={bookingDaysSummary}
                bookingTo={bookingTo}
                bookingState={bookingState}
                isAuthenticated={isAuthenticated}
                onCheckAvailability={onCheckAvailability}
              />
            </div>
          </div>
        </FadeUp>
      </div>
    </div>
  </section>
);

const BenefitsStrip = () => (
  <section className="home-deferred-section border-y border-oak/20 bg-espresso py-4 text-ivory">
    <div className="container max-w-7xl px-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {benefits.map((benefit) => (
          <div key={benefit} className="flex items-center gap-3 text-sm text-ivory/82">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-oak/18 text-[#DDB87F]">
              <CheckCircle2 className="h-4 w-4" />
            </span>
            <span>{benefit}</span>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const AvailabilityPreviewSection = ({
  request,
  availableServices,
  servicesLoading,
  onSelectService,
}: {
  request: AvailabilityRequest | null;
  availableServices: Service[];
  servicesLoading: boolean;
  onSelectService: (request: AvailabilityRequest) => void;
}) => {
  const activeAdminServices = getActiveAdminServices(availableServices);
  const requestedService = activeAdminServices.find((service) => service.id === request?.serviceId) ?? null;
  const serviceCategories = getServiceCategories(activeAdminServices);
  const todayKey = toDateKey(new Date());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(() => requestedService?.category ?? null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(() => requestedService?.id ?? null);
  const [viewMonth, setViewMonth] = useState(() => getMonthStart(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(todayKey);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const selectedService = selectedServiceId
    ? activeAdminServices.find((service) => service.id === selectedServiceId) ?? null
    : null;
  const servicesInSelectedCategory = selectedCategory
    ? activeAdminServices.filter((service) => service.category === selectedCategory)
    : [];

  const handleSelectCategory = (category: string) => {
    setSelectedCategory(category);
    setSelectedServiceId(null);
    setSelectedTime(null);
  };

  const handleSelectService = (service: Service) => {
    setSelectedCategory(service.category);
    setSelectedServiceId(service.id);
    setSelectedTime(null);
    onSelectService({ serviceId: service.id, label: service.name });
  };

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth() + 1;
  const { firstDayOffset, days } = getCalendarMonth(viewMonth);
  const currentMonthStart = getMonthStart(new Date());
  const canGoPrevious = viewMonth.getTime() > currentMonthStart.getTime();

  const { data: monthAvailability = {}, isFetching: monthFetching } = useQuery<Record<string, DayStatus>>({
    queryKey: ['public-month-availability', year, month, selectedService?.id],
    queryFn: () => employeesApi.getMonthAvailability(year, month, selectedService!.id),
    enabled: !!selectedService?.id,
    staleTime: 3 * 60_000,
  });

  const { data: daySlots = [], isFetching: slotsFetching } = useQuery<AvailabilitySlot[]>({
    queryKey: ['public-day-availability', selectedDate, selectedService?.id],
    queryFn: () => employeesApi.getAvailability(selectedDate!, selectedService!.id),
    enabled: !!selectedDate && !!selectedService?.id,
    staleTime: 60_000,
  });

  const availableDaySlots = daySlots.filter((slot) => slot.available);
  const selectedDateLabel = selectedDate ? formatAvailabilityDate(selectedDate) : 'wybierz dzień';
  const reservationTarget = buildReservationTarget(selectedService?.id, selectedDate, selectedTime);
  const reservationTo = reservationTarget;
  const reservationState = undefined;

  useEffect(() => {
    if (!request) {
      setSelectedCategory(null);
      setSelectedServiceId(null);
      setSelectedTime(null);
      return;
    }

    if (!requestedService) return;

    setSelectedCategory(requestedService.category);
    setSelectedServiceId(requestedService.id);
  }, [request, requestedService]);

  useEffect(() => {
    const today = toDateKey(new Date());
    setViewMonth(getMonthStart(new Date()));
    setSelectedDate(today);
    setSelectedTime(null);
  }, [selectedService?.id]);

  useEffect(() => {
    if (!selectedService?.id) return;
    if (Object.keys(monthAvailability).length === 0) return;

    const currentStatus = selectedDate ? monthAvailability[selectedDate] : undefined;
    if (isAvailableDay(currentStatus)) return;

    const nextAvailableDate = Object.entries(monthAvailability)
      .filter(([date, status]) => date >= todayKey && isAvailableDay(status))
      .sort(([a], [b]) => a.localeCompare(b))[0]?.[0];

    if (nextAvailableDate && nextAvailableDate !== selectedDate) {
      setSelectedDate(nextAvailableDate);
      setSelectedTime(null);
    }
  }, [selectedService?.id, monthAvailability, selectedDate, todayKey]);

  return (
    <section id="terminy" className="home-deferred-section bg-espresso py-16 text-ivory md:py-24">
      <div className="container max-w-7xl px-5">
        <FadeUp>
          <div className="mb-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.32em] text-[#DDB87F]">
                Kalendarz terminów
              </p>
              <h2 className="font-heading text-3xl font-bold leading-tight md:text-4xl">
                Sprawdź dostępny dzień i godzinę bez logowania
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ivory/68 md:text-base">
                Najpierw wybierz kategorię, potem konkretną usługę. Kalendarz pokaże wolne godziny tylko dla tego zabiegu.
                Konto będzie potrzebne dopiero przy potwierdzeniu rezerwacji.
              </p>
            </div>

            <div className="grid gap-3">
              {servicesLoading ? (
                <div className="rounded-lg border border-white/12 bg-white/7 px-4 py-3 text-sm text-ivory/68">
                  Ładuję aktualną ofertę...
                </div>
              ) : activeAdminServices.length === 0 ? (
                <div className="rounded-lg border border-white/12 bg-white/7 px-4 py-3 text-sm text-ivory/68 sm:col-span-2">
                  Brak usług dostępnych do rezerwacji. Kalendarz pojawi się, gdy oferta zostanie uzupełniona.
                </div>
              ) : (
                <>
                  <div className="rounded-lg border border-white/12 bg-white/7 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#DDB87F]">1. Kategoria</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {serviceCategories.map((category) => (
                        <button
                          key={category}
                          type="button"
                          onClick={() => handleSelectCategory(category)}
                          className={`min-h-[38px] rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                            selectedCategory === category
                              ? 'border-oak bg-oak text-espresso shadow-[0_14px_35px_rgba(196,150,90,0.22)]'
                              : 'border-white/12 bg-white/7 text-ivory/78 hover:border-oak/45 hover:bg-white/12'
                          }`}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-white/12 bg-white/7 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#DDB87F]">2. Usługa</p>
                    {selectedCategory ? (
                      <div className="mt-3 grid max-h-[260px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                        {servicesInSelectedCategory.map((service) => (
                          <button
                            key={service.id}
                            type="button"
                            onClick={() => handleSelectService(service)}
                            className={`rounded-lg border px-4 py-3 text-left transition ${
                              selectedService?.id === service.id
                                ? 'border-oak bg-oak text-espresso shadow-[0_14px_35px_rgba(196,150,90,0.22)]'
                                : 'border-white/12 bg-white/7 text-ivory/78 hover:border-oak/45 hover:bg-white/12'
                            }`}
                          >
                            <span className="block text-sm font-semibold">{service.name}</span>
                            <span className={`mt-1 block text-xs ${selectedService?.id === service.id ? 'text-espresso/62' : 'text-ivory/50'}`}>
                              {service.durationMinutes} min
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-ivory/58">
                        Wybierz kategorię, a pokażemy krótszą listę usług.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </FadeUp>

        <FadeUp delay={0.06}>
          <div className="grid gap-5 rounded-lg border border-oak/25 bg-white p-4 text-espresso shadow-[0_28px_90px_rgba(0,0,0,0.24)] md:p-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-lg border border-espresso/10 bg-cream/60 p-4 md:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setViewMonth((monthDate) => addCalendarMonths(monthDate, -1))}
                  disabled={!canGoPrevious}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-espresso/10 bg-white text-espresso transition hover:border-oak/45 disabled:cursor-not-allowed disabled:opacity-35"
                  aria-label="Poprzedni miesiąc"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="text-center">
                  <p className="font-heading text-2xl font-bold capitalize text-espresso">{formatMonthLabel(viewMonth)}</p>
                  <p className="mt-1 text-xs text-espresso/75">
                    {selectedService
                      ? monthFetching
                        ? 'Aktualizuję dostępność...'
                        : 'Zielone dni mają wolne godziny'
                      : 'Wybierz usługę, aby aktywować kalendarz'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setViewMonth((monthDate) => addCalendarMonths(monthDate, 1))}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-espresso/10 bg-white text-espresso transition hover:border-oak/45"
                  aria-label="Następny miesiąc"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-espresso/75">
                {['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'].map((day) => (
                  <span key={day} className="py-2">{day}</span>
                ))}
              </div>

              <div className="mt-1 grid grid-cols-7 gap-1.5">
                {Array.from({ length: firstDayOffset }).map((_, index) => (
                  <span key={`empty-${index}`} aria-hidden="true" />
                ))}
                {days.map((day) => {
                  const dateKey = toDateKey(day);
                  const status = monthAvailability[dateKey];
                  const isPast = dateKey < todayKey;
                  const isSelected = selectedDate === dateKey;
                  const isToday = dateKey === todayKey;
                  const isUnavailable = status === 'off' || status === 'none';
                  const disabled = !selectedService?.id || isPast || isUnavailable;
                  const available = isAvailableDay(status);

                  return (
                    <button
                      key={dateKey}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        setSelectedDate(dateKey);
                        setSelectedTime(null);
                      }}
                      className={`relative flex aspect-square min-h-[42px] items-center justify-center rounded-lg border text-sm font-semibold transition ${
                        isSelected
                          ? 'border-espresso bg-espresso text-ivory shadow-[0_10px_25px_rgba(26,56,40,0.18)]'
                          : disabled
                          ? 'border-transparent bg-white/45 text-espresso/25'
                          : available
                          ? 'border-oak/45 bg-oak/12 text-espresso hover:bg-oak/20'
                          : 'border-espresso/8 bg-white text-espresso/70 hover:border-oak/35 hover:bg-white'
                      } ${isToday && !isSelected ? 'ring-1 ring-oak/60' : ''}`}
                      aria-label={formatAvailabilityDate(dateKey)}
                      aria-pressed={isSelected}
                    >
                      {day.getDate()}
                      {available && (
                        <span
                          className={`absolute bottom-1.5 h-1.5 w-1.5 rounded-full ${
                            isSelected ? 'bg-oak' : status === 'partial' ? 'bg-caramel' : 'bg-green-600'
                          }`}
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap gap-3 text-xs text-espresso/75">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-600" />
                  Dostępne
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-caramel" />
                  Częściowo zajęte
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-espresso/18" />
                  Niedostępne
                </span>
              </div>
            </div>

            <div className="flex min-h-[430px] flex-col rounded-lg border border-espresso/10 bg-white p-4 md:p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-oak">
                    {selectedService ? 'Wybrana usługa' : selectedCategory ? 'Wybierz usługę' : 'Wybierz kategorię'}
                  </p>
                  <h3 className="mt-2 font-heading text-2xl font-bold text-espresso">
                    {selectedService?.name ?? selectedCategory ?? 'Najpierw kategoria'}
                  </h3>
                  <p className="mt-1 text-sm text-espresso/75">
                    {selectedService
                      ? selectedDateLabel
                      : selectedCategory
                      ? 'Teraz wybierz usługę z tej kategorii'
                      : 'Kategorie porządkują aktualną ofertę'}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-espresso/48">
                    {selectedService
                      ? 'Dostępne godziny są liczone dla wybranej usługi i jej czasu trwania.'
                      : 'Po wyborze usługi aktywujemy kalendarz i wolne godziny.'}
                  </p>
                </div>
                <CalendarCheck className="h-8 w-8 shrink-0 text-oak" />
              </div>

              <div className="mt-5 flex-1 rounded-lg bg-cream/55 p-4">
                {servicesLoading ? (
                  <p className="mb-4 rounded-lg border border-oak/20 bg-white px-3 py-2 text-xs text-espresso/55">
                    Ładuję aktualną ofertę...
                  </p>
                ) : null}
                {!servicesLoading && activeAdminServices.length === 0 ? (
                  <div className="grid min-h-[220px] place-items-center rounded-lg border border-dashed border-espresso/12 bg-white/60 p-5 text-center">
                    <div>
                      <p className="font-semibold text-espresso">Brak aktywnych usług do sprawdzenia</p>
                      <p className="mt-2 text-sm text-espresso/58">
                        Terminy pojawią się tutaj, gdy w ofercie będzie dostępna usługa do rezerwacji.
                      </p>
                    </div>
                  </div>
                ) : !selectedCategory ? (
                  <div className="grid min-h-[220px] place-items-center rounded-lg border border-dashed border-espresso/12 bg-white/60 p-5 text-center">
                    <div>
                      <p className="font-semibold text-espresso">Wybierz kategorię</p>
                      <p className="mt-2 text-sm text-espresso/58">
                        Po wyborze kategorii pokażemy tylko pasujące usługi i odblokujemy sprawdzanie terminów.
                      </p>
                    </div>
                  </div>
                ) : !selectedService ? (
                  <div className="grid min-h-[220px] place-items-center rounded-lg border border-dashed border-espresso/12 bg-white/60 p-5 text-center">
                    <div>
                      <p className="font-semibold text-espresso">Wybierz usługę</p>
                      <p className="mt-2 text-sm text-espresso/58">
                        Lista po lewej pokazuje usługi tylko z kategorii: {selectedCategory}.
                      </p>
                    </div>
                  </div>
                ) : slotsFetching ? (
                  <div className="grid min-h-[220px] place-items-center text-center">
                    <p className="text-sm text-espresso/55">Sprawdzam godziny dla wybranego dnia...</p>
                  </div>
                ) : availableDaySlots.length > 0 ? (
                  <div>
                    <p className="text-sm font-semibold text-espresso">
                      Dostępne godziny — {selectedDateLabel}
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {availableDaySlots.map((slot) => (
                        <button
                          key={slot.time}
                          type="button"
                          onClick={() => setSelectedTime(slot.time)}
                          className={`min-h-[46px] rounded-lg border text-sm font-semibold transition ${
                            selectedTime === slot.time
                              ? 'border-espresso bg-espresso text-ivory shadow-[0_10px_25px_rgba(26,56,40,0.18)]'
                              : 'border-oak/25 bg-white text-espresso hover:border-oak hover:bg-oak/10'
                          }`}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="grid min-h-[220px] place-items-center rounded-lg border border-dashed border-espresso/12 bg-white/60 p-5 text-center">
                    <div>
                      <p className="font-semibold text-espresso">Brak wolnych godzin w tym dniu</p>
                      <p className="mt-2 text-sm text-espresso/58">
                        Wybierz zielony dzień w kalendarzu albo sprawdź kolejny miesiąc.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-espresso/58">
                  {selectedTime ? (
                    <span>
                      Wybrano: <strong className="text-espresso">{selectedDateLabel}, {selectedTime}</strong>
                    </span>
                  ) : (
                    <span>
                      {selectedService
                        ? 'Wybierz godzinę, aby przejść dalej z gotowym terminem.'
                        : 'Wybierz kategorię i usługę, aby zobaczyć godziny.'}
                    </span>
                  )}
                </div>
                <Button
                  className="shrink-0 gap-2 bg-espresso text-ivory hover:bg-espresso/90"
                  disabled={!selectedTime || !selectedService}
                  asChild={!!selectedTime && !!selectedService}
                >
                  {selectedTime && selectedService ? (
                    <Link to={reservationTo} state={reservationState}>
                      Zarezerwuj wybrany termin
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <span>
                      {selectedService ? 'Wybierz godzinę' : 'Wybierz usługę'}
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
};

const ServicesSection = ({
  availableServices,
  servicesLoading,
  onCheckAvailability,
}: {
  availableServices: Service[];
  servicesLoading: boolean;
  onCheckAvailability: (request: AvailabilityRequest) => void;
}) => {
  const activeAdminServices = getActiveAdminServices(availableServices);
  const visibleServices = activeAdminServices.slice(0, 3);
  const hiddenServicesCount = Math.max(activeAdminServices.length - visibleServices.length, 0);

  return (
    <section id="zabiegi" className="home-deferred-section bg-ivory py-16 md:py-24">
      <div className="container max-w-7xl px-5">
        <FadeUp>
          <SectionIntro
            eyebrow="Aktualne usługi"
            title="Zabiegi dostępne do rezerwacji"
            description="Zobacz aktualną ofertę BeskidStudio By Wiktoria Ćwik, wybierz zabieg i przejdź do kalendarza, aby sprawdzić najbliższe wolne godziny."
          />
        </FadeUp>

        {servicesLoading ? (
          <div className="rounded-lg border border-espresso/10 bg-white p-6 text-center text-sm text-espresso/60 shadow-sm">
            Ładuję aktualną ofertę...
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {activeAdminServices.length === 0 && (
              <FadeUp className="md:col-span-2 xl:col-span-4">
                <article className="rounded-lg border border-dashed border-espresso/15 bg-white p-6 text-center shadow-sm">
                  <h3 className="font-heading text-2xl font-bold text-espresso">Brak usług dostępnych do rezerwacji</h3>
                  <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-espresso/60">
                    Gdy oferta zostanie uzupełniona, zabiegi pojawią się tutaj oraz w kalendarzu terminów.
                  </p>
                </article>
              </FadeUp>
            )}

            {visibleServices.map((service, index) => {
              const Icon = getServiceIcon(service);
              return (
                <FadeUp key={service.id} delay={index * 0.06}>
                  <article className="group flex h-full flex-col rounded-lg border border-espresso/10 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_55px_rgba(26,56,40,0.14)]">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-cream text-caramel transition-colors group-hover:bg-espresso group-hover:text-ivory">
                        <Icon className="h-5 w-5" />
                      </div>
                      {index === 0 ? (
                        <span className="rounded-full bg-oak/14 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-oak">
                          Dostępne teraz
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-5">
                      <h3 className="font-heading text-2xl font-bold text-espresso">{service.name}</h3>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.22em] text-mink">
                        {service.category || 'Usługa z panelu'}
                      </p>
                      <p className="mt-4 text-sm leading-relaxed text-espresso/62">{service.description}</p>
                    </div>

                    <div className="mt-5 grid gap-2 text-sm text-espresso/68 sm:grid-cols-3">
                      <span className="flex items-center gap-2 rounded-lg bg-cream/70 px-3 py-2">
                        <BadgeCheck className="h-4 w-4 text-oak" />
                        {formatAdminServicePrice(service)}
                      </span>
                      <span className="flex items-center gap-2 rounded-lg bg-cream/70 px-3 py-2">
                        <Timer className="h-4 w-4 text-oak" />
                        {service.durationMinutes} min
                      </span>
                      <span className="flex items-center gap-2 rounded-lg bg-cream/70 px-3 py-2">
                        <Sparkles className="h-4 w-4 text-oak" />
                        Aktywna
                      </span>
                    </div>

                    <div className="mt-auto pt-5">
                      <Button
                        type="button"
                        onClick={() => onCheckAvailability({ serviceId: service.id, label: service.name })}
                        className="w-full gap-2 bg-espresso text-ivory hover:bg-espresso/90"
                      >
                        Sprawdź termin
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </article>
                </FadeUp>
              );
            })}

            {hiddenServicesCount > 0 && (
              <FadeUp delay={visibleServices.length * 0.06}>
                <Link
                  to="/uslugi"
                  className="group flex h-full min-h-[260px] flex-col justify-between rounded-lg border border-oak/30 bg-espresso p-5 text-ivory shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-espresso/95 hover:shadow-[0_22px_55px_rgba(26,56,40,0.18)]"
                >
                  <div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-oak/18 text-[#DDB87F] transition-colors group-hover:bg-oak group-hover:text-espresso">
                      <LayoutDashboard className="h-5 w-5" />
                    </div>
                    <p className="mt-5 text-xs font-semibold uppercase tracking-[0.24em] text-[#DDB87F]">
                      +{hiddenServicesCount} w ofercie
                    </p>
                    <h3 className="mt-3 font-heading text-2xl font-bold">Zobacz wszystkie usługi</h3>
                    <p className="mt-4 text-sm leading-relaxed text-ivory/68">
                      Pełna lista zabiegów jest w zakładce usług, z filtrowaniem po kategoriach.
                    </p>
                  </div>
                  <span className="mt-6 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#DDB87F]">
                    Przejdź do /uslugi
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              </FadeUp>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

const SeasonalSection = ({
  seasonalServices,
  currentSeason,
}: {
  seasonalServices: Service[];
  currentSeason: Season;
}) => {
  if (seasonalServices.length === 0) return null;

  return (
  <section className="home-deferred-section bg-cream py-16">
      <div className="container max-w-7xl px-5">
        <FadeUp>
          <SectionIntro
            eyebrow="Polecane zabiegi"
            title={`${SEASON_LABELS[currentSeason]} w BeskidStudio By Wiktoria Ćwik`}
            description="Zalogowane klientki widzą sezonowe propozycje z aktualnej oferty salonu."
            align="left"
          />
        </FadeUp>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {seasonalServices.map((service, index) => (
            <FadeUp key={service.id} delay={index * 0.06}>
              <article className="flex h-full flex-col rounded-lg border border-espresso/10 bg-white p-5 shadow-sm">
                <h3 className="font-heading text-xl font-bold text-espresso">{service.name}</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-espresso/62">{service.description}</p>
                <div className="mt-5 flex items-center justify-between gap-3">
                  <p className="font-bold text-oak">od {Number(service.price).toFixed(0)} zł</p>
                  <Button size="sm" className="gap-1 bg-espresso text-ivory" asChild>
                    <Link to={`/rezerwacja?serviceId=${service.id}`}>
                      Zarezerwuj
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </article>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
};

const ConsultationSection = ({
  onConsultationClick,
  bookingTo,
  bookingState,
}: {
  onConsultationClick: () => void;
  bookingTo: string;
  bookingState?: BookingState;
}) => (
  <section className="home-deferred-section bg-[#F8F5EF] py-16 md:py-20">
    <div className="container max-w-6xl px-5">
      <FadeUp>
        <div className="grid items-center gap-8 rounded-lg border border-oak/25 bg-espresso p-6 text-ivory shadow-[0_24px_80px_rgba(26,56,40,0.22)] md:grid-cols-[1.2fr_0.8fr] md:p-10">
          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.32em] text-[#DDB87F]">Bezpłatna konsultacja</p>
            <h2 className="font-heading text-3xl font-bold leading-tight md:text-4xl">
              Nie wiesz, jaki zabieg wybrać?
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-ivory/72">
              Przyjdź na spokojną konsultację. Dobierzemy aktywną usługę do Twoich potrzeb,
              wyjaśnimy możliwe efekty i zaproponujemy plan bez presji. Jeśli interesuje Cię usługa,
              której nie ma jeszcze w grafiku, możesz zapytać o planowany termin uruchomienia.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                size="lg"
                onClick={onConsultationClick}
                className="gap-2 bg-oak text-espresso hover:bg-oak/90"
              >
                Bezpłatna konsultacja
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="lg" className="gap-2 border-ivory/30 bg-transparent text-ivory hover:bg-white/10 hover:text-ivory" asChild>
                <Link to={bookingTo} state={bookingState}>
                  Umów wizytę
                  <CalendarCheck className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <p className="mt-3 text-sm text-ivory/55">Mikroplan działania już po pierwszej rozmowie.</p>
          </div>

          <div className="grid gap-3">
            {consultationArguments.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/8 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#DDB87F]" />
                <p className="text-sm leading-relaxed text-ivory/78">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </FadeUp>
    </div>
  </section>
);

const TestimonialsSection = ({
  onCheckAvailability,
  googleData,
}: {
  onCheckAvailability: () => void;
  googleData?: GoogleReviewsData;
}) => {
  const rating = googleData?.rating?.toFixed(1) ?? '4.9';
  const displayReviews = googleData?.reviews?.slice(0, 3) ?? testimonials.map(t => ({
    author_name: t.author,
    rating: 5,
    text: t.quote,
    time: 0,
    relative_time_description: t.detail,
    profile_photo_url: '',
  }));

  return (
  <section className="home-deferred-section bg-ivory py-16 md:py-24">
    <div className="container max-w-7xl px-5">
      <FadeUp>
        <div className="mb-10 grid items-end gap-6 lg:grid-cols-[1fr_auto]">
          <SectionIntro
            eyebrow="Opinie klientek"
            title="Zaufanie buduje się spokojem, dokładnością i kontaktem po wizycie"
            description="Naturalne opinie klientek podkreślają to, co dla nas ważne: jasny plan, delikatność i profesjonalną opiekę."
            align="left"
          />
          <div className="rounded-lg border border-oak/25 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <p className="font-heading text-4xl font-bold text-espresso">{rating}</p>
              <div>
                <StarRow />
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.22em] text-mink">
                  ocena Google{googleData ? ' (' + googleData.user_ratings_total + ' opinii)' : ''}
                </p>
              </div>
            </div>
          </div>
        </div>
      </FadeUp>

      <div className="grid gap-4 md:grid-cols-3">
        {displayReviews.map((review, index) => (
          <FadeUp key={review.author_name + index} delay={index * 0.08}>
            <article className="flex h-full flex-col rounded-lg border border-espresso/10 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(26,56,40,0.12)]">
              <StarRow compact />
              <p className="mt-5 flex-1 font-display text-[22px] italic leading-relaxed text-espresso">
                "{review.text}"
              </p>
              <div className="mt-6 border-t border-espresso/10 pt-4">
                <p className="text-sm font-semibold text-espresso">{review.author_name}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.22em] text-mink">{review.relative_time_description}</p>
              </div>
            </article>
          </FadeUp>
        ))}
      </div>

      <FadeUp>
        <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-lg border border-oak/20 bg-cream p-5 text-center md:flex-row md:text-left">
          <div>
            <p className="font-heading text-2xl font-bold text-espresso">Chcesz sprawdzić najbliższy termin?</p>
                <p className="mt-1 text-sm text-espresso/75">Najpierw zobacz godziny bez logowania, a konto założysz dopiero przy rezerwacji.</p>
          </div>
          <Button
            type="button"
            onClick={onCheckAvailability}
            size="lg"
            className="premium-shine shrink-0 gap-2 bg-oak text-espresso shadow-[0_18px_45px_rgba(196,150,90,0.35)] hover:bg-oak/90"
          >
            Sprawdź termin
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </FadeUp>
    </div>
  </section>
  );
};

const ProcessSection = () => (
  <section className="home-deferred-section bg-cream py-16 md:py-24">
    <div className="container max-w-7xl px-5">
      <FadeUp>
        <SectionIntro
          eyebrow="Twoja wizyta krok po kroku"
          title="Nie musisz wiedzieć wszystkiego przed wejściem do gabinetu"
          description="Od pierwszej rozmowy prowadzimy Cię przez decyzję, zabieg i pielęgnację po wizycie."
        />
      </FadeUp>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {processSteps.map(({ num, title, desc, Icon }, index) => (
          <FadeUp key={title} delay={index * 0.07}>
            <article className="relative h-full overflow-hidden rounded-lg border border-espresso/10 bg-white p-5 shadow-sm">
              <p className="absolute right-4 top-3 font-heading text-5xl font-bold text-cream">{num}</p>
              <div className="relative z-10">
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-espresso text-ivory">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-heading text-2xl font-bold text-espresso">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-espresso/62">{desc}</p>
              </div>
            </article>
          </FadeUp>
        ))}
      </div>
    </div>
  </section>
);

const ReservationFormSection = ({
  onConsultationClick,
  bookingTo,
  bookingState,
  availableServices,
  servicesLoading,
}: {
  onConsultationClick: () => void;
  bookingTo: string;
  bookingState?: BookingState;
  availableServices: Service[];
  servicesLoading: boolean;
}) => {
  const activeAdminServices = getActiveAdminServices(availableServices);
  const upcomingCards = upcomingServiceCards.filter(
    (card) => !activeAdminServices.some((service) => serviceMatches(service, card.matchers))
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onConsultationClick();
  };

  return (
    <section className="home-deferred-section bg-[#F8F5EF] py-16 md:py-24">
      <div className="container max-w-7xl px-5">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.82fr]">
          <FadeUp>
            <div className="rounded-lg border border-espresso/10 bg-white p-5 shadow-[0_18px_55px_rgba(26,56,40,0.1)] md:p-8">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.32em] text-oak">Formularz kontaktowy</p>
              <h2 className="font-heading text-3xl font-bold text-espresso md:text-4xl">
                Zostaw kontakt, a dopasujemy najlepszy termin
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-espresso/62">
                Odezwiemy się, aby potwierdzić najlepszy termin i dobrać właściwy kierunek wizyty.
              </p>

              <form onSubmit={handleSubmit} className="mt-7 grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2 text-sm font-semibold text-espresso">
                    Imię
                    <input
                      name="name"
                      className="min-h-[48px] rounded-lg border border-espresso/12 bg-cream/45 px-4 text-base font-normal outline-none transition focus:border-oak focus:bg-white"
                      placeholder="np. Anna"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-espresso">
                    Telefon
                    <input
                      name="phone"
                      type="tel"
                      className="min-h-[48px] rounded-lg border border-espresso/12 bg-cream/45 px-4 text-base font-normal outline-none transition focus:border-oak focus:bg-white"
                      placeholder="np. 600 123 456"
                    />
                  </label>
                </div>
                <label className="grid gap-2 text-sm font-semibold text-espresso">
                  Preferowany zabieg
                  <select
                    name="service"
                    defaultValue=""
                    className="min-h-[48px] rounded-lg border border-espresso/12 bg-cream/45 px-4 text-base font-normal outline-none transition focus:border-oak focus:bg-white"
                  >
                    <option value="" disabled>Wybierz z listy</option>
                    {servicesLoading && <option disabled>Ładuję usługi z panelu...</option>}
                    {!servicesLoading && activeAdminServices.length === 0 && (
                      <option disabled>Brak aktywnych usług w panelu</option>
                    )}
                    {activeAdminServices.map((service) => (
                      <option key={service.id} value={service.id}>{service.name}</option>
                    ))}
                    {upcomingCards.map((card) => (
                      <option key={card.shortTitle} disabled>{card.shortTitle} (wkrótce)</option>
                    ))}
                    <option>Nie wiem, potrzebuję konsultacji</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-semibold text-espresso">
                  Wiadomość
                  <textarea
                    name="message"
                    rows={4}
                    className="rounded-lg border border-espresso/12 bg-cream/45 px-4 py-3 text-base font-normal outline-none transition focus:border-oak focus:bg-white"
                    placeholder="Napisz, czego potrzebujesz lub jaki termin byłby wygodny."
                  />
                </label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button type="submit" size="lg" className="gap-2 bg-espresso text-ivory hover:bg-espresso/90">
                    Poproś o kontakt
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="lg" className="gap-2 bg-white" asChild>
                    <Link to={bookingTo} state={bookingState}>
                      Umów wizytę online
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </form>
            </div>
          </FadeUp>

          <FadeUp delay={0.08}>
            <aside className="h-full rounded-lg border border-oak/25 bg-espresso p-6 text-ivory shadow-[0_22px_70px_rgba(26,56,40,0.18)] md:p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-oak/18 text-[#DDB87F]">
                <Sparkles className="h-6 w-6" />
              </div>
              <h2 className="mt-6 font-heading text-3xl font-bold">Bezpłatna konsultacja</h2>
              <p className="mt-3 text-sm leading-relaxed text-ivory/70">
                Dla nowych klientek to najprostszy sposób, aby zacząć bez niepewności i bez wybierania usługi na ślepo.
              </p>
              <ul className="mt-6 grid gap-3">
                {consultationArguments.map((argument) => (
                  <li key={argument} className="flex items-start gap-3 text-sm text-ivory/78">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#DDB87F]" />
                    <span>{argument}</span>
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                onClick={onConsultationClick}
                className="mt-7 w-full gap-2 bg-oak text-espresso hover:bg-oak/90"
              >
                Umów konsultację
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Link
                to="/auth/register"
                state={{ from: '/rezerwacja' }}
                className="mt-4 flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-white/14 text-[10px] font-semibold uppercase tracking-[0.2em] text-ivory transition hover:bg-white/8"
              >
                Zarejestruj się
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </aside>
          </FadeUp>
        </div>
      </div>
    </section>
  );
};

const FaqSection = () => {
  return (
    <section className="home-deferred-section bg-ivory py-16 md:py-24" aria-labelledby="faq-heading">
      <div className="container max-w-3xl px-5">
        <FadeUp>
          <div className="mb-10 text-center">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.32em] text-oak">FAQ</p>
            <h2 id="faq-heading" className="font-heading text-3xl font-bold text-espresso md:text-4xl">
              Najczęściej zadawane pytania
            </h2>
          </div>
        </FadeUp>
        <div className="space-y-3">
          {faqItems.map((item, index) => (
            <FadeUp key={item.name} delay={index * 0.04}>
              <details className="group overflow-hidden rounded-lg border border-espresso/10 bg-white shadow-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-espresso transition-colors hover:bg-cream/60">
                  {item.name}
                  <ChevronDown className="h-5 w-5 shrink-0 text-oak transition-transform group-open:rotate-180" />
                </summary>
                <dd className="border-t border-espresso/10 px-5 pb-5 pt-4 text-sm leading-relaxed text-espresso/65">
                  {item.acceptedAnswer.text}
                </dd>
              </details>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
};

const AreaSection = () => (
  <section className="home-deferred-section bg-cream py-14" aria-labelledby="area-heading">
    <div className="container max-w-4xl px-5 text-center">
      <FadeUp>
        <h2 id="area-heading" className="font-heading text-2xl font-bold text-espresso">
          Salon kosmetologiczny Limanowa i okolice
        </h2>
        <p className="mt-5 text-sm leading-relaxed text-espresso/64">
          BeskidStudio By Wiktoria Ćwik przyjmuje klientki z Limanowej i całego powiatu limanowskiego. Regularnie odwiedzają nas osoby
          z Mordarki, Laskowej, Słopnic, Mszany Dolnej, Nowego Sącza, Ujanowic, Dobrej, Kasiny Wielkiej, Sowlin,
          Tymbarku, Jodłownika oraz pobliskich miejscowości.
        </p>
      </FadeUp>
    </div>
  </section>
);

export const Home = () => {
  const [consultationOpen, setConsultationOpen] = useState(false);
  const [availabilityRequest, setAvailabilityRequest] = useState<AvailabilityRequest | null>(null);
  const { isAuthenticated } = useAuth();
  const openClientPanel = useClientPanelEntry();

  const { data: nextSlot, isLoading: nextSlotLoading } = useQuery({
    queryKey: ['next-available-slot'],
    queryFn: employeesApi.getNextAvailable,
    staleTime: 10 * 60_000,
  });

  const { data: weekSlots } = useQuery({
    queryKey: ['week-slots-count'],
    queryFn: employeesApi.getWeekSlotsCount,
    staleTime: 5 * 60_000,
  });

  const { data: allServices = [], isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: servicesApi.getAll,
    staleTime: 10 * 60_000,
  });

  const { data: googleReviews } = useQuery<GoogleReviewsData>({
    queryKey: ['google-reviews'],
    queryFn: googleReviewsApi.get,
    staleTime: 24 * 60 * 60_000,
    retry: false,
  });

  const currentSeason = getCurrentSeason();
  const seasonalServices = allServices
    .filter((service) => service.isActive && service.seasons.includes(currentSeason))
    .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name, 'pl'))
    .slice(0, 3);

  const formattedSlot = nextSlot ? formatNextSlot(nextSlot.date, nextSlot.time) : null;
  const bookingDaysSummary = getBookingDaysSummary(weekSlots?.availableDays);
  const bookingTo = '/rezerwacja';
  const bookingState = undefined;

  const handleCheckAvailability = (request?: AvailabilityRequest) => {
    setAvailabilityRequest(request ?? null);
    window.setTimeout(() => {
      document.getElementById('terminy')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  return (
    <div className="flex min-h-screen flex-col bg-ivory">
      <PageSEO
        title="Kosmetolog Limanowa | Wiktoria Ćwik – BeskidStudio"
        description="BeskidStudio By Wiktoria Ćwik — gabinet kosmetologiczny 5 min od Limanowej. Sprawdź wolny termin online i umów wizytę lub bezpłatną konsultację."
        canonical="/"
        ogImage={heroImage}
        schema={buildFaqSchema()}
      />

      <main className="flex-1">
        <HeroSection
          nextSlotLoading={nextSlotLoading}
          formattedSlot={formattedSlot}
          bookingDaysSummary={bookingDaysSummary}
          bookingTo={bookingTo}
          bookingState={bookingState}
          isAuthenticated={isAuthenticated}
          onConsultationClick={() => setConsultationOpen(true)}
          onCheckAvailability={() => handleCheckAvailability()}
          onOpenClientPanel={() => openClientPanel()}
          googleRating={googleReviews?.rating}
        />
        <BenefitsStrip />
        <ServicesSection
          availableServices={allServices}
          servicesLoading={servicesLoading}
          onCheckAvailability={handleCheckAvailability}
        />
        <AvailabilityPreviewSection
          request={availabilityRequest}
          availableServices={allServices}
          servicesLoading={servicesLoading}
          onSelectService={(request) => setAvailabilityRequest(request)}
        />
        {isAuthenticated && (
          <SeasonalSection seasonalServices={seasonalServices} currentSeason={currentSeason} />
        )}
        <ConsultationSection
          onConsultationClick={() => setConsultationOpen(true)}
          bookingTo={bookingTo}
          bookingState={bookingState}
        />
        <TestimonialsSection onCheckAvailability={() => handleCheckAvailability()} googleData={googleReviews} />
        <ProcessSection />
        <ReservationFormSection
          onConsultationClick={() => setConsultationOpen(true)}
          bookingTo={bookingTo}
          bookingState={bookingState}
          availableServices={allServices}
          servicesLoading={servicesLoading}
        />
        <FaqSection />
        <AreaSection />
      </main>

      {consultationOpen ? (
        <Suspense fallback={null}>
          <ConsultationModal open onClose={() => setConsultationOpen(false)} />
        </Suspense>
      ) : null}
    </div>
  );
};
