CREATE TABLE "LangLearner" (
    "telegramId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "username" TEXT,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LangLearner_pkey" PRIMARY KEY ("telegramId")
);

CREATE TABLE "LangAssignedWord" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "lang" TEXT NOT NULL DEFAULT 'en',
    "front" TEXT NOT NULL,
    "back" TEXT NOT NULL,
    "image" TEXT,
    "example" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LangAssignedWord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LangHomework" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "answer" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LangHomework_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LangAssignedWord_learnerId_idx" ON "LangAssignedWord"("learnerId");
CREATE INDEX "LangHomework_learnerId_idx" ON "LangHomework"("learnerId");

ALTER TABLE "LangAssignedWord" ADD CONSTRAINT "LangAssignedWord_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "LangLearner"("telegramId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LangHomework" ADD CONSTRAINT "LangHomework_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "LangLearner"("telegramId") ON DELETE CASCADE ON UPDATE CASCADE;
