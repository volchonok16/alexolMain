import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

export const authRouter = Router();
const controller = new AuthController();

authRouter.post('/login', controller.login);

/** Admin → mail.alexol.io handoff ticket */
authRouter.post('/sso/mail-ticket', authenticate, requireAdmin, controller.createMailTicket);

/** Mail → admin.alexol.io ticket exchange */
authRouter.post('/sso/exchange', controller.exchangeSso);
