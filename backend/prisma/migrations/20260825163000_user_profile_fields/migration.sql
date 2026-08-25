-- AlterTable
ALTER TABLE "User" ADD COLUMN "photo" TEXT,
ADD COLUMN "birthDate" DATE;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'user';
