-- AlterTable
ALTER TABLE "subjects" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "subjects_is_deleted_idx" ON "subjects"("is_deleted");
