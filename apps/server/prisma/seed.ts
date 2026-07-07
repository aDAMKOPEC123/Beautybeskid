// filepath: apps/server/prisma/seed.ts
import { PrismaClient, SkinType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
  
  // Create admin user
  const adminPasswordHash = await bcrypt.hash('Admin2024!', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@gabinet.pl' },
    update: {},
    create: {
      email: 'admin@gabinet.pl',
      name: 'Administrator',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      loyaltyTier: 'GOLD',
      loyaltyPoints: 9999
    }
  });

  console.log(`Created admin user: ${admin.email}`);

  // Create test user
  const userPasswordHash = await bcrypt.hash('User2024!', 10);
  const testUser = await prisma.user.upsert({
    where: { email: 'user@gabinet.pl' },
    update: {},
    create: {
      email: 'user@gabinet.pl',
      name: 'Jan Kowalski',
      passwordHash: userPasswordHash,
      role: 'USER',
      loyaltyTier: 'BRONZE',
      loyaltyPoints: 0
    }
  });

  console.log(`Created test user: ${testUser.email}`);

  // Create some initial services
  const servicesData = [
    {
      name: 'Konsultacja Kosmetologiczna',
      slug: 'konsultacja-kosmetologiczna',
      description: 'Szczegółowa diagnoza skóry wraz ze spersonalizowanym planem pielęgnacyjnym.',
      price: 150.00,
      durationMinutes: 45,
      category: 'Konsultacje'
    },
    {
      name: 'Oczyszczanie Wodorowe',
      slug: 'oczyszczanie-wodorowe',
      description: 'Zabieg wieloetapowego oczyszczania skóry z wykorzystaniem aktywnego wodoru.',
      price: 250.00,
      durationMinutes: 60,
      category: 'Zabiegi na twarz'
    }
  ];

  for (const s of servicesData) {
    await prisma.service.upsert({
      where: { slug: s.slug },
      update: {},
      create: s
    });
  }

  console.log('Created initial services.');

  // Create loyalty rewards
  const rewardsData = [
    {
      name: 'Zniżka 50 PLN',
      description: 'Kupon rabatowy 50 PLN na dowolny zabieg.',
      pointsCost: 500,
      discountType: 'AMOUNT' as const,
      discountValue: 50
    },
    {
      name: 'Darmowa Konsultacja',
      description: 'Bezpłatna konsultacja kontrolna.',
      pointsCost: 700,
      discountType: 'OTHER' as const
    }
  ];

  for (const r of rewardsData) {
    const existing = await prisma.loyaltyReward.findFirst({ where: { name: r.name }});
    if (!existing) {
      await prisma.loyaltyReward.create({ data: r });
    }
  }

  console.log('Created initial loyalty rewards.');

  // Seed SkinTypeAdvice (5 records, one per skin type)
  for (const skinType of Object.values(SkinType)) {
    await prisma.skinTypeAdvice.upsert({
      where: { skinType },
      update: {},
      create: { skinType, content: '' },
    });
  }
  console.log('Seeded 5 SkinTypeAdvice records');

  // Seed forum categories
  const forumCategories = [
    { name: 'Pielęgnacja stóp', slug: 'pielegnacja-stop', description: 'Porady i pytania dotyczące pielęgnacji stóp', order: 1 },
    { name: 'Pielęgnacja twarzy', slug: 'pielegnacja-twarzy', description: 'Pielęgnacja skóry twarzy, nawilżanie, oczyszczanie', order: 2 },
    { name: 'Dłonie & Paznokcie', slug: 'dlonie-paznokcie', description: 'Manicure, pielęgnacja dłoni i paznokci', order: 3 },
    { name: 'Pytania do kosmetologa', slug: 'pytania-do-kosmetologa', description: 'Zadaj pytanie kosmetologowi', order: 4 },
    { name: 'Moje patenty na skórę', slug: 'moje-patenty-na-skore', description: 'Podziel się swoimi sprawdzonymi metodami pielęgnacyjnymi', order: 5 },
  ];

  for (const cat of forumCategories) {
    await prisma.forumCategory.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }
  console.log('Seeded 5 forum categories.');

  // Seed SkinWeatherRules
  const skinWeatherRules = [
    {
      label: 'Intensywne promieniowanie UV ☀️',
      recommendation:
        'Indeks UV wynosi 6 lub więcej — to poziom wysoki. Nałóż SPF 50+ minimum 20 minut przed wyjściem i odnawiaj co 2 godziny. Stosuj rano serum z witaminą C, by chronić skórę przed wolnymi rodnikami. Unikaj słońca między 11:00 a 15:00.',
      sortOrder: 1,
      conditions: ['uv'],
      thresholds: { uv: { min: 6, max: 20 } },
    },
    {
      label: 'Upalny dzień 🌡️',
      recommendation:
        'Przy temperaturze powyżej 28°C skóra produkuje więcej sebum i łatwiej się odwadnia. Wybieraj lekkie, bezolejowe nawilżacze o konsystencji żelu. Unikaj ciężkich kremów i podkładów. Pij co najmniej 2 litry wody. Chłodna mgiełka tonizująca w ciągu dnia przyniesie ulgę i odświeżenie.',
      sortOrder: 2,
      conditions: ['temperature'],
      thresholds: { temperature: { min: 28, max: 60 } },
    },
    {
      label: 'Gorące i słoneczne — podwójna ochrona 🔆',
      recommendation:
        'Połączenie wysokiej temperatury i silnego UV to poważne wyzwanie dla skóry. Obowiązkowy SPF 50+, kapelusz i okulary. Stosuj lekkie produkty — ciężkie blokują pory i mogą powodować krostki. Wieczorem użyj maseczki kojącej z aloesem lub niacynamidem, by uśmierzyć podrażnienia.',
      sortOrder: 3,
      conditions: ['temperature', 'uv'],
      thresholds: { temperature: { min: 25, max: 60 }, uv: { min: 6, max: 20 } },
    },
    {
      label: 'Wysoka wilgotność powietrza 💧',
      recommendation:
        'Wilgotność powyżej 70% ułatwia nawilżenie skóry, ale może nasilać łojotok i powstawanie zaskórników. Sięgnij po lekkie serum z kwasem hialuronowym zamiast bogatego kremu. Osoby z cerą tłustą i mieszaną powinny używać toneru matującego. Unikaj ciężkich olejów w pielęgnacji.',
      sortOrder: 4,
      conditions: ['humidity'],
      thresholds: { humidity: { min: 70, max: 100 } },
    },
    {
      label: 'Suche powietrze — intensywne nawilżanie 🏜️',
      recommendation:
        'Niska wilgotność poniżej 30% wysusza skórę i niszczy barierę ochronną. Stosuj warstową pielęgnację: najpierw hydrolat lub tonik nawilżający, potem serum z hialuronianem sodu i na koniec krem uszczelniający z ceramidami. Rozważ użycie nawilżacza powietrza w domu lub biurze.',
      sortOrder: 5,
      conditions: ['humidity'],
      thresholds: { humidity: { min: 0, max: 30 } },
    },
    {
      label: 'Deszczowy dzień 🌧️',
      recommendation:
        'Woda deszczowa może zawierać zanieczyszczenia i mieć kwaśne pH. Po powrocie do domu umyj twarz łagodnym żelem oczyszczającym. Stosuj lżejszą pielęgnację — powietrze jest wilgotne. Nie zapominaj o kremie ochronnym — niskie UV nie oznacza braku promieniowania UVA przez chmury.',
      sortOrder: 6,
      conditions: ['precip'],
      thresholds: { precip: { min: 60, max: 100 } },
    },
    {
      label: 'Zimny dzień — ochrona bariery skórnej 🥶',
      recommendation:
        'Mróz i temperatura poniżej 5°C niszczą barierę lipidową skóry i mogą powodować rumień oraz przesuszenie. Nałóż bogaty krem ochronny z ceramidami lub waseliną przed wyjściem. Unikaj długich gorących kąpieli. Zadbaj o dłonie — stosuj krem ochronny za każdym razem po myciu.',
      sortOrder: 7,
      conditions: ['temperature'],
      thresholds: { temperature: { min: -30, max: 5 } },
    },
    {
      label: 'Chłodny jesienny dzień 🍂',
      recommendation:
        'Jesienne warunki — chłód i zachmurzenie — osłabiają barierę ochronną skóry. Czas na bogatszą pielęgnację: krem z ceramidami, peptydami i kwasem hialuronowym. To dobry moment na intensywne maseczki odżywcze i nocne zabiegi regeneracyjne. Nie zapominaj o SPF — UVA przenika przez chmury.',
      sortOrder: 8,
      conditions: ['temperature', 'cloud'],
      thresholds: { temperature: { min: 5, max: 15 }, cloud: { min: 60, max: 100 } },
    },
    {
      label: 'Zanieczyszczone powietrze — smog 🏭',
      recommendation:
        'Wysokie AQI oznacza smog i cząsteczki PM2.5, które niszczą kolagen i powodują stres oksydacyjny skóry. Stosuj rano produkty z antyoksydantami: niacynamid, witamina C i E tworzą tarczę ochronną. Wieczorem dokładnie oczyść skórę dwuetapowo, by usunąć zanieczyszczenia osadzone w porach.',
      sortOrder: 9,
      conditions: ['aqi'],
      thresholds: { aqi: { min: 80, max: 300 } },
    },
    {
      label: 'Idealne warunki dla skóry 🌤️',
      recommendation:
        'Łagodna temperatura, umiarkowana wilgotność i niskie UV to idealne warunki dla skóry. Wystarczy SPF 30 i Twoja standardowa rutyna pielęgnacyjna. To dobry dzień na zabiegi rozjaśniające, peelingi chemiczne lub nowe produkty — skóra jest mniej reaktywna w komfortowych warunkach.',
      sortOrder: 10,
      conditions: ['temperature', 'humidity', 'uv'],
      thresholds: {
        temperature: { min: 15, max: 27 },
        humidity: { min: 35, max: 65 },
        uv: { min: 1, max: 5 },
      },
    },
  ];

  for (const rule of skinWeatherRules) {
    const existing = await prisma.skinWeatherRule.findFirst({ where: { label: rule.label } });
    if (!existing) {
      await prisma.skinWeatherRule.create({ data: rule as any });
    }
  }
  console.log('Seeded 10 SkinWeatherRules.');

  console.log('Seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
