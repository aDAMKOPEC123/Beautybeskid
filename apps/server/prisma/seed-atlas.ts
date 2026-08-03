import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Hierarchical body regions with sub-regions ──────────────────────────

interface ConditionData {
  name: string;
  slug: string;
  description: string;
  causes: string;
  treatments: string;
  contraindications: string;
}

interface SubRegionData {
  name: string;
  slug: string;
  hotspotX: number;
  hotspotY: number;
  conditions: ConditionData[];
}

interface TopRegionData {
  name: string;
  slug: string;
  hotspotX: number;
  hotspotY: number;
  subRegions: SubRegionData[];
}

const bodyRegions: TopRegionData[] = [
  {
    name: 'Twarz',
    slug: 'twarz',
    hotspotX: 50,
    hotspotY: 7,
    subRegions: [
      {
        name: 'Czoło',
        slug: 'czolo',
        hotspotX: 50,
        hotspotY: 15,
        conditions: [
          {
            name: 'Trądzik pospolity',
            slug: 'tradzik-pospolity-czolo',
            description: 'Trądzik pospolity (acne vulgaris) na czole jest jedną z najczęstszych dermatoz. Objawia się zaskórnikami otwartymi i zamkniętymi, grudkami, krostkami, a w cięższych przypadkach guzkami i torbielami. Czoło należy do tzw. strefy T, która charakteryzuje się zwiększoną aktywnością gruczołów łojowych.',
            causes: 'Nadmierna produkcja sebum, hiperkeratoza ujść mieszków włosowych, kolonizacja Cutibacterium acnes, predyspozycje genetyczne, zaburzenia hormonalne (androgeny), stres, niewłaściwa pielęgnacja, stosowanie komedogennych kosmetyków, noszenie czapek i opasek.',
            treatments: 'Kwasy (salicylowy 2%, glikolowy, azelainowy), retinoidy miejscowe (adapalen, tretynoina), nadtlenek benzoilu, antybiotykoterapia miejscowa (klindamycyna, erytromycyna), peelingi chemiczne, oczyszczanie manualne, terapia LED niebieskim światłem, w ciężkich przypadkach izotretynoina doustna.',
            contraindications: 'Wyciskanie zmian bez odpowiedniego przygotowania skóry, stosowanie agresywnych peelingów na stan zapalny, nadmierne wysuszanie skóry, ekspozycja na UV bez ochrony w trakcie leczenia retinoidami.',
          },
          {
            name: 'Zmarszczki mimiczne',
            slug: 'zmarszczki-mimiczne-czolo',
            description: 'Zmarszczki mimiczne czoła powstają w wyniku powtarzalnych skurczów mięśnia czołowego (musculus frontalis). Początkowo widoczne tylko podczas unoszenia brwi, z czasem stają się utrwalone — widoczne także w spoczynku. Są jednym z pierwszych objawów starzenia się skóry.',
            causes: 'Naturalne starzenie się skóry, utrata kolagenu i elastyny, fotostarzenie (promieniowanie UV), mimika twarzy, odwodnienie skóry, palenie tytoniu, zanieczyszczenia środowiskowe, cienka skóra w okolicy czoła.',
            treatments: 'Toksyna botulinowa (botoks) — złoty standard, kwas hialuronowy (wypełniacze), mezoterapia igłowa, mikronakłuwanie (dermapen), peelingi chemiczne średniogłębokie, laser frakcyjny CO2 lub Er:YAG, radiofrekwencja mikroigłowa, HIFU.',
            contraindications: 'Ciąża i karmienie piersią (przy zabiegach z toksyną botulinową), aktywne infekcje skóry, choroby nerwowo-mięśniowe, uczulenie na składniki preparatów, zaburzenia krzepnięcia.',
          },
          {
            name: 'Łojotokowe zapalenie skóry',
            slug: 'lojotokowe-zapalenie-skory-czolo',
            description: 'Łojotokowe zapalenie skóry (dermatitis seborrhoeica) na czole objawia się rumieniem z żółtawymi, tłustymi łuskami. Często lokalizuje się wzdłuż linii włosów i brwi. Jest chorobą przewlekłą z tendencją do nawrotów.',
            causes: 'Nadmierny rozrost drożdżaka Malassezia, zwiększona produkcja sebum, predyspozycje genetyczne, stres, zmęczenie, zmiany temperatury, osłabienie odporności, choroby neurologiczne (Parkinson).',
            treatments: 'Szampony i preparaty z ketokonazolem, piritionianem cynku, siarczkiem selenu; miejscowe glikokortykosteroidy o małej sile (hydrokortyzon 1%), inhibitory kalcyneuryny (takrolimus, pimekrolimus), kwas salicylowy w niskich stężeniach, preparaty z mocznikiem.',
            contraindications: 'Długotrwałe stosowanie silnych kortykosteroidów na twarz, stosowanie drażniących peelingów w fazie zaostrzenia, produkty na bazie alkoholu.',
          },
        ],
      },
      {
        name: 'Policzki',
        slug: 'policzki',
        hotspotX: 65,
        hotspotY: 25,
        conditions: [
          {
            name: 'Trądzik różowaty',
            slug: 'tradzik-rozowaty',
            description: 'Trądzik różowaty (rosacea) to przewlekła choroba zapalna skóry twarzy, najczęściej policzków. Objawia się trwałym rumieniem, teleangiektazjami (pajączkami naczyniowymi), grudkami i krostkami. Wyróżnia się 4 podtypy: rumieniowo-teleangiektazyjny, grudkowo-krostkowy, przerostowy (rhinophyma) i oczny.',
            causes: 'Etiologia wieloczynnikowa: predyspozycje genetyczne, zaburzenia układu odpornościowego, rola nużeńca (Demodex folliculorum), nadreaktywność naczyń, czynniki wyzwalające: alkohol, ostre przyprawy, gorące napoje, stres, UV, gwałtowne zmiany temperatury.',
            treatments: 'Miejscowo: metronidazol, kwas azelainowy, iwermektyna (Soolantra); doustnie: doksycyklina w dawce przeciwzapalnej, izotretynoina w małych dawkach; zabiegi: IPL, laser naczyniowy (Nd:YAG 1064nm, pulsed dye laser 595nm), LED, łagodne peelingi, krioterapia teleangiektazji.',
            contraindications: 'Agresywne peelingi chemiczne, dermabrazja, miejscowe kortykosteroidy (powodują rosacea steroidową), drażniące kosmetyki z alkoholem/mentolem/kamforą, ekspozycja na ekstremalne temperatury.',
          },
          {
            name: 'Przebarwienia posłoneczne',
            slug: 'przebarwienia-posloneczne-policzki',
            description: 'Przebarwienia posłoneczne (lentigines solares) na policzkach to płaskie, brązowe plamy o wyraźnych granicach, powstające w wyniku kumulatywnej ekspozycji na promieniowanie UV. Częściej występują u osób o jasnej karnacji (fototyp I-III wg Fitzpatricka).',
            causes: 'Kumulatywna ekspozycja na promieniowanie UVA i UVB, brak odpowiedniej fotoprotekcji, fototyp jasny, starzenie się skóry, predyspozycje genetyczne, terapia hormonalna.',
            treatments: 'Peelingi chemiczne (kwas glikolowy, migdałowy, TCA), terapia laserowa (laser aleksandrytowy 755nm, Q-switched Nd:YAG), IPL, krioterapia, preparaty rozjaśniające (kwas kojowy, arbutyna, witamina C, niacynamid, kwas traneksamowy), dermapen z koktajlem rozjaśniającym.',
            contraindications: 'Ekspozycja na UV bezpośrednio po zabiegu rozjaśniającym, stosowanie hydrochinonu powyżej 3 miesięcy bez przerwy, agresywne peelingi u osób z ciemną karnacją (ryzyko PIH), brak fotoprotekcji po zabiegach.',
          },
          {
            name: 'Melasma',
            slug: 'melasma-policzki',
            description: 'Melasma (chloasma, ostuda) to nabyta hiperpigmentacja objawiająca się symetrycznymi, nieregularnymi plamami brązowymi, głównie na policzkach, czole i górnej wardze. Najczęściej dotyczy kobiet w wieku reprodukcyjnym, szczególnie o ciemniejszym fototypie.',
            causes: 'Promieniowanie UV (główny czynnik wyzwalający), zmiany hormonalne (ciąża, antykoncepcja hormonalna, HTZ), predyspozycje genetyczne, fototyp III-V, światło niebieskie (HEV), leki fotouczulające, dysfunkcja tarczycy.',
            treatments: 'Fotoprotekcja szerokopasmowa SPF50+ (kluczowa!), preparaty z kwasem traneksamowym (miejscowo i doustnie), kwas azelainowy 20%, tretynoina 0.025-0.05%, hydrochinon 2-4% (krótkoterminowo), kwas kojowy, arbutyna, peelingi chemiczne delikatne, laser picosekundowy w doświadczonych rękach.',
            contraindications: 'Agresywne lasery ablacyjne (ryzyko nawrotu/pogorszenia), silne peelingi TCA, brak fotoprotekcji, stosowanie hydrochinonu dłużej niż 3 miesiące, zabiegi laserowe w lecie bez rygorystycznej ochrony.',
          },
        ],
      },
      {
        name: 'Nos',
        slug: 'nos',
        hotspotX: 50,
        hotspotY: 28,
        conditions: [
          {
            name: 'Zaskórniki',
            slug: 'zaskorniki-nos',
            description: 'Zaskórniki (comedones) na nosie to jedne z najczęstszych zmian skórnych. Nos, będący centralną częścią strefy T, ma wyjątkowo gęstą sieć gruczołów łojowych. Wyróżniamy zaskórniki otwarte (czarne) i zamknięte (białe/mikrozaskórniki).',
            causes: 'Hiperkeratoza ujść mieszków włosowych, nadprodukcja sebum, zanieczyszczenia i smog, komedogenne kosmetyki, niedostateczne oczyszczanie, zmiany hormonalne, dieta bogata w nabiał i cukry proste.',
            treatments: 'Kwas salicylowy 2% (BHA), retinoidy miejscowe, kwas glikolowy, regularne oczyszczanie profesjonalne, maski z glinką, hydroksykwasy, enzymowe peelingi, ekstrakcja manualna w gabinecie, IPL w celu redukcji gruczołów łojowych.',
            contraindications: 'Wyciskanie zaskórników brudnymi rękami, paski na nos (uszkadzają barierę hydrolipidową), stosowanie olejków komedogennych na nos, nadmierne wysuszanie (paradoksalnie zwiększa produkcję sebum).',
          },
          {
            name: 'Rhinophyma',
            slug: 'rhinophyma',
            description: 'Rhinophyma to zaawansowana postać trądziku różowatego (rosacea podtyp III), objawiająca się przerostem gruczołów łojowych i tkanki łącznej nosa. Nos staje się powiększony, nierówny, bulwiasty, z poszerzonymi porami i widocznymi naczyniami.',
            causes: 'Zaawansowany trądzik różowaty, predyspozycje genetyczne, płeć męska (10x częściej), wiek powyżej 50 lat, brak leczenia rosacea we wczesnych stadiach.',
            treatments: 'Leczenie chirurgiczne: dermabrazja, laser CO2 ablacyjny, elektrokoagulacja, skalpel; w łagodnych przypadkach: izotretynoina doustna, laser naczyniowy. Rhinophyma nie cofa się samoistnie — wymaga interwencji zabiegowej.',
            contraindications: 'Stosowanie kortykosteroidów miejscowych, samoleczenie, odkładanie wizyty u dermatologa, ekspozycja na alkohol i wysokie temperatury.',
          },
        ],
      },
      {
        name: 'Okolice oczu',
        slug: 'okolice-oczu',
        hotspotX: 35,
        hotspotY: 20,
        conditions: [
          {
            name: 'Cienie pod oczami',
            slug: 'cienie-pod-oczami',
            description: 'Cienie pod oczami (hiperpigmentacja okołooczodołowa) to przebarwienie skóry w okolicy dolnych powiek. Mogą mieć odcień niebieski/fioletowy (naczyniowe), brązowy (melaninowe) lub mieszany. Skóra okolicy oczu jest najcieńsza na całym ciele (0.5mm).',
            causes: 'Genetyka, cienka skóra uwidaczniająca naczynia, utrata tkanki podskórnej z wiekiem, niedobór snu, odwodnienie, alergie (alergiczne shiners), niedokrwistość, ekspozycja na UV, hiperpigmentacja.',
            treatments: 'Wypełniacze kwasu hialuronowego (dolina łez), mezoterapia z witaminą C i peptydami, karboxyterapia, laser naczyniowy przy przebarwieniach naczyniowych, IPL, peelingi delikatne (kwas migdałowy), kremy z witaminą K, kofeiną, retinaldehydem, niacynamidem.',
            contraindications: 'Agresywne peelingi chemiczne, lasery ablacyjne, silne retinoidy (tretynoina) w wysokim stężeniu wokół oczu, nadmierne pocieranie/rozciąganie delikatnej skóry.',
          },
          {
            name: 'Prosaki',
            slug: 'prosaki',
            description: 'Prosaki (milia) to małe, białe lub żółtawe torbiele keratynowe o średnicy 1-2mm, najczęściej występujące w okolicach oczu (powiek, kości jarzmowej). Są wypełnione keratyną i nie mają ujścia na powierzchni skóry.',
            causes: 'Retencja keratyny w mieszkach włosowych, mikrourazy skóry (np. po dermabrazji, peelingach, laseroterapii), oparzenia słoneczne, genetyka, stosowanie okluzyjnych kosmetyków na okolice oczu.',
            treatments: 'Nakłucie sterylną igłą lub lancetnikiem i delikatna ekstrakcja (w gabinecie!), elektrokoagulacja, laser CO2, krioterapia. Profilaktyka: kwas salicylowy, retinoidy miejscowe, regularna eksfoliacja.',
            contraindications: 'Samodzielne wyciskanie (ryzyko infekcji i blizn), stosowanie grubych, tłustych kremów na powieki, nienadzorowane stosowanie retinoidów w bezpośredniej okolicy oczu.',
          },
        ],
      },
      {
        name: 'Broda i żuchwa',
        slug: 'broda-zuchwa',
        hotspotX: 50,
        hotspotY: 38,
        conditions: [
          {
            name: 'Trądzik hormonalny',
            slug: 'tradzik-hormonalny',
            description: 'Trądzik hormonalny lokalizuje się głównie w dolnej partii twarzy: wzdłuż żuchwy, na brodzie i szyi. Dotyczy głównie kobiet, nasila się w fazie lutealnej cyklu, w PCOS, po odstawieniu antykoncepcji. Zmiany mają charakter głębokich, bolesnych grudek i torbieli.',
            causes: 'Nadmiar androgenów (testosteron, DHEA-S), zespół policystycznych jajników (PCOS), zaburzenia cyklu miesiączkowego, stres (kortyzol stymuluje gruczoły łojowe), insulinooporność, dieta o wysokim indeksie glikemicznym.',
            treatments: 'Konsultacja endokrynologiczna/ginekologiczna, spironolakton (antyandrogen), doustna antykoncepcja z efektem antyandrogenowym, kwas azelainowy 15-20%, adapalen + nadtlenek benzoilu, niacynamid, izotretynoina w opornych przypadkach, regulacja diety.',
            contraindications: 'Stosowanie samych antybiotyków bez diagnostyki hormonalnej, agresywne zabiegi mechaniczne na głębokie torbiele, wyciskanie zmian zapalnych, zaniedbywanie diagnostyki systemowej.',
          },
          {
            name: 'Zapalenie mieszków włosowych',
            slug: 'zapalenie-mieszkow-wlosowych-broda',
            description: 'Zapalenie mieszków włosowych (folliculitis) w okolicy brody to infekcja bakteryjna (najczęściej Staphylococcus aureus) lub podrażnienie mieszków włosowych. U mężczyzn często związane z goleniem (pseudofolliculitis barbae — wrastanie włosów).',
            causes: 'Golenie (szczególnie pod włos), wrastające włosy, okluzja (maseczki, szaliki), bakterie (S. aureus), drożdżaki (Pityrosporum), podrażnienia mechaniczne, tępie ostrza do golenia.',
            treatments: 'Antybiotyki miejscowe (mupirocyna, kwas fusydowy), nadtlenek benzoilu, w ciężkich przypadkach antybiotyk doustny, zmiana techniki golenia, eksfoliacja, depilacja laserowa (rozwiązanie długoterminowe), terapia IPL.',
            contraindications: 'Golenie pod włos, stosowanie brudnych maszynek, dotykanie zmian brudnymi rękami, nakładanie okluzyjnych produktów na zmienioną skórę.',
          },
        ],
      },
      {
        name: 'Usta i okolice',
        slug: 'usta-okolice',
        hotspotX: 50,
        hotspotY: 33,
        conditions: [
          {
            name: 'Zapalenie kątów ust',
            slug: 'zapalenie-katow-ust',
            description: 'Zapalenie kątów ust (cheilitis angularis, zajady) to stan zapalny skóry i błony śluzowej w kątach ust. Objawia się zaczerwienieniem, pękaniem, nadżerkami i bolesnością. Może mieć charakter ostry lub przewlekły.',
            causes: 'Zakażenie drożdżakowe (Candida albicans), bakteryjne (Staphylococcus, Streptococcus), niedobory żywieniowe (żelazo, cynk, witaminy z grupy B — szczególnie B2 i B12), nadmierne ślinienie, źle dopasowane protezy zębowe, braki zębowe, atopowe zapalenie skóry.',
            treatments: 'Leczenie przyczynowe: przeciwgrzybicze preparaty miejscowe (ketokonazol, klotrimazol), antybiotyki miejscowe, suplementacja niedoborów, ochrona kątów ust maścią z witaminą A lub wazeliną, korekta protezy, kwas hialuronowy w celu uzupełnienia objętości kątów ust.',
            contraindications: 'Oblizywanie ust (nasila problem), stosowanie drażniących balsamów z mentolem/cynamonem, samodiagnostyka bez badań krwi na niedobory.',
          },
          {
            name: 'Opryszczka wargowa',
            slug: 'opryszczka-wargowa',
            description: 'Opryszczka wargowa (herpes labialis) to nawracająca infekcja wirusowa wywołana przez wirus opryszczki pospolitej (HSV-1, rzadziej HSV-2). Objawia się pęcherzykami na zaczerwienionej podstawie, które pękają tworząc nadżerki i strupy. Poprzedzona pieczeniem i świądem.',
            causes: 'Wirus HSV-1 (pierwotne zakażenie najczęściej w dzieciństwie), wirus latentny w zwoju nerwu trójdzielnego, reaktywacja pod wpływem: stresu, infekcji, gorączki, ekspozycji na UV, zabiegów kosmetycznych w okolicy ust, menstruacji, osłabienia odporności.',
            treatments: 'Acyklowir/walacyklowir doustnie (najskuteczniej w pierwszych 72h), acyklowir/pencyklowir miejscowo, plastry hydrokoloidowe, profilaktyka: acyklowir przed planowanymi zabiegami w okolicy ust, SPF na usta, suplementacja L-lizyny.',
            contraindications: 'Wykonywanie zabiegów w okolicy ust (kwas hialuronowy, peelingi, laser, makijaż permanentny) przy aktywnej opryszczce — ryzyko rozsiewu! Każdy zabieg na usta wymaga profilaktyki przeciwwirusowej.',
          },
        ],
      },
    ],
  },
  {
    name: 'Szyja i dekolt',
    slug: 'szyja-dekolt',
    hotspotX: 50,
    hotspotY: 16,
    subRegions: [
      {
        name: 'Szyja',
        slug: 'szyja',
        hotspotX: 50,
        hotspotY: 20,
        conditions: [
          {
            name: 'Poikiloderma Civatte',
            slug: 'poikiloderma-civatte',
            description: 'Poikiloderma Civatte to przewlekłe uszkodzenie skóry szyi i dekoltu wywołane przez promieniowanie UV. Objawia się siateczkowatym rumieniem z przebarwieniami, teleangiektazjami i delikatną atrofią skóry. Charakterystycznie oszczędza obszar pod brodą (cień).',
            causes: 'Chroniczna ekspozycja na UV, jasna karnacja, brak ochrony przeciwsłonecznej szyi, fotostarzenie, estrogeny (częściej u kobiet po menopauzie), używanie perfum na szyję (fotouczulacze).',
            treatments: 'IPL (złoty standard), laser naczyniowy, BBL, laser frakcyjny nieablacyjny, fotoprotekcja SPF50+, preparaty z witaminą C i niacynamidem, mezoterapia, kwas traneksamowy. Leczenie wymaga wielu sesji.',
            contraindications: 'Opalanie, solarium, perfumy na szyję, agresywne peelingi, brak fotoprotekcji między zabiegami.',
          },
          {
            name: 'Necklace lines — zmarszczki szyi',
            slug: 'zmarszczki-szyi',
            description: 'Tzw. necklace lines to poziome zmarszczki szyi, tworzące charakterystyczne pierścienie. Mogą być wrodzone (linie Venusa) lub nabyte z wiekiem. Skóra szyi starzeje się szybciej niż twarz z powodu cieńszej warstwy tłuszczowej i mniejszej ilości gruczołów łojowych.',
            causes: 'Starzenie chronologiczne, fotostarzenie, grawitacja, powtarzalne ruchy szyi (spoglądanie w telefon — tech neck), utrata kolagenu i elastyny, odwodnienie, szybki spadek wagi, genetyka.',
            treatments: 'Kwas hialuronowy (skinbooster lub wypełniacz), mezoterapia, biorevitalizacja, laser frakcyjny, radiofrekwencja, mikronakłuwanie, HIFU, toksyna botulinowa w mięśnie szyi (platysma), peelingi średniogłębokie.',
            contraindications: 'Agresywne peelingi głębokie na szyję (cienka skóra!), laser ablacyjny na wysokich parametrach, brak nawilżania.',
          },
        ],
      },
      {
        name: 'Dekolt',
        slug: 'dekolt',
        hotspotX: 50,
        hotspotY: 25,
        conditions: [
          {
            name: 'Fotostarzenie dekoltu',
            slug: 'fotostarzenie-dekoltu',
            description: 'Dekolt jest jednym z najczęściej zaniedbywanych obszarów pod kątem fotoprotekcji. Objawy fotostarzenia: drobne zmarszczki „marszczony papier", przebarwienia, utrata elastyczności, teleangiektazje, suchość. Skóra dekoltu ma mniejszą ilość gruczołów łojowych i jest cieńsza.',
            causes: 'Kumulatywna ekspozycja na UV, brak stosowania filtra na dekolt, delikatna struktura skóry, pozycja podczas snu (leżenie na boku tworzy zmarszczki dekoltu), utrata kolagenu, estrogeny.',
            treatments: 'Laser frakcyjny nieablacyjny, IPL, skinboostery (kwas hialuronowy), mezoterapia, peelingi chemiczne (kwas migdałowy, pirogronowy), mikronakłuwanie, biorevitalizacja polynukleotydami, radiofrekwencja, preparaty z retinaldehydem.',
            contraindications: 'Agresywne lasery ablacyjne (ryzyko blizn na dekolcie), głębokie peelingi TCA, brak fotoprotekcji, solarium.',
          },
          {
            name: 'Rogowacenie słoneczne',
            slug: 'rogowacenie-sloneczne-dekolt',
            description: 'Rogowacenie słoneczne (keratosis actinica) to stan przedrakowy skóry, objawiający się szorstkimi, łuszczącymi się plamkami lub grudkami o barwie cielistej do brązowej. Na dekolcie pojawia się często u osób z fototypem I-III po wieloletniej ekspozycji UV.',
            causes: 'Przewlekła ekspozycja na UV, jasna karnacja, wiek powyżej 50 lat, immunosupresja, opalanie w solarium, praca na wolnym powietrzu. Jest stanem przedrakowym — nieleczone może przekształcić się w raka kolczystokomórkowego (SCC).',
            treatments: 'Krioterapia ciekłym azotem, 5-fluorouracyl miejscowo, imikwimod 5%, terapia fotodynamiczna (PDT), kwas diklofenak/hialuronian, ingenol mebutat, biopsja przy podejrzeniu transformacji nowotworowej. Regularna kontrola dermatoskopowa.',
            contraindications: 'Ignorowanie zmian (ryzyko transformacji nowotworowej!), samoleczenie, ekspozycja na UV, brak regularnej kontroli dermatologicznej.',
          },
        ],
      },
    ],
  },
  {
    name: 'Ciało — tułów',
    slug: 'tulow',
    hotspotX: 50,
    hotspotY: 38,
    subRegions: [
      {
        name: 'Plecy',
        slug: 'plecy',
        hotspotX: 50,
        hotspotY: 38,
        conditions: [
          {
            name: 'Trądzik pleców',
            slug: 'tradzik-plecow',
            description: 'Trądzik pleców (bacne) jest bardzo częsty, szczególnie u mężczyzn. Plecy mają dużą gęstość gruczołów łojowych. Zmiany bywają większe i głębsze niż na twarzy — guzkowe i torbielowate, z tendencją do bliznowacenia.',
            causes: 'Nadmierna aktywność gruczołów łojowych, okluzja (obcisłe ubrania, plecaki), pocenie się, trening fizyczny, sterydowe środki anaboliczne, niewłaściwa higiena po wysiłku, dieta.',
            treatments: 'Żele myjące z kwasem salicylowym lub nadtlenkiem benzoilu, retinoidy miejscowe, antybiotykoterapia doustna, izotretynoina w ciężkich przypadkach, peelingi chemiczne pleców, terapia LED, laser Nd:YAG.',
            contraindications: 'Okluzyjne kremy na plecy przy trądziku, pocenie bez mycia, sterydowe suplementy, noszenie obcisłej syntetycznej odzieży.',
          },
          {
            name: 'Łupież pstry',
            slug: 'lupież-pstry',
            description: 'Łupież pstry (pityriasis versicolor) to powierzchowna grzybica skóry wywołana przez drożdżaki Malassezia. Na plecach objawia się drobnymi, okrągłymi plamami o zmienionej pigmentacji — hipopigmentacja (jasne plamy na opaleninie) lub hiperpigmentacja.',
            causes: 'Drożdżaki Malassezia (komensale skóry), wilgotne i ciepłe środowisko, pocenie się, immunosupresja, stosowanie olejków do ciała, genetyka, tłusta karnacja.',
            treatments: 'Szampony/żele z ketokonazolem 2% (stosowane na ciało), siarczek selenu, terbinafina miejscowo, w rozległych przypadkach: flukonazol lub itrakonazol doustnie. Repigmentacja po leczeniu wymaga czasu (ekspozycja na UV).',
            contraindications: 'Przerywanie leczenia po ustąpieniu objawów (nawroty!), oczekiwanie natychmiastowej repigmentacji, samoleczenie bez diagnozy.',
          },
        ],
      },
      {
        name: 'Klatka piersiowa',
        slug: 'klatka-piersiowa',
        hotspotX: 50,
        hotspotY: 32,
        conditions: [
          {
            name: 'Blizny keloidowe',
            slug: 'blizny-keloidowe',
            description: 'Blizny keloidowe to patologiczne, przerośnięte blizny wykraczające poza granice pierwotnego urazu. Klatka piersiowa (szczególnie okolica mostka) jest jednym z najczęstszych miejsc ich powstawania. Keloidy są twarde, uniesione, często świedzą lub bolą.',
            causes: 'Predyspozycje genetyczne (częściej u osób o ciemnej karnacji), urazy skóry (operacje, piercig, trądzik, oparzenia), nadmierna produkcja kolagenu, napięcie skóry w obszarach mostka.',
            treatments: 'Iniekcje doogniskowe triamcynolonu, silikonowe plastry i żele, kriochirurgia, laseroterapia (pulsed dye laser, frakcyjny), 5-fluorouracyl w iniekcjach, naświetlania, chirurgiczne wycięcie z adiuwantową radioterapią, bleomycyna doogniskowo.',
            contraindications: 'Samo wycięcie chirurgiczne bez leczenia adiuwantowego (ryzyko nawrotu!), piercig i tatuaże u osób z tendencją do keloidów, drażnienie i tarcie blizny.',
          },
        ],
      },
      {
        name: 'Brzuch',
        slug: 'brzuch',
        hotspotX: 50,
        hotspotY: 48,
        conditions: [
          {
            name: 'Rozstępy',
            slug: 'rozstepy-brzuch',
            description: 'Rozstępy (striae distensae) na brzuchu to linearne blizny atroficzne powstające w wyniku rozerwania włókien kolagenowych i elastynowych w skórze właściwej. Początkowo czerwono-fioletowe (striae rubrae), z czasem bladną do białych/perłowych (striae albae).',
            causes: 'Ciąża (striae gravidarum), szybki przyrost masy ciała, szybki wzrost w okresie dojrzewania, kortykosteroidoterapia (miejscowa i ogólna), zespół Cushinga, predyspozycje genetyczne, typ budowy ciała.',
            treatments: 'Striae rubrae (świeże): tretynoina, laser naczyniowy, mikrodermalny nakłuwanie; Striae albae (stare): laser frakcyjny CO2, mikronakłuwanie (dermapen), radiofrekwencja mikroigłowa, karboxyterapia, PRP (osocze bogatopłytkowe), kwas trójchlorooctowy (TCA) w niskim stężeniu.',
            contraindications: 'Naciąganie skóry podczas zabiegów, agresywne peelingi na rozstępach, oczekiwanie 100% usunięcia (blizny można poprawić, nie usunąć całkowicie), dermabrazja.',
          },
        ],
      },
    ],
  },
  {
    name: 'Ramiona i ręce',
    slug: 'ramiona-rece',
    hotspotX: 16,
    hotspotY: 30,
    subRegions: [
      {
        name: 'Ramiona',
        slug: 'ramiona',
        hotspotX: 20,
        hotspotY: 30,
        conditions: [
          {
            name: 'Rogowacenie mieszkowe',
            slug: 'rogowacenie-mieszkowe',
            description: 'Rogowacenie mieszkowe (keratosis pilaris) to powszechna, łagodna dermatoza objawiająca się drobnymi grudkami o barwie cielistej, czerwonawej lub brązowawej, zlokalizowanymi wokół mieszków włosowych. Skóra jest szorstka w dotyku — „gęsia skórka". Najczęściej dotyczy ramion.',
            causes: 'Nadmierne rogowacenie ujść mieszków włosowych (keratynizacja), predyspozycje genetyczne (dziedziczenie autosomalne dominujące), związek z atopią (AZS), suchość skóry, niedobór witaminy A.',
            treatments: 'Preparaty z mocznikiem 10-20%, kwas salicylowy 2%, kwas glikolowy, kwas mlekowy, retinoidy miejscowe, regularne nawilżanie, delikatna eksfoliacja, laser alexandrytowy lub IPL (w przypadku towarzyszącego rumienia).',
            contraindications: 'Agresywne złuszczanie (mechaniczne tarcie), gorąca woda, mydła z SLS, zaniedbanie nawilżania, oczekiwanie trwałego wyleczenia (stan przewlekły, wymaga stałej pielęgnacji).',
          },
        ],
      },
      {
        name: 'Dłonie',
        slug: 'dlonie',
        hotspotX: 15,
        hotspotY: 55,
        conditions: [
          {
            name: 'Wyprysk kontaktowy',
            slug: 'wyprysk-kontaktowy-dlonie',
            description: 'Wyprysk kontaktowy dłoni (eczema) to stan zapalny skóry wywołany kontaktem z alergenem (wyprysk alergiczny) lub substancją drażniącą (wyprysk z podrażnienia). Objawia się rumieniem, pęcherzykami, złuszczaniem, pękaniem i świądem. Może być ostry lub przewlekły.',
            causes: 'Częste mycie rąk, detergenty, środki czystości, lateks, nikiel, chrom, kosmetyki, cement, rozpuszczalniki, praca w mokrym środowisku (fryzjerstwo, gastronomia, medycyna), atopia.',
            treatments: 'Identyfikacja i eliminacja alergenu/drażniacza, rękawice ochronne, emolienty (wielokrotnie dziennie), glikokortykosteroidy miejscowe (fluticazon, mometazon), inhibitory kalcyneuryny, fototerapia PUVA rąk, alitretynoina doustna w ciężkich przypadkach.',
            contraindications: 'Kontynuacja ekspozycji na alergen, stosowanie silnych sterydów długotrwale na dłonie, zaniedbywanie nawilżania, mycie rąk w gorącej wodzie.',
          },
          {
            name: 'Plamy starcze dłoni',
            slug: 'plamy-starcze-dloni',
            description: 'Plamy starcze (lentigo senilis/solaris) na dłoniach to płaskie, brązowe przebarwienia o ostrych granicach, pojawiające się po 40-50 r.ż. na grzbietach dłoni. Są wynikiem kumulatywnej ekspozycji na UV i fotostarzenia skóry.',
            causes: 'Kumulatywna ekspozycja na UV, starzenie chronologiczne, jasna karnacja, brak fotoprotekcji dłoni, predyspozycje genetyczne.',
            treatments: 'Krioterapia, laser Q-switched (ruby, alexandrite, Nd:YAG), IPL, peelingi chemiczne (TCA spot), preparaty rozjaśniające (kwas kojowy, arbutyna, witamina C), mezoterapia dłoni, kwas hialuronowy (rejuvenacja objętości dłoni).',
            contraindications: 'Brak fotoprotekcji po zabiegach, samoleczenie preparatami z hydrochinonem bez nadzoru, mylenie z melanoma (każda nowa, asymetryczna zmiana wymaga dermatoskopii!).',
          },
          {
            name: 'Brodawki wirusowe',
            slug: 'brodawki-wirusowe-dlonie',
            description: 'Brodawki wirusowe (verrucae vulgares) na dłoniach to łagodne rozrosty skóry wywołane przez wirusa brodawczaka ludzkiego (HPV, głównie typy 1, 2, 4). Objawiają się twardymi grudkami z szorstkową powierzchnią, często z ciemnymi punktami (zakrzepłe naczynia).',
            causes: 'Zakażenie wirusem HPV, mikurourazy skóry, osłabienie odporności, mokre środowisko (baseny, siłownie), kontakt bezpośredni z osobą zakażoną lub skażoną powierzchnią, dzieci i młodzież.',
            treatments: 'Krioterapia ciekłym azotem (kilka sesji), kwas salicylowy 15-40% (plastry, roztwory), 5-fluorouracyl miejscowo, bleomycyna doogniskowo, imikwimod, terapia fotodynamiczna, elektrokoagulacja, laser CO2, wzmacnianie odporności.',
            contraindications: 'Samodzielne wycinanie lub odcinanie brodawek, ignorowanie zmian (mogą się rozprzestrzeniać), stosowanie agresywnych metod na twarz (ryzyko blizn).',
          },
        ],
      },
    ],
  },
  {
    name: 'Nogi i stopy',
    slug: 'nogi-stopy',
    hotspotX: 35,
    hotspotY: 68,
    subRegions: [
      {
        name: 'Uda i kolana',
        slug: 'uda-kolana',
        hotspotX: 45,
        hotspotY: 65,
        conditions: [
          {
            name: 'Cellulit',
            slug: 'cellulit',
            description: 'Cellulit (lipodystrofia ginoidalna) to zmiana struktury tkanki podskórnej objawiająca się nierówną, „pomarańczową" powierzchnią skóry. Dotyczy 85-98% kobiet po okresie dojrzewania. Najczęściej lokalizuje się na udach, pośladkach i biodrach. Wyróżnia się 4 stopnie.',
            causes: 'Struktura tkanki łącznej u kobiet (przegrody włókniste prostopadłe do skóry), estrogeny, genetyka, zaburzenia mikrokrążenia, retencja wody, brak aktywności fizycznej, dieta bogata w sól i cukry, siedzący tryb życia.',
            treatments: 'Endermologia (LPG), fala uderzeniowa (shockwave therapy), radiofrekwencja, karboksyterapia, mezoterapia antycellulitowa, lipoliza iniekcyjna (fosfatydylocholina), laser 1440nm (Cellulaze), regularna aktywność fizyczna, drenaż limfatyczny, suche szczotkowanie.',
            contraindications: 'Nierealistyczne oczekiwania (cellulit nie jest chorobą), liposukcja jako metoda na cellulit (może pogorszyć), agresywne masaże u osób z żylakami, brak aktywności fizycznej.',
          },
        ],
      },
      {
        name: 'Podudzia',
        slug: 'podudzia',
        hotspotX: 42,
        hotspotY: 78,
        conditions: [
          {
            name: 'Żylaki i pajączki naczyniowe',
            slug: 'zylaki-pajaczki-naczyniowe',
            description: 'Teleangiektazje (pajączki naczyniowe) i żylaki kończyn dolnych to rozszerzone naczynia żylne. Teleangiektazje mają średnicę <1mm (czerwono-fioletowe siateczki), żylaki retikularne 1-3mm (niebieskawe), a żylaki pniowe >3mm (wypukłe, kręte). Dotyczą nawet 50% kobiet.',
            causes: 'Niewydolność zastawek żylnych, predyspozycje genetyczne, ciąża, estrogeny/progesteron, otyłość, długotrwałe stanie lub siedzenie, brak aktywności fizycznej, wiek.',
            treatments: 'Skleroterapia (iniekcja środka obliterującego), laser przezskórny (Nd:YAG 1064nm), mikroflebektomia, EVLA (wewnątrzżylna ablacja laserowa), RFA (ablacja radiofrekwencyjna), pończochy uciskowe (klasa II), aktywność fizyczna, elevacja nóg.',
            contraindications: 'Opalanie nóg przed/po skleroterapii, gorące kąpiele i sauna po zabiegach, długotrwałe stanie bez przerw, brak kompresji po zabiegach.',
          },
          {
            name: 'Wrastające włosy po depilacji',
            slug: 'wrastajace-wlosy-podudzia',
            description: 'Wrastające włosy (pseudofolliculitis) na podudziach to stan, w którym ogolone lub wyrwane włosy wrastają z powrotem w skórę, powodując stan zapalny, grudki i krostki. Szczególnie częste po goleniu i depilacji woskiem.',
            causes: 'Golenie pod włos, depilacja woskiem, grube kręcone włosy, brak eksfoliacji, okluzja (obcisłe ubrania), sucha skóra, niewłaściwa technika golenia.',
            treatments: 'Zmiana metody depilacji na laserową (rozwiązanie długoterminowe), IPL, eksfoliacja kwasami (glikolowy, salicylowy), enzymatyczna eksfoliacja, golenie zgodnie z kierunkiem wzrostu włosów, nawilżanie, preparaty z kwasem glikolowym po goleniu.',
            contraindications: 'Golenie pod włos, wyciskanie grudek, depilacja woskiem na podrażnionej skórze, zaniedbanie nawilżania i eksfoliacji.',
          },
        ],
      },
      {
        name: 'Stopy',
        slug: 'stopy',
        hotspotX: 45,
        hotspotY: 95,
        conditions: [
          {
            name: 'Grzybica stóp',
            slug: 'grzybica-stop',
            description: 'Grzybica stóp (tinea pedis) to najczęstsza grzybica skóry. Wyróżnia się postać międzypalcową (maceracja, pękanie), mokaszynową (suchość, łuszczenie podeszew) i pęcherzową (świąd, pęcherzyki). Może współistnieć z grzybicą paznokci.',
            causes: 'Dermatofity (Trichophyton rubrum, T. mentagrophytes), ciepłe i wilgotne środowisko (buty, baseny, siłownie), nadmierne pocenie stóp, uszkodzenia skóry, obniżona odporność, cukrzyca.',
            treatments: 'Leki przeciwgrzybicze miejscowe (terbinafina, klotrimazol, mikonazol) stosowane 2-4 tygodnie, w opornych/rozległych przypadkach: terbinafina lub itrakonazol doustnie, higiena stóp, suszenie przestrzeni międzypalcowych, zmiana obuwia.',
            contraindications: 'Przerywanie leczenia po ustąpieniu objawów (nawroty!), noszenie obuwia bez skarpet, chodzenie boso w miejscach publicznych, stosowanie sterydów miejscowych na grzybicę.',
          },
          {
            name: 'Odciski i modzele',
            slug: 'odciski-modzele',
            description: 'Odciski (clavus) i modzele (callus) to ograniczone zgrubienia warstwy rogowej naskórka powstające w miejscach przewlekłego ucisku i tarcia. Odciski mają twardy, centralny rdzeń wnikający w głąb skóry i są bolesne przy ucisku. Modzele są płaskie i rozlane.',
            causes: 'Źle dopasowane obuwie, deformacje stóp (hallux valgus, palce młoteczkowate), chód bez skarpet, nadwaga, nieprawidłowa biomechanika stopy, cukrzyca (stopa cukrzycowa).',
            treatments: 'Podologia — profesjonalne opracowanie, plastry z kwasem salicylowym 40%, mocznik 20-40%, regularne złuszczanie, dobór prawidłowego obuwia, wkładki ortopedyczne, korekta deformacji stóp, w przypadku cukrzycy — regularna opieka podologiczna.',
            contraindications: 'Samodzielne wycinanie (szczególnie u diabetyków — ryzyko ran!), stosowanie metalowych tarkek na sucho, ignorowanie przyczyny (wadliwe obuwie), brak opieki podologicznej u diabetyków.',
          },
          {
            name: 'Pękające pięty',
            slug: 'pekajace-piety',
            description: 'Pękanie pięt (ragady) to głębokie szczeliny w zrogowaciałym naskórku pięt. Mogą być bolesne i krwawić. W zaawansowanych przypadkach stanowią wrota zakażeń. Częstsze w miesiącach letnich (chodzenie w sandałach, na boso).',
            causes: 'Suchość skóry, brak nawilżania, chodzenie w sandałach/klapkach, nadwaga, cukrzyca, niedoczynność tarczycy, grzybica stóp, łuszczyca, niedobór witamin (A, E, C, cynk), długie stanie.',
            treatments: 'Złuszczanie zrogowaciałego naskórka (podolog), preparaty z mocznikiem 25-40%, kwas salicylowy 10-20%, maści okluzyjne na noc (wazelina + skarpetki), peeling enzymatyczny stóp, regularne nawilżanie, leczenie chorób współistniejących.',
            contraindications: 'Agresywne zdzieranie skóry na sucho (tarki metalowe), golenie naskórka żyletkami, ignorowanie pęknięć u diabetyków (ryzyko owrzodzenia), chodzenie boso na twardych powierzchniach.',
          },
        ],
      },
    ],
  },
  {
    name: 'Skóra głowy',
    slug: 'skora-glowy',
    hotspotX: 50,
    hotspotY: 2,
    subRegions: [
      {
        name: 'Owłosiona skóra głowy',
        slug: 'owlosiona-skora-glowy',
        hotspotX: 50,
        hotspotY: 5,
        conditions: [
          {
            name: 'Łupież',
            slug: 'lupiej',
            description: 'Łupież (pityriasis capitis) to złuszczanie naskórka owłosionej skóry głowy. Wyróżnia się łupież suchy (drobne białe łuski) i łupież tłusty (większe żółtawe łuski przyklejone do skóry). Dotyczy nawet 50% populacji dorosłych.',
            causes: 'Drożdżaki Malassezia, nadmierna produkcja sebum, wrażliwość skóry, stres, zmiany hormonalne, suche powietrze, niewłaściwe szampony, rzadkie mycie głowy, dieta.',
            treatments: 'Szampony lecznicze: ketokonazol 2%, piritionian cynku, siarczek selenu, dziegieć, kwas salicylowy, cyklopirox. Regularne stosowanie 2-3x/tydzień przez 4 tygodnie, potem profilaktycznie 1x/tydzień.',
            contraindications: 'Drapanie skóry głowy, agresywne szczotkowanie, gorąca woda, silne detergenty, zbyt częste lub zbyt rzadkie mycie, stresowanie się łupieżem (błędne koło).',
          },
          {
            name: 'Łuszczyca skóry głowy',
            slug: 'luszczyca-skory-glowy',
            description: 'Łuszczyca skóry głowy (psoriasis capitis) to jedna z najczęstszych lokalizacji łuszczycy. Objawia się wyraźnie odgraniczonymi, czerwonymi ogniskami pokrytymi srebrzystobiałymi łuskami, często wykraczającymi poza linię włosów na czoło, za uszy i na kark.',
            causes: 'Choroba autoimmunologiczna z predyspozycją genetyczną, czynniki wyzwalające: stres, infekcje (paciorkowcowe), urazy skóry (objaw Koebnera), leki (beta-blokery, lit), alkohol, palenie.',
            treatments: 'Miejscowo: glikokortykosteroidy (klobetazol w roztworze), kalcypotriol + betametazon, szampony z dziegciem/salicylanem, preparaty złuszczające łuski; ogólnie: metotreksat, cyklosporyna, acytretyna; biologiczne: adalimumab, sekukinumab.',
            contraindications: 'Drapanie i zdrapywanie łusek (objaw Koebnera!), agresywne koloryzacje włosów, stosowanie silnych sterydów bez przerwy, ignorowanie łuszczycy (choroba ogólnoustrojowa).',
          },
          {
            name: 'Łysienie androgenowe',
            slug: 'lysienie-androgenowe',
            description: 'Łysienie androgenowe (alopecia androgenetica) to najczęstsza forma łysienia, dotycząca 50% mężczyzn i 30% kobiet. U mężczyzn: cofanie się linii włosów i przerzedzenie na szczycie głowy (skala Norwooda). U kobiet: rozlane przerzedzenie centralnej części głowy (skala Ludwiga).',
            causes: 'Genetyczna wrażliwość mieszków włosowych na dihydrotestosteron (DHT), enzym 5-alfa-reduktaza, predyspozycje rodzinne, wiek, zaburzenia hormonalne, PCOS (u kobiet).',
            treatments: 'Minoxidil miejscowo 2-5% (mężczyźni i kobiety), finasteryd doustnie (mężczyźni), mezoterapia skóry głowy, PRP (osocze bogatopłytkowe), terapia LED (niskodawkowe światło czerwone), mikronakłuwanie skóry głowy, przeszczep włosów (FUE/FUT).',
            contraindications: 'Finasteryd u kobiet w wieku rozrodczym (teratogenność), przerywanie leczenia minoxidilem (nasilone wypadanie), suplementy bez diagnozy, streotypowe „cuda" na łysienie.',
          },
        ],
      },
    ],
  },
  {
    name: 'Paznokcie',
    slug: 'paznokcie',
    hotspotX: 90,
    hotspotY: 40,
    subRegions: [
      {
        name: 'Paznokcie rąk',
        slug: 'paznokcie-rak',
        hotspotX: 80,
        hotspotY: 52,
        conditions: [
          {
            name: 'Onycholiza',
            slug: 'onycholiza',
            description: 'Onycholiza to oddzielenie się płytki paznokciowej od łożyska. Paznokieć staje się biały lub żółtawy w dystalnej części. Może dotyczyć jednego lub wielu paznokci. Jest jednym z najczęstszych problemów paznokciowych.',
            causes: 'Urazy mechaniczne, grzybica paznokci, łuszczyca, liszaj płaski, nadczynność tarczycy, reakcja na leki, kontakt z chemikaliami, zbyt długie paznokcie, agresywny manicure, żele UV.',
            treatments: 'Leczenie przyczyny (grzybica: leki przeciwgrzybicze; łuszczyca: steroidy miejscowe), przycinanie oddzielonej części, unikanie wilgoci pod paznokciem, rękawice ochronne, biotyna, żelazo (jeśli niedobór).',
            contraindications: 'Odrywanie oddzielonej płytki, ekspozycja na detergenty bez rękawic, długie namaczanie w wodzie, manicure hybrydowy na chorym paznokciu.',
          },
          {
            name: 'Łamliwość paznokci',
            slug: 'lamliwosc-paznokci',
            description: 'Łamliwość paznokci (onychorrhexis/onychoschisis) to stan, w którym paznokcie łatwo pękają, łuszczą się i łamią. Dotyczy nawet 20% populacji, częściej kobiet. Paznokcie mogą mieć podłużne prążkowanie i rozwarstwione końce.',
            causes: 'Częsty kontakt z wodą i detergentami, niedobory żywieniowe (żelazo, cynk, biotyna, witamina D), niedoczynność tarczycy, anemia, suchość paznokci, agresywne usuwanie lakierów hybrydowych, aceton.',
            treatments: 'Suplementacja biotyny 2.5mg/dziennie (przez 6 miesięcy), preparaty z keratyną i krzemem, ochrona rękawicami, nawilżanie płytki (emolienty), lakiery wzmacniające (formaldehyde-free), unikanie acetonu, dieta bogata w białko, żelazo, cynk.',
            contraindications: 'Zdejmowanie lakieru hybrydowego przez zdzieranie, aceton, agresywne piłowanie, zaniedbywanie suplementacji.',
          },
        ],
      },
      {
        name: 'Paznokcie stóp',
        slug: 'paznokcie-stop',
        hotspotX: 50,
        hotspotY: 97,
        conditions: [
          {
            name: 'Grzybica paznokci',
            slug: 'grzybica-paznokci',
            description: 'Grzybica paznokci (onychomycosis) to zakażenie grzybicze płytki paznokciowej, najczęściej paznokcia dużego palca stopy. Paznokieć staje się żółtawy, zgrubiały, kruchy, z podpaznokciową hiperkeratozą. Najczęstszy patogen: Trichophyton rubrum.',
            causes: 'Dermatofity (T. rubrum), wilgotne środowisko stóp, uraz paznokcia, cukrzyca, zaburzenia krążenia, immunosupresja, wiek podeszły, sportowcy, wspólne korzystanie z łazienek.',
            treatments: 'Leki doustne: terbinafina 250mg/dziennie przez 3-6 miesięcy (złoty standard), itrakonazol w pulsach; miejscowe: amorolfina lakier 5%, cyklopirox lakier, terapia laserowa Nd:YAG (wspomagająco), podologiczne opracowanie płytki, kombinacja leków miejscowych i doustnych.',
            contraindications: 'Samo leczenie miejscowe w ciężkiej grzybicy (nieskuteczne!), przerywanie leczenia doustnego, brak kontroli wątroby przy terbinafinie, ignorowanie grzybicy stóp towarzyszącej, lakierowanie paznokcia bez leczenia.',
          },
          {
            name: 'Wrastający paznokieć',
            slug: 'wrastajacy-paznokiec',
            description: 'Wrastający paznokieć (unguis incarnatus) to wrastanie bocznego brzegu płytki paznokciowej w wał paznokciowy. Powoduje ból, zaczerwienienie, obrzęk, a w zaawansowanych stadiach ziarninę i ropne zakażenie. Najczęściej dotyczy dużego palca stopy.',
            causes: 'Nieprawidłowe obcinanie paznokci (za krótko, zaokrąglanie rogów), ciasne obuwie, uraz, nadmierna potliwość stóp, predyspozycje anatomiczne (szerokie płytki, zakrzywione paznokcie), otyłość.',
            treatments: 'Stadium I: tamponada, ortonyksia (klamerki korekcyjne), prawidłowe obcinanie; Stadium II: częściowe usunięcie bocznego fragmentu z matrycektomią fenolową (zabieg podologiczny); Stadium III: chirurgiczne wycięcie fragmentu z plasttyką wału (Winograd, Emmert).',
            contraindications: 'Obcinanie rogów paznokcia (główna przyczyna!), noszenie ciasnego obuwia, ignorowanie infekcji (ropne zapalenie), samoleczenie w stadium zaawansowanym.',
          },
        ],
      },
    ],
  },
];

async function main() {
  console.log('Seeding Skin Atlas with hierarchical body regions...\n');

  let topOrder = 0;
  let totalRegions = 0;
  let totalSubRegions = 0;
  let totalConditions = 0;

  for (const topRegion of bodyRegions) {
    // Create top-level region
    const parent = await prisma.skinAtlasRegion.upsert({
      where: { slug: topRegion.slug },
      update: {
        name: topRegion.name,
        hotspotX: topRegion.hotspotX,
        hotspotY: topRegion.hotspotY,
        order: topOrder++,
        published: true,
      },
      create: {
        name: topRegion.name,
        slug: topRegion.slug,
        hotspotX: topRegion.hotspotX,
        hotspotY: topRegion.hotspotY,
        order: topOrder - 1,
        published: true,
      },
    });
    totalRegions++;
    console.log(`✓ ${parent.name} (top-level)`);

    let subOrder = 0;
    for (const sub of topRegion.subRegions) {
      // Create sub-region
      const subRegion = await prisma.skinAtlasRegion.upsert({
        where: { slug: sub.slug },
        update: {
          name: sub.name,
          parentId: parent.id,
          hotspotX: sub.hotspotX,
          hotspotY: sub.hotspotY,
          order: subOrder++,
          published: true,
        },
        create: {
          name: sub.name,
          slug: sub.slug,
          parentId: parent.id,
          hotspotX: sub.hotspotX,
          hotspotY: sub.hotspotY,
          order: subOrder - 1,
          published: true,
        },
      });
      totalSubRegions++;
      console.log(`  ├─ ${subRegion.name} (sub-region)`);

      let condOrder = 0;
      for (const cond of sub.conditions) {
        await prisma.skinAtlasCondition.upsert({
          where: { slug: cond.slug },
          update: {
            regionId: subRegion.id,
            name: cond.name,
            description: cond.description,
            causes: cond.causes,
            treatments: cond.treatments,
            contraindications: cond.contraindications,
            order: condOrder++,
            published: true,
          },
          create: {
            regionId: subRegion.id,
            name: cond.name,
            slug: cond.slug,
            description: cond.description,
            causes: cond.causes,
            treatments: cond.treatments,
            contraindications: cond.contraindications,
            order: condOrder - 1,
            published: true,
          },
        });
        totalConditions++;
        console.log(`  │  └─ ${cond.name}`);
      }
    }
    console.log('');
  }

  console.log(`\nDone! Created:`);
  console.log(`  ${totalRegions} top-level regions`);
  console.log(`  ${totalSubRegions} sub-regions`);
  console.log(`  ${totalConditions} conditions`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
