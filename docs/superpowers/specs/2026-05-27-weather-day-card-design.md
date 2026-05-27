# Design Spec: WeatherDayCard — dzienny przegląd pogody

**Data:** 2026-05-27
**Dotyczy:** `/user/pogoda-skory` (SkinWeatherProfile)
**Kontekst:** Moduł `skin-weather` — backend Express + Prisma, frontend React 19 + TypeScript

---

## Problem

Raport skórny generowany o 6:00 używa prognozy na 13:00, ale użytkownik nie widzi żadnych surowych danych pogodowych — tylko dopasowane reguły tekstowe. Nie może stwierdzić, dlaczego dostał daną rekomendację ani jaki jest przewidywany przebieg UV i temperatury przez cały dzień.

---

## Cel

Dodać kartę `WeatherDayCard` nad sekcją "Prognoza na 13:00", która pokazuje:
- Godzinowy przebieg temperatury i UV (06–21h)
- Zachmurzenie i opady
- Animowane wejście elementów

---

## Zakres

### W zakresie
- Nowy komponent frontendowy `WeatherDayCard`
- Rozszerzenie backendowego fetcha o `cloud_cover`
- Renderowanie na stronie `/user/pogoda-skory`

### Poza zakresem
- Widget na dashboardzie (za mały)
- Wykres historyczny
- Powiadomienia push ze zmianą danych

---

## Backend

### Zmiana w `skin-weather.service.ts`

Funkcja `fetchWeatherForecastAt13` otrzymuje `cloud_cover` w parametrach godzinowych:

```
&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,uv_index,cloud_cover
```

Pole `cloud_cover` (0–100%) jest przechowywane w `report.weatherData.hourly.cloud_cover[]` automatycznie — bez migracji schematu (pole `weatherData` to `Json` w Prisma).

Nie zmienia się struktura `current` (używana przez `matchRulesToWeather`) — tylko hourly dostaje nowe pole.

---

## Frontend

### Nowy plik

`apps/web/src/components/skin-weather/WeatherDayCard.tsx`

### Interfejs propsów

```ts
interface WeatherDayCardProps {
  weatherData: any; // report.weatherData z API
  cityName?: string;
}
```

### Struktura wizualna (układ C z animacjami C)

```
┌─────────────────────────────────────────────────────┐
│  [emoji]  23°  max 26°                              │
│  Częściowe zachmurzenie · Warszawa                  │
│  [☁ 40% chmur]  [UV max 7 — Wysoki]                │
│                                                     │
│  ▁▂▄▆█▇▅▃▁  ← mini słupki temperatury (06–21h)    │
│  06 08 10 12 [13] 15 17 19 21                       │
│  🌤 ☀  ☀  ⛅  🌞  ⛅  🌥  🌆  🌙              │
│  17° 19° 22° 25° 26° 25° 22° 20° 18°              │
│  UV1 UV3 UV5 UV6 UV7 UV5 UV2 —  —                 │
└─────────────────────────────────────────────────────┘
```

### Dane źródłowe

Z `weatherData.hourly`:
- `time[]` — tablica ISO timestamps (np. `"2026-05-27T13:00"`)
- `temperature_2m[]` — temperatura °C
- `uv_index[]` — UV 0–11
- `precipitation_probability[]` — % szans na deszcz
- `cloud_cover[]` — % zachmurzenia (nowe)

Wyświetlane godziny: co 2h od 06:00 do 21:00 + zawsze godzina 13:00 (łącznie 9 kolumn: 06,08,10,12,13,15,17,19,21).

### Logika emoji pogody

| Warunek | Emoji |
|---------|-------|
| godzina nocna (≥21 lub <6) | 🌙 |
| `cloud_cover` < 20% | ☀️ |
| `cloud_cover` < 50% i `precip` < 30% | 🌤 |
| `cloud_cover` < 50% i `precip` >= 30% | 🌦 |
| `cloud_cover` < 80% | ⛅ |
| `cloud_cover` >= 80% i `precip` >= 50% | 🌧 |
| `cloud_cover` >= 80% | 🌥 |
| godzina 13:00 i UV >= 6 | 🌞 (override) |

### Kolor słupków temperatury

Miniaturowe słupki nad kolumnami (wysokość proporcjonalna do temp w przedziale min–max dnia):

| Temperatura | Kolor |
|-------------|-------|
| < 10°C | `#818cf8` (indigo) |
| 10–18°C | `#a78bfa` (violet) |
| 18–25°C | `#f59e0b` (amber) |
| > 25°C | `#ef4444` (red) + box-shadow glow |

Godzina 13:00 zawsze wyróżniona: kolumna z gradientem `#6366f1→#8b5cf6`, emoji pulsuje.

### Etykieta UV

| Wartość | Kolor tekstu |
|---------|-------------|
| 0–2 | `text-green-400` |
| 3–5 | `text-yellow-400` |
| 6–7 | `text-orange-400` |
| 8+ | `text-red-400` |

### Animacje CSS

1. **Slide-in kaskadowy** — kolumny wjeżdżają z prawej (translateX + opacity), opóźnienie rośnie o 50ms na kolumnę
2. **Bar-grow** — mini słupki temperatury wyrastają z dołu (scaleY 0→1, transform-origin bottom)
3. **Pulse-glow** — godzina 13:00 pulsuje (drop-shadow na emoji)

Wszystkie animacje: `animation-fill-mode: both`, respektują `prefers-reduced-motion` (wyłączają się).

### Fallback

Jeśli `weatherData` jest null/brak godzinowych danych → komponent nie renderuje się (zwraca `null`). Raporty stare (sprzed dodania `cloud_cover`) wyświetlą się poprawnie — emoji logic obsługuje `cloud_cover = undefined` jako `> 80%` (zachowawcze).

---

## Integracja w SkinWeatherProfile

W sekcji B (Today's Report):

```tsx
{/* Nowa karta pogodowa NAD sekcjami reguł */}
{report?.weatherData && (
  <WeatherDayCard
    weatherData={report.weatherData}
    cityName={profile?.cityName}
  />
)}
```

Karta dodana **wewnątrz** `TodayReport`, przed listą `sections`.

---

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `apps/server/src/modules/skin-weather/skin-weather.service.ts` | Dodanie `cloud_cover` do URL hourly |
| `apps/web/src/components/skin-weather/WeatherDayCard.tsx` | Nowy komponent (create) |
| `apps/web/src/pages/user/SkinWeatherProfile.tsx` | Import i renderowanie `WeatherDayCard` |

---

## Testowanie

- Stary raport (bez `cloud_cover` w `weatherData`) → fallback emoji działa, karta się wyświetla
- Nowy raport → wszystkie 9 kolumn z poprawnymi danymi
- `prefers-reduced-motion: reduce` → animacje wyłączone
- Mobile (320px) → horizontal scroll działa, karty nie uciekają
