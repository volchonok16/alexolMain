import { Request, Response } from 'express';
import { MailInboundSyncService } from '../services/mailInboundSync.service.js';
import { TelegramNewsDmService } from '../services/telegramNewsDm.service.js';
import { normalizeOrgRoles } from '../utils/orgRoles.js';

function parseOptionalString(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (value === null) return '';
  return undefined;
}

function parseOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === 1 || value === '1') return true;
  if (value === 'false' || value === 0 || value === '0') return false;
  return undefined;
}

export class MailInboundSyncController {
  private service = new MailInboundSyncService();
  private newsDm = new TelegramNewsDmService();

  ensure = async (req: Request, res: Response) => {
    try {
      const username = String(req.body?.username || '').trim();
      const full_name = String(req.body?.full_name || '').trim();
      const password =
        typeof req.body?.password === 'string' && req.body.password
          ? req.body.password
          : undefined;
      const is_admin = Boolean(req.body?.is_admin);
      const is_active = req.body?.is_active === undefined ? true : Boolean(req.body.is_active);
      const phone =
        typeof req.body?.phone === 'string' ? req.body.phone : req.body?.phone === null ? null : undefined;
      const job_title =
        typeof req.body?.job_title === 'string'
          ? req.body.job_title
          : req.body?.job_title === null
            ? null
            : undefined;
      const telegram = parseOptionalString(req.body?.telegram);
      const org_roles =
        req.body?.org_roles === undefined ? undefined : normalizeOrgRoles(req.body.org_roles);
      const direction = parseOptionalString(req.body?.direction);
      const is_technical = parseOptionalBoolean(req.body?.is_technical);
      const avatar_url =
        typeof req.body?.avatar_url === 'string' && req.body.avatar_url
          ? req.body.avatar_url
          : undefined;
      const avatar_base64 =
        typeof req.body?.avatar_base64 === 'string' && req.body.avatar_base64
          ? req.body.avatar_base64
          : undefined;
      const avatar_content_type =
        typeof req.body?.avatar_content_type === 'string'
          ? req.body.avatar_content_type
          : undefined;

      if (!username || !full_name) {
        return res.status(400).json({ error: 'username and full_name are required' });
      }

      const user = await this.service.ensureFromMail({
        username,
        full_name,
        password,
        is_admin,
        is_active,
        phone,
        job_title,
        telegram,
        org_roles,
        direction,
        is_technical,
        avatar_url,
        avatar_base64,
        avatar_content_type,
      });
      res.json({ user });
    } catch (error: any) {
      const msg = error.message || 'Sync failed';
      const status =
        msg.includes('required') || msg.includes('exists') || msg.includes('last admin')
          ? 400
          : 500;
      res.status(status).json({ error: msg });
    }
  };

  get = async (req: Request, res: Response) => {
    try {
      const username = String(req.params.username || '').trim();
      if (!username) return res.status(400).json({ error: 'username is required' });
      const user = await this.service.getByLogin(username);
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Sync failed' });
    }
  };

  remove = async (req: Request, res: Response) => {
    try {
      const username = String(req.params.username || '').trim();
      if (!username) return res.status(400).json({ error: 'username is required' });
      const result = await this.service.deleteFromMail(username);
      res.json(result);
    } catch (error: any) {
      const msg = error.message || 'Sync failed';
      const status = msg.includes('last admin') ? 400 : 500;
      res.status(status).json({ error: msg });
    }
  };

  notifyDm = async (req: Request, res: Response) => {
    try {
      const telegram = typeof req.body?.telegram === 'string' ? req.body.telegram : '';
      const text = typeof req.body?.text === 'string' ? req.body.text : '';
      if (!telegram.trim() || !text.trim()) {
        return res.status(400).json({ error: 'telegram and text are required' });
      }
      const result = await this.newsDm.sendDirectMessage(telegram, text);
      if (!result.ok) {
        return res.status(502).json({ error: result.error });
      }
      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Telegram send failed' });
    }
  };
}
