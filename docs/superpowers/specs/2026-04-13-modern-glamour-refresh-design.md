# COSMO – Modern Glamour Refresh · Design Spec

**Data:** 2026-04-13
**Typ zmian:** Visual Refresh (bez zmian funkcjonalności)
**Obszar:** Strony publiczne, panel użytkownika, komponenty UI, doświadczenie mobilne
**Nie obejmuje:** Panel admina, panel pracownika, logika backendowa

---

## 1. Kierunek wizualny

### Zatwierdzone podejście: Modern Glamour

Zachowujemy istniejące DNA marki (paleta caramel + espresso, Playfair Display + DM Sans), dodając nową warstwę wizualnego charakteru:

- **Geometryczne dekoracje** — duże gradient circles, dekoracyjne łuki (arc) i linie jako elementy tła
- **Sekcje numerowane** — wielkie cyfry (01, 02, 03…) jako subtelna typograficzna dekoracja (opacity ~7%)
- **Pewny siebie CTA** — przyciski z ikonką strzałki w kółku, ghost z podkreśleniem zamiast borderów
- **Editorial eyebrow** — linia-pozioma + wersaliki zamiast pill badge (wyjątek: patrz 2.1)
- **Dekoracyjne cudzysłowy i litery** — wielkie znaki w tle sekcji testimonials/quote (opacity ~8%)
- **Floating badges** — subtelne okrągłe etykiety z informacją kontekstową (np. "Salon od 2018")

### Paleta — bez zmian

```
--ivory:    #FAF7F2   (tło główne)
--cream:    #F0EBE3   (tło sekcji alternatywnych)
--espresso: #1C1510   (tekst główny)
--caramel:  #C4A882   (akcenty, dekoracje)
--walnut:   #8C6A4A   (akcenty wtórne)
--mink:     #6B5A4E   (tekst drugorzędny)
```

### Typografia — bez zmian fontów, zmiany w użyciu

- Eyebrow labels: z pill-badge na `linia + wersaliki`
- Cytaty (testimonials): `font-family: Playfair Display, font-style: italic`
- Sekcje numerowane: Playfair Display, bardzo duże, bardzo niskie opacity

---

## 2. Strony publiczne

### 2.1 Nawigacja (Navbar)

**Zmiany:**
- Dodać CTA "Rezerwacja" po prawej stronie jako `variant="ghost-underline"` (patrz sekcja 4.1) — nie pill, żeby zachować spójność z anti-pill design direction. Na mobile ukryć (wystarczy FloatingBookingCTA).
- Logo: drobna zmiana — `letter-spacing: 0.08em` dla bardziej editorial feel
- Aktywny link: zamiast tylko koloru, dodać thin underline (2px, caramel, `border-bottom`)

**Bez zmian:** layout, kolejność linków, logika scroll-shrink, responsywność

### 2.2 HeroSlider

**Zmiany:**
- Dodać subtelną geometryczną nakładkę na slajdach: dekoracyjny arc/łuk w prawym górnym rogu każdego slajdu (SVG, stroke caramel 20% opacity, `pointer-events: none`)
- Tekst slajdu: dodać horizontal line (24px, caramel) przed eyebrow label

**Bez zmian:** logika slidera, auto-rotate, Ken Burns, responsive

### 2.3 Sekcja Hero (pod sliderem)

**Zmiany:**
- Wielki dekoracyjny numer `01` jako background element (prawy róg, Playfair, ~130px, `color: rgba(196,168,130,0.07)`, `pointer-events: none`, `user-select: none`, `position: absolute`)
- Wielki gradient circle: `radial-gradient(circle, rgba(196,168,130,0.18) 0%, transparent 70%)`, top-right, ~240px, `position: absolute`, `pointer-events: none`
- Dekoracyjny arc: `border-radius: 50%; border: 1px solid rgba(196,168,130,0.25)`, top-right ~100px, `position: absolute`, `pointer-events: none`
- Floating badge: okrąg 72px, "Salon od 2018", `border: 1px solid rgba(196,168,130,0.4)`, prawy górny narożnik, `position: absolute`
- Eyebrow: pill-badge → `<DecoLine /> + wersaliki DM Sans` (komponent z sekcji 6.1)
- Główny CTA button: dodać ikonkę `ArrowRight` (lucide, 14px, w kółku `w-5 h-5 rounded-full bg-white/15`) wewnątrz buttona po prawej
- Drugorzędny button: z `variant="outline"` na `variant="ghost-underline"` (sekcja 4.1)

**Bez zmian:** layout grid, tekst, linki, logika slot availability, slot urgency indicator

### 2.4 Sekcja Usługi sezonowe

**Zmiany:**
- Nagłówek sekcji: dodać `<SectionNumber n={2} opacity={0.12} />` (komponent z sekcji 6.1) po prawej w nagłówku
- Sekcja label: wersaliki z `<DecoLine />` z lewej
- Karty usług: dodać `→` (`ArrowRight` 12px, muted color) w prawym dolnym rogu każdej karty
- Footer karty: `flex justify-between` z ceną po lewej i strzałką po prawej
- Tło sekcji: `#EDE8DE` zamiast jednolitego cream

**Bez zmian:** grid kart, filtrowanie sezonów, linki do usług, responsywność

### 2.5 Sekcja Testimonials

**Zmiany:**
- Dekoracyjny numer `03` w nagłówku sekcji (analogicznie do `01` i `02`)
- Header: `<DecoLine /> — OPINIE KLIENTEK — <DecoLine />` (centered, editorial)
- Dodać wielki dekoracyjny cudzysłów `"` w tle sekcji (`position: absolute`, Playfair italic, ~120px, `color: rgba(196,168,130,0.08)`, `pointer-events: none`)
- Cytaty: `fontFamily: 'Playfair Display', fontStyle: 'italic'` (zamiast DM Sans)
- Rating: zastąpić gwiazdki kolorowymi "pałeczkami" (prostokąty `14×2px`, `border-radius: 1px`, caramel vs `rgba(196,168,130,0.25)`)
- Imię + label: `text-[10px] tracking-[0.1em] uppercase`

**Bez zmian:** treść cytatów, layout 3-kolumnowy, responsywność

### 2.6 Ticker (scrolling labels)

**Zmiany:**
- Dodać separator `·` między elementami
- Tło paska: użyć klasy Tailwind `bg-espresso` (CSS variable `var(--espresso)` przez token systemu) zamiast ivory; tekst: `text-caramel`
- ⚠️ Jeśli app ma dark mode toggle aktywny dla tickera, zastosować `dark:bg-ivory dark:text-espresso` (light/dark inversion)

**Bez zmian:** animacja `@keyframes ticker`, prędkość, treść

### 2.7 FAQ Section

**Zmiany:**
- Dodać `<SectionNumber n={4} />` w tle nagłówka (opacity 7%)
- Strzałka expand/collapse: zmienić kolor na caramel

**Bez zmian:** logika expand/collapse, treść, schema.org

### 2.8 Strona Usługi (ServiceList)

**Zmiany:**
- Hero sekcja: dodać `<GeoArc />` (komponent z sekcji 6.1) w prawym narożniku
- Service cards: dodać `ArrowRight` 12px w prawym dolnym rogu, poprawić hover: `scale(1.03) + shadow-lg` razem (transition 300ms)
- Sticky header: dodać `border-b border-caramel/20`

**Bez zmian:** grid, filtrowanie, linki, glassmorphism overlay

### 2.9 Strona Blog

**Zmiany:**
- Card: dodać datę publikacji jako duży dekoracyjny element tła (`opacity: 0.07`, Playfair, ~48px)
- "Czytaj dalej" link: zmienić na `variant="ghost-underline"` (sekcja 4.1)
- Category labels: `uppercase tracking-widest text-[10px]` z `<DecoLine />` z lewej

**Bez zmian:** layout, routing, paginacja

---

## 3. Panel użytkownika

### 3.1 Dashboard

**Zmiany:**
- Powitanie (`Cześć, {name}!`): dodać `<DecoLine />` (40px, caramel) przed nagłówkiem
- Loyalty progress bar: zastąpić prostym bar na segmented bar z trzema segmentami i etykietami tierów. **Progi zapisane statycznie w komponencie, wyrównane z istniejącym systemem punktów:** Brąz 0–499 pkt, Srebro 500–1499 pkt, Złoto 1500+ pkt (zgodnie z BRONZE/SILVER/GOLD z `loyalty.service.ts`). Dane z istniejącego `loyaltyApi.getStats` (pole `points`) — bez nowych wywołań API.
- Karty sekcji: dodać `background: linear-gradient(135deg, var(--ivory), var(--cream))` zamiast jednolitego
- Empty states (brak wizyt, brak osiągnięć, itp.): dodać geometryczne SVG ilustracje inline (proste, w stylu caramel, `w-16 h-16`, bez zależności zewnętrznych)

**Bez zmian:** layout, kolejność widgetów, logika danych, wszystkie istniejące podkomponenty Dashboard

### 3.2 Appointments (Moje wizyty)

**Zmiany:**
- Status badges: obecne kolory zachowane, dodać `border-l-[3px] border-l-[color]` (ten sam kolor co tło, ale pełna opacity) zamiast samego półprzezroczystego tła
- "Brak wizyt" empty state: dodać geometryczną ikonę kalendarza SVG (inline, caramel accent, `w-12 h-12`)
- Upcoming appointment card: dodać `border-l-[3px] border-l-caramel` po lewej stronie karty

**Bez zmian:** CalendarView, ClientDrawer, HappyHourModal, logika rezerwacji

### 3.3 Profil

**Zmiany:**
- Avatar: dodać `ring-2 ring-caramel/40` + `shadow-[0_0_20px_rgba(196,168,130,0.2)]`
- Section headers: `<DecoLine /> + wersaliki` (editorial eyebrow style)

**Bez zmian:** formularz, upload, logika zapisu

### 3.4 Skin Journal

**Zmiany:**
- Entry cards: dodać mood indicator jako kolorową pałeczkę (mood 1–5 → 5 prostokątów 10×3px, caramel intensity)
- Pusty dziennik: dodać geometric empty state SVG (inline, book/journal icon w stylu caramel)

**Bez zmian:** logika wpisów, zdjęcia, komentarze admina

### 3.5 Skeletons (loading states)

**Zmiany:**
- W pliku `apps/web/src/components/ui/skeleton.tsx`: zmienić klasę `bg-muted` na inline style lub custom Tailwind class z caramel shimmer:
  - Base: `background: rgba(196,168,130,0.08)`
  - Shimmer animation: `linear-gradient(90deg, rgba(196,168,130,0.05), rgba(196,168,130,0.15), rgba(196,168,130,0.05))`
  - Zaktualizować `@keyframes skeleton-shimmer` w `index.css` lub dodać nowy

**Bez zmian:** kształty, layout, timing animacji

---

## 4. Komponenty UI

### 4.1 Button

**Zmiany w `apps/web/src/components/ui/button.tsx`:**
- `variant="default"`: dodać `transition-all hover:scale-[1.02] hover:brightness-105 active:scale-[0.98]`
- `variant="outline"`: hover → `hover:border-caramel hover:bg-caramel/8`
- Nowy `variant="ghost-underline"`: `bg-transparent text-foreground underline-offset-4 hover:underline` + brak border/shadow. Używany w nawigacji i "Czytaj dalej" linkach.
- Press state: `active:scale-[0.98]` na wszystkich wariantach (duration 80ms)

**Bez zmian:** size variants, disabled state, loading state, istniejące użycia (nowe style są addytywne via hover/active)

### 4.2 Input

**Zmiany w `apps/web/src/components/ui/input.tsx`:**
- Focus ring: nadpisać Tailwind ring utilities przez dodanie do klasy komponentu: `focus-visible:ring-0 focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_rgba(196,168,130,0.35)]`
  - To zastępuje istniejące `focus-visible:ring-1 focus-visible:ring-ring` bez łamania radix/shadcn form integration
- Placeholder: dodać `placeholder:text-[#B8A898]`
- **Float-label animation: NIE implementować** — komponent `Input` jest bare `<input>` bez wrappera label. Animacja float-label wymagałaby stworzenia nowego wrappera, co wykracza poza zakres tego refreshu.

**Bez zmian:** walidacja, error states, API komponentu, wartości props

### 4.3 Card

**Zmiany w `apps/web/src/components/ui/card.tsx`:**
- Dodać opcjonalny prop `accent?: boolean` do `CardProps` interface. **Filtrować z DOM:** `const { accent, className, ...rest } = props` przed przekazaniem do `<div>`. Gdy `accent={true}`: dodać `border-l-[3px] border-l-caramel` do klas.
- Dla klikalnych kart (używających `onClick` lub `as="button"`): dodać `hover:-translate-y-0.5 hover:shadow-md transition-all duration-200`

**Bez zmian:** padding, layout, istniejące użycia (prop `accent` jest opcjonalny, domyślnie `false`)

### 4.4 Badge / Status Label

**Zmiany:**
- W `apps/web/src/pages/user/Appointments.tsx` (inline status badge styles): dodać `borderLeft: '3px solid currentColor'` do obiektów stylów statusów

**Bez zmian:** kolory, logika, inne użycia Badge

### 4.5 Loading Spinner (nowy komponent)

**Uwaga:** Brak istniejącego komponentu `Spinner` w codebase. W ramach tego refreshu **stworzyć nowy** plik `apps/web/src/components/ui/spinner.tsx`:

```tsx
// Trzy animowane prostokąty (stagger), caramel, bez zależności
export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) { ... }
```

Zastosować w miejscach gdzie obecnie używane są generyczne `animate-spin` divs lub `Loader2` z lucide.

**Nie modyfikować:** istniejących użyć `Loader2` w miejscach gdzie Spinner nie pasuje kontekstowo

---

## 5. Doświadczenie mobilne

### 5.1 Bottom Navigation

**Zmiany w `apps/web/src/components/layout/MobileBottomNav.tsx`:**
- Aktywny tab: dodać `w-4 h-0.5 bg-caramel rounded-full mx-auto mb-0.5` nad ikoną jako indicator dot/line
- Tło nav: dodać `backdrop-blur-md` + `bg-gradient-to-t from-ivory to-ivory/90`
- Touch targets: upewnić się że każdy link-element ma `min-h-[44px] min-w-[44px]`

**Bez zmian:** linki, kolejność, badge logic, "Więcej" sheet

### 5.2 Cards na mobile

**Zmiany — tylko w tych konkretnych komponentach** (nie globalnie):
- `AppointmentCard.tsx`: zmienić `p-4` na `p-5` na breakpointach `<= sm`
- `ServiceCard` (w public pages): upewnić się że padding na mobile jest min `p-4`
- CTA buttons w listach: dodać `min-h-[44px]` jeśli brakuje

**Bez zmian:** `Card` UI component (używa `p-6`), wszystkie inne komponenty

### 5.3 BookingWizard na mobile

**Zmiany w `apps/web/src/pages/user/BookingWizard.tsx`:**
- Step indicator: zmienić na `flex gap-2 justify-center` z dot-circles (`w-2 h-2 rounded-full`, active: `bg-caramel w-4`, inactive: `bg-caramel/25`)
- Główne CTA button (krok dalej/rezerwuj): `w-full min-h-[52px]` na mobile

**Bez zmian:** logika kroków, formularze, wybór usług, walidacja

---

## 6. Tożsamość wizualna (Branding details)

### 6.1 Dekoracyjne komponenty SVG

Stworzyć plik `apps/web/src/components/shared/DecoElements.tsx` z 4 reużywalnymi komponentami. Wszystkie mają `pointer-events: none`, `user-select: none`, `position: absolute`, `aria-hidden: true`.

- `<GeoCircle size={240} opacity={0.18} className="..." />` — radial gradient circle
- `<GeoArc size={100} opacity={0.25} className="..." />` — ćwiartka okręgu (stroke only)
- `<SectionNumber n={1} opacity={0.07} className="..." />` — Playfair Display ~130px
- `<DecoLine className="..." />` — `w-6 h-px bg-caramel inline-block`

### 6.2 Ikony (lucide-react)

Nie wymieniamy biblioteki. Zmiany:
- Zmienić domyślny `strokeWidth` na `1.5` w miejscach gdzie ikony pełnią rolę dekoracyjną / nawigacyjną (sidebar, bottom nav, section icons). Ikony akcji (formularze, przyciski) zostawiamy `2`.
- Aktywne ikony w nawigacji: zmienić z `text-muted-foreground` na `text-caramel`

### 6.3 Tekstury tła

Zamiast data URI SVG noise (trudne w utrzymaniu), użyć CSS-only grain effect:

```css
/* Dodać do index.css */
.grain-overlay {
  position: relative;
}
.grain-overlay::after {
  content: '';
  position: absolute; inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
  background-size: 200px 200px;
  opacity: 0.025;
  pointer-events: none;
  z-index: 0;
}
```

Zastosować klasę `.grain-overlay` tylko na hero sections stron publicznych.

---

## 7. Animacje (uzupełnienia do istniejących)

**Istniejące animacje do zachowania bez zmian:**
- Page transitions (framer-motion fade)
- Clip reveal (scroll-triggered)
- HeroSlider Ken Burns
- FloatingCTA slide-up

**Nowe micro-animacje:**
- Button hover: `scale(1.02)` + `brightness(1.05)`, duration 150ms — via Tailwind `transition-all`
- Button press: `scale(0.98)`, duration 80ms — via Tailwind `active:scale-[0.98]`
- Card hover (klikalne): `translateY(-2px)` + shadow, duration 200ms
- GeoCircle + GeoArc float: CSS keyframe `@keyframes deco-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }`, duration 6s, `ease-in-out`, `infinite`. Stosować tylko gdy `not prefers-reduced-motion`.

**Dostępność — reduced motion:**
```css
/* Dodać do index.css */
@media (prefers-reduced-motion: reduce) {
  .deco-float { animation: none !important; }
}
```
Framer-motion animations already use `useReducedMotion()` hook — bez zmian.

---

## 8. Co pozostaje bez zmian

- Cała logika biznesowa i backend
- Struktura routingu
- Wszystkie formularze i walidacje
- Panel admina i pracownika
- Paleta kolorów (rozszerzona, nie zastąpiona)
- Biblioteki (framer-motion, lucide-react, fullcalendar, etc.)
- Kontrast tekstu (WCAG AA zachowany)
- `useReducedMotion()` dla framer-motion animations (już działa)

---

## 9. Kolejność implementacji

1. **Komponenty dekoracyjne** — stworzyć `DecoElements.tsx` (`GeoCircle`, `GeoArc`, `SectionNumber`, `DecoLine`)
2. **Button + Card + Input** — zaktualizować hover/press states, `ghost-underline` variant, `accent` prop, focus ring
3. **Spinner** — stworzyć `apps/web/src/components/ui/spinner.tsx`
4. **index.css** — dodać grain overlay CSS, `@keyframes deco-float`, `prefers-reduced-motion` guard
5. **Strona Home** — zastosować wszystkie zmiany sekcja po sekcji (2.3→2.7)
6. **Navbar** — ghost-underline CTA, active underline, logo tracking
7. **HeroSlider** — arc overlay, eyebrow line
8. **ServiceList** — arc hero, cards arrow, hover fix
9. **Blog** — date deco, ghost-underline CTA, labels
10. **Dashboard** — DecoLine, segmented loyalty bar, empty states, card gradients
11. **Appointments** — status border-l, empty state SVG, upcoming card border-l
12. **Profil** — avatar ring, section headers
13. **Skeletons** — caramel shimmer w `skeleton.tsx` i `index.css`
14. **Bottom Nav** — caramel indicator, blur bg, touch targets
15. **BookingWizard mobile** — step dots, button height
16. **Skin Journal** — mood bars, empty state

---

## 10. Kryteria sukcesu

- [ ] Wszystkie zmiany są czysto wizualne — zero zmian w logice, routingu ani API
- [ ] Nowe elementy dekoracyjne mają `pointer-events: none` i `aria-hidden="true"`
- [ ] Kontrast tekstu spełnia WCAG AA (zachowany obecny standard)
- [ ] CSS keyframe animacje dekoracyjne mają `@media (prefers-reduced-motion: reduce) { animation: none }`
- [ ] Framer-motion animations nadal respektują `useReducedMotion()` (bez zmian)
- [ ] `accent` prop w Card jest odfiltrowany z DOM (brak React warnings w konsoli)
- [ ] Loyalty segmented bar używa statycznych progów punktowych (0/500/1500) zgodnych z backendem — brak nowych wywołań API
- [ ] Nie ma regressions w istniejących testach (logika serwerowa)
- [ ] Wygląd spójny na mobile (375px) i desktop (1280px+)
- [ ] Spinner komponent nie łamie istniejących loading states
