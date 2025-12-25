-- AlterTable
ALTER TABLE "terms" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "terms_is_deleted_idx" ON "terms"("is_deleted");
