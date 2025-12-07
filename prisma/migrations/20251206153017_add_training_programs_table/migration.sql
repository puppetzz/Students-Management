-- CreateTable
CREATE TABLE "training_program_subjects" (
    "training_program_id" INTEGER NOT NULL,
    "subject_id" INTEGER NOT NULL,

    CONSTRAINT "training_program_subjects_pkey" PRIMARY KEY ("training_program_id","subject_id")
);

-- CreateTable
CREATE TABLE "training_programs" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_programs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "training_program_subjects_training_program_id_idx" ON "training_program_subjects"("training_program_id");

-- CreateIndex
CREATE INDEX "training_program_subjects_subject_id_idx" ON "training_program_subjects"("subject_id");

-- CreateIndex
CREATE INDEX "training_programs_name_idx" ON "training_programs"("name");

-- AddForeignKey
ALTER TABLE "training_program_subjects" ADD CONSTRAINT "training_program_subjects_training_program_id_fkey" FOREIGN KEY ("training_program_id") REFERENCES "training_programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_program_subjects" ADD CONSTRAINT "training_program_subjects_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
