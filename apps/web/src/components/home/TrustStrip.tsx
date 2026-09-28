import { trustStats } from './home-data';

/** Trzy liczby w jednym wierszu — zastępuje dawną siatkę czterech kafli w hero. */
export const TrustStrip = ({ googleRating }: { googleRating?: number }) => (
  <section className="home-deferred-section border-y border-oak/20 bg-espresso py-4 text-ivory">
    <div className="container max-w-5xl px-5">
      <div className="grid grid-cols-3 gap-3">
        {trustStats.map(({ value, label, Icon, isRating }) => (
          <div key={label} className="flex flex-col items-center gap-1 text-center">
            <Icon className="h-4 w-4 text-[#DDB87F]" strokeWidth={1.8} />
            <p className="font-heading text-xl font-bold leading-none sm:text-2xl">
              {isRating && googleRating ? googleRating.toFixed(1) : value}
            </p>
            <p className="text-[11px] leading-snug text-ivory/70 sm:text-xs">{label}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);
