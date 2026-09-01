import { prisma } from '../config/database.js';
import { historySince } from '../utils/qaText.js';

export type QaMessageCreate = {
  role: string;
  author: string;
  content: string;
};

export class QaRepository {
  getSettings() {
    return prisma.qaBotSettings.findUnique({ where: { id: 'default' } });
  }

  upsertSettings(prompt: string, maxChars: number) {
    return prisma.qaBotSettings.upsert({
      where: { id: 'default' },
      create: { id: 'default', prompt, maxChars },
      update: { prompt, maxChars },
    });
  }

  findConversationById(id: string) {
    return prisma.qaConversation.findFirst({
      where: { id, updatedAt: { gte: historySince() } },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
  }

  findConversationBySession(sessionId: string) {
    return prisma.qaConversation.findFirst({
      where: { sessionId, updatedAt: { gte: historySince() } },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
  }

  findAnyBySession(sessionId: string) {
    return prisma.qaConversation.findUnique({
      where: { sessionId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
  }

  deleteById(id: string) {
    return prisma.qaConversation.delete({ where: { id } });
  }

  createConversation(data: { sessionId: string; source: string; lastPreview: string }) {
    return prisma.qaConversation.create({
      data: {
        sessionId: data.sessionId,
        source: data.source,
        lastPreview: data.lastPreview,
        unread: true,
        mode: 'ai',
      },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
  }

  async addMessage(conversationId: string, message: QaMessageCreate, extra?: { lastPreview?: string; unread?: boolean }) {
    const [created] = await prisma.$transaction([
      prisma.qaMessage.create({
        data: {
          conversationId,
          role: message.role,
          author: message.author,
          content: message.content,
        },
      }),
      prisma.qaConversation.update({
        where: { id: conversationId },
        data: {
          ...(extra?.lastPreview !== undefined ? { lastPreview: extra.lastPreview } : {}),
          ...(extra?.unread !== undefined ? { unread: extra.unread } : {}),
        },
      }),
    ]);
    return created;
  }

  setMode(id: string, mode: string) {
    return prisma.qaConversation.update({
      where: { id },
      data: { mode },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
  }

  markRead(id: string) {
    return prisma.qaConversation.update({
      where: { id },
      data: { unread: false },
    });
  }

  listConversations(page: number, limit: number) {
    const since = historySince();
    return prisma.$transaction([
      prisma.qaConversation.findMany({
        where: { updatedAt: { gte: since } },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { messages: true } } },
      }),
      prisma.qaConversation.count({ where: { updatedAt: { gte: since } } }),
    ]);
  }

  deleteExpired() {
    return prisma.qaConversation.deleteMany({
      where: { updatedAt: { lt: historySince() } },
    });
  }
}
