CREATE TABLE "QaBotSettings" (
    "id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL DEFAULT '',
    "maxChars" INTEGER NOT NULL DEFAULT 1000,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QaBotSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QaConversation" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'api',
    "mode" TEXT NOT NULL DEFAULT 'ai',
    "lastPreview" TEXT NOT NULL DEFAULT '',
    "unread" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QaConversation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "QaConversation_sessionId_key" ON "QaConversation"("sessionId");
CREATE INDEX "QaConversation_updatedAt_idx" ON "QaConversation"("updatedAt");
CREATE INDEX "QaConversation_unread_idx" ON "QaConversation"("unread");

CREATE TABLE "QaMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "author" TEXT NOT NULL DEFAULT 'user',
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QaMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "QaMessage_conversationId_createdAt_idx" ON "QaMessage"("conversationId", "createdAt");

ALTER TABLE "QaMessage" ADD CONSTRAINT "QaMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "QaConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
