ALTER TABLE "LangHomework" ADD COLUMN "lessonId" TEXT;

CREATE INDEX "LangHomework_lessonId_idx" ON "LangHomework"("lessonId");

ALTER TABLE "LangHomework" ADD CONSTRAINT "LangHomework_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "LangLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
