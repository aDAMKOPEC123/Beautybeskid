# Skin Scan — wizualne overlay zmian skórnych

Data: 2026-07-20
Status: zatwierdzony (rev 2 — po review)

## Cel

Dodać wizualne adnotacje (overlay) na zdjęciach ze skanu skóry, pokazujące użytkownikowi dokładnie gdzie na twarzy występują zmiany: zmarszczki, przebarwienia, rumień (faza 1) oraz trądzik (faza 2).

## Fazy

### Faza 1 — overlay z istniejących masek (bez nowego modelu)

Modele zmarszczek, przebarwień i rumienia już obliczają maski pikselowe, ale wyrzucają je i zwracają tylko wartości liczbowe. Faza 1 zachowuje te maski i zwraca je jako overlay PNG.

### Faza 2 — YOLOv8-nano dla detekcji trądziku

Wytrenować YOLOv8-nano na zbiorze ACNE04-v2 (32 443 adnotacji bbox). Model ~6MB, inference CPU ~100-200ms. Zwraca bounding boxy zmian trądzikowych, renderowane jako overlay PNG.

## Architektura

### Python service (`services/skin-analysis/`)

#### Zmiany w `analysis.py`

Nowa funkcja `encode_overlay(mask, color, original_shape)`:
- Przyjmuje binarną maskę numpy (dowolna rozdzielczość), kolor RGBA, rozmiar oryginalnego zdjęcia
- Skaluje maskę do rozmiaru oryginału (cv2.resize INTER_NEAREST) — to jedyne miejsce upscalingu
- Tworzy RGBA obraz: piksele z maską=True -> podany kolor, reszta -> przezroczysty
- Koduje jako PNG -> base64 string (bez prefixu data:)
- Zwraca czysty base64 string

#### Zmiany w `color_indices()`

Zmiana sygnatury — zwraca tuple `(stats_dict, pigmentation_mask, redness_mask)`:
- `stats_dict` — istniejący dict z `skinPixels`, `pigmentationCoverage`, `rednessCoverage` (bez zmian)
- `pigmentation_mask` — numpy bool array w rozdzielczości wejściowego bgr
- `redness_mask` — numpy bool array w rozdzielczości wejściowego bgr

Callery (`analyze()`) aktualizowane: `row, pig_mask, red_mask = color_indices(...)`. Lista `color_rows` nadal zbiera tylko `stats_dict`, bez zmian w `weighted_coverage()`.

#### Zmiany w `WrinkleModel.predict()` (`models.py`)

Dodaje `wrinkle_mask` do zwracanego dict — numpy bool array w rozdzielczości modelu (`self.image_size`). `encode_overlay()` sam przeskaluje do rozmiaru oryginału.

#### Nowy model `AcneDetectorModel` (faza 2)

- Klasa w `models.py` ladujaca YOLOv8-nano ONNX
- `predict(bgr)` -> lista bbox `{ x, y, w, h, confidence, class_name }`
- `render_overlay(bboxes, original_shape)` -> rysuje bbox na przezroczystym PNG

#### Generacja overlayów w `analyze()`

Po obliczeniu metryk, `analyze()` zbiera maski i generuje overlaye:
```python
overlays = {}
# zmarszczki — tylko wrinkle_angle (FRONT)
overlays["wrinkles"] = {wrinkle_angle: encode_overlay(wrinkle_mask, WRINKLE_COLOR, decoded[wrinkle_angle].shape[:2])}
# przebarwienia i rumien — per usable_angle
overlays["pigmentation"] = {angle: encode_overlay(pig_masks[angle], PIGMENTATION_COLOR, decoded[angle].shape[:2]) for angle in pig_masks}
overlays["redness"] = {angle: encode_overlay(red_masks[angle], REDNESS_COLOR, decoded[angle].shape[:2]) for angle in red_masks}
```

#### Response z Pythona

Nowe pole top-level `overlays` w JSON response (obok istniejacych `metrics`, `faceParsing` itd.):

```json
{
  "schemaVersion": "1.0",
  "metrics": { "..." },
  "overlays": {
    "wrinkles": { "FRONT": "<base64>" },
    "pigmentation": { "FRONT": "<base64>", "LEFT": "<base64>", "RIGHT": "<base64>" },
    "redness": { "FRONT": "<base64>", "LEFT": "<base64>", "RIGHT": "<base64>" }
  }
}
```

### Kolory overlay

| Metryka | RGBA | Opis |
|---------|------|------|
| Zmarszczki | `(147, 51, 234, 128)` | Fioletowy |
| Przebarwienia | `(180, 120, 50, 128)` | Brazowy/pomaranczowy |
| Rumien | `(220, 38, 38, 128)` | Czerwony |
| Tradzik (faza 2) | `(234, 179, 8, 200)` | Zolty bbox |

### Node.js backend (`apps/server/`)

#### Zmiany w `skin-scans.provider.ts`

**Krytyczne: Zod parse order.** Obecny `analysisSchema.parse()` stripuje nieznane pola. Zmiana:

1. Wyciag `overlays` z surowego JSON **przed** wywolaniem `analysisSchema.parse()`
2. Parsuj `analysisSchema` bez zmian (overlay nie trafia do validated analysis)
3. Dekoduj base64 -> Buffer -> zapisz jako PNG

```ts
const raw = await response.json();
const overlayData = raw.overlays; // wyciag przed parse
const analysis = analysisSchema.parse(raw); // parse stripuje overlays - OK
// ... dekoduj i zapisz overlayData do plikow
```

**Zapis plikow — flat structure** (spójne z istniejacym `processAndSaveImage`):
- Naming: `overlay-{sessionId}-{metric}-{angle}.png`
- Sciezka: `uploads/skin-scans/overlay-{sessionId}-wrinkles-front.png`
- Brak subdirectory per sesja (istniejace zdjecia tez uzyaja flat structure)

**Wstrzykniecie sciezek do analysis:**
Po zapisie plikow, dla kazdej metryki ktora ma overlay, dodaj `overlays` do istniejacego obiektu `details` (merge, nie replace):

```ts
// Merge overlays into existing details
if (analysis.metrics.wrinkles.details) {
  analysis.metrics.wrinkles.details.overlays = { FRONT: "uploads/skin-scans/overlay-{sid}-wrinkles-front.png" };
} else {
  analysis.metrics.wrinkles.details = { overlays: { FRONT: "..." } };
}
```

#### Zmiany w `skin-scans.service.ts`

`deleteSession()` — po usunieciu sesji z bazy, oprócz istniejacego cleanup zdjec, wyciagnij overlay paths z `session.analysis.metrics.*.details.overlays` i usun kazdy plik. Nie potrzeba glob — sciezki sa jawnie zapisane w JSON.

#### Zmiany w `privateUpload.middleware.ts`

Obecny middleware sprawdza wlasnosc przez `prisma.skinScanImage.findFirst()` co nie znajdzie overlayów (nie sa w tabeli `SkinScanImage`). Dodac drugi branch:

```ts
if (folder === 'skin-scans') {
  // Najpierw sprawdz czy to zwykly obraz sesji
  const image = await prisma.skinScanImage.findFirst({
    where: { imagePath: { endsWith: filename }, session: { userId: decoded.id } },
  });
  if (!image) {
    // Moze to overlay — sprawdz czy sessionId z nazwy pliku nalezy do usera
    const overlayMatch = filename.match(/^overlay-([a-z0-9-]+)-/i);
    if (overlayMatch) {
      const session = await prisma.skinScanSession.findFirst({
        where: { id: overlayMatch[1], userId: decoded.id },
      });
      if (!session) { return res.status(403)... }
    } else {
      return res.status(403)...
    }
  }
}
```

### Frontend (`apps/web/`)

#### Nowy komponent `SkinScanOverlayViewer`

Props:
- `session: SkinScanSession` — sesja z analysis
- `className?: string`

Funkcjonalnosc:
- Wyswietla zdjecia sesji (FRONT/LEFT/RIGHT) jako taby
- Pod zdjeciem: przyciski-toggle per metryka (tylko te ze statusem AVAILABLE i istniejacymi overlayami)
- Kazdy przycisk ma kolorowa kropke odpowiadajaca kolorowi overlay
- Aktywna metryka naklada `<img src={overlayPath}>` z `position: absolute; inset: 0; object-fit: cover`
- Suwak opacity 0-100% pod przyciskami — kontroluje CSS `opacity` overlay
- Domyslny kat: FRONT, domyslny opacity: 40%
- Mozna aktywowac wiele metryk naraz (wielokrotny toggle)
- Loading state: skeleton placeholder podczas ladowania overlay image

#### Zmiany w `SkinScan.tsx`

`ResultReport` — nowa sekcja "Mapa zmian" miedzy istniejacym raportem metryk a przyciskiem "Nowy skan". Renderuje `<SkinScanOverlayViewer session={session} />`.

#### Typy w `skin-scans.api.ts`

Rozszerzenie `SkinScanMetric.details` — zachowaj `Record<string, unknown>` i dodaj helper do wyciagania overlayów:

```ts
// Helper do bezpiecznego wyciagania overlay paths
export const getMetricOverlays = (metric: SkinScanMetric): Partial<Record<SkinScanAngle, string>> | null => {
  const overlays = (metric.details as Record<string, unknown> | undefined)?.overlays;
  if (!overlays || typeof overlays !== 'object') return null;
  return overlays as Partial<Record<SkinScanAngle, string>>;
};
```

#### Typy w `skin-scans.types.ts` (backend)

Dodac opcjonalne `overlays` do `SkinScanAnalysisMetric.details`:
```ts
details?: Record<string, unknown> & {
  overlays?: Partial<Record<string, string>>;
};
```

## Pliki do zmodyfikowania

### Faza 1
| Plik | Zakres zmiany |
|------|--------------|
| `services/skin-analysis/analysis.py` | `encode_overlay()`, `color_indices()` zwraca tuple, `analyze()` generuje overlaye |
| `services/skin-analysis/models.py` | `WrinkleModel.predict()` zwraca `wrinkle_mask` w dict |
| `apps/server/src/modules/skin-scans/skin-scans.provider.ts` | Wyciag overlays przed Zod parse, dekodowanie base64 -> pliki PNG, merge paths do details |
| `apps/server/src/modules/skin-scans/skin-scans.types.ts` | Opcjonalne `overlays` w `details` |
| `apps/server/src/modules/skin-scans/skin-scans.service.ts` | Cleanup overlay w deleteSession |
| `apps/server/src/middleware/privateUpload.middleware.ts` | Ownership check dla overlay plikow |
| `apps/web/src/components/skin-scan/SkinScanOverlayViewer.tsx` | Nowy komponent |
| `apps/web/src/pages/user/SkinScan.tsx` | Sekcja "Mapa zmian" w ResultReport |
| `apps/web/src/api/skin-scans.api.ts` | Helper `getMetricOverlays()` |

### Faza 2 (dodatkowe)
| Plik | Zakres zmiany |
|------|--------------|
| `services/skin-analysis/models.py` | Nowa klasa `AcneDetectorModel` |
| `services/skin-analysis/analysis.py` | Integracja detekcji tradziku |
| `services/skin-analysis/scripts/download_models.py` | Pobranie wag YOLOv8-nano |
| `services/skin-analysis/scripts/train_acne_yolo.py` | Skrypt treningu (nowy) |

## Szacunek rozmiaru transferu base64

Overlay PNG to glownie przezroczyste piksele. Przy kompresji PNG:
- Zmarszczki (linie, male pokrycie): ~20-50KB per overlay
- Przebarwienia/rumien (wieksze obszary): ~50-150KB per overlay
- Najgorszy przypadek: 3 metryki x 3 katy x 150KB = ~1.35MB
- Typowy przypadek: ~400-800KB

Transfer localhost->localhost, jednorazowy. Akceptowalne.

## Ograniczenia i uwagi

- Overlay to przyblizzona wizualizacja badawcza, nie diagnoza
- ACNE04-v2 wymaga pisemnej zgody autora na uzycie komercyjne — OK dla demonstratora badawczego
- Overlay nie jest generowany gdy metryka ma status inny niz AVAILABLE
- Flat file naming z sessionId w nazwie umozliwia ownership check bez dodatkowej tabeli w bazie
