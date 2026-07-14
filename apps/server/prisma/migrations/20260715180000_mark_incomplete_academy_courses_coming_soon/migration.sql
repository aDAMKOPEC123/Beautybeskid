UPDATE "Course"
SET "isComingSoon" = TRUE
WHERE "status" = 'PUBLISHED' AND "isFree" = FALSE AND "price" <= 0;
