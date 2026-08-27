import { Request, Response } from 'express';
import { MailInboundSyncService } from '../services/mailInboundSync.service.js';

export class MailInboundSyncController {
  private service = new MailInboundSyncService();

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

      if (!username || !full_name) {
        return res.status(400).json({ error: 'username and full_name are required' });
      }
      if (!is_active) {
        // Soft-disable in mail → keep admin user but demote isn't enough; skip create
        // Still upsert profile without forcing active flag (admin panel has no is_active).
      }

      const user = await this.service.ensureFromMail({
        username,
        full_name,
        password,
        is_admin,
        is_active,
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
}
