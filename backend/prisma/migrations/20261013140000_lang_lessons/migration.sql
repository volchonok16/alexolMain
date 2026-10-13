ALTER TABLE "LangLearner" ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "LangLesson" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LangLesson_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LangLesson_learnerId_idx" ON "LangLesson"("learnerId");

ALTER TABLE "LangLesson" ADD CONSTRAINT "LangLesson_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "LangLearner"("telegramId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LangAssignedWord" ADD COLUMN "lessonId" TEXT;
ALTER TABLE "LangAssignedWord" ADD COLUMN "stage" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "LangAssignedWord" ADD COLUMN "known" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "LangAssignedWord" ADD COLUMN "unknown" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "LangAssignedWord_lessonId_idx" ON "LangAssignedWord"("lessonId");

ALTER TABLE "LangAssignedWord" ADD CONSTRAINT "LangAssignedWord_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "LangLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
