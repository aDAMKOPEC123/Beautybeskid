/**
 * Seed: Reguły pogodowe dla sekcji "Twoja Skóra"
 * Uruchom: cd apps/server && npx tsx prisma/seed-skin-weather-rules.ts
 *
 * Parametry:
 *  temperature  °C        absMin -20, absMax 45
 *  uv           indeks    absMin 0,   absMax 11
 *  humidity     %         absMin 0,   absMax 100
 *  aqi          AQI       absMin 0,   absMax 300
 *  precip       %         absMin 0,   absMax 100
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const rules = [
  // ── 1. Upał ──────────────────────────────────────────────────────────────────
  {
    label: 'Upał — silne nawodnienie i filtr SPF',
    recommendation:
      'Temperatura powyżej 30°C przyspiesza utratę wody przez skórę i nasila produkcję sebum. Nałóż lekki krem nawilżający z kwasem hialuronowym i bezwzględnie stosuj krem z filtrem SPF 50+. Unikaj ciężkich, okluzyjnych produktów — mogą zapychać pory. Chłodź twarz mgiełką z wody termalnej kilka razy dziennie.',
    isActive: true,
    sortOrder: 10,
    conditions: ['temperature'],
    thresholds: { temperature: { min: 30, max: 45 } },
  },
  // ── 2. Mróz ───────────────────────────────────────────────────────────────────
  {
    label: 'Mróz — intensywna ochrona przed zimnem',
    recommendation:
      'Niska temperatura uszkadza barierę lipidową i powoduje przesuszenie oraz zaczerwienienia. Stosuj bogaty krem ochronny (najlepiej z ceramidami i masłem shea) przed wyjściem z domu. Unikaj gorących kąpieli — ciepła woda jest lepsza. Nakładaj balsam do ust i chroń policzki kremem „na mróz". W nocy użyj pielęgnacji regenerującej.',
    isActive: true,
    sortOrder: 20,
    conditions: ['temperature'],
    thresholds: { temperature: { min: -20, max: 2 } },
  },
  // ── 3. Optymalna temperatura ─────────────────────────────────────────────────
  {
    label: 'Optymalna temperatura — podstawowa pielęgnacja',
    recommendation:
      'Warunki sprzyjają utrzymaniu naturalnej bariery ochronnej skóry. To dobry czas na regularną pielęgnację: oczyszczanie, tonik, serum z witaminą C i krem nawilżający z SPF 30. Możesz wprowadzić aktywniejsze składniki, np. retinol lub eksfoliację chemiczną, bo skóra lepiej je toleruje w umiarkowanych temperaturach.',
    isActive: true,
    sortOrder: 30,
    conditions: ['temperature'],
    thresholds: { temperature: { min: 10, max: 22 } },
  },
  // ── 4. Silne UV ──────────────────────────────────────────────────────────────
  {
    label: 'Silne promieniowanie UV — fotoochrona priorytetem',
    recommendation:
      'Indeks UV ≥ 6 oznacza wysokie ryzyko uszkodzeń DNA skóry. Stosuj SPF 50+ i odnawiaj go co 2 godziny przy pobycie na zewnątrz. Unikaj słońca między 10:00 a 15:00. Sięgnij po antyoksydanty (witamina C, E, niacynamid) rano. Wieczorem zastosuj serum regenerujące lub krem z alantoiną, by złagodzić ewentualne podrażnienia.',
    isActive: true,
    sortOrder: 40,
    conditions: ['uv'],
    thresholds: { uv: { min: 6, max: 11 } },
  },
  // ── 5. Niskie UV (jesień/zima) ───────────────────────────────────────────────
  {
    label: 'Niskie UV — uzupełnij witaminę D',
    recommendation:
      'Przy indeksie UV poniżej 3 synteza witaminy D w skórze jest bardzo ograniczona. Rozważ suplementację witaminą D3, która wspomaga regenerację naskórka i wzmacnia odporność skóry. Możesz sięgnąć po produkty z witaminą D w składzie, np. nawilżające balsamy. To dobry moment na zabiegi złuszczające, bo ryzyko przebarwień jest niższe.',
    isActive: true,
    sortOrder: 50,
    conditions: ['uv'],
    thresholds: { uv: { min: 0, max: 2 } },
  },
  // ── 6. Wysoka wilgotność ─────────────────────────────────────────────────────
  {
    label: 'Wysoka wilgotność — kontrola sebum',
    recommendation:
      'Wilgotność powyżej 75% powoduje, że skóra tłusta i mieszana intensywniej się przetłuszcza, a pory mogą być bardziej zapchane. Stosuj lekkie, beztłuszczowe nawilżacze z kwasem hialuronowym. Używaj chusteczek matujących w ciągu dnia i delikatnego peelingującego toniku z kwasem salicylowym (BHA). Unikaj ciężkich kremów i olejków.',
    isActive: true,
    sortOrder: 60,
    conditions: ['humidity'],
    thresholds: { humidity: { min: 75, max: 100 } },
  },
  // ── 7. Niska wilgotność ──────────────────────────────────────────────────────
  {
    label: 'Niska wilgotność — intensywne nawilżenie',
    recommendation:
      'Przy wilgotności poniżej 30% skóra traci wodę przez transepidermalną utratę wody (TEWL). Nałóż humektant (kwas hialuronowy, gliceryna) na lekko wilgotną skórę, a potem zablokuj wilgoć kremem z ceramidami lub olejem jojoba. W domu rozważ używanie nawilżacza powietrza. Pij co najmniej 2 litry wody dziennie.',
    isActive: true,
    sortOrder: 70,
    conditions: ['humidity'],
    thresholds: { humidity: { min: 0, max: 30 } },
  },
  // ── 8. Zły jakość powietrza (AQI) ────────────────────────────────────────────
  {
    label: 'Zanieczyszczone powietrze — tarcza antyoksydacyjna',
    recommendation:
      'Wysoki AQI oznacza obecność cząstek PM2.5 i PM10, które wnikają w skórę i nasilają stres oksydacyjny, powodując przedwczesne starzenie i trądzik. Użyj rano serum z witaminą C (antyoksydant), a wieczorem dokładnie oczyść twarz podwójnym oczyszczaniem (olejek + pianką). Możesz stosować produkty z niacynamidem, który wzmacnia barierę ochronną.',
    isActive: true,
    sortOrder: 80,
    conditions: ['aqi'],
    thresholds: { aqi: { min: 101, max: 300 } },
  },
  // ── 9. Deszcz / wysokie opady ─────────────────────────────────────────────────
  {
    label: 'Deszczowa pogoda — ochrona przed wilgocią atmosferyczną',
    recommendation:
      'Wysoki poziom opadów i wilgotność powietrza mogą rozmywać kosmetyki i zaburzać pH skóry. Wybierz lekki krem nawilżający o matowej formule i nie rezygnuj z SPF — promieniowanie UV przenika przez chmury. Jeśli Twoja skóra jest wrażliwa, unikaj intensywnych peelingów w takie dni — bariera jest osłabiona.',
    isActive: true,
    sortOrder: 90,
    conditions: ['precip'],
    thresholds: { precip: { min: 70, max: 100 } },
  },
  // ── 10. Sucho i słonecznie ───────────────────────────────────────────────────
  {
    label: 'Sucho i słonecznie — nawodnienie + SPF',
    recommendation:
      'Połączenie niskiej wilgotności i silnego nasłonecznienia to podwójne wyzwanie: skóra wysycha i jest narażona na UV. Stosuj nawilżacz z kwasem hialuronowym i SPF 50+ rano. W ciągu dnia używaj mgiełki nawilżającej. Wieczorem bogaty krem regenerujący z ceramidami i peptydami pomoże odbudować barierę lipidową.',
    isActive: true,
    sortOrder: 100,
    conditions: ['temperature', 'humidity', 'uv'],
    thresholds: {
      temperature: { min: 22, max: 45 },
      humidity: { min: 0, max: 35 },
      uv: { min: 4, max: 11 },
    },
  },
  // ── 11. Wietrzna pogoda (upał + niska wilgotność) ────────────────────────────
  {
    label: 'Gorąco i sucho — ryzyko przesuszenia i zaczerwienień',
    recommendation:
      'Gorące i suche powietrze szybko odparowuje wodę ze skóry, co szczególnie dotyka skórę suchą i wrażliwą. Stosuj produkty z aloesem, kwasem hialuronowym i pantenolem. Ogranicz mycie twarzy do 1-2 razy dziennie, by nie niszczyć naturalnych olejów. Przed snem użyj maski nawilżającej lub olejku — jako ostatni krok.',
    isActive: true,
    sortOrder: 110,
    conditions: ['temperature', 'humidity'],
    thresholds: {
      temperature: { min: 28, max: 45 },
      humidity: { min: 0, max: 30 },
    },
  },
  // ── 12. Pochmurno, wysoka wilgotność, brak deszczu ──────────────────────────
  {
    label: 'Parny, duszny dzień — lekka pielęgnacja matująca',
    recommendation:
      'Pochmurna, wilgotna i ciepła pogoda sprzyja przetłuszczaniu i powstawaniu zaskórników. Wybierz żelowy nawilżacz bez olejów i stosuj tonik z kwasem salicylowym (BHA) wieczorem. Nie pomijaj SPF — UV działa też przez chmury. Unikaj pudrowania w nadmiarze, gdyż zatykasz pory. Mgiełka z wody termalnej + bibułki matujące to Twój sprzymierzeniec w ciągu dnia.',
    isActive: true,
    sortOrder: 120,
    conditions: ['temperature', 'humidity', 'precip'],
    thresholds: {
      temperature: { min: 18, max: 30 },
      humidity: { min: 65, max: 100 },
      precip: { min: 0, max: 30 },
    },
  },
  // ── 13. Wiosenna alergia (umiarkowany AQI + niskie UV) ───────────────────────
  {
    label: 'Sezon przejściowy — wzmocnienie bariery ochronnej',
    recommendation:
      'W okresach przejściowych (wiosna, jesień) skóra jest bardziej reaktywna i skłonna do alergii. Zrezygnuj z agresywnych peelingów i mocnych kwasów. Wybierz produkty kojące z bisabololem, pantenolem i ekstraktem z owsa. Stosuj probiotyki miejscowe lub suplementy doustne wzmacniające mikrobiomu skóry. Nie wprowadzaj nowych produktów — minimalizuj rutynę.',
    isActive: true,
    sortOrder: 130,
    conditions: ['temperature', 'aqi'],
    thresholds: {
      temperature: { min: 5, max: 18 },
      aqi: { min: 50, max: 150 },
    },
  },
  // ── 14. Zima z dobrą jakością powietrza ─────────────────────────────────────
  {
    label: 'Mroźny, czysty dzień — intensywna regeneracja',
    recommendation:
      'Czyste, chłodne powietrze to idealna pora na intensywną regenerację skóry. Wieczorem stosuj retinol lub bakuchiol — zimą ryzyko fotouczulenia jest niższe. Rano nałóż bogaty krem ochronny z ceramidami i SPF 30 (UV wciąż działa!). Pamiętaj o nawilżaczu powietrza w ogrzewanym pomieszczeniu — centralne ogrzewanie bardzo wysusza skórę.',
    isActive: true,
    sortOrder: 140,
    conditions: ['temperature', 'aqi', 'uv'],
    thresholds: {
      temperature: { min: -20, max: 5 },
      aqi: { min: 0, max: 50 },
      uv: { min: 0, max: 3 },
    },
  },
  // ── 15. Idealne warunki ──────────────────────────────────────────────────────
  {
    label: 'Idealne warunki pogodowe — utrzymaj rutynę',
    recommendation:
      'Dziś pogoda sprzyja Twojej skórze — umiarkowana temperatura, niska wilgotność, słabe UV i czyste powietrze. Skorzystaj z okazji i przeprowadź delikatny peeling (enzymatyczny lub AHA), który oczyści skórę bez ryzyka podrażnienia. Zastosuj serum z antyoksydantami rano i krem regenerujący wieczorem. Pamiętaj o SPF, nawet gdy słońce jest łagodne.',
    isActive: true,
    sortOrder: 150,
    conditions: ['temperature', 'humidity', 'uv', 'aqi'],
    thresholds: {
      temperature: { min: 15, max: 24 },
      humidity: { min: 40, max: 65 },
      uv: { min: 0, max: 4 },
      aqi: { min: 0, max: 50 },
    },
  },
  // ── 16. Ekstremalne UV + upał ────────────────────────────────────────────────
  {
    label: 'Ekstremalne UV i upał — maksymalna ochrona',
    recommendation:
      'Indeks UV ≥ 8 w połączeniu z temperaturą powyżej 28°C to warunki wymagające pełnej fotoochrony. Stosuj SPF 50+ PA++++ i odnawiaj co 90 minut. Nakryj głowę kapeluszem i zakryj ramiona. Unikaj słońca od 10:00 do 16:00. Po powrocie do domu nałóż kojący żel z aloesem lub kompres z zimnej herbaty zielonej na twarz. Wieczorem bogata ceramidowa odbudowa.',
    isActive: true,
    sortOrder: 160,
    conditions: ['temperature', 'uv'],
    thresholds: {
      temperature: { min: 28, max: 45 },
      uv: { min: 8, max: 11 },
    },
  },
];

async function main() {
  console.log('🌤️  Seeding skin weather rules...');

  let created = 0;
  let skipped = 0;

  for (const rule of rules) {
    const existing = await prisma.skinWeatherRule.findFirst({
      where: { label: rule.label },
    });

    if (existing) {
      console.log(`  ⏭  Skipped (already exists): "${rule.label}"`);
      skipped++;
      continue;
    }

    await prisma.skinWeatherRule.create({
      data: {
        label: rule.label,
        recommendation: rule.recommendation,
        isActive: rule.isActive,
        sortOrder: rule.sortOrder,
        conditions: rule.conditions,
        thresholds: rule.thresholds,
      },
    });

    console.log(`  ✅ Created: "${rule.label}"`);
    created++;
  }

  console.log(`\n✨ Done! Created: ${created}, Skipped (duplicates): ${skipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
