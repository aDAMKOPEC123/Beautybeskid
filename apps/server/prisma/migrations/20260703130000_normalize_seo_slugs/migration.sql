UPDATE "Service"
SET "slug" = CASE "slug"
  WHEN 'henna-brwi-lifting-rzs-set' THEN 'henna-brwi-lifting-rzes-set'
  WHEN 'lamiset-laminacja-brwi-lifting-rzs' THEN 'lamiset-laminacja-brwi-lifting-rzes'
  WHEN 'laminacja-brwi-z-koloryzacj' THEN 'laminacja-brwi-z-koloryzacja'
  WHEN 'lifting-rzs-z-koloryzacj' THEN 'lifting-rzes-z-koloryzacja'
  WHEN 'regulacja-brwi-woskpseta' THEN 'regulacja-brwi-wosk-peseta'
  WHEN 'depilacja-wsika' THEN 'depilacja-wasika'
  ELSE "slug"
END
WHERE "slug" IN (
  'henna-brwi-lifting-rzs-set',
  'lamiset-laminacja-brwi-lifting-rzs',
  'laminacja-brwi-z-koloryzacj',
  'lifting-rzs-z-koloryzacj',
  'regulacja-brwi-woskpseta',
  'depilacja-wsika'
);

UPDATE "BlogPost"
SET
  "title" = 'Laminacja brwi – efekty, pielęgnacja i przeciwwskazania',
  "slug" = 'laminacja-brwi-efekty-pielegnacja-przeciwwskazania',
  "metaTitle" = 'Laminacja brwi Limanowa – efekty i pielęgnacja',
  "metaDescription" = 'Jak działa laminacja brwi, ile utrzymuje się efekt i jak pielęgnować włoski po zabiegu? Poradnik kosmetologa z BeskidStudio koło Limanowej.',
  "content" = REPLACE(
    REPLACE(
      REPLACE("content", 'Laminacja Brwi w Warszawie', 'Laminacja Brwi w Limanowej'),
      'w Warszawie',
      'w Limanowej'
    ),
    'w stolicy',
    'w rejonie Limanowej'
  )
WHERE "slug" = 'wszystko-co-musisz-wiedzie-o-laminacjii-brwii';
