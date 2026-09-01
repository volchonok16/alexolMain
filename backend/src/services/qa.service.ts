import { randomUUID } from 'crypto';
import { QaRepository } from '../repositories/qa.repository.js';
import { OpenRouterQaService, OpenRouterUnavailableError } from './openrouterQa.service.js';
import {
  DEFAULT_OPERATOR_PROMPT,
  QA_DEFAULT_CHARS,
  buildSystemPrompt,
  fitToMaxChars,
  historySince,
  isStockOperatorPrompt,
  previewText,
} from '../utils/qaText.js';

type ConversationRecord = NonNullable<Awaited<ReturnType<QaRepository['findConversationById']>>>;

const toPublicConversation = (conversation: ConversationRecord) => {
  const last = conversation.messages[conversation.messages.length - 1];
  return {
    id: conversation.id,
    sessionId: conversation.sessionId,
    source: conversation.source,
    mode: conversation.mode,
    lastPreview: conversation.lastPreview,
    unread: conversation.unread,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    waitingOperator: conversation.mode === 'human' && last?.role === 'user',
    messages: conversation.messages.map(message => ({
      id: message.id,
      role: message.role,
      author: message.author,
      content: message.content,
      createdAt: message.createdAt,
    })),
  };
};

export class QaService {
  private repository = new QaRepository();
  private openrouter = new OpenRouterQaService();
  private cleaning = false;

  async getSettings() {
    const settings = await this.repository.getSettings();
    const stored =
      !settings || isStockOperatorPrompt(settings.prompt)
        ? await this.repository.upsertSettings(DEFAULT_OPERATOR_PROMPT, settings?.maxChars ?? QA_DEFAULT_CHARS)
        : settings;
    return { ...stored, defaultPrompt: DEFAULT_OPERATOR_PROMPT };
  }

  saveSettings(prompt: string, maxChars: number) {
    return this.repository.upsertSettings(prompt.trim() || DEFAULT_OPERATOR_PROMPT, maxChars).then(stored => ({
      ...stored,
      defaultPrompt: DEFAULT_OPERATOR_PROMPT,
    }));
  }

  async listConversations(page: number, limit: number) {
    await this.cleanupExpired();
    const [rows, total] = await this.repository.listConversations(page, limit);
    return {
      data: rows.map(row => ({
        id: row.id,
        sessionId: row.sessionId,
        source: row.source,
        mode: row.mode,
        lastPreview: row.lastPreview,
        unread: row.unread,
        messageCount: row._count.messages,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })),
      total,
    };
  }

  async getConversation(id: string, { markRead = false } = {}) {
    const conversation = await this.repository.findConversationById(id);
    if (!conversation) throw new Error('Диалог не найден или уже истёк');
    if (markRead && conversation.unread) {
      await this.repository.markRead(id);
      conversation.unread = false;
    }
    return toPublicConversation(conversation);
  }

  async getSession(sessionId: string) {
    const conversation = await this.repository.findConversationBySession(sessionId);
    if (!conversation) throw new Error('Диалог не найден или уже истёк');
    return toPublicConversation(conversation);
  }

  async chat(input: { sessionId?: string; message: string; source: 'api' | 'admin' }) {
    await this.cleanupExpired();
    const settings = await this.getSettings();
    const conversation = await this.resolveConversation(input.sessionId, input.source, input.message);

    const last = conversation.messages[conversation.messages.length - 1];
    const duplicatePending =
      last &&
      last.role === 'user' &&
      last.content.trim() === input.message.trim() &&
      Date.now() - last.createdAt.getTime() < 2 * 60 * 1000;

    if (!duplicatePending) {
      await this.repository.addMessage(
        conversation.id,
        { role: 'user', author: 'user', content: input.message.trim() },
        { lastPreview: previewText(input.message), unread: true }
      );
    }

    const withUser = await this.repository.findConversationById(conversation.id);
    if (!withUser) throw new Error('Диалог не найден');

    if (withUser.mode === 'human') {
      return toPublicConversation(withUser);
    }

    const reply = await this.generateReply(withUser, settings.prompt, settings.maxChars);
    await this.repository.addMessage(withUser.id, {
      role: 'assistant',
      author: 'ai',
      content: reply,
    });

    const updated = await this.repository.findConversationById(withUser.id);
    if (!updated) throw new Error('Диалог не найден');
    return toPublicConversation(updated);
  }

  async setMode(id: string, mode: 'ai' | 'human') {
    const conversation = await this.repository.findConversationById(id);
    if (!conversation) throw new Error('Диалог не найден или уже истёк');

    const updated = await this.repository.setMode(id, mode);
    if (mode === 'human') {
      return toPublicConversation(updated);
    }

    const last = updated.messages[updated.messages.length - 1];
    if (!last || last.role !== 'user') {
      return toPublicConversation(updated);
    }

    const settings = await this.getSettings();
    const reply = await this.generateReply(updated, settings.prompt, settings.maxChars);
    await this.repository.addMessage(updated.id, { role: 'assistant', author: 'ai', content: reply });
    const withReply = await this.repository.findConversationById(updated.id);
    if (!withReply) throw new Error('Диалог не найден');
    return toPublicConversation(withReply);
  }

  async adminReply(id: string, content: string) {
    const conversation = await this.repository.findConversationById(id);
    if (!conversation) throw new Error('Диалог не найден или уже истёк');
    if (conversation.mode !== 'human') {
      await this.repository.setMode(id, 'human');
    }

    const text = fitToMaxChars(content.trim(), 8000);
    await this.repository.addMessage(
      id,
      { role: 'assistant', author: 'admin', content: text },
      { unread: false }
    );
    const updated = await this.repository.findConversationById(id);
    if (!updated) throw new Error('Диалог не найден');
    return toPublicConversation(updated);
  }

  async cleanupExpired() {
    if (this.cleaning) return;
    this.cleaning = true;
    try {
      const result = await this.repository.deleteExpired();
      if (result.count > 0) {
        console.log(`[qa] Removed ${result.count} conversations older than 3 days`);
      }
    } catch (error) {
      console.warn('[qa] Cleanup failed:', error);
    } finally {
      this.cleaning = false;
    }
  }

  private async resolveConversation(sessionId: string | undefined, source: 'api' | 'admin', message: string) {
    if (sessionId) {
      const existing = await this.repository.findAnyBySession(sessionId);
      if (existing && existing.updatedAt >= historySince()) {
        return existing;
      }
      if (existing) {
        await this.repository.deleteById(existing.id);
      }
    }

    return this.repository.createConversation({
      sessionId: sessionId || randomUUID(),
      source,
      lastPreview: previewText(message),
    });
  }

  private async generateReply(conversation: ConversationRecord, prompt: string, maxChars: number) {
    const history = conversation.messages.map(message => ({
      role: (message.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: message.content,
    }));

    try {
      return await this.openrouter.complete(
        [{ role: 'system', content: buildSystemPrompt(prompt, maxChars) }, ...history],
        maxChars
      );
    } catch (error) {
      if (error instanceof OpenRouterUnavailableError) throw error;
      throw new OpenRouterUnavailableError(error instanceof Error ? error.message : 'Ошибка OpenRouter');
    }
  }
}

export const qaService = new QaService();
