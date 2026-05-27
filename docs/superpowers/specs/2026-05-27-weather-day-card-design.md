# Design Spec: WeatherDayCard — dzienny przegląd pogody

**Data:** 2026-05-27
**Dotyczy:** `/user/pogoda-skory` (SkinWeatherProfile)
**Kontekst:** Moduł `skin-weather` — backend Express + Prisma, frontend React 19 + TypeScript

---

## Problem

Raport skórny generowany o 6:00 używa prognozy na 13:00, ale użytkownik nie widzi żadnych surowych danych pogodowych — tylko dopasowane reguły tekstowe.

---

## Cel

Dodać kartę `WeatherDayCard` wewnątrz komponentu `TodayReport`, przed listą sekcji reguł, która pokazuje godzinowy przebieg temperatury, UV i zachmurzenia z animacjami.

---

## Zakres

### W zakresie
- Nowy komponent `WeatherDayCard` (Tailwind CSS, bez osobnych plików CSS)
- Rozszerzenie backendowego fetcha o `cloud_cover`
- Renderowanie na `/user/pogoda-skory`

### Poza zakresem
- Widget na dashboardzie
- Wykres historyczny

---

## Backend

### Zmiana w `skin-weather.service.ts` — tylko `fetchWeatherForecastAt13`

```
&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,uv_index,cloud_cover
```

`cloud_cover` ląduje w `report.weatherData.hourly.cloud_cover[]`. Syntetyczny obiekt `current` celowo nie jest rozszerzany (służy tylko `matchRulesToWeather`, które nie potrzebuje `cloud_cover`). `fetchWeather` (bieżąca pogoda) pozostaje bez zmian.

---

## Frontend

### Nowy plik: `apps/web/src/components/skin-weather/WeatherDayCard.tsx`

### Interfejsy

```ts
interface HourlyWeather {
  time: string[];                    // "2026-05-27T06:00" — lokalny czas bez strefy
  temperature_2m: number[];
  uv_index: number[];
  precipitation_probability: number[];
  cloud_cover?: number[];            // brak w starych raportach
}

interface WeatherDayCardProps {
  weatherData: { hourly?: HourlyWeather } | null | undefined;
  cityName?: string;
}
```

### Fallback

Jeśli `weatherData` lub `weatherData.hourly` jest null/undefined → komponent zwraca `null`.

### Wyświetlane godziny

Dokładnie 9 kolumn: **06, 08, 10, 12, 13, 15, 17, 19, 21**

#### Ekstrakcja indeksów

```ts
const DISPLAY_HOURS = [6, 8, 10, 12, 13, 15, 17, 19, 21];

const columns = DISPLAY_HOURS.map(hour => {
  const suffix = `T${String(hour).padStart(2, '0')}:00`;
  const idx = hourly.time.findIndex(t => t.includes(suffix));
  if (idx === -1) return null; // brak danych dla tej godziny → pomiń kolumnę
  return {
    hour,
    temp: hourly.temperature_2m[idx] ?? null,
    uv: hourly.uv_index[idx] ?? null,
    precip: hourly.precipitation_probability[idx] ?? 0,
    cloud: hourly.cloud_cover?.[idx],   // może być undefined w starych raportach
  };
}).filter(Boolean);
```

Godzina wyciągana ze stałej `hour` (nie parsowana ze stringa), co eliminuje problemy z timezone.

Jeśli `idx === -1` dla danej godziny — ta kolumna jest pomijana (nie renderowana). Nie powoduje błędu.

### Logika emoji

`const isNight = (hour: number) => hour >= 21 || hour < 6`

Reguły w kolejności (pierwsze pasujące wygrywa):

| # | Warunek | Emoji |
|---|---------|-------|
| 1 | `hour === 13 && uv !== null && uv >= 6` | 🌞 |
| 2 | `isNight(hour)` | 🌙 |
| 3 | `cloud === undefined` (stary raport) | 🌥 |
| 4 | `cloud < 20` | ☀️ |
| 5 | `cloud < 50 && precip < 30` | 🌤 |
| 6 | `cloud < 50` (precip >= 30) | 🌦 |
| 7 | `cloud < 80 && precip >= 30` | 🌦 |
| 8 | `cloud < 80` | ⛅ |
| 9 | `precip >= 50` | 🌧 |
| 10 | fallback | 🌥 |

Uwaga: reguła 2 (`isNight`) jest niedosięgalna dla godziny 13, ponieważ reguła 1 wyłapuje ją pierwsza. Dla godziny 06 `isNight` jest fałszywy (06 >= 6), więc reguła 2 odpala się tylko dla kolumny 21. Reguła dla `hour < 6` jest zachowana dla potencjalnych przyszłych zmian zakresu godzin.

### Mini słupki temperatury

Renderowane nad kolumnami scroll w tym samym flex-container (wyrównane pozycją).

```ts
const temps = columns.map(c => c.temp).filter((t): t is number => t !== null);
const minTemp = Math.min(...temps);
const maxTemp = Math.max(...temps);
const getBarHeight = (temp: number | null) => {
  if (temp === null) return 4; // minimum
  return 4 + ((temp - minTemp) / Math.max(maxTemp - minTemp, 1)) * 24;
};
```

Zakres wysokości: 4px (min) – 28px (max).

Kolor słupka (Tailwind):

| Temperatura | Klasa |
|-------------|-------|
| < 10°C | `bg-indigo-400` |
| 10–17°C | `bg-violet-400` |
| 18–24°C | `bg-amber-400` |
| >= 25°C | `bg-red-500` |

Kolumna 13:00 (słupek + wrapper): zawsze `bg-red-500` + `shadow-[0_0_8px_rgba(239,68,68,0.5)]`.

### Etykieta UV

```ts
const uvColor = (uv: number | null) => {
  if (uv === null) return '';
  if (uv <= 2) return 'text-green-400';
  if (uv <= 5) return 'text-yellow-400';
  if (uv <= 7) return 'text-orange-400';
  return 'text-red-400';
};
const uvLabel = (uv: number | null, hour: number) => {
  if (uv === null || (uv === 0 && isNight(hour))) return '—';
  return `UV ${uv}`;
};
```

### Animacje (Tailwind + inline style)

Wszystkie animacje przez Tailwind arbitrary CSS z `style={{ animationDelay }}`.

1. **Slide-in** — każda kolumna (`div`): `animate-[slideIn_0.4s_ease_both]` z `style={{ animationDelay: \`${idx * 50}ms\` }}`
   ```css
   @keyframes slideIn { from { opacity: 0; transform: translateX(12px); } to { opacity: 1; transform: translateX(0); } }
   ```

2. **Bar-grow** — element słupka: `animate-[barGrow_0.5s_ease_both]` z tym samym delay
   ```css
   @keyframes barGrow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
   /* transform-origin: bottom — inline style na elemencie */
   ```

3. **Pulse-glow** — **wrapper kolumny** (nie element słupka!) dla godziny 13: `animate-[pulseGlow_2s_ease-in-out_infinite]`
   ```css
   @keyframes pulseGlow { 0%,100% { box-shadow: 0 0 6px rgba(99,102,241,.4); } 50% { box-shadow: 0 0 14px rgba(99,102,241,.7); } }
   ```
   Pulse-glow na wrapperze kolumny, NIE na elemencie słupka (unikanie konfliktu z `scaleY` transform).

`prefers-reduced-motion` — przez Tailwind `motion-reduce:animate-none` na każdym animowanym elemencie.

---

## Integracja w SkinWeatherProfile

### Zmiana podpisu `TodayReport`

```tsx
// Przed:
function TodayReport({ hasProfile }: { hasProfile: boolean })

// Po:
function TodayReport({ hasProfile, cityName }: { hasProfile: boolean; cityName?: string })
```

### Renderowanie wewnątrz `TodayReport`, po strażnikach błędów, przed `<div className="space-y-3">`

```tsx
import { WeatherDayCard } from '@/components/skin-weather/WeatherDayCard';

// Po: const sections = (report.reportData as any)?.sections ?? [];
<WeatherDayCard
  weatherData={report.weatherData as any}
  cityName={cityName}
/>
```

### Wywołanie `TodayReport` w `SkinWeatherProfile` (~linia 598)

```tsx
// Przed:
<TodayReport hasProfile={hasProfile} />

// Po:
<TodayReport hasProfile={hasProfile} cityName={profile?.cityName} />
```

---

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `apps/server/src/modules/skin-weather/skin-weather.service.ts` | Dodać `cloud_cover` do hourly URL w `fetchWeatherForecastAt13` |
| `apps/web/src/components/skin-weather/WeatherDayCard.tsx` | Nowy plik — cały komponent |
| `apps/web/src/pages/user/SkinWeatherProfile.tsx` | (1) Nowy prop `cityName` w `TodayReport`, (2) renderowanie `<WeatherDayCard>` wewnątrz, (3) aktualizacja call-site `<TodayReport cityName={profile?.cityName}>` |
