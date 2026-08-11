# Akademia — obrazy: wgrywanie, kadrowanie, układ. Plan wdrożenia

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Okładka kursu, zdjęcie prowadzącej i obrazy w treści lekcji wgrywane bezpośrednio z dysku, ze wspólnym oknem kadrowania i pełną kontrolą układu obrazu względem tekstu.

**Architecture:** Kadr wycinany jest w przeglądarce (`react-easy-crop` + `<canvas>`), więc na serwer trafia gotowy WebP i nie trzeba zmieniać bazy ani logiki obróbki. Istniejący endpoint `POST /academy/admin/lesson-images` dostaje opcjonalne pole `folder` z zamkniętej białej listy. Układ obrazu w lekcji zapisuje się w HTML jako klasa CSS plus szerokość procentowa, obsługiwana przez czysty moduł `lessonFigure.ts`.

**Tech Stack:** React 19, TypeScript, Vite, vitest + jsdom, `react-easy-crop` ^6.2.3, DOMPurify, Express 5, sharp.

**Specyfikacja:** `docs/superpowers/specs/2026-08-11-akademia-obrazy-design.md`

## Global Constraints

- Cała praca frontendowa dotyczy **wyłącznie `apps/academy-web`**. Katalog `apps/web/src/pages/admin/academy/` to martwy kod — `apps/web/src/router.tsx:290-292` przekierowuje `/admin/akademia*` na subdomenę. Nie dotykaj go i nie sugeruj się nim.
- Wszystkie teksty widoczne dla użytkownika po polsku, z polskimi znakami. Komunikaty mówią, co zrobić, a nie co się zepsuło.
- Bez zmian w schemacie Prisma i bez migracji. `Course.thumbnailUrl`, `AcademyInstructor.photoUrl` i `Lesson.contentHtml` już istnieją.
- Zamknięta biała lista folderów uploadu: `academy-lessons`, `academy-courses`, `academy-instructors`. Wartość spoza listy → `academy-lessons`. Nigdy nie sklejaj ścieżki z niesprawdzonego wejścia.
- Szerokość obrazu w lekcji: liczba całkowita w zakresie 10–100 (procent). Dla układu `full` zawsze 100.
- Limit uploadu to 5 MB (`apps/server/src/config/multer.ts:15`) — dotyczy kadru po przycięciu.
- Komendy uruchamiaj z `cosmo-app/`. Frontend: `pnpm --filter cosmo-academy-web test`. Backend: `pnpm --filter cosmo-server vitest run <ścieżka>`.
- Commituj po każdym zadaniu. Nie pushuj i nie uruchamiaj `deploy.sh` — o wdrożeniu decyduje właściciel repo.

---

## Struktura plików

**Nowe — biblioteki czyste (testowalne bez przeglądarki):**
- `apps/academy-web/src/lib/cropImage.ts` — przeliczanie obszaru kadru na piksele + wycinanie do `Blob`
- `apps/academy-web/src/lib/lessonFigure.ts` — układ obrazu ↔ HTML
- `apps/academy-web/src/lib/sanitizeLessonHtml.ts` — jedna wspólna konfiguracja sanityzacji

**Nowe — komponenty:**
- `apps/academy-web/src/components/ImageCropDialog.tsx` — okno kadrowania
- `apps/academy-web/src/components/RichTextEditor.tsx` — wyjęty z `AcademyStudio.tsx`, rozbudowany o obsługę figur
- `apps/academy-web/src/components/ImageUploadField.tsx` — kafelek „podgląd + zmień + usuń" dla okładki i zdjęcia prowadzącej
- `apps/academy-web/src/hooks/useImageUpload.ts` — cykl wybór → kadr → wysyłka → adres

**Modyfikowane:**
- `apps/server/src/modules/academy/lessons/lessons.controller.ts` — biała lista folderów
- `apps/academy-web/src/api/academy.api.ts:123-127` — parametr `folder`
- `apps/academy-web/src/pages/AcademyStudio.tsx` — okładka kursu, usunięcie wbudowanego `RichTextEditor`
- `apps/academy-web/src/pages/admin/AdminInstructors.tsx:130-132` — zdjęcie prowadzącej
- `apps/academy-web/src/pages/LessonPlayer.tsx:135-147` — wspólna sanityzacja
- `apps/academy-web/src/pages/CourseDetail.tsx:151` — naprawa sanityzacji
- `apps/academy-web/src/index.css` — style `.academy-figure`
- `apps/academy-web/vite.config.ts:70-72` — środowisko `jsdom`
- `apps/academy-web/package.json` — `react-easy-crop`, `jsdom`

---

### Task 1: Backend — biała lista folderów uploadu

Endpoint przyjmuje dziś tylko obrazy lekcji. Okładka kursu i zdjęcie prowadzącej mają lądować w osobnych katalogach, ale nazwa katalogu przychodzi od klienta — musi przejść przez zamkniętą listę, inaczej byłaby to droga do zapisu poza katalogiem `uploads`.

**Files:**
- Modify: `apps/server/src/modules/academy/lessons/lessons.controller.ts:1-4` (import) oraz `:60-69` (`uploadInlineImage`)
- Test: `apps/server/src/modules/academy/lessons/lessons.controller.test.ts` (nowy)

**Interfaces:**
- Consumes: nic
- Produces: `resolveUploadFolder(input: unknown): AcademyUploadFolder` oraz typ `AcademyUploadFolder = 'academy-lessons' | 'academy-courses' | 'academy-instructors'`, eksportowane z `lessons.controller.ts`. Zadanie 2 opiera się na tym, że endpoint akceptuje pole formularza `folder`.

- [ ] **Step 1: Napisz test, który nie przechodzi**

Utwórz `apps/server/src/modules/academy/lessons/lessons.controller.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { resolveUploadFolder } from './lessons.controller';

describe('resolveUploadFolder', () => {
  it('przepuszcza foldery z białej listy', () => {
    expect(resolveUploadFolder('academy-lessons')).toBe('academy-lessons');
    expect(resolveUploadFolder('academy-courses')).toBe('academy-courses');
    expect(resolveUploadFolder('academy-instructors')).toBe('academy-instructors');
  });

  it('wraca do folderu lekcji, gdy pola nie ma', () => {
    expect(resolveUploadFolder(undefined)).toBe('academy-lessons');
    expect(resolveUploadFolder('')).toBe('academy-lessons');
  });

  it('odrzuca próbę wyjścia poza katalog uploadów', () => {
    expect(resolveUploadFolder('../../etc')).toBe('academy-lessons');
    expect(resolveUploadFolder('academy-lessons/../../etc')).toBe('academy-lessons');
    expect(resolveUploadFolder('/absolute/path')).toBe('academy-lessons');
  });

  it('odrzuca wartości, które nie są tekstem', () => {
    expect(resolveUploadFolder({ toString: () => 'academy-courses' })).toBe('academy-lessons');
    expect(resolveUploadFolder(['academy-courses'])).toBe('academy-lessons');
    expect(resolveUploadFolder(null)).toBe('academy-lessons');
  });
});
```

- [ ] **Step 2: Uruchom test i sprawdź, że nie przechodzi**

Run: `pnpm --filter cosmo-server vitest run src/modules/academy/lessons/lessons.controller.test.ts`
Expected: FAIL — `resolveUploadFolder` nie jest eksportowane.

- [ ] **Step 3: Zaimplementuj białą listę**

W `lessons.controller.ts`, tuż pod importami (po linii 4), dodaj:

```ts
/** Nazwa katalogu przychodzi od klienta, więc nigdy nie trafia do ścieżki bez
 *  sprawdzenia przynależności do tej listy — inaczej byłaby to droga do zapisu
 *  poza katalogiem uploads. */
const ALLOWED_UPLOAD_FOLDERS = ['academy-lessons', 'academy-courses', 'academy-instructors'] as const;

export type AcademyUploadFolder = (typeof ALLOWED_UPLOAD_FOLDERS)[number];

export const resolveUploadFolder = (input: unknown): AcademyUploadFolder =>
  typeof input === 'string' && (ALLOWED_UPLOAD_FOLDERS as readonly string[]).includes(input)
    ? (input as AcademyUploadFolder)
    : 'academy-lessons';
```

Zastąp treść `uploadInlineImage` (linie 60-69):

```ts
export const uploadInlineImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new AppError('Wybierz obraz do wgrania', 400);

    // Każdy obraz w Akademii jest optymalizowany i zapisywany jako WebP.
    const folder = resolveUploadFolder(req.body?.folder);
    const url = await processAndSaveImage(req.file.buffer, folder);
    res.status(201).json({ data: { url } });
  } catch (error) {
    next(error);
  }
};
```

- [ ] **Step 4: Uruchom test i sprawdź, że przechodzi**

Run: `pnpm --filter cosmo-server vitest run src/modules/academy/lessons/lessons.controller.test.ts`
Expected: PASS — 4 testy.

- [ ] **Step 5: Sprawdź, że nic innego się nie zepsuło**

Run: `pnpm --filter cosmo-server build`
Expected: kompilacja bez błędów.

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/modules/academy/lessons/lessons.controller.ts apps/server/src/modules/academy/lessons/lessons.controller.test.ts
git commit -m "feat(akademia): biala lista folderow uploadu obrazow"
```

---

### Task 2: Klient API — parametr `folder`

**Files:**
- Modify: `apps/academy-web/src/api/academy.api.ts:123-127`

**Interfaces:**
- Consumes: endpoint z zadania 1
- Produces: `academyApi.adminUploadLessonImage(image: File | Blob, folder?: string): Promise<{ url: string }>` — używane przez zadanie 6

- [ ] **Step 1: Zmień sygnaturę**

Zastąp `adminUploadLessonImage` (linie 123-127):

```ts
  adminUploadLessonImage: (image: File | Blob, folder?: string) => {
    const formData = new FormData();
    // Blob z kadrowania nie ma nazwy — serwer i tak nadaje własną, ale multer
    // wymaga nazwy pliku, żeby rozpoznać pole jako plik.
    formData.append('image', image, image instanceof File ? image.name : 'kadr.webp');
    if (folder) formData.append('folder', folder);
    return api.post('/academy/admin/lesson-images', formData).then((r) => r.data.data);
  },
```

- [ ] **Step 2: Sprawdź, że typy się kompilują**

Run: `pnpm --filter cosmo-academy-web build`
Expected: kompilacja bez błędów. Dotychczasowe wywołanie w `AcademyStudio.tsx:293` przechodzi, bo `folder` jest opcjonalny.

- [ ] **Step 3: Commit**

```bash
git add apps/academy-web/src/api/academy.api.ts
git commit -m "feat(akademia): parametr folder w uploadzie obrazow"
```

---

### Task 3: Środowisko testowe DOM + wspólna sanityzacja

To zadanie naprawia przy okazji błąd: bezpłatny fragment kursu (`CourseDetail.tsx:151`) sanityzuje treść lekcji domyślną konfiguracją, więc zdejmuje `style`, `class` i `loading` oraz wycina osadzone materiały. Ta sama treść wygląda inaczej w lekcji i na stronie sprzedażowej.

**Files:**
- Modify: `apps/academy-web/vite.config.ts:70-72`, `apps/academy-web/package.json`
- Create: `apps/academy-web/src/lib/sanitizeLessonHtml.ts`
- Test: `apps/academy-web/src/lib/sanitizeLessonHtml.test.ts`
- Modify: `apps/academy-web/src/pages/LessonPlayer.tsx:135-147`, `apps/academy-web/src/pages/CourseDetail.tsx:151`

**Interfaces:**
- Consumes: nic
- Produces: `sanitizeLessonHtml(html: string): string` — używane w zadaniach 9 i 11 przy kontroli ręcznej

- [ ] **Step 1: Dodaj jsdom i włącz środowisko DOM**

```bash
pnpm --filter cosmo-academy-web add -D jsdom
```

W `apps/academy-web/vite.config.ts` zastąp blok `test` (linie 70-72):

```ts
  test: {
    environment: 'jsdom',
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
  },
```

- [ ] **Step 2: Napisz test, który nie przechodzi**

Utwórz `apps/academy-web/src/lib/sanitizeLessonHtml.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { sanitizeLessonHtml } from './sanitizeLessonHtml';

describe('sanitizeLessonHtml', () => {
  it('zachowuje układ obrazu wstawionego w lekcji', () => {
    const html = '<figure class="academy-figure academy-figure--left" style="width:45%">'
      + '<img src="/uploads/academy-lessons/a.webp" alt="Opis" loading="lazy">'
      + '<figcaption>Podpis</figcaption></figure>';
    const result = sanitizeLessonHtml(html);
    expect(result).toContain('academy-figure--left');
    expect(result).toContain('45%');
    expect(result).toContain('<figcaption>Podpis</figcaption>');
    expect(result).toContain('/uploads/academy-lessons/a.webp');
  });

  it('przepuszcza osadzone materiały z dozwolonych platform', () => {
    const html = '<iframe src="https://player.vimeo.com/video/123" allowfullscreen></iframe>';
    expect(sanitizeLessonHtml(html)).toContain('player.vimeo.com');
  });

  it('usuwa osadzenia spoza dozwolonych platform', () => {
    const html = '<iframe src="https://zly.example.com/x"></iframe>';
    expect(sanitizeLessonHtml(html)).not.toContain('zly.example.com');
  });

  it('usuwa skrypty i uchwyty zdarzeń', () => {
    expect(sanitizeLessonHtml('<script>alert(1)</script><p>Tekst</p>')).not.toContain('alert');
    expect(sanitizeLessonHtml('<img src="x" onerror="alert(1)">')).not.toContain('onerror');
  });

  it('usuwa adresy javascript:', () => {
    expect(sanitizeLessonHtml('<a href="javascript:alert(1)">klik</a>')).not.toContain('javascript:');
  });
});
```

- [ ] **Step 3: Uruchom test i sprawdź, że nie przechodzi**

Run: `pnpm --filter cosmo-academy-web test src/lib/sanitizeLessonHtml.test.ts`
Expected: FAIL — modułu `./sanitizeLessonHtml` nie da się rozwiązać.

- [ ] **Step 4: Zaimplementuj wspólną sanityzację**

Utwórz `apps/academy-web/src/lib/sanitizeLessonHtml.ts`:

```ts
import DOMPurify from 'dompurify';

/** Jedna konfiguracja dla wszystkich miejsc pokazujących treść lekcji. Rozjazd
 *  między odtwarzaczem a stroną sprzedażową oznaczałby, że ta sama lekcja
 *  wygląda w dwóch miejscach inaczej. */
const LESSON_HTML_CONFIG = {
  ADD_TAGS: ['iframe', 'img'],
  ADD_ATTR: [
    'allowfullscreen', 'frameborder', 'loading', 'allow',
    'style', 'class', 'width', 'height', 'alt', 'title',
  ],
  // Filmy tylko z zatwierdzonych platform; obrazy kursu z katalogu uploadów Akademii.
  ALLOWED_URI_REGEXP:
    /^(?:(?:https?):\/\/(?:www\.youtube\.com|player\.vimeo\.com)\/|\/uploads\/academy-lessons\/|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
};

export const sanitizeLessonHtml = (html: string): string => DOMPurify.sanitize(html, LESSON_HTML_CONFIG);
```

- [ ] **Step 5: Uruchom test i sprawdź, że przechodzi**

Run: `pnpm --filter cosmo-academy-web test src/lib/sanitizeLessonHtml.test.ts`
Expected: PASS — 5 testów.

- [ ] **Step 6: Podepnij w odtwarzaczu lekcji**

W `LessonPlayer.tsx` dodaj do importów:

```ts
import { sanitizeLessonHtml } from '@/lib/sanitizeLessonHtml';
```

Zastąp blok lekcji tekstowej (linie 135-147):

```tsx
      {lesson.type === 'TEXT' && lesson.contentHtml && (
        <div
          className="prose prose-sm max-w-none bg-card rounded-lg border p-6"
          dangerouslySetInnerHTML={{ __html: sanitizeLessonHtml(lesson.contentHtml) }}
        />
      )}
```

- [ ] **Step 7: Napraw sanityzację bezpłatnego fragmentu**

W `CourseDetail.tsx` dodaj do importów `import { sanitizeLessonHtml } from '@/lib/sanitizeLessonHtml';`, a w linii 151 zamień oba wywołania `DOMPurify.sanitize(...)` na `sanitizeLessonHtml(...)`:

```tsx
        ? <><ExternalVideo videoId={course.previewLesson.videoId} title={course.previewLesson.title} />{course.previewLesson.transcriptHtml && <details className="academy-transcript"><summary>Transkrypcja filmu</summary><div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeLessonHtml(course.previewLesson.transcriptHtml) }} /></details>}</>
        : course.previewLesson.contentHtml && <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeLessonHtml(course.previewLesson.contentHtml) }} />}
```

Jeśli po tej zmianie import `DOMPurify` w którymś z plików nie ma już użycia, usuń go — inaczej lint zgłosi błąd.

- [ ] **Step 8: Uruchom pełne testy i build**

Run: `pnpm --filter cosmo-academy-web test && pnpm --filter cosmo-academy-web build`
Expected: wszystkie testy przechodzą (łącznie z `CourseCard.test.ts`), build bez błędów.

- [ ] **Step 9: Commit**

```bash
git add apps/academy-web/package.json apps/academy-web/vite.config.ts apps/academy-web/src/lib/sanitizeLessonHtml.ts apps/academy-web/src/lib/sanitizeLessonHtml.test.ts apps/academy-web/src/pages/LessonPlayer.tsx apps/academy-web/src/pages/CourseDetail.tsx ../pnpm-lock.yaml
git commit -m "fix(akademia): wspolna sanityzacja tresci lekcji w odtwarzaczu i na stronie kursu"
```

(Jeśli `pnpm-lock.yaml` leży w innym miejscu, użyj `git add -A` ograniczonego do zmienionych ścieżek.)

---

### Task 4: Przeliczanie kadru na piksele

**Files:**
- Create: `apps/academy-web/src/lib/cropImage.ts`
- Test: `apps/academy-web/src/lib/cropImage.test.ts`

**Interfaces:**
- Consumes: nic
- Produces:
  - `interface CropAreaPercent { x: number; y: number; width: number; height: number }`
  - `interface PixelCrop { left: number; top: number; width: number; height: number }`
  - `cropAreaToPixels(area: CropAreaPercent, natural: { width: number; height: number }): PixelCrop`
  - `cropFileToBlob(file: Blob, area: CropAreaPercent): Promise<Blob>` (rzuca `Error('DECODE_FAILED')`)
  - `canDecodeImage(file: Blob): Promise<boolean>`
  - Wszystko używane przez zadanie 5.

- [ ] **Step 1: Napisz test, który nie przechodzi**

Utwórz `apps/academy-web/src/lib/cropImage.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { cropAreaToPixels } from './cropImage';

const natural = { width: 4000, height: 3000 };

describe('cropAreaToPixels', () => {
  it('przelicza procenty na piksele źródłowe', () => {
    expect(cropAreaToPixels({ x: 25, y: 10, width: 50, height: 40 }, natural))
      .toEqual({ left: 1000, top: 300, width: 2000, height: 1200 });
  });

  it('cały obraz daje pełne wymiary', () => {
    expect(cropAreaToPixels({ x: 0, y: 0, width: 100, height: 100 }, natural))
      .toEqual({ left: 0, top: 0, width: 4000, height: 3000 });
  });

  it('zaokrągla ułamki pikseli', () => {
    const result = cropAreaToPixels({ x: 33.333, y: 0, width: 33.333, height: 100 }, natural);
    expect(Number.isInteger(result.left)).toBe(true);
    expect(Number.isInteger(result.width)).toBe(true);
    expect(result.left).toBe(1333);
  });

  it('nie wychodzi poza prawą i dolną krawędź obrazu', () => {
    const result = cropAreaToPixels({ x: 90, y: 90, width: 50, height: 50 }, natural);
    expect(result.left + result.width).toBeLessThanOrEqual(natural.width);
    expect(result.top + result.height).toBeLessThanOrEqual(natural.height);
  });

  it('obcina ujemne przesunięcia do zera', () => {
    const result = cropAreaToPixels({ x: -10, y: -5, width: 50, height: 50 }, natural);
    expect(result.left).toBe(0);
    expect(result.top).toBe(0);
  });

  it('zawsze zwraca co najmniej jeden piksel', () => {
    const result = cropAreaToPixels({ x: 0, y: 0, width: 0, height: 0 }, natural);
    expect(result.width).toBeGreaterThanOrEqual(1);
    expect(result.height).toBeGreaterThanOrEqual(1);
  });

  it('radzi sobie z obrazem mniejszym niż ramka kadru', () => {
    const result = cropAreaToPixels({ x: 0, y: 0, width: 100, height: 100 }, { width: 20, height: 15 });
    expect(result).toEqual({ left: 0, top: 0, width: 20, height: 15 });
  });
});
```

- [ ] **Step 2: Uruchom test i sprawdź, że nie przechodzi**

Run: `pnpm --filter cosmo-academy-web test src/lib/cropImage.test.ts`
Expected: FAIL — modułu `./cropImage` nie da się rozwiązać.

- [ ] **Step 3: Zaimplementuj**

Utwórz `apps/academy-web/src/lib/cropImage.ts`:

```ts
export interface CropAreaPercent {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PixelCrop {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** react-easy-crop podaje obszar w procentach. Przeliczamy go na piksele
 *  źródłowe i przycinamy do granic obrazu, żeby drawImage nigdy nie dostał
 *  obszaru wychodzącego poza źródło. */
export function cropAreaToPixels(area: CropAreaPercent, natural: { width: number; height: number }): PixelCrop {
  const left = Math.min(natural.width - 1, Math.max(0, Math.round((area.x / 100) * natural.width)));
  const top = Math.min(natural.height - 1, Math.max(0, Math.round((area.y / 100) * natural.height)));
  const width = Math.max(1, Math.min(natural.width - left, Math.round((area.width / 100) * natural.width)));
  const height = Math.max(1, Math.min(natural.height - top, Math.round((area.height / 100) * natural.height)));
  return { left, top, width, height };
}

/** Przeglądarki na Windowsie nie dekodują HEIC z iPhone'a. Sprawdzamy to
 *  zawczasu, żeby zamiast pustego okna kadrowania pokazać ścieżkę zapasową. */
export async function canDecodeImage(file: Blob): Promise<boolean> {
  try {
    const bitmap = await createImageBitmap(file);
    bitmap.close();
    return true;
  } catch {
    return false;
  }
}

export async function cropFileToBlob(file: Blob, area: CropAreaPercent): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('DECODE_FAILED');
  }

  try {
    const { left, top, width, height } = cropAreaToPixels(area, { width: bitmap.width, height: bitmap.height });
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('DECODE_FAILED');
    context.drawImage(bitmap, left, top, width, height, 0, 0, width, height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('DECODE_FAILED'))),
        'image/webp',
        0.9,
      );
    });
  } finally {
    bitmap.close();
  }
}
```

- [ ] **Step 4: Uruchom test i sprawdź, że przechodzi**

Run: `pnpm --filter cosmo-academy-web test src/lib/cropImage.test.ts`
Expected: PASS — 7 testów.

- [ ] **Step 5: Commit**

```bash
git add apps/academy-web/src/lib/cropImage.ts apps/academy-web/src/lib/cropImage.test.ts
git commit -m "feat(akademia): przeliczanie kadru na piksele zrodlowe"
```

---

### Task 5: Okno kadrowania i hook uploadu

**Files:**
- Modify: `apps/academy-web/package.json` (`react-easy-crop`)
- Create: `apps/academy-web/src/components/ImageCropDialog.tsx`
- Create: `apps/academy-web/src/hooks/useImageUpload.ts`
- Modify: `apps/academy-web/src/index.css` (style okna)

**Interfaces:**
- Consumes: `cropAreaToPixels`, `cropFileToBlob`, `canDecodeImage`, `CropAreaPercent` (zadanie 4); `academyApi.adminUploadLessonImage` (zadanie 2)
- Produces:
  - `type CropAspect = number | 'free'`
  - `<ImageCropDialog file aspect lockAspect onCancel onConfirm />`
  - `useImageUpload({ folder, aspect, lockAspect }): { pick, dialog, uploading, error }` — używane w zadaniach 6, 7 i 9

- [ ] **Step 1: Dodaj bibliotekę**

```bash
pnpm --filter cosmo-academy-web add react-easy-crop@^6.2.3
```

- [ ] **Step 2: Napisz okno kadrowania**

Utwórz `apps/academy-web/src/components/ImageCropDialog.tsx`:

```tsx
import { useCallback, useEffect, useState } from 'react';
import Cropper from 'react-easy-crop';
import { Check, Loader2, X } from 'lucide-react';
import { cropFileToBlob, type CropAreaPercent } from '@/lib/cropImage';

export type CropAspect = number | 'free';

const ASPECT_CHOICES: { label: string; value: CropAspect }[] = [
  { label: '16:9', value: 16 / 9 },
  { label: '4:3', value: 4 / 3 },
  { label: '1:1', value: 1 },
  { label: 'Dowolne', value: 'free' },
];

interface ImageCropDialogProps {
  file: File;
  aspect: CropAspect;
  lockAspect?: boolean;
  onCancel: () => void;
  onConfirm: (cropped: Blob) => void | Promise<void>;
}

export function ImageCropDialog({ file, aspect, lockAspect, onCancel, onConfirm }: ImageCropDialogProps) {
  const [src, setSrc] = useState('');
  const [ratio, setRatio] = useState<CropAspect>(aspect);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<CropAreaPercent | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const onCropComplete = useCallback((percent: CropAreaPercent) => setArea(percent), []);

  const confirm = async () => {
    if (!area) return;
    setBusy(true);
    setError('');
    try {
      const blob = await cropFileToBlob(file, area);
      await onConfirm(blob);
    } catch {
      setError('Nie udało się przyciąć tego pliku. Sprawdź, czy obraz nie jest uszkodzony.');
      setBusy(false);
    }
  };

  return (
    <div className="crop-dialog-backdrop" role="dialog" aria-modal="true" aria-label="Kadrowanie zdjęcia">
      <div className="crop-dialog">
        <div className="crop-dialog-head">
          <strong>Ustaw kadr</strong>
          <button type="button" onClick={onCancel} aria-label="Zamknij kadrowanie"><X /></button>
        </div>

        <p className="crop-dialog-hint">
          Przeciągnij zdjęcie, żeby wybrać widoczny fragment. Suwakiem przybliżasz obraz.
        </p>

        <div className="crop-dialog-stage">
          {src && (
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              aspect={ratio === 'free' ? undefined : ratio}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              restrictPosition={ratio !== 'free'}
            />
          )}
        </div>

        <div className="crop-dialog-controls">
          <label className="crop-dialog-zoom">
            <span>Przybliżenie</span>
            <input type="range" min={1} max={4} step={0.01} value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))} />
          </label>

          {!lockAspect && (
            <div className="crop-dialog-aspects" role="group" aria-label="Proporcje kadru">
              {ASPECT_CHOICES.map((choice) => (
                <button key={choice.label} type="button"
                  className={ratio === choice.value ? 'selected' : ''}
                  onClick={() => setRatio(choice.value)}>{choice.label}</button>
              ))}
            </div>
          )}
        </div>

        {error && <p className="crop-dialog-error" role="alert">{error}</p>}

        <div className="crop-dialog-actions">
          <button type="button" className="ghost" onClick={onCancel} disabled={busy}>Anuluj</button>
          <button type="button" onClick={confirm} disabled={busy || !area}>
            {busy ? <><Loader2 className="spin" />Zapisywanie…</> : <><Check />Przytnij i wstaw</>}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Napisz hook uploadu**

Utwórz `apps/academy-web/src/hooks/useImageUpload.ts`:

```tsx
import { useCallback, useState } from 'react';
import { academyApi } from '@/api/academy.api';
import { canDecodeImage } from '@/lib/cropImage';
import { ImageCropDialog, type CropAspect } from '@/components/ImageCropDialog';

interface UseImageUploadOptions {
  folder: 'academy-lessons' | 'academy-courses' | 'academy-instructors';
  aspect: CropAspect;
  lockAspect?: boolean;
  onUploaded: (url: string) => void | Promise<void>;
}

export function useImageUpload({ folder, aspect, lockAspect, onUploaded }: UseImageUploadOptions) {
  const [pending, setPending] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const send = useCallback(async (payload: Blob) => {
    setUploading(true);
    try {
      const { url } = await academyApi.adminUploadLessonImage(payload, folder);
      await onUploaded(url);
      setPending(null);
      setError('');
    } catch {
      setError('Nie udało się wgrać zdjęcia. Sprawdź połączenie i spróbuj ponownie.');
    } finally {
      setUploading(false);
    }
  }, [folder, onUploaded]);

  /** Podepnij pod onChange elementu <input type="file">. */
  const pick = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');

    if (await canDecodeImage(file)) {
      setPending(file);
      return;
    }

    // Zdjęcia HEIC z iPhone'a nie dekodują się w przeglądarkach na Windowsie,
    // ale sharp po stronie serwera je obsłuży. Lepiej wgrać bez kadru niż wcale.
    setError('Tego formatu nie da się wykadrować w przeglądarce — zdjęcie zostało wgrane w całości. Aby je przyciąć, zapisz je najpierw jako JPG.');
    await send(file);
  }, [send]);

  const dialog = pending
    ? <ImageCropDialog file={pending} aspect={aspect} lockAspect={lockAspect}
        onCancel={() => setPending(null)} onConfirm={send} />
    : null;

  return { pick, dialog, uploading, error };
}
```

Zmień rozszerzenie pliku na `.tsx` (zwraca JSX): `apps/academy-web/src/hooks/useImageUpload.tsx`.

- [ ] **Step 4: Dodaj style okna kadrowania**

Dopisz na końcu `apps/academy-web/src/index.css`:

```css
/* --- Okno kadrowania zdjęć --- */
.crop-dialog-backdrop {
  position: fixed; inset: 0; z-index: 80;
  display: flex; align-items: center; justify-content: center;
  padding: 1rem; background: rgb(0 0 0 / 0.55);
}
.crop-dialog {
  width: min(40rem, 100%); max-height: 90vh; overflow-y: auto;
  display: flex; flex-direction: column; gap: 0.75rem;
  padding: 1.25rem; border-radius: 1rem;
  background: var(--academy-surface, #fff);
  box-shadow: 0 1.5rem 3rem rgb(0 0 0 / 0.25);
}
.crop-dialog-head { display: flex; align-items: center; justify-content: space-between; }
.crop-dialog-head button { padding: 0.25rem; border-radius: 0.5rem; }
.crop-dialog-hint { font-size: 0.8125rem; opacity: 0.75; }
.crop-dialog-stage {
  position: relative; width: 100%; aspect-ratio: 4 / 3;
  border-radius: 0.75rem; overflow: hidden; background: #111;
}
.crop-dialog-controls { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; justify-content: space-between; }
.crop-dialog-zoom { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8125rem; flex: 1 1 12rem; }
.crop-dialog-zoom input { flex: 1; }
.crop-dialog-aspects { display: flex; gap: 0.25rem; }
.crop-dialog-aspects button {
  padding: 0.25rem 0.625rem; border-radius: 0.5rem; font-size: 0.8125rem;
  border: 1px solid currentColor; opacity: 0.6;
}
.crop-dialog-aspects button.selected { opacity: 1; font-weight: 600; }
.crop-dialog-error { font-size: 0.8125rem; color: #b91c1c; }
.crop-dialog-actions { display: flex; justify-content: flex-end; gap: 0.5rem; }
.crop-dialog-actions button {
  display: inline-flex; align-items: center; gap: 0.375rem;
  padding: 0.5rem 1rem; border-radius: 0.625rem; font-weight: 600; font-size: 0.875rem;
}
.crop-dialog-actions button.ghost { background: transparent; border: 1px solid currentColor; opacity: 0.7; }
.crop-dialog-actions button:not(.ghost) { background: var(--academy-accent, #8b5e3c); color: #fff; }
.crop-dialog-actions button:disabled { opacity: 0.5; cursor: not-allowed; }
.crop-dialog .spin { animation: crop-spin 1s linear infinite; }
@keyframes crop-spin { to { transform: rotate(360deg); } }
```

- [ ] **Step 5: Sprawdź build**

Run: `pnpm --filter cosmo-academy-web build`
Expected: kompilacja bez błędów.

- [ ] **Step 6: Commit**

```bash
git add apps/academy-web/package.json apps/academy-web/src/components/ImageCropDialog.tsx apps/academy-web/src/hooks/useImageUpload.tsx apps/academy-web/src/index.css
git commit -m "feat(akademia): okno kadrowania zdjec i hook uploadu"
```

---

### Task 6: Kafelek wgrywania obrazu + okładka kursu

**Files:**
- Create: `apps/academy-web/src/components/ImageUploadField.tsx`
- Modify: `apps/academy-web/src/pages/AcademyStudio.tsx:57` (pole „Okładka — adres obrazu")
- Modify: `apps/academy-web/src/index.css`

**Interfaces:**
- Consumes: `useImageUpload` (zadanie 5)
- Produces: `<ImageUploadField label hint value onChange folder aspect previewShape />` — używane też w zadaniu 7

- [ ] **Step 1: Napisz komponent kafelka**

Utwórz `apps/academy-web/src/components/ImageUploadField.tsx`:

```tsx
import { useRef } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { useImageUpload } from '@/hooks/useImageUpload';
import type { CropAspect } from '@/components/ImageCropDialog';

interface ImageUploadFieldProps {
  label: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
  folder: 'academy-courses' | 'academy-instructors';
  aspect: CropAspect;
  previewShape: 'wide' | 'circle';
}

export function ImageUploadField({ label, hint, value, onChange, folder, aspect, previewShape }: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { pick, dialog, uploading, error } = useImageUpload({
    folder, aspect, lockAspect: true, onUploaded: onChange,
  });

  return (
    <div className="image-upload-field">
      <span className="image-upload-label">{label}</span>

      <div className={`image-upload-preview ${previewShape}`}>
        {value
          ? <img src={value} alt="" />
          : <span className="image-upload-empty"><ImagePlus /><small>Brak zdjęcia</small></span>}
      </div>

      <div className="image-upload-actions">
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? <><Loader2 className="spin" />Wgrywanie…</> : <><ImagePlus />{value ? 'Zmień zdjęcie' : 'Dodaj zdjęcie'}</>}
        </button>
        {value && (
          <button type="button" className="ghost" onClick={() => onChange('')} disabled={uploading}>
            <Trash2 />Usuń
          </button>
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/*" onChange={pick} hidden />
      {hint && <small className="image-upload-hint">{hint}</small>}
      {error && <small className="image-upload-error" role="alert">{error}</small>}
      {dialog}
    </div>
  );
}
```

- [ ] **Step 2: Dodaj style kafelka**

Dopisz na końcu `apps/academy-web/src/index.css`:

```css
/* --- Kafelek wgrywania zdjęcia --- */
.image-upload-field { display: flex; flex-direction: column; gap: 0.5rem; }
.image-upload-label { font-size: 0.8125rem; font-weight: 600; }
.image-upload-preview {
  display: flex; align-items: center; justify-content: center; overflow: hidden;
  background: rgb(0 0 0 / 0.04); border: 1px dashed rgb(0 0 0 / 0.15);
}
.image-upload-preview img { width: 100%; height: 100%; object-fit: cover; }
.image-upload-preview.wide { width: 100%; aspect-ratio: 16 / 9; border-radius: 0.75rem; }
.image-upload-preview.circle { width: 8rem; height: 8rem; border-radius: 50%; }
.image-upload-empty { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; opacity: 0.5; }
.image-upload-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.image-upload-actions button {
  display: inline-flex; align-items: center; gap: 0.375rem;
  padding: 0.375rem 0.75rem; border-radius: 0.5rem; font-size: 0.8125rem; font-weight: 600;
  border: 1px solid currentColor;
}
.image-upload-actions button.ghost { opacity: 0.7; }
.image-upload-actions button:disabled { opacity: 0.5; cursor: not-allowed; }
.image-upload-hint { font-size: 0.75rem; opacity: 0.7; }
.image-upload-error { font-size: 0.75rem; color: #b91c1c; }
```

- [ ] **Step 3: Podmień pole okładki w studiu**

W `AcademyStudio.tsx` dodaj do importów:

```ts
import { ImageUploadField } from '@/components/ImageUploadField';
```

W linii 57, w sekcji „Karta kursu", zastąp fragment:

```tsx
<Field label="Okładka — adres obrazu"><input value={draft.thumbnailUrl} onChange={e => setDraft({...draft, thumbnailUrl:e.target.value})} /></Field>
```

na:

```tsx
<ImageUploadField label="Okładka kursu" hint="Zalecane proporcje 16:9 — tak wyświetla się okładka w sklepie." value={draft.thumbnailUrl} onChange={(url) => setDraft({ ...draft, thumbnailUrl: url })} folder="academy-courses" aspect={16 / 9} previewShape="wide" />
```

- [ ] **Step 4: Sprawdź build**

Run: `pnpm --filter cosmo-academy-web build`
Expected: kompilacja bez błędów.

- [ ] **Step 5: Kontrola ręczna**

Uruchom `pnpm dev` z `cosmo-app/`, zaloguj się jako ADMIN, wejdź w Studio Akademii i sprawdź kolejno:
1. Nowy kurs bez okładki pokazuje kafelek „Brak zdjęcia".
2. Wybór pliku otwiera okno kadrowania z zablokowanym 16:9 (bez przełącznika proporcji).
3. Po „Przytnij i wstaw" podgląd kafelka i sekcja „Podgląd strony kursu" pokazują nowy obraz.
4. „Usuń" czyści podgląd.
5. Zapis kursu utrwala okładkę — po odświeżeniu strony obraz nadal jest.

- [ ] **Step 6: Commit**

```bash
git add apps/academy-web/src/components/ImageUploadField.tsx apps/academy-web/src/pages/AcademyStudio.tsx apps/academy-web/src/index.css
git commit -m "feat(akademia): okladka kursu wgrywana z dysku zamiast adresu URL"
```

---

### Task 7: Zdjęcie prowadzącej

**Files:**
- Modify: `apps/academy-web/src/pages/admin/AdminInstructors.tsx:130-132`

**Interfaces:**
- Consumes: `<ImageUploadField />` (zadanie 6)
- Produces: nic

- [ ] **Step 1: Podmień pole**

Dodaj do importów `import { ImageUploadField } from '@/components/ImageUploadField';`, a następnie zastąp blok z linii 130-132:

```tsx
            <HelpField label="Adres zdjęcia" hint="Wklej link do zdjęcia. Pliki wgrywasz w zakładce „Biblioteka mediów” i kopiujesz stamtąd adres.">
              <input value={draft.photoUrl} onChange={(e) => setDraft({ ...draft, photoUrl: e.target.value })} placeholder="https://…" />
            </HelpField>
```

na:

```tsx
            <ImageUploadField
              label="Zdjęcie prowadzącej"
              hint="Zdjęcie wyświetla się jako koło — wykadruj tak, żeby twarz była na środku."
              value={draft.photoUrl}
              onChange={(url) => setDraft({ ...draft, photoUrl: url })}
              folder="academy-instructors"
              aspect={1}
              previewShape="circle"
            />
```

- [ ] **Step 2: Sprawdź build**

Run: `pnpm --filter cosmo-academy-web build`
Expected: kompilacja bez błędów.

- [ ] **Step 3: Kontrola ręczna**

W panelu Akademii wejdź w „Prowadzące": dodaj zdjęcie nowej prowadzącej, sprawdź kadrowanie 1:1, zapisz i potwierdź, że miniatura na liście po prawej pokazuje wgrane zdjęcie.

- [ ] **Step 4: Commit**

```bash
git add apps/academy-web/src/pages/admin/AdminInstructors.tsx
git commit -m "feat(akademia): zdjecie prowadzacej wgrywane z dysku"
```

---

### Task 8: Układ obrazu w lekcji — model danych

**Files:**
- Create: `apps/academy-web/src/lib/lessonFigure.ts`
- Test: `apps/academy-web/src/lib/lessonFigure.test.ts`

**Interfaces:**
- Consumes: nic
- Produces:
  - `type FigureLayout = 'left' | 'center' | 'right' | 'full'`
  - `clampWidth(value: number): number`
  - `layoutWidth(layout: FigureLayout, widthPercent: number): number`
  - `buildFigureHtml(input: { src: string; alt: string; caption: string; layout: FigureLayout; widthPercent: number }): string`
  - `readFigureLayout(figure: HTMLElement): { layout: FigureLayout; widthPercent: number }`
  - `applyFigureLayout(figure: HTMLElement, layout: FigureLayout, widthPercent: number): void`
  - Wszystko używane przez zadania 9 i 10.

- [ ] **Step 1: Napisz test, który nie przechodzi**

Utwórz `apps/academy-web/src/lib/lessonFigure.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  applyFigureLayout, buildFigureHtml, clampWidth, layoutWidth, readFigureLayout,
  type FigureLayout,
} from './lessonFigure';

const figureFromHtml = (html: string): HTMLElement => {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host.firstElementChild as HTMLElement;
};

describe('clampWidth', () => {
  it('trzyma szerokość w zakresie 10–100', () => {
    expect(clampWidth(5)).toBe(10);
    expect(clampWidth(150)).toBe(100);
    expect(clampWidth(45)).toBe(45);
  });

  it('zaokrągla do pełnych procentów', () => {
    expect(clampWidth(45.6)).toBe(46);
  });

  it('broni się przed wartością, która nie jest liczbą', () => {
    expect(clampWidth(Number.NaN)).toBe(100);
    expect(clampWidth(Number.POSITIVE_INFINITY)).toBe(100);
  });
});

describe('layoutWidth', () => {
  it('wymusza pełną szerokość dla układu full', () => {
    expect(layoutWidth('full', 30)).toBe(100);
  });

  it('zachowuje szerokość dla pozostałych układów', () => {
    expect(layoutWidth('left', 30)).toBe(30);
  });
});

describe('buildFigureHtml', () => {
  it('buduje figurę z klasą układu i szerokością', () => {
    const html = buildFigureHtml({ src: '/uploads/academy-lessons/a.webp', alt: 'Opis', caption: 'Podpis', layout: 'left', widthPercent: 45 });
    expect(html).toContain('academy-figure--left');
    expect(html).toContain('width:45%');
    expect(html).toContain('<figcaption>Podpis</figcaption>');
    expect(html).toContain('loading="lazy"');
  });

  it('pomija podpis, gdy jest pusty', () => {
    const html = buildFigureHtml({ src: '/a.webp', alt: '', caption: '   ', layout: 'center', widthPercent: 100 });
    expect(html).not.toContain('figcaption');
  });

  it('ucieka znaki specjalne w podpisie i tekście alternatywnym', () => {
    const html = buildFigureHtml({ src: '/a.webp', alt: '"x" & <y>', caption: '<script>alert(1)</script>', layout: 'center', widthPercent: 50 });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&quot;x&quot; &amp; &lt;y&gt;');
  });
});

describe('readFigureLayout', () => {
  it('odczytuje układ i szerokość zapisane w HTML', () => {
    const figure = figureFromHtml('<figure class="academy-figure academy-figure--right" style="width:35%"></figure>');
    expect(readFigureLayout(figure)).toEqual({ layout: 'right', widthPercent: 35 });
  });

  it('wraca do środka i pełnej szerokości, gdy brakuje danych', () => {
    const figure = figureFromHtml('<figure class="academy-figure"></figure>');
    expect(readFigureLayout(figure)).toEqual({ layout: 'center', widthPercent: 100 });
  });
});

describe('applyFigureLayout', () => {
  it('podmienia klasę układu bez pozostawiania starej', () => {
    const figure = figureFromHtml('<figure class="academy-figure academy-figure--left" style="width:40%"></figure>');
    applyFigureLayout(figure, 'right', 60);
    expect(figure.classList.contains('academy-figure--left')).toBe(false);
    expect(figure.classList.contains('academy-figure--right')).toBe(true);
    expect(figure.style.width).toBe('60%');
  });

  it('działa w obie strony razem z readFigureLayout', () => {
    const layouts: FigureLayout[] = ['left', 'center', 'right', 'full'];
    for (const layout of layouts) {
      const figure = figureFromHtml('<figure></figure>');
      applyFigureLayout(figure, layout, 40);
      expect(readFigureLayout(figure)).toEqual({ layout, widthPercent: layout === 'full' ? 100 : 40 });
    }
  });
});
```

- [ ] **Step 2: Uruchom test i sprawdź, że nie przechodzi**

Run: `pnpm --filter cosmo-academy-web test src/lib/lessonFigure.test.ts`
Expected: FAIL — modułu `./lessonFigure` nie da się rozwiązać.

- [ ] **Step 3: Zaimplementuj**

Utwórz `apps/academy-web/src/lib/lessonFigure.ts`:

```ts
export type FigureLayout = 'left' | 'center' | 'right' | 'full';

const LAYOUTS: FigureLayout[] = ['left', 'center', 'right', 'full'];

export const clampWidth = (value: number): number => {
  if (!Number.isFinite(value)) return 100;
  return Math.min(100, Math.max(10, Math.round(value)));
};

/** Obraz rozciągnięty na całą szerokość ignoruje ustawioną wartość — inaczej
 *  „cała szerokość" nie znaczyłaby tego, co mówi. */
export const layoutWidth = (layout: FigureLayout, widthPercent: number): number =>
  layout === 'full' ? 100 : clampWidth(widthPercent);

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function buildFigureHtml(input: {
  src: string;
  alt: string;
  caption: string;
  layout: FigureLayout;
  widthPercent: number;
}): string {
  const width = layoutWidth(input.layout, input.widthPercent);
  const caption = input.caption.trim()
    ? `<figcaption>${escapeHtml(input.caption.trim())}</figcaption>`
    : '';
  return `<figure class="academy-figure academy-figure--${input.layout}" style="width:${width}%" draggable="true">`
    + `<img src="${escapeHtml(input.src)}" alt="${escapeHtml(input.alt)}" loading="lazy">`
    + `${caption}</figure>`;
}

export function readFigureLayout(figure: HTMLElement): { layout: FigureLayout; widthPercent: number } {
  const layout = LAYOUTS.find((name) => figure.classList.contains(`academy-figure--${name}`)) ?? 'center';
  const raw = Number.parseFloat(figure.style.width);
  return { layout, widthPercent: layoutWidth(layout, Number.isNaN(raw) ? 100 : raw) };
}

export function applyFigureLayout(figure: HTMLElement, layout: FigureLayout, widthPercent: number): void {
  LAYOUTS.forEach((name) => figure.classList.remove(`academy-figure--${name}`));
  figure.classList.add('academy-figure', `academy-figure--${layout}`);
  figure.style.width = `${layoutWidth(layout, widthPercent)}%`;
}
```

- [ ] **Step 4: Uruchom test i sprawdź, że przechodzi**

Run: `pnpm --filter cosmo-academy-web test src/lib/lessonFigure.test.ts`
Expected: PASS — 10 testów.

- [ ] **Step 5: Commit**

```bash
git add apps/academy-web/src/lib/lessonFigure.ts apps/academy-web/src/lib/lessonFigure.test.ts
git commit -m "feat(akademia): model ukladu obrazu w tresci lekcji"
```

---

### Task 9: Wyodrębnienie edytora i pasek narzędzi obrazu

`RichTextEditor` siedzi dziś w `AcademyStudio.tsx:267-321`, w pliku, który trzyma już całe studio. Wyprowadzamy go do własnego pliku i dodajemy pasek sterowania obrazem.

**Files:**
- Create: `apps/academy-web/src/components/RichTextEditor.tsx`
- Modify: `apps/academy-web/src/pages/AcademyStudio.tsx` — usunięcie `RichTextEditor` (linie 267-321) i import z nowego pliku
- Modify: `apps/academy-web/src/index.css`

**Interfaces:**
- Consumes: `buildFigureHtml`, `readFigureLayout`, `applyFigureLayout`, `FigureLayout` (zadanie 8); `useImageUpload` (zadanie 5)
- Produces: `<RichTextEditor value onChange />` — ta sama sygnatura co dotychczas, więc `AcademyStudio` używa go bez zmian

- [ ] **Step 1: Przenieś komponent bez zmian w zachowaniu**

Utwórz `apps/academy-web/src/components/RichTextEditor.tsx` i przenieś do niego treść funkcji `RichTextEditor` z `AcademyStudio.tsx:267-321` wraz z potrzebnymi importami (`useEffect`, `useRef`, `useState` z `react`; ikony `Bold`, `Heading1`, `Heading2`, `ImagePlus`, `Italic`, `Link2`, `List`, `ListOrdered`, `Underline` z `lucide-react`; `academyApi`). Dodaj `export` przed `function RichTextEditor`.

W `AcademyStudio.tsx`: usuń definicję funkcji `RichTextEditor` (linie 267-321), dodaj `import { RichTextEditor } from '@/components/RichTextEditor';` i usuń z importu `lucide-react` ikony używane wyłącznie przez edytor (`Bold`, `Heading1`, `Heading2`, `ImagePlus`, `Italic`, `Link2`, `List`, `ListOrdered`, `Underline`) — jeśli nie używa ich nic innego w pliku.

- [ ] **Step 2: Sprawdź, że przenosiny niczego nie zepsuły**

Run: `pnpm --filter cosmo-academy-web build && pnpm --filter cosmo-academy-web lint`
Expected: kompilacja i lint bez błędów (lint pilnuje nieużywanych importów).

- [ ] **Step 3: Commit przenosin osobno**

```bash
git add apps/academy-web/src/components/RichTextEditor.tsx apps/academy-web/src/pages/AcademyStudio.tsx
git commit -m "refactor(akademia): wydziel RichTextEditor z AcademyStudio"
```

- [ ] **Step 4: Dołóż `pickFor` do hooka uploadu**

Przycisk „Kadruj" (dodawany w następnym kroku) pracuje na obrazie, który już jest na serwerze — nie ma pliku z dysku. Rozszerz `apps/academy-web/src/hooks/useImageUpload.tsx` o pobranie obrazu spod adresu i otwarcie okna kadrowania. Dodaj obok `pick`:

```tsx
  /** Otwiera kadrowanie dla obrazu, który jest już na serwerze. */
  const pickFor = useCallback(async (url: string) => {
    if (!url) return;
    setError('');
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('FETCH_FAILED');
      const blob = await response.blob();
      setPending(new File([blob], 'kadr.webp', { type: blob.type || 'image/webp' }));
    } catch {
      setError('Nie udało się wczytać tego zdjęcia do ponownego kadrowania.');
    }
  }, []);
```

i zwróć je: `return { pick, pickFor, dialog, uploading, error };`

- [ ] **Step 5: Przepisz wstawianie obrazu i dodaj pasek narzędzi**

Zastąp całą treść `apps/academy-web/src/components/RichTextEditor.tsx`:

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlignCenter, AlignLeft, AlignRight, Bold, Crop, Heading1, Heading2, ImagePlus,
  Italic, Link2, List, ListOrdered, Maximize2, Pencil, Trash2, Underline,
} from 'lucide-react';
import { useImageUpload } from '@/hooks/useImageUpload';
import {
  applyFigureLayout, buildFigureHtml, clampWidth, readFigureLayout, type FigureLayout,
} from '@/lib/lessonFigure';

const LAYOUT_BUTTONS: { layout: FigureLayout; label: string; icon: React.ReactNode }[] = [
  { layout: 'left', label: 'Do lewej, tekst oblewa', icon: <AlignLeft /> },
  { layout: 'center', label: 'Wyśrodkowany', icon: <AlignCenter /> },
  { layout: 'right', label: 'Do prawej, tekst oblewa', icon: <AlignRight /> },
  { layout: 'full', label: 'Cała szerokość', icon: <Maximize2 /> },
];

export function RichTextEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<HTMLElement | null>(null);
  const [layout, setLayout] = useState<FigureLayout>('center');
  const [width, setWidth] = useState(100);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) editorRef.current.innerHTML = value;
  }, [value]);

  const sync = useCallback(() => onChange(editorRef.current?.innerHTML ?? ''), [onChange]);

  const command = (name: string, commandValue?: string) => {
    editorRef.current?.focus();
    document.execCommand(name, false, commandValue);
    sync();
  };

  const addLink = () => {
    const url = window.prompt('Wklej adres linku (https://...)');
    if (url?.trim()) command('createLink', url.trim());
  };

  const insertFigure = useCallback((url: string) => {
    const alt = window.prompt('Opisz krótko, co przedstawia obraz. Pozostaw puste tylko dla dekoracji.', '') ?? '';
    editorRef.current?.focus();
    document.execCommand('insertHTML', false,
      buildFigureHtml({ src: url, alt: alt.trim(), caption: '', layout: 'center', widthPercent: 100 }) + '<p><br></p>');
    sync();
  }, [sync]);

  const { pick, dialog, uploading, error } = useImageUpload({
    folder: 'academy-lessons', aspect: 'free', onUploaded: insertFigure,
  });

  /** Ponowne kadrowanie już wstawionego obrazu — podmienia adres w miejscu. */
  const recrop = useImageUpload({
    folder: 'academy-lessons', aspect: 'free',
    onUploaded: (url) => {
      const image = selected?.querySelector('img');
      if (image) { image.setAttribute('src', url); sync(); }
    },
  });

  const selectFigure = (event: React.MouseEvent) => {
    const figure = (event.target as HTMLElement).closest('figure.academy-figure') as HTMLElement | null;
    setSelected(figure);
    if (figure) {
      const current = readFigureLayout(figure);
      setLayout(current.layout);
      setWidth(current.widthPercent);
    }
  };

  const setFigureLayout = (next: FigureLayout) => {
    if (!selected) return;
    applyFigureLayout(selected, next, width);
    setLayout(next);
    if (next === 'full') setWidth(100);
    sync();
  };

  const setFigureWidth = (next: number) => {
    if (!selected) return;
    const clamped = clampWidth(next);
    applyFigureLayout(selected, layout, clamped);
    setWidth(clamped);
    sync();
  };

  const editCaption = () => {
    if (!selected) return;
    const existing = selected.querySelector('figcaption');
    const text = window.prompt('Podpis pod zdjęciem (pusty usuwa podpis)', existing?.textContent ?? '') ?? '';
    if (text.trim()) {
      if (existing) existing.textContent = text.trim();
      else {
        const caption = document.createElement('figcaption');
        caption.textContent = text.trim();
        selected.appendChild(caption);
      }
    } else existing?.remove();
    sync();
  };

  const removeFigure = () => {
    if (!selected) return;
    selected.remove();
    setSelected(null);
    sync();
  };

  const tool = (label: string, icon: React.ReactNode, action: () => void) => (
    <button type="button" title={label} aria-label={label}
      onMouseDown={(event) => event.preventDefault()} onClick={action}>{icon}</button>
  );

  return (
    <div className="rich-editor">
      <div className="rich-editor-toolbar">
        {tool('Nagłówek H1', <Heading1 />, () => command('formatBlock', 'h1'))}
        {tool('Nagłówek H2', <Heading2 />, () => command('formatBlock', 'h2'))}
        {tool('Pogrubienie', <Bold />, () => command('bold'))}
        {tool('Kursywa', <Italic />, () => command('italic'))}
        {tool('Podkreślenie', <Underline />, () => command('underline'))}
        {tool('Lista punktowana', <List />, () => command('insertUnorderedList'))}
        {tool('Lista numerowana', <ListOrdered />, () => command('insertOrderedList'))}
        {tool('Dodaj link', <Link2 />, addLink)}
        <span className="rich-editor-divider" />
        <button type="button" className="rich-editor-image" onClick={() => fileRef.current?.click()} disabled={uploading}>
          <ImagePlus />{uploading ? 'Wgrywanie…' : 'Dodaj obraz'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={pick} hidden />
      </div>

      {selected && (
        <div className="figure-toolbar" role="group" aria-label="Ustawienia zdjęcia">
          <div className="figure-toolbar-row">
            {LAYOUT_BUTTONS.map((item) => (
              <button key={item.layout} type="button" title={item.label} aria-label={item.label}
                aria-pressed={layout === item.layout}
                className={layout === item.layout ? 'selected' : ''}
                onClick={() => setFigureLayout(item.layout)}>{item.icon}</button>
            ))}
          </div>
          <div className="figure-toolbar-row">
            <label className="figure-toolbar-width">
              <span>Szerokość {width}%</span>
              <input type="range" min={10} max={100} step={1} value={width}
                disabled={layout === 'full'}
                onChange={(event) => setFigureWidth(Number(event.target.value))} />
            </label>
          </div>
          <div className="figure-toolbar-row">
            <button type="button" onClick={() => recrop.pickFor(selected.querySelector('img')?.getAttribute('src') ?? '')}>
              <Crop />Kadruj
            </button>
            <button type="button" onClick={editCaption}><Pencil />Podpis</button>
            <button type="button" className="danger" onClick={removeFigure}><Trash2 />Usuń</button>
          </div>
          {recrop.error && <p className="rich-editor-error" role="alert">{recrop.error}</p>}
        </div>
      )}

      <div ref={editorRef} className="rich-editor-body" contentEditable suppressContentEditableWarning
        data-placeholder="Napisz instrukcję. Zaznacz tekst, aby użyć formatowania."
        onInput={sync}
        onClick={selectFigure}
        onPaste={(event) => {
          event.preventDefault();
          document.execCommand('insertText', false, event.clipboardData.getData('text/plain'));
          sync();
        }} />

      <p className="rich-editor-hint">
        Kliknij w zdjęcie, żeby ustawić jego rozmiar i położenie. Wstawione obrazy są automatycznie optymalizowane i zapisywane jako WebP.
      </p>
      {error && <p className="rich-editor-error" role="alert">{error}</p>}
      {dialog}
      {recrop.dialog}
    </div>
  );
}
```

- [ ] **Step 6: Dodaj style paska i figur w edytorze**

Dopisz na końcu `apps/academy-web/src/index.css`:

```css
/* --- Pasek ustawień zdjęcia w edytorze --- */
.figure-toolbar {
  display: flex; flex-direction: column; gap: 0.5rem;
  padding: 0.625rem; margin: 0.5rem 0;
  border: 1px solid rgb(0 0 0 / 0.12); border-radius: 0.625rem;
  background: rgb(0 0 0 / 0.03);
}
.figure-toolbar-row { display: flex; flex-wrap: wrap; align-items: center; gap: 0.375rem; }
.figure-toolbar button {
  display: inline-flex; align-items: center; gap: 0.25rem;
  padding: 0.3125rem 0.5rem; border-radius: 0.4375rem; font-size: 0.75rem;
  border: 1px solid rgb(0 0 0 / 0.15); background: #fff;
}
.figure-toolbar button.selected { border-color: currentColor; font-weight: 600; background: rgb(0 0 0 / 0.06); }
.figure-toolbar button.danger { color: #b91c1c; }
.figure-toolbar-width { display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; flex: 1 1 12rem; }
.figure-toolbar-width input { flex: 1; }
.figure-toolbar-width input:disabled { opacity: 0.4; }

/* --- Figury wewnątrz edytora --- */
.rich-editor-body figure.academy-figure { cursor: pointer; }
.rich-editor-body figure.academy-figure:hover { outline: 2px dashed rgb(0 0 0 / 0.25); outline-offset: 2px; }
```

- [ ] **Step 7: Sprawdź build i testy**

Run: `pnpm --filter cosmo-academy-web test && pnpm --filter cosmo-academy-web build`
Expected: wszystkie testy przechodzą, build bez błędów.

- [ ] **Step 8: Commit**

```bash
git add apps/academy-web/src/components/RichTextEditor.tsx apps/academy-web/src/hooks/useImageUpload.tsx apps/academy-web/src/index.css
git commit -m "feat(akademia): pasek ustawien zdjecia w edytorze lekcji"
```

---

### Task 10: Przeciąganie i uchwyty zmiany rozmiaru

**Files:**
- Modify: `apps/academy-web/src/components/RichTextEditor.tsx`
- Modify: `apps/academy-web/src/index.css`

**Interfaces:**
- Consumes: `clampWidth`, `applyFigureLayout` (zadanie 8); stan `selected`, `layout`, `width` z zadania 9
- Produces: nic

- [ ] **Step 1: Dodaj uchwyt zmiany rozmiaru**

W `RichTextEditor.tsx` dodaj przed `return`:

```tsx
  /** Ciągnięcie uchwytu w rogu. Szerokość liczymy względem szerokości edytora,
   *  bo tak samo zachowa się u kursantki — figura ma szerokość w procentach. */
  const startResize = (event: React.PointerEvent) => {
    if (!selected || !editorRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    const editorWidth = editorRef.current.clientWidth;
    const startX = event.clientX;
    const startWidth = width;
    const direction = layout === 'right' ? -1 : 1;

    const onMove = (move: PointerEvent) => {
      const deltaPercent = ((move.clientX - startX) / editorWidth) * 100 * direction;
      const next = clampWidth(startWidth + deltaPercent);
      applyFigureLayout(selected, layout, next);
      setWidth(next);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      sync();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };
```

Uchwyt renderuje się jako nakładka na zaznaczonej figurze. Dodaj bezpośrednio nad `<div ref={editorRef} …>`:

```tsx
      {selected && layout !== 'full' && (
        <div className="figure-resize-hint" aria-hidden="true">
          <button type="button" className="figure-resize-handle" onPointerDown={startResize}
            title="Ciągnij, aby zmienić szerokość" />
        </div>
      )}
```

- [ ] **Step 2: Dodaj przyciski szerokości dla dotyku**

Uchwyt w rogu jest za małym celem na telefonie. W `figure-toolbar`, w wierszu szerokości, dodaj po suwaku:

```tsx
              <span className="figure-toolbar-steps">
                <button type="button" aria-label="Węziej" disabled={layout === 'full'}
                  onClick={() => setFigureWidth(width - 5)}>−</button>
                <button type="button" aria-label="Szerzej" disabled={layout === 'full'}
                  onClick={() => setFigureWidth(width + 5)}>+</button>
              </span>
```

- [ ] **Step 3: Włącz przeciąganie figury w tekście**

`buildFigureHtml` ustawia już `draggable="true"`, więc przeglądarka przenosi figurę natywnie. Trzeba tylko zsynchronizować HTML po upuszczeniu i odznaczyć figurę, bo po przeniesieniu referencja wskazuje na usunięty węzeł. Do `<div ref={editorRef} …>` dodaj:

```tsx
        onDragStart={() => setSelected(null)}
        onDrop={() => { window.setTimeout(sync, 0); }}
```

`setTimeout` jest konieczny: w chwili zdarzenia `drop` przeglądarka jeszcze nie przeniosła węzła, więc odczyt `innerHTML` dałby stan sprzed przenosin.

- [ ] **Step 4: Dodaj style uchwytu**

Dopisz na końcu `apps/academy-web/src/index.css`:

```css
.figure-resize-hint { position: relative; height: 0; }
.figure-resize-handle {
  position: absolute; right: 0; top: 0.25rem;
  width: 1.75rem; height: 1.75rem; border-radius: 50%;
  border: 2px solid #fff; background: var(--academy-accent, #8b5e3c);
  box-shadow: 0 0.125rem 0.375rem rgb(0 0 0 / 0.3);
  cursor: ew-resize; touch-action: none;
}
.figure-toolbar-steps { display: inline-flex; gap: 0.25rem; }
.figure-toolbar-steps button { min-width: 2rem; justify-content: center; font-size: 0.875rem; font-weight: 700; }
@media (max-width: 640px) {
  .figure-resize-hint { display: none; }
}
```

- [ ] **Step 5: Sprawdź build**

Run: `pnpm --filter cosmo-academy-web test && pnpm --filter cosmo-academy-web build`
Expected: testy przechodzą, build bez błędów.

- [ ] **Step 6: Commit**

```bash
git add apps/academy-web/src/components/RichTextEditor.tsx apps/academy-web/src/index.css
git commit -m "feat(akademia): przeciaganie i zmiana rozmiaru zdjecia w lekcji"
```

---

### Task 11: Widok kursantki i kontrola całości

**Files:**
- Modify: `apps/academy-web/src/index.css` (style `.academy-figure` w widoku lekcji)

**Interfaces:**
- Consumes: klasy z `lessonFigure.ts` (zadanie 8), sanityzację z zadania 3
- Produces: nic

- [ ] **Step 1: Dodaj style figur w treści lekcji**

Dopisz na końcu `apps/academy-web/src/index.css`:

```css
/* --- Obrazy w treści lekcji (widok kursantki i podgląd w edytorze) --- */
.academy-figure { margin: 1rem 0; max-width: 100%; }
.academy-figure img { display: block; width: 100%; height: auto; border-radius: 0.75rem; }
.academy-figure figcaption {
  margin-top: 0.375rem; font-size: 0.8125rem; line-height: 1.4; opacity: 0.7; text-align: center;
}
.academy-figure--left { float: left; margin: 0.25rem 1.25rem 0.75rem 0; }
.academy-figure--right { float: right; margin: 0.25rem 0 0.75rem 1.25rem; }
.academy-figure--center { margin-left: auto; margin-right: auto; }
.academy-figure--full { width: 100% !important; margin-left: 0; margin-right: 0; }

/* Na wąskim ekranie oblewanie tekstem robi się nieczytelne — obraz idzie na
   pełną szerokość niezależnie od ustawienia. */
@media (max-width: 640px) {
  .academy-figure,
  .academy-figure--left,
  .academy-figure--right,
  .academy-figure--center {
    float: none; width: 100% !important; margin: 1rem 0;
  }
}
```

- [ ] **Step 2: Zadbaj o czyszczenie opływania**

Figura z `float` może wyjść poza kontener lekcji. Dopisz:

```css
.rich-editor-body::after,
.prose::after { content: ''; display: block; clear: both; }
```

- [ ] **Step 3: Pełne testy i build obu aplikacji**

Run:
```bash
pnpm --filter cosmo-academy-web test
pnpm --filter cosmo-server vitest run src/modules/academy
pnpm build
```
Expected: wszystkie testy przechodzą, build całego monorepo bez błędów.

- [ ] **Step 4: Kontrola ręczna pełnej ścieżki**

Z `cosmo-app/` uruchom `pnpm dev`, zaloguj się jako ADMIN i przejdź listę:

1. **Okładka kursu** — wgraj, wykadruj 16:9, zapisz, odśwież: okładka jest.
2. **Prowadząca** — wgraj zdjęcie, kadr 1:1, zapisz: miniatura na liście jest.
3. **Lekcja tekstowa** — wstaw obraz, ustaw „do lewej" i szerokość ~45%: tekst oblewa obraz z prawej.
4. **Podpis** — dodaj podpis, sprawdź, że pojawia się pod obrazem; wyczyść, sprawdź, że znika.
5. **Kadruj** — przytnij wstawiony obraz; nowy kadr pojawia się w miejscu starego.
6. **Przeciąganie** — przeciągnij obraz między akapitami; po zapisaniu lekcji zostaje w nowym miejscu.
7. **Uchwyt** — ciągnij uchwyt: szerokość zmienia się płynnie, podpowiedź procentowa się aktualizuje.
8. **Widok kursantki** — otwórz lekcję jako kursantka: układ, szerokość i podpis zgadzają się z edytorem.
9. **Wąski ekran** — zwęź okno poniżej 640 px: obrazy idą na pełną szerokość, tekst ich nie oblewa.
10. **Bezpłatny fragment** — ustaw lekcję jako podglądową, otwórz stronę kursu wylogowana: obraz ma ten sam układ co w lekcji (to naprawa z zadania 3).

- [ ] **Step 5: Commit**

```bash
git add apps/academy-web/src/index.css
git commit -m "feat(akademia): uklad obrazow w widoku lekcji kursantki"
```

---

## Autokontrola planu

**Pokrycie specyfikacji:**
- Okładka kursu przez upload → zadania 5, 6
- Zdjęcie prowadzącej → zadanie 7
- Wspólne okno kadrowania (`ImageCropDialog`, zoom, proporcje) → zadania 4, 5
- Obrazy w lekcji: wyrównanie, szerokość, podpis, kadrowanie, usuwanie → zadania 8, 9
- Przeciąganie i uchwyty rozmiaru, wariant dotykowy → zadanie 10
- Backend: biała lista folderów → zadanie 1; klient API → zadanie 2
- Widok kursantki + naprawa sanityzacji na stronie kursu → zadania 3, 11
- Ścieżka zapasowa HEIC → zadanie 5 (`canDecodeImage` + komunikat w `useImageUpload`)
- Testy wymienione w specyfikacji → zadania 1, 3, 4, 8

**Spójność nazw:** `resolveUploadFolder`, `cropAreaToPixels`, `cropFileToBlob`, `canDecodeImage`, `sanitizeLessonHtml`, `clampWidth`, `layoutWidth`, `buildFigureHtml`, `readFigureLayout`, `applyFigureLayout`, `useImageUpload` (`pick`, `pickFor`, `dialog`, `uploading`, `error`), `ImageUploadField`, `ImageCropDialog`, `RichTextEditor` — używane w zadaniach dokładnie tak, jak zdefiniowane.

**Kolejność zależności:** 1 → 2 (endpoint przed klientem); 4 → 5 (przeliczanie kadru przed oknem); 5 → 6 → 7 (hook przed kafelkiem, kafelek przed prowadzącymi); 8 → 9 → 10 (model przed edytorem, edytor przed przeciąganiem); 3 i 11 domykają widok kursantki. Zadania 1–2 i 3–4 da się prowadzić równolegle.
