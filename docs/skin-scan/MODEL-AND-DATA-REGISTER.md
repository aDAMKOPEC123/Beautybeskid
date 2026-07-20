# Rejestr modeli i danych skanowania skóry

Stan weryfikacji: 2026-07-20. Ten dokument nie jest opinią prawną. Przed użyciem komercyjnym należy uzyskać i zarchiwizować właściwą licencję/zgodę dla danych, kodu, wag oraz wszystkich danych zależnych.

## Zbiory danych

| Zasób | Zawartość i zastosowanie | Status licencji / decyzja |
|---|---|---|
| [ACNE04 / LDL](https://github.com/xpwu95/LDL) | 1457 opisanych zdjęć używanych do oceny nasilenia i liczby zmian trądzikowych. Dobry materiał badawczy do baseline'u. | Repozytorium mówi wprost: bezpłatne użycie akademickie; inne zastosowania wymagają kontaktu z autorem. **Nie używać w komercyjnym modelu bez pisemnej zgody.** |
| [ACNE04-v2](https://github.com/AIpourlapeau/acne04v2) | 1204 obrazy z ACNE04 i 32 443 adnotacje pojedynczych zmian, format inspirowany COCO. Repozytorium zawiera przede wszystkim nowe adnotacje; obrazy pochodzą z ACNE04. | Repozytorium nie przedstawia jasnej osobnej licencji. Ograniczenia obrazów ACNE04 nadal mają znaczenie. **Wymaga pisemnego wyjaśnienia praw do adnotacji, wag i komercyjnego użycia obrazów.** |
| [SCIN](https://github.com/google-research-datasets/scin) | Ponad 10 tys. zdjęć schorzeń skóry, metadane samoopisowe, etykiety dermatologów i szacunki FST/MST. Pomocniczy pretraining/audyt różnorodności, nie główny zbiór kosmetologicznych twarzy. | Własna `SCIN Data Use License`; trzeba zaakceptować jej warunki i zakaz prób reidentyfikacji. Nie zakładać automatycznie zgodności z komercyjnym produktem. |
| [DDI — Stanford](https://aimi.stanford.edu/datasets/ddi-diverse-dermatology-images) | 656 obrazów, 570 pacjentów, FST I–VI, rozpoznania potwierdzone patologicznie. Przydatny przede wszystkim do audytu różnic jakości między odcieniami skóry. | Pobranie podlega warunkom/umowie zasobu Stanford. **Nie traktować jako głównego zbioru trądziku lub kosmetologii i nie wdrażać bez weryfikacji umowy.** |
| [FFHQ-Wrinkle](https://github.com/labhai/ffhq-wrinkle-dataset) | 1000 masek ręcznych i ok. 50 tys. masek słabych; dobry punkt badawczy segmentacji zmarszczek. | CC BY-NC-SA 4.0, tak jak zależny FFHQ. **Brak użycia komercyjnego.** Dzieła pochodne wymagają ShareAlike. |
| [CelebAMask-HQ](https://github.com/switchablenorms/CelebAMask-HQ) | 30 tys. twarzy i 19 klas elementów twarzy. Nadaje się do face parsing, nie do oceny problemów skóry. | Tylko niekomercyjne badania. **Nie używać do komercyjnych wag segmentacji bez odrębnych praw.** |

Wniosek biznesowy: wymienione zbiory pozwalają zbudować demonstrator badawczy, ale nie dają obecnie czystej ścieżki licencyjnej do komercyjnego produktu COSMO. Najbezpieczniejszą ścieżką docelową jest własny, świadomie zebrany i ekspercko opisany zbiór z umową obejmującą trening, walidację, wersjonowanie wag i komercyjne wdrożenie.

## Kod i modele bazowe

| Zasób | Zastosowanie | Status / uwagi |
|---|---|---|
| [face-parsing.PyTorch / BiSeNet](https://github.com/zllrunning/face-parsing.PyTorch) | Segmentacja skóry i elementów twarzy. Kod MIT, dostępne wagi. | Kod ma MIT, ale repozytorium trenuje na CelebAMask-HQ, którego dane są niekomercyjne. **Licencję wag i pochodzenie treningowe trzeba analizować oddzielnie od licencji kodu.** |
| [LDL](https://github.com/xpwu95/LDL) / [Acne-LDS](https://github.com/openface-io/acne-lds) | Ocena nasilenia/liczby zmian trądzikowych. | Licencja kodu nie usuwa ograniczeń ACNE04. Zamrozić dokładny commit i sprawdzić pliki licencji przed eksperymentem. |
| [Derm Foundation](https://developers.google.com/health-ai-developer-foundations/derm-foundation/model-card) | 6144-wymiarowe embeddingi dermatologiczne pod mały klasyfikator. | Google oznacza model jako legacy i rekomenduje MedSigLIP dla nowych prac. Model nie daje diagnozy; podlega osobnym HAI-DEF Terms of Use. |
| [MedSigLIP](https://developers.google.com/health-ai-developer-foundations/medsiglip/model-card) | Aktualnie rekomendowany przez Google encoder obraz–tekst, 448×448, możliwy baseline do klasyfikacji/embeddingów. | Nie używać zero-shot jako wyniku klinicznego. Wymaga adaptacji, niezależnej walidacji i sprawdzenia HAI-DEF Terms of Use. |
| [FFHQ-Wrinkle code/weights](https://github.com/labhai/ffhq-wrinkle-dataset) | U-Net/SwinUNETR do segmentacji zmarszczek. | Zależność od danych CC BY-NC-SA 4.0 wyklucza bezpieczne założenie użycia komercyjnego. |

Pozycja „AFLL” z pierwotnej notatki nie została jednoznacznie zidentyfikowana w oficjalnym źródle. Nie dodawać jej do zależności ani nie przypisywać licencji Apache 2.0 bez zapisania dokładnego URL repozytorium, commitu i pliku licencji.

## Rejestr modeli używanych przez demonstrator badawczy

Wagi są aktywne wyłącznie po skonfigurowaniu prywatnego `SKIN_ANALYSIS_URL`. Nie są zatwierdzone do komercyjnego środowiska produkcyjnego COSMO.

| Metryka | Provider | Wersja | Dane treningowe | Status |
|---|---|---|---|---|
| Jakość zdjęcia | `quality-only` | `quality-v1` | brak; progi algorytmiczne Sharp | aktywny MVP |
| Segmentacja skóry | `cosmo-skin-analysis` | `bisenet-resnet18-onnx` | CelebAMask-HQ | aktywny badawczo; ograniczenie niekomercyjne danych |
| Trądzik | `cosmo-skin-analysis` | `acne-lds-acne04-fold0` | ACNE04 | aktywny badawczo; grade Hayashi 1–4 i estymowana liczba, bez lokalizacji zmian |
| Przebarwienia | `cosmo-skin-analysis` | `lab-relative-index-v1` | brak treningu; CIE Lab w masce skóry | aktywny wskaźnik względny, nie klasyfikacja kliniczna |
| Rumień | `cosmo-skin-analysis` | `lab-relative-index-v1` | brak treningu; CIE Lab w masce skóry | aktywny wskaźnik względny, nie klasyfikacja kliniczna |
| Zmarszczki | `cosmo-skin-analysis` | `ffhq-wrinkle-stage2-unet` | FFHQ-Wrinkle | aktywny badawczo; CC BY-NC-SA 4.0 |
| Pory | — | — | — | `MODEL_NOT_CONFIGURED` |
| Pokrycie SPF | — | — | — | `UNAVAILABLE_WITH_RGB` |

## Zamrożone artefakty demonstratora

| Plik | Rozmiar | SHA-256 |
|---|---:|---|
| `bisenet-resnet18.onnx` | 53 205 364 B | `0d9bd318e46987c3bdbfacae9e2c0f461cae1c6ac6ea6d43bbe541a91727e33f` |
| `acne-lds-fold0.pth` | 94 988 797 B | `247af45e2348231e177481d6160af53abd6419f2e2ae0088f5b5c05fb8868601` |
| `ffhq-wrinkle-stage2-unet.pth` | 207 296 760 B | `883034b3e0726dcdae946c312106dfde1d354ea5455fa21cba045a73058f4a25` |

Skrypt `services/skin-analysis/scripts/download_models.py` weryfikuje te sumy przed instalacją. Same pliki wag są ignorowane przez Git.

Każdy nowy wpis musi zawierać: nazwę artefaktu wag, SHA-256, commit kodu, pełną listę danych i licencji, wejście/wyjście, preprocessing, metryki globalne i per podgrupa, progi odrzucenia, osobę zatwierdzającą i datę wdrożenia.
