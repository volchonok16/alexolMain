import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env.js';

export function requireMailSyncKey(req: Request, res: Response, next: NextFunction) {
  const expected = config.mail.syncSecret;
  if (!expected) {
    return res.status(503).json({ error: 'Mail sync is not configured (MAIL_SYNC_SECRET)' });
  }

  const provided = req.header('X-Mail-Sync-Key') || '';
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: 'Invalid sync key' });
  }
  return next();
}
