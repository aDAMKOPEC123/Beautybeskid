import { randomUUID } from 'node:crypto';
import { BodyPart, Prisma, PrismaClient, QuizNodeType } from '@prisma/client';

const prisma = new PrismaClient();

const QUIZ_TITLE = 'Dobierz zabieg — oprawa oka i depilacja twarzy';

const SERVICE_SLUGS = {
  hennaLiftSet: 'henna-brwi-lifting-rzes-set',
  lamiSet: 'lamiset-laminacja-brwi-lifting-rzes',
  browLaminationColor: 'laminacja-brwi-z-koloryzacja',
  browLamination: 'laminacja-brwi',
  lashLiftColor: 'lifting-rzes-z-koloryzacja',
  powderHenna: 'henna-pudrowa',
  tint: 'farbka',
  browShape: 'regulacja-brwi-woskpseta',
  faceWax: 'depilacja-twarzy-woskiem',
  upperLipWax: 'depilacja-wasika',
} as const;

type ServiceKey = keyof typeof SERVICE_SLUGS;
type ResultDefinition = {
  id: string;
  service?: ServiceKey;
  suggestions?: ServiceKey[];
  title: string;
  subtitle: string;
  description: string;
  extras?: string;
};

const question = (id: string, text: string, options: Array<[string, string]>) => ({
  id,
  type: QuizNodeType.QUESTION,
  data: {
    question: text,
    options: options.map(([key, label]) => ({ key, label })),
  },
});

const results: ResultDefinition[] = [
  {
    id: 'r-consultation',
    title: 'Najpierw krótka konsultacja',
    subtitle: 'Bezpieczny wybór jest ważniejszy niż szybka rezerwacja',
    description:
      'Przy podrażnieniu, stanie zapalnym, infekcji, świeżym zabiegu medycznym lub terapii zwiększającej wrażliwość skóry nie wybieraj zabiegu w ciemno.',
    extras: 'Napisz do nas na czacie lub zadzwoń — sprawdzimy, kiedy i jaki zabieg będzie dla Ciebie odpowiedni.',
  },
  {
    id: 'r-lamiset',
    service: 'lamiSet',
    suggestions: ['hennaLiftSet', 'browLaminationColor'],
    title: 'LamiSet — kompletna oprawa oka',
    subtitle: 'Laminacja brwi + lifting rzęs podczas jednej wizyty',
    description:
      'Najlepszy wybór, jeśli zależy Ci jednocześnie na uporządkowanych, łatwych do układania brwiach i naturalnie uniesionych rzęsach.',
    extras: 'SET oszczędza czas i daje spójny efekt całej oprawy oka.',
  },
  {
    id: 'r-henna-lift-set',
    service: 'hennaLiftSet',
    suggestions: ['lamiSet', 'lashLiftColor'],
    title: 'Henna brwi & Lifting rzęs SET',
    subtitle: 'Kolor i kształt brwi + otwarte spojrzenie',
    description:
      'Dobry wybór, jeśli nie potrzebujesz laminowania brwi, ale chcesz podczas jednej wizyty podkreślić ich kolor i unieść naturalne rzęsy.',
    extras: 'Kompleksowy efekt w 60 minut — bez codziennej zalotki i mocnego makijażu brwi.',
  },
  {
    id: 'r-brow-lamination-color',
    service: 'browLaminationColor',
    suggestions: ['lamiSet', 'browLamination'],
    title: 'Laminacja brwi z koloryzacją',
    subtitle: 'Ułożenie, optyczne zagęszczenie i dopasowany kolor',
    description:
      'Dla brwi niesfornych, rosnących w różnych kierunkach lub wymagających jednocześnie uporządkowania i wyraźniejszego koloru.',
    extras: 'Jeśli chcesz od razu podkreślić także rzęsy, wybierz LamiSet.',
  },
  {
    id: 'r-brow-lamination',
    service: 'browLamination',
    suggestions: ['lamiSet', 'browLaminationColor'],
    title: 'Laminacja brwi',
    subtitle: 'Naturalne ułożenie bez dodatkowej koloryzacji',
    description:
      'Dla osób z wystarczająco wyraźnym kolorem brwi, które chcą przede wszystkim ujarzmić włoski i ułatwić sobie codzienną stylizację.',
    extras: 'LamiSet rozszerza ten efekt o lifting i koloryzację rzęs podczas tej samej wizyty.',
  },
  {
    id: 'r-powder-henna',
    service: 'powderHenna',
    suggestions: ['hennaLiftSet', 'tint'],
    title: 'Henna pudrowa',
    subtitle: 'Wyraźniejszy kształt i efekt delikatnego wypełnienia',
    description:
      'Polecana, gdy zależy Ci na podkreśleniu zarówno włosków, jak i skóry oraz optycznym uzupełnieniu drobnych ubytków w brwiach.',
    extras: 'Jeśli chcesz połączyć stylizację brwi z uniesieniem rzęs, rozważ Henna brwi & Lifting rzęs SET.',
  },
  {
    id: 'r-tint',
    service: 'tint',
    suggestions: ['hennaLiftSet', 'powderHenna'],
    title: 'Farbka do brwi',
    subtitle: 'Naturalna koloryzacja włosków',
    description:
      'Najlepsza, gdy chcesz subtelnie pogłębić kolor brwi bez mocniejszego efektu makijażu na skórze.',
    extras: 'Przy kompleksowej oprawie oka korzystniejszym wyborem będzie Henna brwi & Lifting rzęs SET.',
  },
  {
    id: 'r-brow-shape',
    service: 'browShape',
    suggestions: ['powderHenna', 'tint'],
    title: 'Regulacja brwi woskiem lub pęsetą',
    subtitle: 'Czysty, dopasowany do twarzy kształt',
    description:
      'Wybierz ten zabieg, jeśli kolor i ułożenie brwi Ci odpowiadają, a potrzebujesz jedynie precyzyjnego usunięcia zbędnych włosków.',
  },
  {
    id: 'r-lash-lift',
    service: 'lashLiftColor',
    suggestions: ['lamiSet', 'hennaLiftSet'],
    title: 'Lifting rzęs z koloryzacją',
    subtitle: 'Uniesione, podkręcone i przyciemnione naturalne rzęsy',
    description:
      'Dla osób, które chcą otworzyć spojrzenie i ograniczyć używanie zalotki oraz tuszu, bez stylizacji brwi.',
    extras: 'Jeśli brwi również wymagają stylizacji, SET pozwoli wykonać całą oprawę oka podczas jednej wizyty.',
  },
  {
    id: 'r-face-wax',
    service: 'faceWax',
    suggestions: ['upperLipWax'],
    title: 'Depilacja twarzy woskiem',
    subtitle: 'Gładkość kilku obszarów podczas jednej wizyty',
    description:
      'Najlepszy wybór, gdy niechciane włoski dotyczą więcej niż jednej okolicy twarzy lub zależy Ci na kompleksowym efekcie.',
  },
  {
    id: 'r-upper-lip-wax',
    service: 'upperLipWax',
    suggestions: ['faceWax'],
    title: 'Depilacja wąsika',
    subtitle: 'Szybki zabieg na jedną, konkretną okolicę',
    description:
      'Wybierz ten wariant, jeśli zależy Ci wyłącznie na usunięciu włosków nad górną wargą.',
    extras: 'Jeżeli włoski przeszkadzają Ci także w innych okolicach, depilacja całej twarzy będzie bardziej kompleksowa.',
  },
];

const questions = [
  question('q-safety', 'Czy w okolicy zabiegu masz teraz podrażnienie, stan zapalny, infekcję, świeży zabieg medyczny albo stosujesz terapię zwiększającą wrażliwość skóry?', [
    ['A', 'Nie, nic takiego nie występuje'],
    ['B', 'Tak lub nie mam pewności'],
  ]),
  question('q-goal', 'Na jakim efekcie zależy Ci najbardziej?', [
    ['A', 'Kompleksowa stylizacja brwi i rzęs podczas jednej wizyty'],
    ['B', 'Stylizacja samych brwi'],
    ['C', 'Uniesienie i podkreślenie samych rzęs'],
    ['D', 'Usunięcie niechcianych włosków z twarzy'],
  ]),
  question('q-set-kind', 'Jakiego efektu oczekujesz od brwi w zestawie z liftingiem rzęs?', [
    ['A', 'Chcę ujarzmić i trwale ułożyć niesforne włoski'],
    ['B', 'Chcę głównie podkreślić kolor i kształt brwi'],
  ]),
  question('q-brow-need', 'Czego najbardziej potrzebują Twoje brwi?', [
    ['A', 'Ułożenia i ujarzmienia włosków'],
    ['B', 'Wyraźniejszego kształtu i wypełnienia także na skórze'],
    ['C', 'Naturalnego przyciemnienia samych włosków'],
    ['D', 'Tylko regulacji i nadania kształtu'],
  ]),
  question('q-lamination-color', 'Czy poza ułożeniem brwi chcesz również pogłębić ich kolor?', [
    ['A', 'Tak, zależy mi na pełniejszym efekcie'],
    ['B', 'Nie, mój naturalny kolor mi odpowiada'],
  ]),
  question('q-wax-area', 'Jakiego obszaru dotyczy niechciane owłosienie?', [
    ['A', 'Kilku okolic twarzy'],
    ['B', 'Tylko okolicy nad górną wargą'],
  ]),
];

const edges: Array<[string, string, string]> = [
  ['start', 'q-safety', 'default'],
  ['q-safety', 'q-goal', 'A'],
  ['q-safety', 'r-consultation', 'B'],
  ['q-goal', 'q-set-kind', 'A'],
  ['q-goal', 'q-brow-need', 'B'],
  ['q-goal', 'r-lash-lift', 'C'],
  ['q-goal', 'q-wax-area', 'D'],
  ['q-set-kind', 'r-lamiset', 'A'],
  ['q-set-kind', 'r-henna-lift-set', 'B'],
  ['q-brow-need', 'q-lamination-color', 'A'],
  ['q-brow-need', 'r-powder-henna', 'B'],
  ['q-brow-need', 'r-tint', 'C'],
  ['q-brow-need', 'r-brow-shape', 'D'],
  ['q-lamination-color', 'r-brow-lamination-color', 'A'],
  ['q-lamination-color', 'r-brow-lamination', 'B'],
  ['q-wax-area', 'r-face-wax', 'A'],
  ['q-wax-area', 'r-upper-lip-wax', 'B'],
];

async function main() {
  const services = await prisma.service.findMany({
    where: { slug: { in: Object.values(SERVICE_SLUGS) }, isActive: true },
    select: { id: true, slug: true, name: true },
  });

  const bySlug = new Map(services.map((service) => [service.slug, service]));
  const missing = Object.values(SERVICE_SLUGS).filter((slug) => !bySlug.has(slug));
  if (missing.length > 0) {
    throw new Error(`Brakuje aktywnych zabiegów wymaganych przez quiz: ${missing.join(', ')}`);
  }

  const serviceId = (key: ServiceKey) => bySlug.get(SERVICE_SLUGS[key])!.id;
  const representedAsMain = new Set(results.flatMap((result) => (result.service ? [result.service] : [])));
  const unrepresented = (Object.keys(SERVICE_SLUGS) as ServiceKey[]).filter((key) => !representedAsMain.has(key));
  if (unrepresented.length > 0) {
    throw new Error(`Nie wszystkie zabiegi mają własny wynik: ${unrepresented.join(', ')}`);
  }

  const quiz = await prisma.quiz.findFirst({ where: { title: QUIZ_TITLE, bodyPart: BodyPart.TWARZ } });
  const quizId = quiz?.id ?? randomUUID();
  const nodeId = new Map<string, string>();
  for (const id of ['start', ...questions.map((item) => item.id), ...results.map((item) => item.id)]) {
    nodeId.set(id, randomUUID());
  }

  const allNodes: Prisma.QuizNodeCreateManyInput[] = [
    {
      id: nodeId.get('start')!,
      quizId,
      type: QuizNodeType.START,
      positionX: 40,
      positionY: 360,
      data: {},
    },
    ...questions.map((item, index) => ({
      id: nodeId.get(item.id)!,
      quizId,
      type: item.type,
      positionX: 280 + index * 300,
      positionY: 260,
      data: item.data,
    })),
    ...results.map((item, index) => ({
      id: nodeId.get(item.id)!,
      quizId,
      type: QuizNodeType.RESULT,
      positionX: 850 + (index % 4) * 300,
      positionY: 20 + Math.floor(index / 4) * 220,
      data: {
        title: item.title,
        subtitle: item.subtitle,
        description: item.description,
        extras: item.extras ?? '',
      },
    })),
  ];

  await prisma.$transaction(async (tx) => {
    if (quiz) {
      await tx.quiz.update({ where: { id: quizId }, data: { isActive: true } });
      await tx.quizEdge.deleteMany({ where: { quizId } });
      await tx.quizNode.deleteMany({ where: { quizId } });
    } else {
      await tx.quiz.create({
        data: { id: quizId, title: QUIZ_TITLE, bodyPart: BodyPart.TWARZ, isActive: true },
      });
    }

    await tx.quizNode.createMany({ data: allNodes });
    await tx.quizEdge.createMany({
      data: edges.map(([source, target, sourceHandle]) => ({
        id: randomUUID(),
        quizId,
        sourceNodeId: nodeId.get(source)!,
        targetNodeId: nodeId.get(target)!,
        sourceHandle,
      })),
    });

    const resultRows = results.map((result) => ({
      id: randomUUID(),
      nodeId: nodeId.get(result.id)!,
      mainServiceId: result.service ? serviceId(result.service) : null,
      definition: result,
    }));
    await tx.quizResult.createMany({
      data: resultRows.map(({ id, nodeId: resultNodeId, mainServiceId }) => ({
        id,
        nodeId: resultNodeId,
        mainServiceId,
      })),
    });
    await tx.quizResultSuggestion.createMany({
      data: resultRows.flatMap(({ id: resultId, definition }) =>
        (definition.suggestions ?? []).map((key, order) => ({
          id: randomUUID(),
          resultId,
          serviceId: serviceId(key),
          order,
        })),
      ),
    });

    // An empty active quiz would force clients to choose a broken quiz first.
    const emptyFaceQuizzes = await tx.quiz.findMany({
      where: { bodyPart: BodyPart.TWARZ, isActive: true, id: { not: quizId }, nodes: { none: {} } },
      select: { id: true },
    });
    if (emptyFaceQuizzes.length > 0) {
      await tx.quiz.updateMany({
        where: { id: { in: emptyFaceQuizzes.map((item) => item.id) } },
        data: { isActive: false },
      });
    }
  }, { timeout: 30_000 });

  console.log(`Quiz gotowy: ${QUIZ_TITLE}`);
  console.log(`Pytania: ${questions.length}, wyniki: ${results.length}, połączenia: ${edges.length}`);
  console.log(`Zabiegi z własnym wynikiem: ${representedAsMain.size}/${Object.keys(SERVICE_SLUGS).length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
