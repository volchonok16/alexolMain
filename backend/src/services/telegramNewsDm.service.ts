import { config } from '../config/env.js';

export function normalizeTelegramUsername(raw: string): string | null {
  let value = raw.trim();
  if (!value) return null;
  value = value.replace(/^https?:\/\/(t\.me|telegram\.me)\//i, '');
  value = value.replace(/^t\.me\//i, '');
  value = value.replace(/^@/, '');
  value = value.split(/[/?#]/)[0] || '';
  if (!/^[A-Za-z0-9_]{5,32}$/.test(value)) return null;
  return `@${value}`;
}

export class TelegramNewsDmService {
  private token() {
    return config.telegramNewsBotToken;
  }

  async getBotUsername(): Promise<string | null> {
    const token = this.token();
    if (!token) return null;
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const data = (await res.json()) as { ok?: boolean; result?: { username?: string } };
      return data?.result?.username || null;
    } catch {
      return null;
    }
  }

  async sendDirectMessage(
    telegram: string,
    text: string
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const chatId = normalizeTelegramUsername(telegram);
    if (!chatId) {
      return { ok: false, error: 'Некорректный Telegram в профиле. Свяжитесь с администратором.' };
    }

    const token = this.token();
    if (!token) {
      return { ok: false, error: 'Бот новостей не настроен. Свяжитесь с администратором.' };
    }

    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text }),
      });
      const payload = (await res.json().catch(() => null)) as
        | { ok?: boolean; description?: string }
        | null;

      if (res.ok && payload?.ok) return { ok: true };

      console.warn('[telegram-news-dm] send failed', {
        chatId,
        status: res.status,
        description: payload?.description,
      });

      const bot = await this.getBotUsername();
      const botHint = bot ? `@${bot}` : 'новостей';
      return {
        ok: false,
        error: `Не удалось отправить пароль в Telegram. Напишите /start боту ${botHint} и повторите попытку, либо свяжитесь с администратором.`,
      };
    } catch (error) {
      console.warn('[telegram-news-dm] request error', error);
      return {
        ok: false,
        error: 'Не удалось отправить пароль в Telegram. Свяжитесь с администратором.',
      };
    }
  }
}
