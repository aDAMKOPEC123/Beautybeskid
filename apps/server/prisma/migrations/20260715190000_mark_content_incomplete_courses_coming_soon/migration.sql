UPDATE "Course" AS course
SET "isComingSoon" = true,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE course."status" = 'PUBLISHED'
  AND course."isActive" = true
  AND course."isComingSoon" = false
  AND NOT EXISTS (
    SELECT 1
    FROM "CourseModule" AS module
    INNER JOIN "Lesson" AS lesson ON lesson."moduleId" = module."id"
    WHERE module."courseId" = course."id"
      AND (
        (
          lesson."type" = 'VIDEO'
          AND NULLIF(BTRIM(lesson."videoId"), '') IS NOT NULL
          AND lesson."estimatedMinutes" > 0
          AND NULLIF(BTRIM(lesson."transcriptHtml"), '') IS NOT NULL
        )
        OR (
          lesson."type" = 'TEXT'
          AND LENGTH(BTRIM(REGEXP_REPLACE(COALESCE(lesson."contentHtml", ''), '<[^>]*>', '', 'g'))) >= 50
          AND lesson."estimatedMinutes" > 0
        )
      )
  );
