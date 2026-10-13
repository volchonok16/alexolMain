import { NextFunction, Request, Response } from 'express';
import { config } from '../config/env.js';
import { LangError, LangIdentity, upsertLearner, validateTelegramInitData } from '../services/langTutor.service.js';

export type LangRequest = Request & {
  langUser?: Awaited<ReturnType<typeof upsertLearner>>;
};

function decodeHeader(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) return trimmed;
  return Buffer.from(trimmed, 'base64').toString('utf8');
}

function devIdentity(req: Request): LangIdentity | null {
  if (config.nodeEnv === 'production') return null;
  const raw = req.headers['x-lang-dev-user'];
  if (typeof raw !== 'string' || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(decodeHeader(raw)) as { id?: string; firstName?: string; role?: string };
    if (!parsed.id || !parsed.firstName) return null;
    return {
      telegramId: String(parsed.id).slice(0, 32),
      firstName: parsed.firstName.slice(0, 80),
    };
  } catch {
    return null;
  }
}

export async function requireLangUser(req: LangRequest, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization || '';
    const initData = header.startsWith('tma ') ? header.slice(4).trim() : '';
    const identity = initData
      ? validateTelegramInitData(initData, config.speakBotToken)
      : devIdentity(req);
    if (!identity) {
      return res.status(401).json({ error: 'Открой карточки из Telegram' });
    }
    req.langUser = await upsertLearner(identity);
    next();
  } catch (error) {
    const status = error instanceof LangError ? error.status : 401;
    const message = error instanceof Error ? error.message : 'Не удалось проверить Telegram';
    res.status(status).json({ error: message });
  }
}
