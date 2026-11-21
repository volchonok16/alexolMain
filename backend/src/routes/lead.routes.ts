import { Router } from 'express';
import { LeadController } from '../controllers/lead.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

export const leadRouter = Router();
const controller = new LeadController();

leadRouter.get('/', authenticate, requireAdmin, controller.getAll);
leadRouter.get('/:id', authenticate, requireAdmin, controller.getById);
leadRouter.patch('/:id', authenticate, requireAdmin, controller.update);
leadRouter.delete('/:id', authenticate, requireAdmin, controller.delete);
