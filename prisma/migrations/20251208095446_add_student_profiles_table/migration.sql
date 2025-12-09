-- CreateEnum
CREATE TYPE "EGender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- DropIndex
DROP INDEX "public"."students_first_name_last_name_idx";


-- CreateTable
CREATE TABLE "student_profiles" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "gender" "EGender" NOT NULL,
    "day_of_birth" TIMESTAMP(3) NOT NULL,
    "place_of_birth" TEXT,
    "ethnicity" TEXT,
    "religion" TEXT,
    "vneid_issued_date" TIMESTAMP(3),
    "vneid_issued_place" TEXT,
    "hometown" TEXT,
    "permanent_address" TEXT,
    "education_level" TEXT,
    "youth_union_admission_date" TIMESTAMP(3),
    "communist_party_admission_date" TIMESTAMP(3),
    "phone_number" TEXT,
    "email" TEXT,
    "father_name" TEXT,
    "father_occupation" TEXT,
    "father_address" TEXT,
    "father_day_of_birth" TIMESTAMP(3),
    "mother_name" TEXT,
    "mother_occupation" TEXT,
    "mother_address" TEXT,
    "mother_day_of_birth" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_profiles_pkey" PRIMARY KEY ("id")
);

-- Migrate existing data from students table to student_profiles table
-- Create a profile record for every student
INSERT INTO "student_profiles" (
    "student_id",
    "gender", 
    "day_of_birth", 
    "hometown", 
    "permanent_address"
)
SELECT 
    s."id" as student_id,
    'MALE'::"EGender" as gender, -- Default gender since it's required but doesn't exist in students table
    COALESCE(s."day_of_birth", CURRENT_TIMESTAMP) as day_of_birth, -- Use current timestamp as default if null
    s."hometown",
    s."permanent_address"
FROM "students" s;

-- AlterTable
ALTER TABLE "students" DROP COLUMN "day_of_birth",
DROP COLUMN "hometown",
DROP COLUMN "permanent_address";

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_student_id_key" ON "student_profiles"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_email_key" ON "student_profiles"("email");

-- CreateIndex
CREATE INDEX "student_profiles_student_id_idx" ON "student_profiles"("student_id");

-- CreateIndex
CREATE INDEX "students_last_name_first_name_idx" ON "students"("last_name", "first_name");

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;



