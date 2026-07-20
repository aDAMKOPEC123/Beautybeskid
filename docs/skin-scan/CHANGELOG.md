# Historia modułu skanowania skóry

## 2026-07-20 — przygotowanie wdrożenia VPS

- dodano usługę systemd `cosmo-skin-analysis`, nasłuchującą wyłącznie na `127.0.0.1:8010`;
- dodano automatyczne instalowanie środowiska Python, wag z kontrolą SHA-256 i wspólnego klucza API;
- wymuszono wariant CPU PyTorch, jeden worker oraz limity RAM/CPU;
- dodano 2 GB swap jako zabezpieczenie startu modeli na VPS z 4 GB RAM;
- główny `deploy.sh` uruchamia i sprawdza serwis ML przed restartem backendu.

## 2026-07-20 — modele kosmetologiczne (demonstrator badawczy)

- dodano prywatny serwis FastAPI i połączenie multipart z backendem Express;
- podłączono BiSeNet ResNet18 ONNX do maskowania skóry twarzy;
- podłączono Acne-LDS/ACNE04 do oceny nasilenia trądziku i estymacji liczby zmian;
- podłączono U-Net FFHQ-Wrinkle do segmentacji zmarszczek;
- dodano względne wskaźniki przebarwień i rumienia CIE Lab liczone wyłącznie w masce skóry;
- dodano pobieranie wag z kontrolą SHA-256, rejestr modeli/licencji i testy jednostkowe Python;
- zaktualizowano raport użytkownika tak, aby prezentował wartości, statusy, confidence i wersje modeli;
- wykonano test pełnego przepływu: trzy obrazy → Express → serwis ML → raport zapisany w PostgreSQL;
- ACNE04-v2 pozostaje zbiorem treningowych adnotacji dla przyszłego detektora pojedynczych zmian, nie modelem runtime;
- pory pozostają `MODEL_NOT_CONFIGURED`, a SPF `UNAVAILABLE_WITH_RGB`;
- ze względu na warunki ACNE04, CelebAMask-HQ i FFHQ-Wrinkle integracja nie jest zatwierdzona do użytku komercyjnego.

## 2026-07-20 — MVP jakości zdjęć

- dodano modele Prisma `SkinScanSession`, `SkinScanImage` i migrację;
- dodano prywatny moduł REST `/api/skin-scans`;
- dodano kontrolę rozdzielczości, jasności, prześwietlenia, kontrastu i przybliżonej ostrości;
- dodano prowadzone wykonanie zdjęć `FRONT`, `LEFT`, `RIGHT`, fallback plikowy, wersjonowane zgody i kontekst;
- dodano historię, raport jakości i kasowanie sesji z plikami;
- dodano provider `quality-only/quality-v1` oraz wersjonowany kontrakt pod dalsze modele;
- celowo nie dodano pseudowyników trądziku, przebarwień, rumienia, zmarszczek, porów ani SPF;
- pełna regresja backendu: 182/182 testy; build backendu, build frontendu i lint zmienionych plików przechodzą na dzień wpisu;
- kolejne priorytety: landmarki/kąt głowy, face parsing z komercyjnie bezpiecznym pochodzeniem, własny zbiór walidacyjny, pierwszy model trądziku w trybie cienia.
