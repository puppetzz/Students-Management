/*
  Warnings:

  - You are about to drop the column `permanentAddress` on the `students` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "students" DROP COLUMN "permanentAddress",
ADD COLUMN     "permanent_address" TEXT;
