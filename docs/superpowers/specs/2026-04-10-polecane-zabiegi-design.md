# Polecane Zabiegi — Design Spec

**Date:** 2026-04-10
**Status:** Approved

## Problem / Motivation

Klienci wchodzący na dashboard nie mają żadnego spersonalizowanego kontekstu marketingowego dotyczącego aktualnej oferty zabiegowej. Admin chce móc promować wybrane zabiegi (np. sezonowe, specjalne) bezpośrednio w dashboardzie klienta — z obrazem tła, opisem „dlaczego teraz" i bezpośrednim linkiem do rezerwacji.

## Scope

Funkcja **globalna** — admin ustawia zestaw polecanych zabiegów widoczny dla wszystkich zalogowanych klientów. Brak personalizacji per-user w tym zakresie.

## User Stories

- **Admin**: Mogę wejść w `/admin/polecane-zabiegi`, wybrać zabieg z listy, dodać opis „dlaczego teraz", wgrać zdjęcie tła i opublikować slajd.
- **Admin**: Mogę zarządzać kolejnością, aktywować/dezaktywować i usuwać slajdy.
- **Klient**: W dashboardzie widzę slider polecanych zabiegów między kafelkami statystyk a przyciskiem „+ Umów wizytę". Każdy slajd pokazuje nazwę zabiegu, opis, cenę i przycisk rezerwacji.
- **Klient**: Slider jest niewidoczny gdy admin nie ma żadnych aktywnych slajdów.

## Data Model

### Nowy model Prisma: `RecommendedSlide`

```prisma
model RecommendedSlide {
  id          String   @id @default(cuid())
  serviceId   String
  service     Service  @relation(fields: [serviceId], references: [id], onDelete: Cascade)
  description String   // "dlaczego teraz" — krótki tekst admina
  imagePath   String   // osobne zdjęcie tła (nie zdjęcie serwisu)
  isActive    Boolean  @default(true)
  order       Int      @default(0)
  createdAt   DateTime @default(now())
}
```

Relacja dodana do modelu `Service`:
```prisma
recommendedSlides RecommendedSlide[]
```

### Image processing
- Folder: `recommended` w `uploads/`
- Format: WebP, 1200×675 (16:9), quality 85 — reuses `processAndSaveImage()` from `utils/imageProcessor.ts`

## Backend

### Moduł: `apps/server/src/modules/recommended-slides/`

Pliki: `router.ts`, `controller.ts`, `service.ts`

#### Endpointy

| Method | Path | Auth | Opis |
|--------|------|------|------|
| GET | `/recommended-slides` | Public | Aktywne slajdy (z danymi serwisu) — dla dashboardu |
| GET | `/recommended-slides/all` | Admin | Wszystkie slajdy |
| POST | `/recommended-slides` | Admin | Utwórz slajd (multipart: image + serviceId + description) |
| PATCH | `/recommended-slides/:id` | Admin | Edytuj opis / aktywność / order |
| DELETE | `/recommended-slides/:id` | Admin | Usuń slajd |

#### Odpowiedź GET /recommended-slides

```json
{
  "status": "success",
  "data": {
    "slides": [
      {
        "id": "...",
        "description": "Idealne na wiosnę",
        "imagePath": "/uploads/recommended/xxx.webp",
        "order": 0,
        "service": {
          "id": "...",
          "name": "Peeling kawitacyjny twarzy",
          "slug": "peeling-kawitacyjny-twarzy",
          "price": "180.00",
          "category": "Twarz"
        }
      }
    ]
  }
}
```

#### Rejestracja w `app.ts`
```ts
import recommendedSlidesRouter from './modules/recommended-slides/router';
app.use('/api/recommended-slides', recommendedSlidesRouter);
```

## Frontend — Admin

### Strona: `apps/web/src/pages/admin/RecommendedSlides.tsx`

Wzorowana na `HeroSlides.tsx`. Zawiera:

1. **Formularz dodawania** (góra strony):
   - Dropdown wyboru zabiegu (lista aktywnych serwisów z `servicesApi.getAll()`)
   - Textarea „Dlaczego teraz?" (max ~120 znaków)
   - Upload zdjęcia z crop 16:9 (reuses crop logic z `HeroSlides.tsx`)
   - Przycisk „Dodaj polecany zabieg"

2. **Lista slajdów** (dół):
   - Miniatura + nazwa zabiegu + opis
   - Toggle aktywny/nieaktywny
   - Przycisk edycji inline (opis + aktywność)
   - Przycisk usunięcia z potwierdzeniem

### Route w `router.tsx`

```tsx
{ path: 'polecane-zabiegi', element: <RecommendedSlides /> }
// wewnątrz AdminLayout
```

### API client: `apps/web/src/api/recommended-slides.api.ts`

Funkcje: `getSlides()`, `getAllSlides()`, `createSlide(formData)`, `updateSlide(id, data)`, `deleteSlide(id)`

## Frontend — Dashboard klienta

### Nowy komponent: `apps/web/src/components/dashboard/RecommendedSlider.tsx`

- Pobiera dane: `useQuery(['recommended-slides'], recommendedSlidesApi.getSlides)`
- Renderuje 0 elementów (null) gdy brak aktywnych slajdów
- Slider z auto-rotate (5s), przyciskami prev/next, dot-indicators — wzorowany na `HeroSlider.tsx`
- Styl każdego slajdu:
  - Pełna szerokość, `border-radius: 16px`
  - Zdjęcie tła z gradient overlay (dark, jak w mockupie)
  - Złoty label „✨ Polecany zabieg" (`#B8913A`)
  - Nazwa zabiegu (biały, bold)
  - Opis „dlaczego teraz" (biały/szary)
  - Cena (złota)
  - Przycisk „Zarezerwuj →" → `/rezerwacja` (link z query param `?service=slug`)

### Integracja w `Dashboard.tsx`

```tsx
// Po grid 2x2, PRZED primary CTA:
<RecommendedSlider />

<Link to="/rezerwacja" ...>
  + Umów wizytę
</Link>
```

## Patterns to reuse

| Co | Skąd |
|----|------|
| Image upload + crop 16:9 | `apps/web/src/pages/admin/HeroSlides.tsx` |
| `processAndSaveImage()` | `apps/server/src/utils/imageProcessor.ts` |
| Multer middleware | `apps/server/src/config/multer.ts` |
| Slider auto-rotate logic | `apps/web/src/components/public/HeroSlider.tsx` |
| Admin CRUD pattern | `apps/server/src/modules/hero/` |
| React Query + mutations | `apps/web/src/pages/admin/HeroSlides.tsx` |

## Verification

1. `pnpm prisma:migrate` — migracja dodaje tabelę `RecommendedSlide`
2. Admin wchodzi na `/admin/polecane-zabiegi`, dodaje slajd z zdjęciem → widzi go na liście
3. Klient otwiera dashboard — slider widoczny nad przyciskiem „+ Umów wizytę"
4. Klik „Zarezerwuj →" prowadzi do `/rezerwacja`
5. Admin dezaktywuje ostatni slajd → slider znika z dashboardu klienta
6. `pnpm test` w `apps/server/` — testy przechodzą
