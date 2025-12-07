/*
  Warnings:

  - You are about to drop the `class_subjects` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `training_program_id` to the `classes` table without a default value. This is not possible if the table is not empty.

*/

-- Step 1: Create training programs based on unique subject combinations from class_subjects
INSERT INTO "training_programs" ("name", "description", "created_at", "updated_at")
SELECT DISTINCT
    'Chương trình ' || c."name" AS name,
    'Chương trình đào tạo tự động tạo từ lớp ' || c."name" AS description,
    NOW() AS created_at,
    NOW() AS updated_at
FROM "classes" c
WHERE EXISTS (SELECT 1 FROM "public"."class_subjects" cs WHERE cs."class_id" = c."id");

-- Step 2: Add training_program_id column with nullable first
ALTER TABLE "classes" ADD COLUMN "training_program_id" INTEGER;

-- Step 3: Link classes to their corresponding training programs
UPDATE "classes" c
SET "training_program_id" = tp."id"
FROM "training_programs" tp
WHERE tp."name" = 'Chương trình ' || c."name";

-- Step 4: Create training_program_subjects from class_subjects
INSERT INTO "training_program_subjects" ("training_program_id", "subject_id")
SELECT DISTINCT tp."id", cs."subject_id"
FROM "public"."class_subjects" cs
JOIN "classes" c ON c."id" = cs."class_id"
JOIN "training_programs" tp ON tp."name" = 'Chương trình ' || c."name"
ON CONFLICT DO NOTHING;

-- Step 5: For classes without class_subjects, create a default training program
INSERT INTO "training_programs" ("name", "description", "created_at", "updated_at")
SELECT 'Chương trình mặc định', 'Chương trình đào tạo mặc định', NOW(), NOW()
WHERE EXISTS (SELECT 1 FROM "classes" WHERE "training_program_id" IS NULL)
AND NOT EXISTS (SELECT 1 FROM "training_programs" WHERE "name" = 'Chương trình mặc định');

UPDATE "classes"
SET "training_program_id" = (SELECT "id" FROM "training_programs" WHERE "name" = 'Chương trình mặc định' LIMIT 1)
WHERE "training_program_id" IS NULL;

-- Step 6: Make training_program_id NOT NULL
ALTER TABLE "classes" ALTER COLUMN "training_program_id" SET NOT NULL;

-- DropForeignKey
ALTER TABLE "public"."class_subjects" DROP CONSTRAINT "class_subjects_class_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."class_subjects" DROP CONSTRAINT "class_subjects_subject_id_fkey";

-- DropTable
DROP TABLE "public"."class_subjects";

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_training_program_id_fkey" FOREIGN KEY ("training_program_id") REFERENCES "training_programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
