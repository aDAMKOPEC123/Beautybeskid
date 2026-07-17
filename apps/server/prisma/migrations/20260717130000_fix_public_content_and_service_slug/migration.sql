-- Correct a public service typo while preserving the old URL through Nginx.
UPDATE "Service"
SET
  "name" = 'Koreańska Laminacja Rzęs',
  "slug" = 'koreanska-laminacja-rzes',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'koreanska-lamicja-rzes';

-- Replace error-prone marketing copy with concise, verifiable information.
UPDATE "AboutPage"
SET
  "salonDescription" = '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"BeskidStudio to kameralny gabinet kosmetologiczny w Mordarce koło Limanowej. Łączę świadomą pielęgnację, dokładną stylizację oprawy oka i spokojną konsultację dopasowaną do potrzeb każdej klientki."}]},{"type":"paragraph","content":[{"type":"text","text":"Zależy mi na naturalnych efektach, jasnych zaleceniach po zabiegu i atmosferze, w której można czuć się swobodnie. Podologia jest realizowana w odrębnej lokalizacji po wcześniejszym kontakcie telefonicznym."}]}]}',
  "ownerTitle" = 'Właścicielka, kosmetolog i podolog',
  "featuresTitle" = 'Dlaczego warto wybrać BeskidStudio?',
  "features" = '[{"id":"education","icon":"star","title":"Wykształcenie i praktyka","description":"Licencjat z kosmetologii, studia magisterskie w toku, regularne szkolenia i doświadczenie w pracy z klientkami."},{"id":"aftercare","icon":"smile","title":"Pomoc także po wizycie","description":"Po zabiegu otrzymujesz jasne zalecenia. W razie pytań możesz skontaktować się z salonem."},{"id":"client-panel","icon":"zap","title":"Wygodny panel klienta","description":"Rezerwacje, historia wizyt, zalecenia i program lojalnościowy są dostępne w jednym miejscu."},{"id":"individual-care","icon":"star","title":"Indywidualne podejście","description":"Zakres zabiegu i pielęgnację dobieramy do Twoich potrzeb, stanu skóry lub oczekiwanego efektu."}]'::jsonb,
  "updatedAt" = CURRENT_TIMESTAMP;
