import { Router } from 'express';
import { MailInboundSyncController } from '../controllers/mailInboundSync.controller.js';
import { requireMailSyncKey } from '../middleware/mailSyncAuth.js';

export const mailSyncRouter = Router();
const controller = new MailInboundSyncController();

/** mail.alexol.io → admin user upsert (no reverse mail sync) */
mailSyncRouter.post('/users/ensure', requireMailSyncKey, controller.ensure);
mailSyncRouter.get('/users/:username', requireMailSyncKey, controller.get);
mailSyncRouter.delete('/users/:username', requireMailSyncKey, controller.remove);
mailSyncRouter.post('/telegram-dm', requireMailSyncKey, controller.notifyDm);
