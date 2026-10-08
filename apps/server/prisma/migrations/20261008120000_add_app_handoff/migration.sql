-- Przekazanie linku z przeglądarki (np. Messengera) do zainstalowanej PWA:
-- krótko żyjący wpis dopasowywany po skrócie sieci i cech urządzenia.
CREATE TABLE "AppHandoff" (
    "id" TEXT NOT NULL,
    "matchKey" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppHandoff_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AppHandoff_matchKey_expiresAt_idx" ON "AppHandoff"("matchKey", "expiresAt");
