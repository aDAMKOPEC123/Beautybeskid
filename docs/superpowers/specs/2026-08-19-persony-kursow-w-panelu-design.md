# Persony kursów w panelu Akademii

Data: 2026-08-19

## Problem

Landingi person (`/dla-poczatkujacych`, `/dla-praktykow`, `/dla-salonow`) filtrują kursy
po polu `Course.audiences` (`academy-web/src/lib/personas.ts` → `coursesForAudience`).
Gdy filtr nic nie zwróci, `PersonaLanding` renderuje wariant „lista oczekujących”
zamiast oferty.

Na produkcji jedyny opublikowany kurs ma `audiences = []`, więc **wszystkie trzy
lejki** działają w trybie listy oczekujących. Złożyły się na to trzy rzeczy:

1. Migracja `20260804070000_add_academy_audiences_and_instructors` dodała kolumnę
   z `DEFAULT ARRAY[]` — istniejące kursy dostały pustą listę.
2. Skrypt backfillu `prisma/seed-academy-personas.ts` nigdy nie został uruchomiony
   na VPS.
3. **Panel admina nie ma pola do ustawienia person.** `audiences` nie występuje
   w `apps/academy-web/src` poza `personas.ts`. Backend przyjąłby wartość
   (`updateCourse` przepuszcza `data as any`), ale UI jej nie wysyła.

Błąd był cichy: kurs wygląda na poprawnie opublikowany, a lejek świeci pustką.

## Zakres

Pole wyboru person w edytorze kursu plus blokada publikacji kursu bez persony.

Poza zakresem: uruchamianie seeda backfillu (przy jednym opublikowanym kursie
i działającym polu w panelu jest zbędny, a mapowanie po `difficulty` przypisałoby
tylko `STARTER`).

## Rozwiązanie

### Backend — `apps/server/src/modules/academy/courses/courses.service.ts`

Nowa czysta funkcja, eksportowana dla testów:

```ts
export const resolvePublishAudiences = (incoming: unknown, current: string[]): string[] =>
  incoming === undefined ? current : Array.isArray(incoming) ? incoming : [];
```

Aktualizacja częściowa (payload bez `audiences`) musi brać stan z bazy, a nie
blokować zapis — to jedyne miejsce z realnym ryzykiem błędu, więc jest pokryte
testem jednostkowym.

W `updateCourse`, wewnątrz istniejącego bloku `if (nextStatus === 'PUBLISHED')`,
obok kontroli ceny i transkrypcji:

```ts
if (!resolvePublishAudiences(data.audiences, before.audiences).length)
  throw new AppError('Przed publikacją przypisz kurs do co najmniej jednej persony…', 400);
```

`createCourse` nie wymaga zmiany logiki — już dziś odrzuca tworzenie ze statusem
`PUBLISHED`. Dopisujemy tylko `audiences?: string[]` do jego typu wejściowego.

**Świadomy kompromis:** twarda blokada uniemożliwia opublikowanie kursu
przeznaczonego wyłącznie do katalogu, bez lejka. Decyzja właścicielki produktu.

### Frontend — `apps/academy-web/src/pages/AcademyStudio.tsx`

Trzy checkboxy w sekcji „Karta kursu”, pod polem „Poziom” — persona jest sąsiadem
poziomu trudności, nie osobnym bytem.

Etykiety pochodzą z `PERSONA_LIST` (`hero.kicker`), nie z nowej listy w panelu.
Jedno źródło prawdy: nazwa w panelu nie może rozjechać się z nagłówkiem landingu.

Stan: `audiences: [] as string[]` w `emptyDraft`, odczyt w `choose()`, dopisanie
do payloadu w `saveCourse`. Błąd 400 pokazuje istniejący `onError` w toaście.

## Testy

`courses.service.test.ts` — `resolvePublishAudiences`:
- payload bez pola → zachowuje wartość z bazy,
- jawna pusta tablica → pusta (blokuje publikację),
- lista person → przechodzi bez zmian.

## Weryfikacja końcowa

Po deployu właścicielka zaznacza trzy persony na istniejącym kursie i zapisuje.
Kurs pojawia się na `/dla-poczatkujacych` — zapis z panelu jest jednocześnie
testem end-to-end funkcji.
