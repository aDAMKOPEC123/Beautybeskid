# Skin Scan — wizualne overlay zmian skórnych

Data: 2026-07-20
Status: zatwierdzony

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
- Przyjmuje binarną maskę numpy, kolor RGBA, rozmiar oryginalnego zdjęcia
- Skaluje maskę do rozmiaru oryginału (cv2.resize INTER_NEAREST)
- Tworzy RGBA obraz: piksele z maską=True → podany kolor, reszta → przezroczysty
- Koduje jako PNG → base64 string
- Zwraca `"data:image/png;base64,{encoded}"`

#### Zmiany w `color_indices()`

Oprócz istniejącego dict, zwraca też maski `pigmentation_mask` i `redness_mask` (numpy bool arrays).

#### Zmiany w `WrinkleModel.predict()`

Oprócz istniejącego dict, zwraca też `wrinkle_mask` (numpy bool array skalowany do rozmiaru wejścia).

#### Nowy model `AcneDetectorModel` (faza 2)

- Klasa w `models.py` ładująca YOLOv8-nano ONNX
- `predict(bgr)` → lista bbox `{ x, y, w, h, confidence, class_name }`
- `render_overlay(bboxes, original_shape)` → rysuje bbox na przezroczystym PNG

#### Response z Pythona

Nowe pole top-level `overlays` w JSON response:

```json
{
  "overlays": {
    "wrinkles": {
      "FRONT": "data:image/png;base64,..."
    },
    "pigmentation": {
      "FRONT": "data:image/png;base64,...",
      "LEFT": "data:image/png;base64,...",
      "RIGHT": "data:image/png;base64,..."
    },
    "redness": {
      "FRONT": "data:image/png;base64,...",
      "LEFT": "data:image/png;base64,...",
      "RIGHT": "data:image/png;base64,..."
    },
    "acne": {
      "FRONT": "data:image/png;base64,...",
      "LEFT": "data:image/png;base64,...",
      "RIGHT": "data:image/png;base64,..."
    }
  }
}
```

Zmarszczki: tylko FRONT (jak obecna analiza). Przebarwienia i rumień: per usable_angle. Trądzik (faza 2): per usable_angle.

### Kolory overlay

| Metryka | RGBA | Opis |
|---------|------|------|
| Zmarszczki | `(147, 51, 234, 128)` | Fioletowy |
| Przebarwienia | `(180, 120, 50, 128)` | Brązowy/pomarańczowy |
| Rumień | `(220, 38, 38, 128)` | Czerwony |
| Trądzik (faza 2) | `(234, 179, 8, 200)` | Żółty bbox |

### Node.js backend (`apps/server/`)

#### Zmiany w `skin-scans.provider.ts`

`mlServiceProvider.analyze()` po otrzymaniu response z Pythona:
1. Wyciąga `overlays` z response
2. Dla każdego overlay: dekoduje base64 → Buffer → zapisuje jako PNG do `uploads/skin-scans/{sessionId}/`
3. Naming: `overlay-{metric}-{angle}.png` (np. `overlay-wrinkles-front.png`)
4. Zapisuje ścieżki w `details.overlays` per metryka

Format w details per metryka:
```json
{
  "details": {
    "overlays": {
      "FRONT": "uploads/skin-scans/{sessionId}/overlay-wrinkles-front.png"
    }
  }
}
```

5. Usuwa pole `overlays` z top-level response przed zapisem do bazy (nie chcemy base64 w Prisma JSON)

#### Zmiany w `skin-scans.service.ts`

`deleteSession()` — po usunięciu sesji z bazy, oprócz istniejącego cleanup zdjęć, usunąć też pliki `overlay-*.png` z katalogu sesji.

#### Serwowanie plików

Overlay w `uploads/skin-scans/` — chronione przez istniejący `privateUpload.middleware.ts`. Zero nowego kodu.

### Frontend (`apps/web/`)

#### Nowy komponent `SkinScanOverlayViewer`

Props:
- `session: SkinScanSession` — sesja z analysis
- `className?: string`

Funkcjonalność:
- Wyświetla zdjęcia sesji (FRONT/LEFT/RIGHT) jako taby
- Pod zdjęciem: przyciski-toggle per metryka (tylko te ze statusem AVAILABLE i istniejącymi overlayami)
- Każdy przycisk ma kolorową kropkę odpowiadającą kolorowi overlay
- Aktywna metryka nakłada `<img src={overlayPath}>` z `position: absolute; inset: 0; object-fit: cover`
- Suwak opacity 0-100% pod przyciskami — kontroluje CSS `opacity` overlay
- Domyślny kąt: FRONT, domyślny opacity: 40%
- Można aktywować wiele metryk naraz (wielokrotny toggle)

#### Zmiany w `SkinScan.tsx`

`ResultReport` — nowa sekcja "Mapa zmian" między istniejącym raportem metryk a przyciskiem "Nowy skan". Renderuje `<SkinScanOverlayViewer session={session} />`.

#### Typy w `skin-scans.api.ts`

Rozszerzenie `SkinScanMetric.details`:
```ts
details?: Record<string, unknown> & {
  overlays?: Partial<Record<SkinScanAngle, string>>;
};
```

## Pliki do zmodyfikowania

### Faza 1
| Plik | Zakres zmiany |
|------|--------------|
| `services/skin-analysis/analysis.py` | `encode_overlay()`, modyfikacja `color_indices()` i `analyze()` |
| `services/skin-analysis/models.py` | `WrinkleModel.predict()` zwraca maskę |
| `apps/server/src/modules/skin-scans/skin-scans.provider.ts` | Dekodowanie base64 → pliki PNG |
| `apps/server/src/modules/skin-scans/skin-scans.service.ts` | Cleanup overlay w deleteSession |
| `apps/web/src/components/skin-scan/SkinScanOverlayViewer.tsx` | Nowy komponent |
| `apps/web/src/pages/user/SkinScan.tsx` | Sekcja "Mapa zmian" w ResultReport |
| `apps/web/src/api/skin-scans.api.ts` | Rozszerzenie typów |

### Faza 2 (dodatkowe)
| Plik | Zakres zmiany |
|------|--------------|
| `services/skin-analysis/models.py` | Nowa klasa `AcneDetectorModel` |
| `services/skin-analysis/analysis.py` | Integracja detekcji trądziku |
| `services/skin-analysis/scripts/download_models.py` | Pobranie wag YOLOv8-nano |
| `services/skin-analysis/scripts/train_acne_yolo.py` | Skrypt treningu (nowy) |

## Ograniczenia i uwagi

- Overlay to przybliżona wizualizacja badawcza, nie diagnoza
- Transfer base64 z Pythona do Node.js ~300-600KB per skan — akceptowalne na localhost
- ACNE04-v2 wymaga pisemnej zgody autora na użycie komercyjne — OK dla demonstratora badawczego
- Overlay nie jest generowany gdy metryka ma status inny niż AVAILABLE
