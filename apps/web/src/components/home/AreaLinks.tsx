import { Link } from 'react-router-dom';
import { areaLinks } from './home-data';

/**
 * Dawna pełna sekcja „obszar działania" zwinięta do pasa nad stopką.
 * Wszystkie linki do stron lokalnych zostają — one niosą SEO.
 */
export const AreaLinks = () => (
  <section className="home-deferred-section border-t border-espresso/10 bg-cream py-8" aria-labelledby="area-heading">
    <div className="container max-w-4xl px-5 text-center">
      <h2 id="area-heading" className="font-heading text-lg font-bold text-espresso">
        Salon kosmetologiczny Limanowa i okolice
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-espresso/70">
        Przyjmujemy klientki z{' '}
        <Link to="/kosmetolog-limanowa" className="text-oak underline transition-colors hover:text-espresso">Limanowej</Link>,{' '}
        <Link to="/kosmetolog-mordarka" className="text-oak underline transition-colors hover:text-espresso">Mordarki</Link>{' '}
        i całego powiatu limanowskiego — także z Laskowej, Słopnic, Mszany Dolnej, Nowego Sącza, Ujanowic, Dobrej,
        Kasiny Wielkiej, Sowlin, Tymbarku i Jodłownika.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {areaLinks.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className="rounded-full border border-espresso/15 px-3 py-1.5 text-xs font-medium text-espresso/70 transition-colors hover:border-oak hover:text-oak"
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  </section>
);
