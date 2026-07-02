import {
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

export interface TileData {
  key: string;
  content: ReactNode;
  /** URL zdjęcia tła kafelka — można dodać później */
  backgroundImage?: string;
}

interface TileCarouselProps {
  tiles: TileData[];
}

export function TileCarousel({ tiles }: TileCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el || el.clientWidth === 0) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    setActiveIndex(Math.max(0, Math.min(idx, tiles.length - 1)));
  }, [tiles.length]);

  const scrollTo = (idx: number) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: idx * el.clientWidth, behavior: 'smooth' });
  };

  if (tiles.length === 0) return null;

  return (
    <div>
      {/* Wrapper z overflow:hidden — twardy limit szerokości karuzeli */}
      <div
        style={{
          overflow: 'hidden',
          position: 'relative',
          width: '100%',
        }}
      >
        {/*
          CSS Grid carousel.
          KLUCZOWE:
          - width: 100% na tracku → % w gridAutoColumns ma punkt odniesienia
          - gridAutoColumns: '100%' → każda kolumna = szerokość kontenera
          - minWidth: 0 na tile slidach → grid items nie rozszerzają się ponad kolumnę
        */}
        <div
          ref={trackRef}
          onScroll={handleScroll}
          className="tile-track grid grid-flow-col auto-cols-[100%] overflow-x-auto md:grid-flow-row md:auto-cols-auto md:grid-cols-2 md:overflow-visible md:gap-3"
          style={{
            width: '100%',
            scrollSnapType: 'x mandatory',
            scrollbarWidth: 'none',
            // @ts-ignore vendor prefix
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {tiles.map((tile, i) => (
            <TileSlide
              key={tile.key}
              tile={tile}
              animDelay={i * 75}
            />
          ))}
        </div>

        {/* Wskaźnik "przesuń w prawo" */}
      </div>

      {/* Doty + licznik — poza overflow:hidden żeby były zawsze widoczne */}
      {tiles.length > 1 && (
        <div
          className="md:hidden"
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 5,
            marginTop: 11,
          }}
        >
          {tiles.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollTo(i)}
              aria-label={`Kafelek ${i + 1}`}
              style={{
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
              }}
            >
              <span
                aria-hidden
                style={{
                  width: i === activeIndex ? 22 : 6,
                  height: 6,
                  borderRadius: 100,
                  background: i === activeIndex ? '#1A3828' : 'rgba(26,56,40,0.18)',
                  transition: 'width 0.38s cubic-bezier(0.34,1.56,0.64,1), background 0.2s ease',
                }}
              />
            </button>
          ))}
          <span
            style={{
              marginLeft: 5,
              fontSize: 11,
              fontWeight: 600,
              color: 'rgba(26,56,40,0.3)',
            }}
          >
            {activeIndex + 1}/{tiles.length}
          </span>
        </div>
      )}
    </div>
  );
}

function TileSlide({
  tile,
  animDelay,
}: {
  tile: TileData;
  animDelay: number;
}) {
  const hasBg = !!tile.backgroundImage;

  return (
    <div
      style={{
        scrollSnapAlign: 'start',
        // KLUCZOWE: min-width: 0 zapobiega rozszerzaniu się grid item
        // ponad rozmiar kolumny (domyślnie grid items mają min-width: auto)
        minWidth: 0,
        ...(hasBg
          ? {
              borderRadius: 16,
              overflow: 'hidden',
              position: 'relative',
              backgroundImage: `url(${tile.backgroundImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : {}),
        animation: 'tileEnter 0.4s ease both',
        animationDelay: `${animDelay}ms`,
      }}
    >
      {hasBg && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(160deg, rgba(15,32,22,0.15) 0%, rgba(15,32,22,0.70) 100%)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
      )}
      <div
        style={{
          position: hasBg ? 'relative' : undefined,
          zIndex: hasBg ? 2 : undefined,
        }}
      >
        {tile.content}
      </div>
    </div>
  );
}
