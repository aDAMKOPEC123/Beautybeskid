# Konfiguracja logowania przez Facebook

Kod aplikacji ukrywa przycisk Facebook do czasu ustawienia obu danych dostępowych po stronie serwera.
Sekret aplikacji Meta nigdy nie może trafić do `apps/web` ani do zmiennej `VITE_*`.

## 1. Aplikacja Meta

1. Utwórz aplikację w [Meta for Developers](https://developers.facebook.com/apps/).
2. Dodaj przypadek użycia Facebook Login dla witryny internetowej.
3. W ustawieniach OAuth dodaj dokładny adres callbacku:

   ```text
   https://twojadomena.pl/api/auth/facebook/callback
   ```

4. Dodaj domenę produkcyjną do domen aplikacji.
5. Skonfiguruj publiczne adresy polityki prywatności, regulaminu i usuwania danych.
6. Do podstawowego logowania wymagane są tylko uprawnienia `public_profile` oraz `email`.

## 2. Zmienne serwera

Dodaj do `apps/server/.env` lub konfiguracji środowiska produkcyjnego:

```dotenv
FACEBOOK_APP_ID=123456789012345
FACEBOOK_APP_SECRET=sekret-z-panelu-meta
FACEBOOK_REDIRECT_URI=https://twojadomena.pl/api/auth/facebook/callback
FACEBOOK_GRAPH_API_VERSION=v23.0
```

`FACEBOOK_REDIRECT_URI` musi być identyczny z adresem wpisanym w panelu Meta. Jeżeli backend i
frontend działają pod tą samą domeną, można pominąć tę zmienną — aplikacja użyje
`${SERVER_URL}/api/auth/facebook/callback`, a gdy `SERVER_URL` nie istnieje, domeny `CLIENT_URL`.

## 3. Baza danych i uruchomienie

Po wdrożeniu kodu uruchom:

```bash
cd cosmo-app/apps/server
pnpm prisma:migrate
pnpm prisma:generate
```

W środowisku produkcyjnym zastosuj migracje poleceniem `prisma migrate deploy` zgodnie z obecnym
procesem wdrożeniowym. Następnie zrestartuj backend. Endpoint
`GET /api/auth/facebook/status` powinien zwrócić `enabled: true`.

W trybie deweloperskim logować mogą się konta przypisane do ról aplikacji Meta. Przed udostępnieniem
funkcji klientom przełącz aplikację Meta do trybu Live i wykonaj wymagane przez panel kroki dostępu.
