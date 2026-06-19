# Google OAuth — Specyfikacja

**Data:** 2026-06-02
**Projekt:** COSMO — aplikacja salonu kosmetycznego
**Zakres:** Logowanie i rejestracja przez Google (Google Identity Services, Approach A)

---

## Cel

Umożliwienie użytkownikom rejestracji i logowania przez konto Google bez wypełniania formularza. Konta Google aktywowane natychmiast (`accountStatus: ACTIVE`). Jeśli email już istnieje w systemie — konto zostaje połączone.

---

## Architektura

**Flow (frontend-first, bez redirectów):**

1. Użytkownik klika "Zaloguj z Google" na stronie `/auth/login` lub `/auth/register`
2. Google Identity Services SDK zwraca `credential` (id_token — podpisany JWT)
3. Frontend wysyła `POST /api/auth/google { credential }`
4. Backend weryfikuje token przez `google-auth-library` (OAuth2Client.verifyIdToken)
5. Backend wyciąga z tokenu: `email`, `name`, `picture`, `sub` (googleId)
6. Backend znajduje lub tworzy usera, wystawia access token + refresh token
7. Frontend zapisuje dane identycznie jak po zwykłym logowaniu (Zustand store)

Brak redirectów OAuth2. Brak Passport.js. Endpoint zwraca identyczną strukturę odpowiedzi co `/auth/login`.

---

## Baza danych

**Zmiana w modelu `User` (schema.prisma):**

```prisma
googleId  String?  @unique
```

Dodanie jednego opcjonalnego, unikalnego pola. `passwordHash` pozostaje `String?` — Google users mają `null`.

---

## Scenariusze łączenia kont

| Sytuacja | Działanie |
|----------|-----------|
| `googleId` znaleziony w DB | Zaloguj istniejące konto |
| Email znaleziony, brak `googleId` | Dopisz `googleId` do konta, ustaw `accountStatus: ACTIVE` (Google potwierdził email), zaloguj |
| Email nieznany | Utwórz nowe konto, zaloguj |

**Nowe konta Google:**
- `accountStatus: ACTIVE` (natychmiastowa aktywacja)
- `googleId`: wartość z tokenu Google (`sub`)
- `avatarPath`: URL zdjęcia z Google (np. `lh3.googleusercontent.com/...`) — przechowywany jako zewnętrzny URL, bez lokalnego przetwarzania przez Sharp; użytkownik może nadpisać własnym zdjęciem z profilu
- `termsAcceptedAt`: `new Date()` automatycznie
- `marketingConsent`: `false`
- `photoConsent`: `false`
- `phone`: `null` (użytkownik uzupełnia w profilu)
- `passwordHash`: `null`
- `ambassadorCode`: generowany jak przy standardowej rejestracji

---

## Backend

**Nowy pakiet:** `google-auth-library`

**Nowa zmienna środowiskowa (`apps/server/.env`):**
```
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
```

**Nowy endpoint:**
```
POST /api/auth/google
Body: { credential: string }
Response: { accessToken: string, user: UserObject }  (+ refreshToken w HttpOnly cookie)
```

**Nowy plik:** `apps/server/src/modules/auth/google.strategy.ts`
Odpowiedzialność: weryfikacja id_token przez `OAuth2Client`, zwrot payloadu `{ email, name, picture, googleId }`.

**Zmiany w `auth.service.ts`:**
Nowa funkcja `loginWithGoogle(credential: string)`:
1. Weryfikuj token przez `google.strategy.ts`
2. Szukaj usera po `googleId`, następnie po `email`
3. Merge lub utwórz usera
4. Wywołaj `signToken` (jak w `loginUser`) i zwróć access token

**Zmiany w `auth.controller.ts`:**
Nowa metoda `googleAuth` wywołująca `authService.loginWithGoogle`.

**Zmiany w `auth.router.ts`:**
```ts
router.post('/google', authController.googleAuth);
```

**Prisma migration:** `add_google_id_to_user`

---

## Frontend

**Nowy pakiet:** `@react-oauth/google`

**Nowa zmienna środowiskowa (`apps/web/.env`):**
```
VITE_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
```

**Zmiana w `main.tsx`:**
```tsx
<GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
  <RouterProvider router={router} />
</GoogleOAuthProvider>
```

**Nowy komponent:** `apps/web/src/components/auth/GoogleAuthButton.tsx`
- Używa komponentu `<GoogleLogin>` z `@react-oauth/google` (nie `useGoogleLogin` — ten zwraca authorization code, nie id_token)
- Callback `onSuccess({ credential })` → wywołuje `authApi.loginWithGoogle(credential)`
- Po sukcesie: zapisuje dane w Zustand store (identycznie jak `authApi.login`)
- Obsługa błędów przez `onError`: toast z komunikatem

**Zmiany w `auth.api.ts`:**
```ts
loginWithGoogle: (credential: string) =>
  api.post('/auth/google', { credential }).then(r => r.data)
```

**Zmiany w `Login.tsx` i `Register.tsx`:**
- Dodanie `<GoogleAuthButton />` z separatorem "lub" nad lub pod formularzem
- Zachowanie `from` state (przekierowanie po zalogowaniu działa tak samo)

---

## Konfiguracja Google Cloud Console (jednorazowo)

1. Utwórz projekt w Google Cloud Console
2. Włącz Google Identity API
3. Skonfiguruj OAuth 2.0 Client ID (typ: Web application)
4. Authorized JavaScript origins:
   - `http://localhost:5173` (dev)
   - `https://twojadomena.pl` (produkcja)
5. **Nie trzeba** Authorized redirect URIs (flow nie używa redirectów)
6. Skopiuj Client ID do `.env` obu środowisk

---

## Zmiany niewymagane

- Zustand auth store — bez zmian (ta sama struktura odpowiedzi)
- Axios interceptor — bez zmian
- Middleware JWT — bez zmian
- `accountStatus` guard w logowaniu — bez zmian (Google users są ACTIVE)

---

## Uwagi implementacyjne

- `termsAcceptedAt: new Date()` dla Google users jest przypisywane automatycznie bez pokazywania regulaminu użytkownikowi — dodać komentarz w kodzie
- Kody polecające (referral) nie są obsługiwane przy rejestracji Google (brak pola input) — celowe uproszczenie
- `avatarPath` dla Google users zawiera zewnętrzny URL (`https://lh3.googleusercontent.com/...`). Frontend musi sprawdzać czy wartość jest absolutnym URL i jeśli tak — używać jej bezpośrednio zamiast dostawiać prefix `/uploads/`

## Poza zakresem

- Apple Sign In
- Zmiana flow rejestracji emailowej (osobne zadanie)
- Google One Tap
