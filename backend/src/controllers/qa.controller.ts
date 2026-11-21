import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { qaService } from '../services/qa.service.js';
import { AuthRequest } from '../types/index.js';
import { OpenRouterUnavailableError } from '../services/openrouterQa.service.js';
import { qaChatSchema, qaModeSchema, qaReplySchema, qaSettingsSchema } from '../validators/qa.validator.js';

const chatHits = new Map<string, number[]>();

const clientIp = (req: Request) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
};

const allowChat = (ip: string, max = 40, windowMs = 10 * 60 * 1000) => {
  const now = Date.now();
  const recent = (chatHits.get(ip) || []).filter(ts => now - ts < windowMs);
  if (recent.length >= max) {
    chatHits.set(ip, recent);
    return false;
  }
  recent.push(now);
  chatHits.set(ip, recent);
  return true;
};

const fail = (res: Response, error: unknown, fallbackStatus = 400) => {
  if (error instanceof ZodError) {
    return res.status(400).json({ error: error.errors[0]?.message || 'Некорректные данные' });
  }
  if (error instanceof OpenRouterUnavailableError) {
    return res.status(504).json({ error: error.message });
  }
  const message = error instanceof Error ? error.message : 'Ошибка запроса';
  const notFound = /не найден|истёк/i.test(message);
  return res.status(notFound ? 404 : fallbackStatus).json({ error: message });
};

export class QaController {
  getSettings = async (_req: AuthRequest, res: Response) => {
    try {
      const data = await qaService.getSettings();
      res.json({ data });
    } catch (error) {
      fail(res, error, 500);
    }
  };

  saveSettings = async (req: AuthRequest, res: Response) => {
    try {
      const body = qaSettingsSchema.parse(req.body);
      const data = await qaService.saveSettings(body.prompt, body.maxChars);
      res.json({ data });
    } catch (error) {
      fail(res, error);
    }
  };

  listConversations = async (req: AuthRequest, res: Response) => {
    try {
      const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
      const limit = Math.max(1, Math.min(50, parseInt(String(req.query.limit || '20'), 10) || 20));
      const result = await qaService.listConversations(page, limit);
      res.json({ data: result.data, total: result.total, page, limit });
    } catch (error) {
      fail(res, error, 500);
    }
  };

  getConversation = async (req: AuthRequest, res: Response) => {
    try {
      const data = await qaService.getConversation(req.params.id, { markRead: true });
      res.json({ data });
    } catch (error) {
      fail(res, error);
    }
  };

  getSession = async (req: AuthRequest, res: Response) => {
    try {
      const data = await qaService.getSession(req.params.sessionId);
      res.json({ data });
    } catch (error) {
      fail(res, error);
    }
  };

  chat = async (req: AuthRequest, res: Response) => {
    try {
      if (!allowChat(clientIp(req))) {
        return res.status(429).json({ error: 'Слишком много вопросов. Подождите немного.' });
      }
      const body = qaChatSchema.parse(req.body);
      const data = await qaService.chat({
        sessionId: body.sessionId,
        message: body.message,
        source: 'api',
      });
      res.json({ data });
    } catch (error) {
      fail(res, error);
    }
  };

  adminChat = async (req: AuthRequest, res: Response) => {
    try {
      const body = qaChatSchema.parse(req.body);
      const data = await qaService.chat({
        sessionId: body.sessionId,
        message: body.message,
        source: 'admin',
      });
      res.json({ data });
    } catch (error) {
      fail(res, error);
    }
  };

  setMode = async (req: AuthRequest, res: Response) => {
    try {
      const body = qaModeSchema.parse(req.body);
      const data = await qaService.setMode(req.params.id, body.mode);
      res.json({ data });
    } catch (error) {
      fail(res, error);
    }
  };

  reply = async (req: AuthRequest, res: Response) => {
    try {
      const body = qaReplySchema.parse(req.body);
      const data = await qaService.adminReply(req.params.id, body.content);
      res.json({ data });
    } catch (error) {
      fail(res, error);
    }
  };
}
