import { AcademyAudience, Difficulty, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Punkt startowy person na podstawie poziomu trudności.
 * SALON_OWNER celowo NIE jest tu przypisywany — to rola biznesowa, nie poziom
 * zaawansowania, więc musi zostać nadany ręcznie w panelu.
 */
const audiencesForDifficulty: Record<Difficulty, AcademyAudience[]> = {
  BEGINNER: [AcademyAudience.STARTER],
  INTERMEDIATE: [AcademyAudience.PRACTITIONER],
  ADVANCED: [AcademyAudience.PRACTITIONER],
};

const wiktoria = {
  slug: 'wiktoria-cwik',
  name: 'Wiktoria Ćwik',
  title: 'magister kosmetologii',
  credentials: ['mgr kosmetologii', '5 lat praktyki', 'kosmetologia i podologia'],
  shortBio:
    'Magister kosmetologii z pięcioletnią praktyką, specjalizacja kosmetologiczno-podologiczna. ' +
    'Prowadzi BeskidStudio pod Limanową. Uczy tego, co sama robi w gabinecie — od decyzji, nie od produktu.',
  fullBio:
    'Wiktoria Ćwik — magister kosmetologii, od pięciu lat przy fotelu. Prowadzi BeskidStudio pod Limanową, ' +
    'gdzie łączy kosmetologię z podologią: obszarem, który większość gabinetów omija, bo wymaga wiedzy, ' +
    'a nie samej techniki.\n\n' +
    'Uczy tak, jak pracuje — od decyzji, nie od produktu. Zanim pokaże, jak wykonać zabieg, tłumaczy, ' +
    'kiedy go nie wykonywać. Bo najdroższy błąd w gabinecie to nie nieporadny ruch dłoni. ' +
    'To dobrze wykonany zabieg na niewłaściwej skórze.\n\n' +
    'Drugą nogą stoi w marketingu beauty — w tym, jak mówić o swojej pracy, żeby trafiała do właściwych klientek.',
};

async function main() {
  // Zdjęcie bierzemy ze strony salonu, żeby nie wgrywać tego samego pliku dwa razy.
  const about = await prisma.aboutPage.findFirst({ select: { ownerPhoto: true } });

  const instructor = await prisma.academyInstructor.upsert({
    where: { slug: wiktoria.slug },
    // Nic nie nadpisujemy — teksty mogły zostać poprawione w panelu.
    // Brakujące zdjęcie uzupełniamy niżej, warunkowo.
    update: {},
    create: { ...wiktoria, photoUrl: about?.ownerPhoto ?? null, displayOrder: 0 },
  });

  if (!instructor.photoUrl && about?.ownerPhoto) {
    await prisma.academyInstructor.update({
      where: { id: instructor.id },
      data: { photoUrl: about.ownerPhoto },
    });
    console.log('  zdjęcie prowadzącej uzupełnione z AboutPage.ownerPhoto');
  }
  console.log(`Prowadząca: ${instructor.name} (${instructor.slug})`);

  // Kursy bez prowadzącego dostają Wiktorię — kursy już przypisane zostają nietknięte.
  const linked = await prisma.course.updateMany({
    where: { instructorId: null },
    data: { instructorId: instructor.id },
  });
  console.log(`Kursy powiązane z prowadzącą: ${linked.count}`);

  // Backfill person. Dotykamy wyłącznie kursów z pustą listą, więc ręczne
  // ustawienia z panelu przetrwają ponowne uruchomienie skryptu.
  const pending = await prisma.course.findMany({
    where: { audiences: { isEmpty: true } },
    select: { id: true, title: true, difficulty: true },
  });

  for (const course of pending) {
    await prisma.course.update({
      where: { id: course.id },
      data: { audiences: audiencesForDifficulty[course.difficulty] },
    });
    console.log(`  ${course.title} -> ${audiencesForDifficulty[course.difficulty].join(', ')}`);
  }
  console.log(`Kursy z uzupełnionymi personami: ${pending.length}`);

  const salonCourses = await prisma.course.count({
    where: { audiences: { has: AcademyAudience.SALON_OWNER } },
  });
  if (salonCourses === 0) {
    console.log(
      '\nUWAGA: żaden kurs nie ma persony SALON_OWNER.\n' +
        'Landing /dla-salonow będzie działał w trybie listy oczekujących, dopóki nie przypiszesz kursu w panelu.'
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
