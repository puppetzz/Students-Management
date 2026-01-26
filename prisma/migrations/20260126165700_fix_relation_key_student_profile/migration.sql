-- DropForeignKey
ALTER TABLE "public"."student_profiles" DROP CONSTRAINT "student_profiles_id_fkey";

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
