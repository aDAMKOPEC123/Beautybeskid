import { BadgeCheck, Eye, Footprints, Hand, HeartHandshake, Leaf, MessageCircle, ShieldCheck, Sparkles, Star, Wand2 } from 'lucide-react';
import type { Service } from '@cosmo/shared';

export const faqItems = [
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
      text: 'Tak. Po kliknięciu „Umów wizytę” przechodzisz do rezerwacji, gdzie wybierasz zabieg i widzisz wolne godziny bez zakładania konta. Konto jest potrzebne dopiero na ostatnim kroku, gdy potwierdzasz wybrany termin.',
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
  {
    '@type': 'Question',
    name: 'Jak wygląda pierwsza wizyta w salonie kosmetologicznym BeskidStudio?',
    acceptedAnswer: {
      '@type': 'Answer',
      text: 'Pierwsza wizyta zaczyna się od rozmowy o potrzebach skóry, przeciwwskazaniach i oczekiwaniach. Następnie dobieramy odpowiedni zabieg i plan pielęgnacyjny. Nowe klientki mogą skorzystać z bezpłatnej konsultacji kosmetologicznej.',
    },
  },
  {
    '@type': 'Question',
    name: 'Ile kosztują zabiegi kosmetologiczne w BeskidStudio Limanowa?',
    acceptedAnswer: {
      '@type': 'Answer',
      text: 'Ceny zabiegów są widoczne przy każdej usłudze w zakładce Usługi i ceny oraz w systemie rezerwacji online. Cennik jest aktualizowany na bieżąco. Konsultacja kosmetologiczna dla nowych klientek jest bezpłatna.',
    },
  },
  {
    '@type': 'Question',
    name: 'Czy salon BeskidStudio oferuje laminację brwi i rzęs w Limanowej?',
    acceptedAnswer: {
      '@type': 'Answer',
      text: 'Tak. BeskidStudio By Wiktoria Ćwik oferuje laminację brwi, laminację rzęs, hennę z regulacją, stylizację oprawy oka oraz inne zabiegi beauty. Efekt jest naturalny i trwa kilka tygodni.',
    },
  },
  {
    '@type': 'Question',
    name: 'Jakie kwalifikacje ma kosmetolog Wiktoria Ćwik?',
    acceptedAnswer: {
      '@type': 'Answer',
      text: 'Wiktoria Ćwik jest dyplomowanym kosmetologiem z ponad 5-letnim doświadczeniem. Regularnie uczestniczy w szkoleniach branżowych i pracuje wyłącznie z certyfikowanymi preparatami renomowanych marek.',
    },
  },
  {
    '@type': 'Question',
    name: 'Jak umówić się na wizytę podologiczną w BeskidStudio?',
    acceptedAnswer: {
      '@type': 'Answer',
      text: 'Rezerwacja usług podologicznych jest dostępna wyłącznie telefonicznie pod numerem 532 128 227. Wizyty odbywają się w odrębnej lokalizacji, a dokładny adres przekazujemy podczas ustalania terminu.',
    },
  },
];

export const buildFaqSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqItems,
});

/** Trzy liczby w pasku pod hero. Ocena Google jest nadpisywana danymi z API. */
export const trustStats = [
  { value: '5.0', label: 'ocena Google', Icon: Star, isRating: true },
  { value: '5+', label: 'lat doświadczenia', Icon: BadgeCheck, isRating: false },
  { value: '0 zł', label: 'pierwsza konsultacja', Icon: HeartHandshake, isRating: false },
];

export const processSteps = [
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

export const consultationArguments = [
  'dobierzemy aktywną usługę do Twoich potrzeb',
  'bez presji i zobowiązań',
  'otrzymasz jasny plan działania',
];

export const areaLinks = [
  { to: '/laminacja-brwi-limanowa', label: 'Laminacja brwi Limanowa' },
  { to: '/laminacja-rzes-limanowa', label: 'Laminacja rzęs Limanowa' },
  { to: '/oprawa-oka-limanowa', label: 'Oprawa oka Limanowa' },
  { to: '/podolog-limanowa', label: 'Podolog Limanowa' },
  { to: '/pedicure-podologiczny-limanowa', label: 'Pedicure podologiczny' },
];

const normalizeText = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export const getActiveAdminServices = (availableServices: Service[]) =>
  availableServices
    .filter((service) => service.isActive)
    .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name, 'pl'));

export const formatAdminServicePrice = (service: Service) => `od ${Number(service.price).toFixed(0)} zł`;

export const getServiceIcon = (service: Service) => {
  const haystack = normalizeText(`${service.name} ${service.category ?? ''}`);
  if (haystack.includes('rz') || haystack.includes('oko') || haystack.includes('brwi')) return Eye;
  if (haystack.includes('manicure') || haystack.includes('paznok')) return Hand;
  if (haystack.includes('podolog') || haystack.includes('stop')) return Footprints;
  if (haystack.includes('kosmetolog') || haystack.includes('twarz')) return Leaf;
  return Sparkles;
};

export const buildReservationTarget = (serviceId?: string) =>
  serviceId ? `/rezerwacja?serviceId=${encodeURIComponent(serviceId)}` : '/rezerwacja';
