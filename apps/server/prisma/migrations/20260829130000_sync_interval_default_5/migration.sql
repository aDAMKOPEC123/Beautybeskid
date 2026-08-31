-- Domyślny interwał synchronizacji kalendarza Apple schodzi z 15 na 5 minut.
ALTER TABLE "ExternalCalendarSource" ALTER COLUMN "syncIntervalMinutes" SET DEFAULT 5;

-- Istniejące źródła, które nigdy nie miały ustawionej własnej wartości,
-- dostają nową domyślną. W MVP jest dokładnie jedno źródło.
UPDATE "ExternalCalendarSource" SET "syncIntervalMinutes" = 5 WHERE "syncIntervalMinutes" = 15;
