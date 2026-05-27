# WeatherDayCard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dodać kartę `WeatherDayCard` na stronie `/user/pogoda-skory`, która pokazuje godzinowy przebieg temperatury i UV z animacjami, opartą o prognozę na 13:00.

**Architecture:** Backend `fetchWeatherForecastAt13` dostaje `cloud_cover` w hourly URL — dane lądują automatycznie w istniejącym polu `Json` (Open-Meteo już zwraca `hourly` w stored `weatherData`, więc stare raporty też mają `hourly`, tylko bez `cloud_cover[]`). Nowy komponent `WeatherDayCard` czyta `report.weatherData.hourly` i renderuje 9 kolumn godzinowych. Komponent wstawiany wewnątrz `TodayReport` (który ma własny `useQuery` na raport — `profile` nie jest dostępny przez domknięcie, dlatego `cityName` przekazywany jako prop).

**Tech Stack:** React 19, TypeScript, Tailwind CSS (keyframes w `tailwind.config.ts`), Open-Meteo API

---

## Kluczowe fakty

- Open-Meteo zwraca pole jako `cloud_cover` (z podkreślnikiem) — to samo co `uv_index`, `temperature_2m`
- `report.weatherData` = cały response Open-Meteo + syntetyczne `current:{}`. Pole `hourly` jest obecne we wszystkich raportach — ale `cloud_cover[]` tylko w nowych (po Task 1)
- Stare raporty: `hourly.cloud_cover` = `undefined` → traktować jako brak danych → emoji 🌥
- Tailwind JIT: klasy Tailwind w `barColor()` muszą być pełnymi string-literałami (np. `'bg-red-500'`), nie template-literals — inaczej JIT je usunie
- Kolumnę 13:00 identyfikujemy przez `col.hour === 13` (pole w interfejsie `Column`), nie przez index tablicy

---

## File Map

| Plik | Akcja | Co się zmienia |
|------|-------|----------------|
| `apps/server/src/modules/skin-weather/skin-weather.service.ts` | Modify | Dodanie `,cloud_cover` do URL hourly |
| `apps/web/tailwind.config.ts` | Modify | Dodanie keyframes `slideIn`, `barGrow`, `pulseGlow` |
| `apps/web/src/components/skin-weather/WeatherDayCard.tsx` | Create | Cały nowy komponent |
| `apps/web/src/pages/user/SkinWeatherProfile.tsx` | Modify | (1) prop `cityName` w `TodayReport`, (2) `<WeatherDayCard>` wewnątrz, (3) call-site update |

---

## Task 1: Backend — dodanie cloud_cover do fetcha

**Files:**
- Modify: `apps/server/src/modules/skin-weather/skin-weather.service.ts`

- [ ] **Krok 1: Znajdź i zmień URL w `fetchWeatherForecastAt13`**

  Znajdź linię (ok. linia 204):
  ```typescript
  `&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,uv_index` +
  ```
  Zmień na:
  ```typescript
  `&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,uv_index,cloud_cover` +
  ```

  Open-Meteo zwróci teraz `data.hourly.cloud_cover[]` (wartości 0–100, procent zachmurzenia). Nazwa pola w API to `cloud_cover` (z podkreślnikiem).

- [ ] **Krok 2: Sprawdź TypeScript**

  ```bash
  cd apps/server && npx tsc --noEmit 2>&1 | grep "skin-weather"
  ```
  Oczekiwany wynik: brak błędów.

- [ ] **Krok 3: Commit**

  ```bash
  git add apps/server/src/modules/skin-weather/skin-weather.service.ts
  git commit -m "feat(skin-weather): add cloud_cover to hourly forecast fetch"
  ```

---

## Task 2: Tailwind — dodanie keyframes animacji

**Files:**
- Modify: `apps/web/tailwind.config.ts`

- [ ] **Krok 1: Dodaj keyframes do `theme.extend.keyframes`**

  W pliku `apps/web/tailwind.config.ts`, w sekcji `keyframes: { ... }` (po `"overlay-in"`), dodaj:

  ```typescript
  "slideIn": {
    from: { opacity: "0", transform: "translateX(12px)" },
    to:   { opacity: "1", transform: "translateX(0)" },
  },
  "barGrow": {
    from: { transform: "scaleY(0)" },
    to:   { transform: "scaleY(1)" },
  },
  "pulseGlow": {
    "0%, 100%": { boxShadow: "0 0 6px rgba(99,102,241,.4)" },
    "50%":      { boxShadow: "0 0 14px rgba(99,102,241,.7)" },
  },
  ```

- [ ] **Krok 2: Dodaj skróty do `theme.extend.animation`**

  W sekcji `animation: { ... }` (po `"overlay-in"`), dodaj:

  ```typescript
  "slideIn":   "slideIn 0.4s ease both",
  "barGrow":   "barGrow 0.5s ease both",
  "pulseGlow": "pulseGlow 2s ease-in-out infinite",
  ```

- [ ] **Krok 3: Zweryfikuj**

  ```bash
  cd apps/web && npx tsc --noEmit 2>&1 | grep "tailwind"
  ```
  Oczekiwany wynik: brak błędów.

- [ ] **Krok 4: Commit**

  ```bash
  git add apps/web/tailwind.config.ts
  git commit -m "feat(web): add slideIn, barGrow, pulseGlow keyframes to Tailwind config"
  ```

---

## Task 3: Nowy komponent WeatherDayCard

**Files:**
- Create: `apps/web/src/components/skin-weather/WeatherDayCard.tsx`

- [ ] **Krok 1: Utwórz plik z pełną zawartością**

  ```tsx
  // filepath: apps/web/src/components/skin-weather/WeatherDayCard.tsx

  interface HourlyWeather {
    time: string[];                       // "2026-05-27T06:00" — lokalny czas bez strefy
    temperature_2m: number[];
    uv_index: number[];
    precipitation_probability: number[];
    cloud_cover?: number[];               // undefined w starych raportach
  }

  interface WeatherDayCardProps {
    weatherData: { hourly?: HourlyWeather } | null | undefined;
    cityName?: string;
  }

  interface Column {
    hour: number;
    temp: number | null;
    uv: number | null;
    precip: number;
    cloud: number | undefined;
  }

  // 9 godzin do wyświetlenia
  const DISPLAY_HOURS = [6, 8, 10, 12, 13, 15, 17, 19, 21];

  const isNight = (hour: number) => hour >= 21 || hour < 6;

  // Pełne string-literały (nie template-literals) — wymagane przez Tailwind JIT
  function barColor(temp: number | null, isThirteen: boolean): string {
    if (isThirteen) return 'bg-red-500';
    if (temp === null) return 'bg-muted';
    if (temp < 10) return 'bg-indigo-400';
    if (temp < 18) return 'bg-violet-400';
    if (temp < 25) return 'bg-amber-400';
    return 'bg-red-500';
  }

  // Reguły emoji w kolejności — pierwsze pasujące wygrywa
  function getEmoji(hour: number, uv: number | null, precip: number, cloud: number | undefined): string {
    if (hour === 13 && uv !== null && uv >= 6) return '🌞';
    if (isNight(hour)) return '🌙';
    if (cloud === undefined) return '🌥';   // stary raport bez cloud_cover
    if (cloud < 20) return '☀️';
    if (cloud < 50 && precip < 30) return '🌤';
    if (cloud < 50) return '🌦';
    if (cloud < 80 && precip >= 30) return '🌦';
    if (cloud < 80) return '⛅';
    if (precip >= 50) return '🌧';
    return '🌥';
  }

  // Pełne string-literały — wymagane przez Tailwind JIT
  function uvColor(uv: number | null): string {
    if (uv === null) return 'text-muted-foreground';
    if (uv <= 2) return 'text-green-400';
    if (uv <= 5) return 'text-yellow-400';
    if (uv <= 7) return 'text-orange-400';
    return 'text-red-400';
  }

  function uvLabel(uv: number | null, hour: number): string {
    if (uv === null || (uv === 0 && isNight(hour))) return '—';
    return `UV ${uv}`;
  }

  // Buduje tablicę kolumn — filtruje hourly.time[] dla każdej z 9 godzin
  // Używa dynamicznie budowanego sufiksu, np. "T06:00", "T13:00"
  // Godzina pochodzi ze stałej DISPLAY_HOURS, nie ze stringa (brak problemów z timezone)
  function buildColumns(hourly: HourlyWeather): Column[] {
    return DISPLAY_HOURS.map(hour => {
      const suffix = `T${String(hour).padStart(2, '0')}:00`;
      const idx = hourly.time.findIndex(t => t.includes(suffix));
      if (idx === -1) return null;  // brak tej godziny w danych → pomiń kolumnę
      return {
        hour,
        temp:   hourly.temperature_2m[idx] ?? null,
        uv:     hourly.uv_index[idx] ?? null,
        precip: hourly.precipitation_probability[idx] ?? 0,
        cloud:  hourly.cloud_cover?.[idx],  // undefined gdy cloud_cover brak
      };
    }).filter((c): c is Column => c !== null);
  }

  export function WeatherDayCard({ weatherData, cityName }: WeatherDayCardProps) {
    const hourly = weatherData?.hourly;
    if (!hourly) return null;

    const columns = buildColumns(hourly);
    if (columns.length === 0) return null;

    const temps = columns.map(c => c.temp).filter((t): t is number => t !== null);
    const minTemp = Math.min(...temps);
    const maxTemp = Math.max(...temps);

    // Wysokość słupka 4–28px; Math.max(...,1) zapobiega dzieleniu przez zero
    const getBarHeight = (temp: number | null): number => {
      if (temp === null) return 4;
      return 4 + ((temp - minTemp) / Math.max(maxTemp - minTemp, 1)) * 24;
    };

    // Dane dla nagłówka — kolumna 13:00 (lub środkowa jako fallback)
    const col13 = columns.find(c => c.hour === 13);
    const uvMax = Math.max(...columns.map(c => c.uv ?? 0));
    const tempAt13 = col13?.temp ?? temps[Math.floor(temps.length / 2)] ?? null;
    const headerEmoji = col13
      ? getEmoji(13, col13.uv, col13.precip, col13.cloud)
      : '🌤';

    return (
      <div className="weather-day-card rounded-2xl bg-card border border-border/60 overflow-hidden mb-4">
        {/* Nagłówek */}
        <div className="flex items-start gap-4 px-4 pt-4 pb-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400/20 to-indigo-500/20 flex items-center justify-center text-2xl flex-shrink-0">
            {headerEmoji}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tabular-nums">
                {tempAt13 !== null ? `${Math.round(tempAt13)}°` : '—'}
              </span>
              <span className="text-sm text-muted-foreground font-normal">
                max {temps.length > 0 ? `${Math.round(Math.max(...temps))}°` : '—'}
              </span>
            </div>
            {cityName && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{cityName}</p>
            )}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {col13?.cloud !== undefined && (
                <span className="text-[11px] bg-muted/50 text-muted-foreground px-2 py-0.5 rounded-full">
                  ☁ {col13.cloud}% chmur
                </span>
              )}
              {uvMax > 0 && (
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                  uvMax >= 8 ? 'bg-red-500/20 text-red-400' :
                  uvMax >= 6 ? 'bg-orange-500/20 text-orange-400' :
                  uvMax >= 3 ? 'bg-yellow-500/20 text-yellow-400' :
                               'bg-green-500/20 text-green-400'
                }`}>
                  UV max {uvMax}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="px-3 pb-4">
          {/* Mini słupki temperatury — nad kolumnami, ta sama szerokość flex */}
          <div className="flex gap-1 items-end mb-1" style={{ height: '32px' }}>
            {columns.map((col, i) => {
              const h = getBarHeight(col.temp);
              const isThirteen = col.hour === 13;  // identyfikacja przez col.hour, nie index
              return (
                <div key={col.hour} className="flex-1 flex items-end justify-center">
                  <div
                    className={`w-full rounded-t-sm animate-barGrow motion-reduce:animate-none ${barColor(col.temp, isThirteen)} ${isThirteen ? 'shadow-[0_0_8px_rgba(239,68,68,0.4)]' : ''}`}
                    style={{
                      height: `${h}px`,
                      transformOrigin: 'bottom',
                      animationDelay: `${i * 50}ms`,
                      animationFillMode: 'both',
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* Kolumny godzinowe */}
          <div className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
            {columns.map((col, i) => {
              const isThirteen = col.hour === 13;
              return (
                <div
                  key={col.hour}
                  className={`flex-shrink-0 flex-1 min-w-[40px] flex flex-col items-center gap-1 py-2 px-1 rounded-xl
                    animate-slideIn motion-reduce:animate-none
                    ${isThirteen
                      ? 'bg-gradient-to-b from-indigo-600/80 to-violet-700/80 animate-pulseGlow'
                      : 'hover:bg-muted/30 transition-colors'
                    }`}
                  style={{
                    animationDelay: `${i * 50}ms`,
                    animationFillMode: 'both',
                  }}
                >
                  <span className="text-[10px] text-muted-foreground">
                    {String(col.hour).padStart(2, '0')}
                  </span>
                  <span className="text-base leading-none">
                    {getEmoji(col.hour, col.uv, col.precip, col.cloud)}
                  </span>
                  <span className="text-[11px] font-semibold tabular-nums">
                    {col.temp !== null ? `${Math.round(col.temp)}°` : '—'}
                  </span>
                  <span className={`text-[9px] font-semibold ${uvColor(col.uv)}`}>
                    {uvLabel(col.uv, col.hour)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }
  ```

- [ ] **Krok 2: Sprawdź TypeScript**

  ```bash
  cd apps/web && npx tsc --noEmit 2>&1 | grep "WeatherDayCard"
  ```
  Oczekiwany wynik: brak błędów.

- [ ] **Krok 3: Commit**

  ```bash
  git add apps/web/src/components/skin-weather/WeatherDayCard.tsx
  git commit -m "feat(skin-weather): add WeatherDayCard component with hourly UV/temp/cloud display"
  ```

---

## Task 4: Integracja w SkinWeatherProfile

**Files:**
- Modify: `apps/web/src/pages/user/SkinWeatherProfile.tsx`

Uwaga: `TodayReport` jest samodzielną funkcją z własnym `useQuery` — nie ma dostępu do `profile` z rodzica przez domknięcie. Dlatego `cityName` przekazywany jako prop.

### 4a — Import

- [ ] **Krok 1: Dodaj import po istniejących importach z `skin-weather`**

  Znajdź:
  ```tsx
  import { skinWeatherApi } from '@/api/skin-weather.api';
  ```
  Dodaj po tej linii:
  ```tsx
  import { WeatherDayCard } from '@/components/skin-weather/WeatherDayCard';
  ```

### 4b — Prop i renderowanie w `TodayReport`

- [ ] **Krok 2: Zmień sygnaturę `TodayReport`**

  Znajdź:
  ```tsx
  function TodayReport({ hasProfile }: { hasProfile: boolean }) {
  ```
  Zmień na:
  ```tsx
  function TodayReport({ hasProfile, cityName }: { hasProfile: boolean; cityName?: string }) {
  ```

- [ ] **Krok 3: Dodaj `<WeatherDayCard>` przed listą sekcji**

  Znajdź w `TodayReport` (ok. linia 206):
  ```tsx
  const sections: any[] = (report.reportData as any)?.sections ?? [];

  return (
    <div className="space-y-3">
  ```
  Zmień na:
  ```tsx
  const sections: any[] = (report.reportData as any)?.sections ?? [];

  return (
    <div className="space-y-3">
      <WeatherDayCard weatherData={report.weatherData as any} cityName={cityName} />
  ```

### 4c — Call-site

- [ ] **Krok 4: Zaktualizuj wywołanie `TodayReport`** (ok. linia 598)

  Znajdź:
  ```tsx
  <TodayReport hasProfile={hasProfile} />
  ```
  Zmień na:
  ```tsx
  <TodayReport hasProfile={hasProfile} cityName={profile?.cityName} />
  ```

- [ ] **Krok 5: Sprawdź TypeScript**

  ```bash
  cd apps/web && npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -20
  ```
  Oczekiwany wynik: brak błędów w plikach projektu.

- [ ] **Krok 6: Commit**

  ```bash
  git add apps/web/src/pages/user/SkinWeatherProfile.tsx
  git commit -m "feat(skin-weather): integrate WeatherDayCard into TodayReport section"
  ```

---

## Task 5: Weryfikacja końcowa

- [ ] **Krok 1: Uruchom serwer deweloperski**

  ```bash
  cd cosmo-app && pnpm dev
  ```

- [ ] **Krok 2: Wygeneruj nowy raport** (na stronie `/user/pogoda-skory`, przycisk "Wygeneruj raport teraz" z force=true / "Odśwież")

  Nowy raport będzie zawierał `cloud_cover` w `weatherData.hourly`.

- [ ] **Krok 3: Sprawdź wizualnie**

  - [ ] Karta pojawia się nad sekcjami reguł
  - [ ] 9 kolumn godzinowych (06–21) z emoji, temp i UV
  - [ ] Mini słupki temperatury z animacją barGrow
  - [ ] Kolumna 13:00 wyróżniona fioletowym gradientem + glow
  - [ ] Przycisk "Odśwież" nadal działa pod kartą

- [ ] **Krok 4: Sprawdź stary raport (bez cloud_cover)**

  W historii raportów stare wpisy powinny renderować emoji 🌥 zamiast crashować.

- [ ] **Krok 5: Commit poprawek (jeśli potrzebny)**

  ```bash
  git add -A && git commit -m "fix(skin-weather): post-integration fixes"
  ```
