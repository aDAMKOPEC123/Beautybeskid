-- Awaryjne cofnięcie migracji 20260810120000_add_device_token_and_refresh_rotation
--
-- Uruchamiać WYŁĄCZNIE, gdy trzeba wycofać trwałą sesję PWA na produkcji.
-- Wymaga wcześniejszego cofnięcia kodu backendu do wersji sprzed wdrożenia,
-- inaczej serwer będzie odwoływał się do nieistniejących obiektów.
--
-- Bezstratne dla danych sesyjnych sprzed wdrożenia: kasuje wyłącznie tabelę
-- tokenów urządzeń oraz kolumnę i indeks dodane przez tę migrację.
-- Skutek dla użytkowników: sesje odtworzone tokenem urządzenia przestaną
-- działać, a ich właściciele zalogują się ponownie.
--
-- Użycie na VPS:
--   psql "$DATABASE_URL" -f rollback-20260810-device-token.sql

BEGIN;

DROP TABLE IF EXISTS "DeviceToken";

DROP INDEX IF EXISTS "RefreshToken_rotatedAt_idx";

ALTER TABLE "RefreshToken" DROP COLUMN IF EXISTS "rotatedAt";

DELETE FROM _prisma_migrations
WHERE migration_name = '20260810120000_add_device_token_and_refresh_rotation';

COMMIT;
