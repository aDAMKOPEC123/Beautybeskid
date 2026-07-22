import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar, Star, Shield, Heart, Sparkles, Zap, Award, Users, Clock, Smile,
  CheckCircle, BadgeCheck, Camera, User, GraduationCap, BookOpen, Leaf, MapPin,
} from 'lucide-react';
import { PageSEO } from '@/components/shared/SEO';
import { RichTextViewer } from '@/components/shared/RichTextViewer';
import { aboutApi } from '@/api/about.api';
import { employeesApi } from '@/api/employees.api';
import { SEO } from '@/lib/seo-config';
import { ClipRevealImage } from '@/components/ui/ClipRevealImage';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  calendar: Calendar,
  star: Star,
  shield: Shield,
  heart: Heart,
  sparkles: Sparkles,
  zap: Zap,
  award: Award,
  users: Users,
  clock: Clock,
  smile: Smile,
  'check-circle': CheckCircle,
  badge: BadgeCheck,
};

const ownerSchema = (ownerName: string, ownerTitle: string, ownerPhoto?: string) => ({
  '@context': 'https://schema.org',
  '@type': 'Person',
  '@id': `${SEO.domain}/o-nas#person`,
  name: ownerName,
  jobTitle: ownerTitle,
  url: `${SEO.domain}/o-nas`,
  ...(ownerPhoto ? { image: ownerPhoto.startsWith('http') ? ownerPhoto : `${SEO.domain}${ownerPhoto}` } : {}),
  sameAs: [SEO.fbProfile, SEO.igProfile, SEO.ttProfile],
  knowsAbout: ['kosmetologia', 'pielęgnacja skóry', 'laminacja brwi', 'lifting rzęs', 'stylizacja brwi'],
  worksFor: {
    '@type': 'BeautySalon',
    '@id': `${SEO.domain}/#beautysalon`,
    name: SEO.siteName,
    url: SEO.domain,
    address: {
      '@type': 'PostalAddress',
      ...(SEO.address.street ? { streetAddress: SEO.address.street } : {}),
      addressLocality: SEO.address.city,
      postalCode: SEO.address.postalCode,
      addressRegion: SEO.address.region,
      addressCountry: 'PL',
    },
  },
});

export const About = () => {
  const { data: about, isLoading } = useQuery({
    queryKey: ['about'],
    queryFn: aboutApi.get,
  });

  const { data: employees } = useQuery({
    queryKey: ['employees-public'],
    queryFn: () => employeesApi.getAll(),
    staleTime: 300_000,
  });

  const [salonImgError, setSalonImgError] = useState(false);
  const [ownerImgError, setOwnerImgError] = useState(false);
  const [empImgErrors, setEmpImgErrors] = useState<Set<string>>(new Set());

  const activeEmployees = (employees as any[])?.filter((e) => e.isActive) ?? [];

  if (isLoading) {
    return (
      <div className="container py-16 flex justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <>
      <PageSEO
        title="Kosmetolog Wiktoria Ćwik — o BeskidStudio Limanowa"
        description="Wiktoria Ćwik, dyplomowany kosmetolog z Limanowej. Poznaj BeskidStudio w Mordarce — indywidualne konsultacje, spokojna atmosfera i świadoma pielęgnacja skóry."
        canonical="/o-nas"
        schema={ownerSchema(about?.ownerName ?? 'Wiktoria Ćwik', about?.ownerTitle ?? 'Kosmetolożka', about?.ownerPhoto ?? undefined)}
      />

      {/* Hero */}
      <section className="py-16 text-center" style={{ backgroundColor: '#F0F7F1' }}>
        <div className="container">
          <div
            className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest mb-6"
            style={{ backgroundColor: 'rgba(196,150,90,0.12)', color: '#C4965A' }}
          >
            Poznaj nas
          </div>
          <h1
            className="text-4xl font-heading font-display tracking-tight sm:text-5xl"
            style={{ color: '#1A3828', fontStyle: 'italic', fontWeight: 300 }}
          >
            Wiktoria Ćwik — kosmetolog koło Limanowej
          </h1>
          {about?.salonTagline && (
            <p className="mt-4 text-lg max-w-2xl mx-auto" style={{ color: 'rgba(20,40,28,0.55)' }}>
              {about.salonTagline}
            </p>
          )}
        </div>
      </section>

      {/* Salon info */}
      <section className="py-16" style={{ backgroundColor: '#F4F9F5' }}>
        <div className="container">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 items-center">
            {/* Cover image */}
            <div
              className="overflow-hidden shadow-lg"
              style={{ borderRadius: '20px', border: '1px solid rgba(0,0,0,0.07)' }}
            >
              {about?.salonCoverImage && !salonImgError ? (
                <ClipRevealImage
                  src={about.salonCoverImage}
                  alt={`Salon ${SEO.siteName}`}
                  className="w-full h-72 lg:h-96"
                  wrapperClassName="w-full h-72 lg:h-96"
                  onError={() => setSalonImgError(true)}
                />
              ) : (
                <div
                  className="flex h-72 lg:h-96 w-full flex-col items-center justify-center gap-3"
                  style={{ backgroundColor: '#F0F7F1', color: 'rgba(20,40,28,0.35)' }}
                >
                  <Camera className="h-12 w-12 opacity-30" />
                  <span className="text-sm">Zdjęcie salonu</span>
                </div>
              )}
            </div>
            {/* Description */}
            <div>
              <h2 className="text-2xl font-heading font-bold mb-5" style={{ color: '#1A3828' }}>
                {SEO.siteName}
              </h2>
              {about?.salonDescription ? (
                <RichTextViewer
                  content={about.salonDescription}
                  className="prose prose-sm max-w-none text-muted-foreground [&_.ProseMirror]:outline-none"
                />
              ) : (
                <p style={{ color: 'rgba(20,40,28,0.55)' }}>Opis salonu zostanie wkrótce uzupełniony.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Owner */}
      <section className="py-16" style={{ backgroundColor: '#F0F7F1' }}>
        <div className="container">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 items-center">
            {/* Bio */}
            <div className="order-2 lg:order-1">
              <span
                className="text-xs font-semibold uppercase tracking-widest mb-3 block"
                style={{ color: '#C4965A' }}
              >
                Właścicielka
              </span>
              <h2 className="text-2xl font-heading font-bold mb-1" style={{ color: '#1A3828' }}>
                {about?.ownerName ?? 'Wiktoria Ćwik'}
              </h2>
              <p className="text-sm mb-5" style={{ color: 'rgba(20,40,28,0.5)' }}>
                {about?.ownerTitle ?? 'Właścicielka & Kosmetolożka'}
              </p>
              <div className="w-10 h-0.5 rounded-full mb-6" style={{ backgroundColor: '#C4965A' }} />
              {about?.ownerBio ? (
                <RichTextViewer
                  content={about.ownerBio}
                  className="prose prose-sm max-w-none text-muted-foreground [&_.ProseMirror]:outline-none"
                />
              ) : (
                <p style={{ color: 'rgba(20,40,28,0.55)' }}>Bio zostanie wkrótce uzupełnione.</p>
              )}
            </div>
            {/* Photo */}
            <div className="order-1 lg:order-2 flex flex-col items-center gap-4">
              {about?.ownerPhoto && !ownerImgError ? (
                <div className="relative">
                  <div
                    className="absolute -inset-3 rounded-full opacity-30 blur-md"
                    style={{ backgroundColor: '#C4965A' }}
                  />
                  <div
                    className="relative h-64 w-64 rounded-full shadow-xl"
                    style={{ border: '4px solid #fff', outline: '2px solid #C4965A' }}
                  >
                    <ClipRevealImage
                      src={about.ownerPhoto}
                      alt={about.ownerName ?? 'Właścicielka'}
                      className="h-64 w-64"
                      wrapperClassName="h-64 w-64 rounded-full"
                      onError={() => setOwnerImgError(true)}
                    />
                  </div>
                </div>
              ) : (
                <div
                  className="flex h-64 w-64 items-center justify-center rounded-full shadow-xl"
                  style={{ backgroundColor: '#F0F7F1', border: '4px solid #fff' }}
                >
                  <User className="h-16 w-16 opacity-30" style={{ color: '#C4965A' }} />
                </div>
              )}
              <div className="text-center">
                <p className="font-semibold" style={{ color: '#1A3828' }}>{about?.ownerName ?? 'Wiktoria Ćwik'}</p>
                <p className="text-sm" style={{ color: 'rgba(20,40,28,0.5)' }}>{about?.ownerTitle ?? 'Właścicielka & Kosmetolożka'}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Wykształcenie i doświadczenie */}
      <section className="py-16" style={{ backgroundColor: '#F4F9F5' }}>
        <div className="container max-w-3xl">
          <div className="text-center mb-10">
            <div
              className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest mb-4"
              style={{ backgroundColor: 'rgba(196,150,90,0.12)', color: '#C4965A' }}
            >
              Kwalifikacje
            </div>
            <h2 className="text-2xl font-heading font-bold" style={{ color: '#1A3828' }}>
              Wykształcenie i doświadczenie
            </h2>
          </div>
          <div className="flex flex-col gap-4">
            {[
              { icon: GraduationCap, text: 'Studia kosmetologiczne — dyplom kosmetologa' },
              { icon: BookOpen, text: 'Szkolenia z laminacji i liftingu brwi oraz rzęs' },
              { icon: BookOpen, text: 'Kursy z koloryzacji henną i stylizacji oprawy oka' },
              { icon: BookOpen, text: 'Szkolenia z podologii i pielęgnacji stóp' },
              { icon: BookOpen, text: 'Kursy z pielęgnacji skóry problematycznej' },
            ].map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="flex items-center gap-4 p-5"
                style={{
                  borderRadius: '16px',
                  backgroundColor: '#fff',
                  borderLeft: '3px solid #C4965A',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                }}
              >
                <Icon className="h-5 w-5 shrink-0" style={{ color: '#C4965A' }} />
                <span className="text-sm font-medium" style={{ color: '#1A3828' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Filozofia pracy */}
      <section className="py-16" style={{ backgroundColor: '#F0F7F1' }}>
        <div className="container max-w-3xl">
          <div className="text-center mb-10">
            <div
              className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest mb-4"
              style={{ backgroundColor: 'rgba(196,150,90,0.12)', color: '#C4965A' }}
            >
              Podejście
            </div>
            <h2 className="text-2xl font-heading font-bold" style={{ color: '#1A3828' }}>
              Filozofia pracy
            </h2>
          </div>
          <div className="flex flex-col gap-5">
            {[
              { icon: Heart, title: 'Indywidualna konsultacja', desc: 'Każdą wizytę zaczynamy od rozmowy — omawiamy potrzeby skóry, dotychczasową pielęgnację, oczekiwania i ewentualne przeciwwskazania. Na tej podstawie dobieramy zabieg i plan dalszej opieki.' },
              { icon: Shield, title: 'Uczciwa ocena efektów', desc: 'Nie obiecujemy niemożliwego. Przed zabiegiem realnie omawiamy, czego można się spodziewać, jak długo utrzyma się efekt i jakie są ograniczenia.' },
              { icon: Sparkles, title: 'Jakość i higiena', desc: 'Pracujemy sprawdzonymi produktami renomowanych marek. Gabinet jest utrzymywany w pełnej czystości, a narzędzia sterylizowane po każdym użyciu.' },
              { icon: Leaf, title: 'Ciągły rozwój', desc: 'Regularnie uczestniczymy w szkoleniach i kursach, aby oferować najnowsze techniki i metody pielęgnacji — od laminacji brwi po zaawansowaną podologię.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="p-6"
                style={{
                  borderRadius: '20px',
                  backgroundColor: '#fff',
                  border: '1px solid rgba(0,0,0,0.07)',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: 'rgba(196,150,90,0.1)' }}
                  >
                    <Icon className="h-5 w-5" style={{ color: '#C4965A' }} />
                  </div>
                  <h3 className="font-semibold" style={{ color: '#1A3828' }}>{title}</h3>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(20,40,28,0.6)' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dlaczego BeskidStudio */}
      <section className="py-16" style={{ backgroundColor: '#F4F9F5' }}>
        <div className="container max-w-3xl">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-heading font-bold" style={{ color: '#1A3828' }}>
              Dlaczego BeskidStudio?
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: Heart, text: 'Indywidualne podejście do każdej klientki' },
              { icon: Sparkles, text: 'Spokojna, kameralna atmosfera' },
              { icon: MapPin, text: '5 min od centrum Limanowej' },
              { icon: Clock, text: 'Rezerwacja online 24/7' },
              { icon: Star, text: '5.0 gwiazdek w Google (18 opinii)' },
            ].map(({ icon: Ico, text }) => (
              <div
                key={text}
                className="flex items-center gap-3 p-4"
                style={{
                  borderRadius: '16px',
                  backgroundColor: '#fff',
                  border: '1px solid rgba(0,0,0,0.07)',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                }}
              >
                <Ico className="h-5 w-5 shrink-0" style={{ color: '#C4965A' }} />
                <span className="text-sm font-medium" style={{ color: '#1A3828' }}>{text}</span>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm leading-relaxed" style={{ color: 'rgba(20,40,28,0.6)' }}>
            Zapraszamy do{' '}
            <Link to="/kontakt" style={{ color: '#C4965A', textDecoration: 'underline' }}>naszego gabinetu w Mordarce</Link>
            {' '}lub sprawdź{' '}
            <Link to="/uslugi" style={{ color: '#C4965A', textDecoration: 'underline' }}>pełną ofertę zabiegów</Link>
            {' '}i{' '}
            <Link to="/rezerwacja" style={{ color: '#C4965A', textDecoration: 'underline' }}>umów wizytę online</Link>.
            Obsługujemy klientki z{' '}
            <Link to="/kosmetolog-limanowa" style={{ color: '#C4965A', textDecoration: 'underline' }}>Limanowej</Link>,
            Mordarki, Laskowej, Dobrej i Tymbarku.
          </p>
        </div>
      </section>

      {/* Employees */}
      {activeEmployees.length > 0 && (
        <section className="py-16" style={{ backgroundColor: '#F4F9F5' }}>
          <div className="container">
            <h2 className="text-2xl font-heading font-bold mb-2 text-center" style={{ color: '#1A3828' }}>
              Nasz Zespół
            </h2>
            <p className="text-center text-sm mb-12" style={{ color: 'rgba(20,40,28,0.55)' }}>
              Poznaj specjalistów, którzy zadbają o Twój wygląd i samopoczucie.
            </p>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {activeEmployees.map((emp: any) => (
                <div
                  key={emp.id}
                  className="flex flex-col items-center gap-4 p-7 text-center transition-all duration-300 hover:-translate-y-1"
                  style={{
                    borderRadius: '20px',
                    border: '1px solid rgba(0,0,0,0.07)',
                    backgroundColor: '#fff',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                  }}
                >
                  {emp.avatarPath && !empImgErrors.has(emp.id) ? (
                    <div
                      className="h-24 w-24 rounded-full"
                      style={{ border: '3px solid rgba(196,150,90,0.3)' }}
                    >
                      <ClipRevealImage
                        src={emp.avatarPath}
                        alt={emp.name}
                        className="h-24 w-24"
                        wrapperClassName="h-24 w-24 rounded-full"
                        onError={() => setEmpImgErrors((prev) => new Set(prev).add(emp.id))}
                      />
                    </div>
                  ) : (
                    <div
                      className="flex h-24 w-24 items-center justify-center rounded-full text-3xl font-bold"
                      style={{ backgroundColor: 'rgba(196,150,90,0.1)', color: '#C4965A' }}
                    >
                      {emp.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold" style={{ color: '#1A3828' }}>{emp.name}</p>
                    {emp.specialties?.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-1 mt-2">
                        {emp.specialties.slice(0, 3).map((s: string) => (
                          <span
                            key={s}
                            className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                            style={{ backgroundColor: 'rgba(196,150,90,0.1)', color: '#C4965A' }}
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                    {emp.bio && (
                      <p className="mt-3 text-sm line-clamp-3" style={{ color: 'rgba(20,40,28,0.55)' }}>{emp.bio}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Features / App */}
      {about && ((about.features?.length ?? 0) > 0 || about.appDescription) && (
        <section className="py-16" style={{ backgroundColor: '#F0F7F1' }}>
          <div className="container">
            <h2 className="text-2xl font-heading font-bold mb-2 text-center" style={{ color: '#1A3828' }}>
              {about.featuresTitle || 'Dlaczego warto wybrać BeskidStudio By Wiktoria Ćwik?'}
            </h2>
            <p className="text-center text-sm max-w-xl mx-auto mb-12" style={{ color: 'rgba(20,40,28,0.55)' }}>
              Nowoczesna aplikacja to więcej niż rezerwacje — to pełne doświadczenie klienta.
            </p>

            {about.features && about.features.length > 0 && (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {about.features.map((f) => {
                  const Icon = ICON_MAP[f.icon] ?? Star;
                  return (
                    <div
                      key={f.id}
                      className="p-6 flex flex-col gap-4 transition-all duration-300 hover:-translate-y-1"
                      style={{
                        borderRadius: '20px',
                        border: '1px solid rgba(0,0,0,0.07)',
                        backgroundColor: '#fff',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                      }}
                    >
                      <div
                        className="flex h-11 w-11 items-center justify-center rounded-xl"
                        style={{ backgroundColor: 'rgba(196,150,90,0.1)' }}
                      >
                        <Icon className="h-5 w-5" style={{ color: '#C4965A' }} />
                      </div>
                      <p className="font-semibold" style={{ color: '#1A3828' }}>{f.title}</p>
                      <p className="text-sm" style={{ color: 'rgba(20,40,28,0.55)' }}>{f.description}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {about.appDescription && (
              <div className="mt-10 max-w-2xl mx-auto">
                <RichTextViewer
                  content={about.appDescription}
                  className="prose prose-sm max-w-none text-muted-foreground text-center [&_.ProseMirror]:outline-none"
                />
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
};
