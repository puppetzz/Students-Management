-- AlterTable
ALTER TABLE "training_programs" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "training_programs_is_deleted_idx" ON "training_programs"("is_deleted");
