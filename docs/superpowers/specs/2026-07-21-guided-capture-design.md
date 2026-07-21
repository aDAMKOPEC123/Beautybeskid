# Guided Capture z detekcją twarzy — Design Spec

> **Goal:** Dodać real-time detekcję twarzy (MediaPipe Face Mesh) do kamery SkinScan, walidującą pozycję/rozmiar/oświetlenie/stabilność z podpowiedziami i aktywacją przycisku.

## Kontekst obecnej architektury

Obecny flow (`SkinScan.tsx` → `SkinScanCamera.tsx`):
- **Parent** (`SkinScan.tsx`) zarządza sekwencją 6 ujęć: `FRONT`, `FOREHEAD`, `LEFT_CHEEK`, `RIGHT_CHEEK`, `CHIN`, `NECK`
- Camera component (`ANGLE_COPY`) obsługuje 8 kątów (dodaje `LEFT`, `RIGHT`) ale parent ich nie używa
- **Camera** jest controlled component: `{ angle, previewUrl, onCapture }` — rodzic podaje kąt, kamera zwraca plik
- Parent ma step indicator, nawigację Wstecz/Dalej, przycisk "Analizuj"
- Camera ma `inspectFrame()` sprawdzający brightness (55-210) i contrast (>18) na 96x72 canvas co 700ms
- Camera ma owal prowadzący (CSS border), file input fallback, preview po zdjęciu

**Ta zmiana NIE modyfikuje sekwencji ujęć ani props interface.** Camera pozostaje controlled component. Dodajemy face detection wewnątrz kamery dla walidacji real-time.

## Dwa tryby walidacji: pełnotwarzowe vs zbliżenia

Kluczowa obserwacja: ujęcia dzielą się na dwa typy:
- **Pełnotwarzowe** (`FRONT`): użytkownik trzyma telefon na wyciągniętą rękę, cała twarz widoczna → Face Mesh wykrywa twarz → pełna walidacja (pozycja, rozmiar, stabilność)
- **Zbliżenia** (`FOREHEAD`, `LEFT_CHEEK`, `RIGHT_CHEEK`, `CHIN`, `NECK`): użytkownik zbliża telefon na ~15cm, widać fragment twarzy → Face Mesh prawdopodobnie NIE wykryje twarzy → walidacja ograniczona do oświetlenia

Konfiguracja per kąt w `captureGuides.ts` definiuje `mode: 'full' | 'closeup'`. Dla closeup:
- Warunki 1-3 (twarz, pozycja, rozmiar) → **pominięte**
- Warunki 4-5 (oświetlenie, stabilność*) → aktywne
- Stabilność w trybie closeup: oparta na ruchu pikseli (frame diff), nie na landmarkach
- Owal prowadzący: bez zmiany kolorów (brak danych z Face Mesh)
- Przycisk: aktywny gdy oświetlenie OK

*Stabilność closeup: porównanie dwóch kolejnych klatek na 96x72 canvas — mean absolute difference < próg → stabilna. Proste i nie wymaga Face Mesh.

## Architektura

MediaPipe Face Mesh (468 landmarks) ładowany jako WASM z CDN (`cdn.jsdelivr.net`), uruchamiany na video stream tylko dla ujęć `mode: 'full'`. Wyniki przetwarzane w pure-function module `faceValidation.ts`. Camera component zyskuje nowe zachowania: podpowiedzi pozycjonowania, aktywacja/dezaktywacja przycisku capture.

## Pakiet: `@mediapipe/tasks-vision` (Tasks API)

Wybieramy nowsze Tasks API (`@mediapipe/tasks-vision`) zamiast legacy `@mediapipe/face_mesh`:
- Lepsze API (async, promise-based)
- Aktywnie rozwijane
- WASM + model ładowane z CDN via `createFromOptions({ baseOptions: { modelAssetPath: CDN_URL } })`
- Nie wymaga bundlowania WASM — ładowane dynamicznie z `cdn.jsdelivr.net`
- Konfiguracja: `numFaces: 1`, `refineLandmarks: false` (468 landmarks, bez iris)
- Timeout ładowania: 10s — po przekroczeniu → fallback mode

## Komponenty

### `SkinScanCamera.tsx` (modyfikacja)

Props interface **bez zmian**: `{ angle: SkinScanAngle; previewUrl?: string; onCapture: (file: File) => void }`.

Zmiany wewnętrzne:
- Importuje `useFaceMesh` hook
- Sprawdza `ANGLE_TARGETS[angle].mode` — 'full' vs 'closeup'
- Dla 'full': pełna walidacja (face mesh + lighting)
- Dla 'closeup': tylko lighting + frame-diff stability
- Przycisk capture aktywny tylko gdy `validationResult.ready === true` (z 300ms debounce aktywacji, natychmiastowa dezaktywacja)
- Podpowiedzi wyświetlane pod owalem (zamiast obecnego prostego komunikatu)
- Kolor owalu (tylko w mode 'full'): czerwony → żółty → zielony
- Fallback: jeśli Face Mesh error → przycisk zawsze aktywny, tylko brightness/contrast check (obecne zachowanie)
- `poseHistory` (HeadPose[]): ring buffer max 5 elementów, zarządzany w komponencie, resetowany gdy `angle` prop się zmienia

### `useFaceMesh.ts` (nowy hook)

```typescript
type UseFaceMeshResult = {
  landmarks: NormalizedLandmark[] | null;
  isLoading: boolean;
  error: string | null;
};

function useFaceMesh(
  videoRef: RefObject<HTMLVideoElement>,
  enabled: boolean  // false dla closeup angles — nie uruchamia detekcji
): UseFaceMeshResult
```

- Lazy-loads `@mediapipe/tasks-vision` via dynamic `import()`
- Tworzy `FaceLandmarker` z modelem z CDN (`numFaces: 1`, `refineLandmarks: false`)
- Uruchamia detekcję via `requestAnimationFrame` z throttle (~100ms, co 6 klatek przy 60fps)
- Gdy `enabled=false`: nie uruchamia detection loop, zwraca `landmarks: null, isLoading: false, error: null`
- `FaceLandmarker` instance tworzona raz na pierwszym `enabled=true` i cache'owana w `useRef`. Kolejne przejścia `enabled: false→true` wznawiają RAF loop bez ponownej inicjalizacji modelu.
- Cleanup: dispose na unmount
- Zwraca `error` jeśli WebGL niedostępny, model nie załadował się, lub timeout 10s

### `faceValidation.ts` (nowy, pure functions)

```typescript
type HeadPose = { yaw: number; pitch: number; roll: number };

type ValidationResult = {
  ready: boolean;
  hint: string | null;     // max 1 hint, priorytetyzowany
  hintType: 'error' | 'warning' | 'success';
};

// Oblicza kąty z landmarków (468-point model, refineLandmarks: false):
// nos tip (1), lewe oko (33), prawe oko (263), lewy kącik ust (61),
// prawy kącik ust (291), lewy kontur (234), prawy kontur (454)
// Yaw: kąt z nose tip vs midpoint oczu w płaszczyźnie XZ
// Pitch: kąt z nose tip vs midpoint oczu w płaszczyźnie YZ
// Roll: nachylenie linii oczu
// Landmarks z selfie camera: MediaPipe operuje na raw pixels, nie CSS mirror
computeHeadPose(landmarks: NormalizedLandmark[]): HeadPose

// Bounding box z landmarków vs frame dimensions → ratio 0-1
// OK gdy ratio 0.30-0.60
checkFaceSize(landmarks: NormalizedLandmark[]): { ratio: number; ok: boolean }

// Porównuje ostatnie 5 HeadPose — max delta < 3° na yaw i pitch = stabilna
checkStability(poseHistory: HeadPose[]): boolean

// Frame-diff stability dla closeup: mean absolute diff dwóch klatek (96x72 grayscale)
// Próg: MAD < 8 na skali 0-255 = stabilna. prevFrame przechowywany w useRef, resetowany na zmianę angle.
checkFrameStability(prevFrame: Uint8ClampedArray, currFrame: Uint8ClampedArray): boolean

// Sprawdza brightness (mean 55-210) i contrast (>18) — zachowuje obecne progi
checkLighting(brightness: number, contrast: number): { ok: boolean; hint: string | null }

// Walidacja dla mode 'full' — wszystkie 5 warunków
validateFullMode(
  landmarks: NormalizedLandmark[] | null,
  targetAngle: AngleTarget,
  brightness: number,
  contrast: number,
  poseHistory: HeadPose[]
): ValidationResult

// Walidacja dla mode 'closeup' — tylko lighting + frame stability
validateCloseupMode(
  brightness: number,
  contrast: number,
  frameStable: boolean
): ValidationResult
```

### `captureGuides.ts` (nowy, konfiguracja)

```typescript
type FullAngleTarget = {
  angle: SkinScanAngle;
  mode: 'full';
  targetYaw: number;
  targetPitch: number;
  yawTolerance: number;
  pitchTolerance: number;
  hintTooLeft: string;
  hintTooRight: string;
  hintTooUp: string;
  hintTooDown: string;
};

type CloseupAngleTarget = {
  angle: SkinScanAngle;
  mode: 'closeup';
};

type AngleTarget = FullAngleTarget | CloseupAngleTarget;

const ANGLE_TARGETS: Record<SkinScanAngle, AngleTarget>
```

| Angle | Mode | Yaw | Pitch | Yaw tol. | Pitch tol. |
|-------|------|-----|-------|----------|------------|
| FRONT | full | 0° | 0° | ±10° | ±10° |
| LEFT | full | -30° | 0° | ±12° | ±10° |
| RIGHT | full | +30° | 0° | ±12° | ±10° |
| FOREHEAD | closeup | — | — | — | — |
| LEFT_CHEEK | closeup | — | — | — | — |
| RIGHT_CHEEK | closeup | — | — | — | — |
| CHIN | closeup | — | — | — | — |
| NECK | closeup | — | — | — | — |

Wszystkie 8 `SkinScanAngle` mają wpis w `ANGLE_TARGETS`. Parent używa 6 (bez LEFT/RIGHT), ale jeśli kiedykolwiek przekaże LEFT/RIGHT — zadziała poprawnie.

**Uwaga o mirrorze:** CSS `scaleX(-1)` na video to tylko display transform. MediaPipe przetwarza surowe piksele z kamery — landmark coordinates odpowiadają surowym pikselom. Konfiguracja targetYaw jest w coordinate space landmarków (surowe piksele), a hinty mówią użytkownikowi co zrobić w jego perspektywie (mirror).

## Warunki aktywacji przycisku

### Mode 'full' (FRONT, LEFT, RIGHT)

| # | Warunek | Parametr | Hint |
|---|---------|----------|------|
| 1 | Twarz wykryta | landmarks != null | "Umieść twarz w owalu" |
| 2 | Poprawna pozycja | yaw/pitch w tolerancji | Kontekstowy (per kąt) |
| 3 | Odpowiedni rozmiar | ratio 0.30-0.60 | "Przesuń bliżej" / "Odsuń się" |
| 4 | Oświetlenie | brightness 55-210, contrast >18 | "Więcej światła" / "Za jasno" / "Oczyść obiektyw" |
| 5 | Stabilność | <3° zmiana w 5 klatkach | "Nie ruszaj się" |

Priorytet: 1 > 2 > 3 > 4 > 5. Max 1 hint.

### Mode 'closeup' (FOREHEAD, LEFT_CHEEK, RIGHT_CHEEK, CHIN, NECK)

| # | Warunek | Parametr | Hint |
|---|---------|----------|------|
| 1 | Oświetlenie | brightness 55-210, contrast >18 | "Więcej światła" / "Za jasno" / "Oczyść obiektyw" |
| 2 | Stabilność | frame diff < próg | "Nie ruszaj się" |

Max 1 hint.

## Przycisk UI

- **Nieaktywny:** `opacity-50`, `pointer-events-none`, szary
- **Aktywny:** zielony z `animate-pulse`, tekst bez zmian
- Debounce: 300ms na aktywację (warunki muszą być ciągiem spełnione), natychmiastowa dezaktywacja. Timer resetowany (`clearTimeout`) przy każdej zmianie `angle` prop.
- Istniejący przycisk "Wybierz z urządzenia" (file input) **bez zmian** — działa zawsze, bez walidacji face mesh

## Owal prowadzący

Istniejący owal CSS zostaje. Zmiana koloru **tylko w mode 'full'**:
- Czerwony (`border-red-400`): twarz nie wykryta lub poważny problem
- Żółty (`border-amber-400`): prawie dobrze (1-2 warunki niespełnione)
- Zielony (`border-emerald-400`): wszystko OK

W mode 'closeup': owal zachowuje domyślny kolor (bez zmian).

## Fallback

Jeśli `useFaceMesh` zwraca `error` (brak WebGL, timeout 10s, stary telefon):
- Przycisk capture zawsze aktywny (jak obecnie)
- Podpowiedzi tylko brightness/contrast (obecny `inspectFrame` logic na 700ms interval)
- Owal bez zmiany kolorów
- Zero zmian w UX vs obecne zachowanie
- File input: zawsze dostępny jako escape hatch niezależnie od trybu

## Performance

- W mode 'full': `inspectFrame` 700ms interval → usunięty, brightness/contrast w pętli face mesh (~100ms)
- W mode 'closeup': brightness/contrast + frame diff na ~200ms interval (lżejsze niż face mesh)
- Na urządzeniach bez WebGL (fallback): inspectFrame na 700ms
- Face Mesh ~100ms per frame na mid-range mobile
- Lazy loading: `@mediapipe/tasks-vision` ładowany dynamicznie dopiero gdy kamera aktywna i mode='full'

## WASM/Model hosting

- WASM + model (~4MB łącznie) ładowane z `cdn.jsdelivr.net/npm/@mediapipe/tasks-vision`
- Nie bundlujemy do Vite build — zero wpływu na bundle size
- Przeglądarka cache'uje po pierwszym pobraniu
- Loading state: video stream widoczny natychmiast, mały overlay badge "Ładowanie detekcji..." w rogu. Przycisk nieaktywny do załadowania. Dla closeup angles: video widoczne od razu (face mesh nie ładowany).
- Timeout: 10s — po przekroczeniu aktywuje się fallback mode

## Zależności

- `@mediapipe/tasks-vision` — dodać do `apps/web/package.json` (npm types + CDN runtime)

## Testowanie

- `faceValidation.test.ts` — unit testy: computeHeadPose (znane landmarks → oczekiwane kąty), checkFaceSize (small/ok/large), checkStability (stable/moving), checkFrameStability (still/moving frames), validateFullMode (all combinations), validateCloseupMode (light ok/dark/unstable), checkLighting (dark/bright/ok/low-contrast)
- `captureGuides.test.ts` — walidacja konfiguracji (wszystkie 8 SkinScanAngle mają target, mode jest 'full' lub 'closeup', full-mode ma tolerancje > 0 i hinty niepuste)
- Manual: guided capture na telefonie end-to-end (FRONT z face mesh + closeup bez)

## Scope — czego NIE robimy

- Nie zmieniamy sekwencji ujęć (parent zarządza)
- Nie zmieniamy props interface kamery
- Nie dodajemy auto-capture
- Nie dodajemy preprocessing (to osobna faza)
- Nie walidujemy zdjęć z file input (fallback path)
- Nie dodajemy accessibility (ARIA) w tym scope — przyszłe ulepszenie
