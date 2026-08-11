# Trwała sesja w PWA — projekt

Data: 2026-08-10
Status: zaakceptowany (opcja B)

## Cel

Użytkownik, który raz zalogował się w zainstalowanej PWA, nie powinien nigdy zostać
wylogowany samoczynnie — ani po dniach nieużywania, ani w trakcie normalnej pracy,
ani po aktualizacji aplikacji. Dzięki temu subskrypcja push pozostaje aktywna
i powiadomienia docierają bez przerw.

Zakres obejmuje **wszystkie role** (USER, EMPLOYEE, ADMIN) — decyzja właściciela
produktu z 2026-08-10.

## Stan obecny

Sesja jest już zaprojektowana jako długa:

- `auth.controller.ts:34` — refresh token ma 400 dni (`LONG_LIVED_REFRESH_TTL_DAYS`)
- `auth.controller.ts:686-700` — każde odświeżenie przedłuża sesję (sliding window)
- `auth.store.ts:29` — dane użytkownika trafiają do `localStorage`, przeżywają restart
- `lib/axios.ts:48-86` — `refreshSession()` serializuje równoległe odświeżenia

Mimo to sesja pęka z dwóch niezależnych powodów.

### Przyczyna 1 — wyścig przy rotacji tokenu

`auth.controller.ts:686-700` rotuje refresh token i **natychmiast kasuje stary**
w tej samej transakcji. Serializacja w `lib/axios.ts` działa wyłącznie w obrębie
jednego kontekstu JavaScript. Zainstalowana PWA i ta sama witryna otwarta w karcie
przeglądarki to dwa osobne konteksty, każdy z własną flagą `isRefreshing`.

Gdy oba odświeżą w tym samym czasie: pierwszy rotuje i kasuje token, drugi nie
znajduje go w bazie, dostaje 401, a interceptor woła `logout()` i przekierowuje
na ekran logowania. Objawia się jako losowe wylogowanie w trakcie używania.

### Przyczyna 2 — skasowane ciasteczko

Odtworzenie sesji stoi wyłącznie na ciasteczku `refreshToken`. iOS potrafi wyczyścić
dane witryny po około 7 dniach bez interakcji. Wtedy `localStorage` z danymi
użytkownika zostaje, ale ciasteczko znika — refresh zwraca 401 i użytkownik ląduje
na ekranie logowania. Wydłużanie `maxAge` tego nie naprawia, bo ciasteczko jest
kasowane, a nie wygasa.

### Aktualizacja PWA

`sw.ts` wywołuje `skipWaiting()`, ale nie czyści `localStorage` ani ciasteczek.
Aktualizacja sama w sobie nie powinna wylogowywać; zgłoszenia najprawdopodobniej
pokrywały się czasowo z przyczyną 1 lub 2. Projekt zabezpiecza ten przypadek
testem regresyjnym, nie zmianą zachowania.

## Rozwiązanie

Dwa niezależne mechanizmy, każdy adresujący jedną przyczynę.

### Mechanizm 1 — okno karencji przy rotacji

Stary refresh token przestaje być kasowany natychmiast. Zamiast tego zostaje
oznaczony jako zrotowany i przez 60 sekund nadal jest akceptowany.

Każde takie użycie wydaje **nowy** token następcy — nie odtwarzamy poprzednio
wydanego. Serwer trzyma wyłącznie hash tokenu, więc odtworzenie tej samej
wartości i tak nie byłoby możliwe, a wydanie kolejnego jest bezpieczniejsze:
każdy kontekst aplikacji (PWA i karta przeglądarki) dostaje własny token, a
skrócenie ważności starego dotyczy tylko pierwszej rotacji, więc okno karencji
nie przedłuża się w nieskończoność.

Token następcy jest podpisanym JWT (`{ id, jti }` sekretem `JWT_REFRESH_SECRET`),
a nie losowym ciągiem: handler `refresh` weryfikuje kandydatów z ciasteczka przez
`verifyToken` i korzysta z `decoded.iat`, żeby odciąć sesje starsze niż
`passwordChangedAt`. `jti` gwarantuje unikalność `tokenHash` przy dwóch rotacjach
w tej samej sekundzie.

Model `RefreshToken` zyskuje jedno pole:

```prisma
rotatedAt DateTime?
```

Logika w `refresh`:

1. Token nieznany lub wygasły → 401 bez żadnych skutków ubocznych. Wołający
   przechodzi na ścieżkę tokenu urządzenia.
2. Token ważny → wydaj **nowy** refresh token, a staremu skróć `expiresAt` do
   `teraz + 60 s` i oznacz `rotatedAt`. Stary token pozostaje więc sprawny przez
   okno karencji, obsługując drugi kontekst aplikacji, po czym wygasa sam.
3. Zrotowane tokeny starsze niż 24 h są kasowane przy okazji tej samej transakcji.

**Świadomie nie wykrywamy ponownego użycia tokenu.** Rozważaliśmy kasowanie
wszystkich sesji użytkownika przy użyciu tokenu po upływie karencji, jako sygnał
kradzieży. Odrzucone 2026-08-10: zainstalowana PWA potrafi leżeć w tle godzinami
i wrócić ze starym tokenem, więc mechanizm masowo wylogowywałby uczciwych
użytkowników — dokładnie odwrotnie do celu tego projektu. Token po karencji
dostaje zwykłe 401, a token urządzenia odtwarza sesję bezszelestnie.

Odcięcie dostępu pozostaje możliwe przez zmianę hasła, która kasuje tokeny
urządzeń (patrz niżej).

Zrotowane tokeny sprzątamy przy okazji: rekordy z `rotatedAt` starszym niż 24 h
są usuwane w tym samym zapytaniu, które i tak wykonujemy.

### Mechanizm 2 — token urządzenia jako druga ścieżka

Niezależny od ciasteczka kanał odtworzenia sesji, odporny na czyszczenie ciasteczek.

Nowy model:

```prisma
model DeviceToken {
  id         String   @id @default(cuid())
  tokenHash  String   @unique
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  label      String?
  expiresAt  DateTime
  lastUsedAt DateTime @default(now())
  createdAt  DateTime @default(now())

  @@index([userId])
}
```

Przepływ:

- Przy logowaniu (hasło, Google, Facebook) serwer zwraca dodatkowo `deviceToken`
  o ważności 400 dni. Frontend zapisuje go w `localStorage` pod kluczem
  `cosmo-device-token`.
- `refreshSession()` w `lib/axios.ts` próbuje najpierw ciasteczka. Gdy odpowiedź to
  401, a `localStorage` zawiera token urządzenia, wykonuje drugie żądanie do
  `POST /auth/refresh-device` z tokenem w nagłówku `X-Device-Token`.
- Sukces tej ścieżki odtwarza pełną sesję: nowy access token **i** nowe ciasteczko
  `refreshToken`. Ciasteczko zostaje więc odbudowane po skasowaniu przez system.
- Dopiero gdy obie ścieżki zwrócą 401, `refreshSession()` odrzuca obietnicę z 401
  i dotychczasowa logika wylogowania działa jak dziś.

Kluczowa własność: cała obsługa fallbacku mieści się wewnątrz `refreshSession()`.
Trzy miejsca w `App.tsx` (start aplikacji, `visibilitychange`, interwał 10-minutowy)
oraz interceptor w `lib/axios.ts` pozostają nietknięte — nadal reagują na 401,
tylko że 401 pojawia się wyłącznie, gdy naprawdę nie da się odtworzyć sesji.

Token urządzenia jest unieważniany przez: świadome wylogowanie (tylko tokenu
urządzenia, z którego przyszło żądanie — pozostałe urządzenia użytkownika, np.
zainstalowana PWA na telefonie, zachowują swoje tokeny i trwałą sesję push),
zmianę hasła (`passwordChangedAt`, odcina tokeny **wszystkich** urządzeń naraz —
to jest jedyna ścieżka globalnego, awaryjnego wylogowania), wykrycie ponownego
użycia refresh tokenu, upływ 400 dni.

## Bezpieczeństwo

Token urządzenia leży w `localStorage`, więc — inaczej niż ciasteczko `httpOnly` —
jest dostępny dla kodu JavaScript i tym samym dla ewentualnego ataku XSS. Przy
decyzji o objęciu wszystkich ról dotyczy to również konta administratora, które ma
wgląd w kartoteki medyczne wszystkich klientek.

Ryzyko ograniczają:

- `passwordChangedAt` jako awaryjne odcięcie wszystkich urządzeń — ścieżka
  wymagająca testu potwierdzającego, że unieważnia także tokeny urządzeń.
  Świadome wylogowanie tego nie robi: unieważnia wyłącznie token urządzenia,
  z którego przyszło żądanie (`X-Device-Token`), więc kolejne urządzenia
  użytkownika nie tracą trwałej sesji,
- ograniczona ważność 400 dni z odnawianiem tylko przy faktycznym użyciu,
- istniejąca polityka CSP, która blokuje skrypty spoza listy dozwolonych domen.

Świadome wylogowanie nadal kasuje subskrypcję push tego urządzenia
(`UserLayout.tsx:164`, `Navbar.tsx:165`) — to nie zmienia się. Zmienia się zakres
unieważniania tokenu urządzenia: dotyczy wyłącznie urządzenia, z którego przyszło
żądanie wylogowania, a nie wszystkich urządzeń użytkownika.

## Powiadomienia push

Nie wymagają zmian. Subskrypcja żyje w bazie i jest kasowana wyłącznie przy
świadomym wylogowaniu. Gdy sesja przestanie pękać samoczynnie, subskrypcje
przestaną znikać — to jest właśnie oczekiwany efekt biznesowy.

## Testy

Backend (vitest):

- rotacja: drugie żądanie odświeżenia z tym samym tokenem w oknie 60 s dostaje
  świeży token i status 200,
- token użyty po upływie karencji dostaje 401 i **nie** kasuje innych sesji,
- token urządzenia odtwarza sesję, gdy ciasteczko nie zostało przysłane,
- zmiana hasła unieważnia zarówno refresh tokeny, jak i tokeny urządzeń,
- token urządzenia po 400 dniach jest odrzucany.

Frontend:

- `refreshSession()` sięga po ścieżkę urządzenia dopiero po 401 z ciasteczka,
- gdy obie ścieżki zwrócą 401, obietnica jest odrzucana z 401 (wylogowanie działa),
- brak tokenu urządzenia w `localStorage` nie powoduje dodatkowego żądania.

## Zakres zmian

- `apps/server/prisma/schema.prisma` — 2 pola w `RefreshToken`, nowy model `DeviceToken`, relacja w `User`
- migracja Prisma
- `apps/server/src/modules/auth/auth.controller.ts` — karencja rotacji, `refreshDevice`, wydawanie tokenu urządzenia w 3 ścieżkach logowania
- `apps/server/src/modules/auth/auth.router.ts` — `POST /auth/refresh-device`
- `apps/server/src/modules/auth/auth.service.ts` — unieważnianie tokenów urządzeń
- `apps/web/src/lib/axios.ts` — fallback wewnątrz `refreshSession()`
- `apps/web/src/api/auth.api.ts` — obsługa `deviceToken` przy logowaniu
- testy backendu i frontendu

Poza zakresem: odświeżanie w tle przez service workera (odrzucona opcja C),
zmiany w `App.tsx`, zmiany w module push.
