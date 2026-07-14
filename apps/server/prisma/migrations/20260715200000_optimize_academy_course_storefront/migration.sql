UPDATE "Lesson"
SET "title" = 'Sprawdź wiedzę'
WHERE "id" IN (
  SELECT lesson."id"
  FROM "Lesson" AS lesson
  INNER JOIN "CourseModule" AS module ON module."id" = lesson."moduleId"
  INNER JOIN "Course" AS course ON course."id" = module."courseId"
  WHERE course."slug" = 'rozszerzony-kurs-stylizacji-brwii'
    AND lesson."type" = 'QUIZ'
);

UPDATE "Course"
SET "title" = 'Rozszerzony kurs stylizacji brwi',
    "slug" = 'rozszerzony-kurs-stylizacji-brwi',
    "description" = 'Opanujesz praktyczną i teoretyczną wiedzę o laminacji brwi, hennie i profesjonalnej stylizacji.',
    "thumbnailUrl" = '/course-images/stylizacja-brwi.webp',
    "estimatedMinutes" = 0,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'rozszerzony-kurs-stylizacji-brwii';
