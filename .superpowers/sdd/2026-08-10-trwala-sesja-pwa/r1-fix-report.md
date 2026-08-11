# R1 — fix: wylogowanie unieważnia token tylko jednego urządzenia

## Problem

`revokeSessionOnLogout` w `apps/server/src/modules/auth/session.service.ts` przy
wylogowaniu wywoływał `revokeDeviceTokens(userId)`, który kasuje `DeviceToken`
wszystkich urządzeń użytkownika (`deleteMany({ where: { userId } })`). Wylogowanie
na komputerze zabijało więc trwałą sesję PWA na telefonie i przerywało powiadomienia
push — działało to wprost przeciw celowi gałęzi `feat/trwala-sesja-pwa`.

## Zmiana

`apps/server/src/modules/auth/session.service.ts` (`revokeSessionOnLogout`):

- Gdy żądanie niesie nagłówek `X-Device-Token` — kasowany jest wyłącznie jeden
  wiersz `DeviceToken`, po `tokenHash` (sha256 surowego tokenu), przez
  `prisma.deviceToken.deleteMany({ where: { tokenHash } })`. Ponieważ `tokenHash`
  ma ograniczenie `@unique` w schemacie Prisma, dotyka to co najwyżej jednego
  wiersza — pozostałe urządzenia użytkownika nietknięte.
- Gdy nagłówka brak — **żaden** `DeviceToken` nie jest kasowany. Funkcja przestała
  ustalać właściciela sesji po `userId` w ogóle po tej stronie; nie ma już potrzeby
  wyszukiwać właściciela, bo nie kasujemy niczego po `userId`.
- Kasowanie `RefreshToken` po hashu ciasteczka (`prisma.refreshToken.deleteMany({
  where: { tokenHash } })`) zostało bez zmian.
- Import/wywołanie `revokeDeviceTokens` zniknęło z tej funkcji (zostało jako
  osobny eksport, używany gdzie indziej — patrz niżej).

Komentarz nad funkcją wyjaśnia uzasadnienie: wylogowanie jest operacją lokalną dla
urządzenia; globalne odcięcie wszystkich urządzeń nadal jest dostępne przez zmianę
hasła (`revokeDeviceTokens`), która pozostaje awaryjnym mechanizmem.

Dodatkowo zaktualizowano komentarz w `apps/server/src/modules/auth/auth.controller.ts`
(`logout`), tak by nie sugerował już kasowania wszystkich urządzeń.

## Miejsca celowo nietknięte

`revokeDeviceTokens(userId)` — kasowanie **wszystkich** tokenów urządzeń —
pozostaje używane bez zmian w:

- `apps/server/src/modules/users/users.service.ts:570` — zmiana hasła przez
  zalogowanego użytkownika,
- `apps/server/src/modules/auth/auth.controller.ts:785` — reset hasła.

To jest zamierzone: zmiana hasła to awaryjne, globalne odcięcie sesji.

## Testy

`apps/server/src/modules/auth/session.service.test.ts`, blok „sprzątanie i
wylogowanie” — zastąpiono 4 istniejące testy wylogowania nowym zestawem 4 testów
dopasowanym do nowego zachowania. Liczba testów w pliku i w całym repo backendu
nie zmieniła się (238 przed i po).

Nowe przypadki:

1. „wylogowanie z ciasteczkiem, bez nagłówka X-Device-Token, kasuje tylko
   RefreshToken” — asercja, że `deviceToken.deleteMany` NIE jest wołane.
2. „wylogowanie z nagłówkiem X-Device-Token kasuje dokładnie jeden wiersz
   DeviceToken po hashu tego tokenu, nie wszystkie urządzenia użytkownika” —
   asercja na `where: { tokenHash: hashToken('dev-raw') }` oraz explicit
   `not.toHaveBeenCalledWith({ where: { userId: expect.anything() } })`.
3. „wylogowanie z ciasteczkiem i nagłówkiem kasuje RefreshToken po hashu
   ciasteczka i DeviceToken po hashu nagłówka — oba niezależnie” — pokrywa
   równoczesne działanie obu gałęzi.
4. „wylogowanie bez ciasteczka i bez nagłówka kończy się bez błędu i bez
   żadnego kasowania” — dodatkowo sprawdza, że żadne `findUnique` też nie jest
   wołane (funkcja nie musi już nic wyszukiwać po stronie logout, bo nie
   ustala właściciela po `userId`).

**Osłabione/zastąpione asercje:** dwa oryginalne testy sprawdzały
`deviceToken.deleteMany` wołane z `{ where: { userId: ... } }` — to jest
dokładnie zachowanie, które usuwamy, więc te asercje nie mają już sensu i
zostały zastąpione asercjami na nowe, poprawne zachowanie (kasowanie po
`tokenHash`, brak kasowania przy braku nagłówka). Nic nie zostało po prostu
"złagodzone" bez zamiany na sensowną, ostrzejszą asercję.

Test `revokeDeviceTokens kasuje tokeny wskazanego użytkownika` (blok „tokeny
urządzeń”) pozostał bez zmian — funkcja nadal istnieje i jest używana przy
zmianie hasła.

## Dokumentacja

`docs/superpowers/specs/2026-08-10-trwala-sesja-pwa-design.md`:
- sekcja o unieważnianiu tokenu urządzenia doprecyzowana: świadome wylogowanie
  dotyczy wyłącznie urządzenia, z którego przyszło żądanie; zmiana hasła
  pozostaje jedyną ścieżką globalnego odcięcia wszystkich urządzeń,
- sekcja „Bezpieczeństwo” i akapit o subskrypcjach push zaktualizowane w tym
  samym duchu.

## Weryfikacja

1. `cd apps/server && pnpm exec tsc --noEmit` — bez błędów, pusty output.
2. `cd apps/server && pnpm test` — 34 pliki, **238 testów przeszło** (0 failed),
   zgodnie z oczekiwaniem.
3. `cd apps/web && pnpm vitest run` — 4 pliki, **37 testów przeszło** (0 failed),
   zgodnie z oczekiwaniem.

## Obawy

Brak. Zmiana jest lokalna do `session.service.ts` (+ komentarz w kontrolerze +
dokumentacja), inne wywołania `revokeDeviceTokens` nietknięte, wszystkie testy
zielone bez modyfikacji niepowiązanych plików.
