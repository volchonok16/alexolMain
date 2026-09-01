import { Router } from 'express';
import { QaController } from '../controllers/qa.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { applyLongTimeout } from '../utils/longTimeout.js';

export const qaRouter = Router();
const controller = new QaController();

/**
 * @swagger
 * /api/qa/settings:
 *   get:
 *     summary: Настройки Q&A бота
 *     tags: [QA]
 *     security:
 *       - bearerAuth: []
 */
qaRouter.get('/settings', authenticate, requireAdmin, controller.getSettings);

/**
 * @swagger
 * /api/qa/settings:
 *   put:
 *     summary: Сохранить промпт и лимит символов
 *     tags: [QA]
 *     security:
 *       - bearerAuth: []
 */
qaRouter.put('/settings', authenticate, requireAdmin, controller.saveSettings);

/**
 * @swagger
 * /api/qa/conversations:
 *   get:
 *     summary: История запросов за 3 дня
 *     tags: [QA]
 *     security:
 *       - bearerAuth: []
 */
qaRouter.get('/conversations', authenticate, requireAdmin, controller.listConversations);

qaRouter.get('/conversations/:id', authenticate, requireAdmin, controller.getConversation);

qaRouter.patch(
  '/conversations/:id/mode',
  authenticate,
  requireAdmin,
  applyLongTimeout,
  controller.setMode
);

qaRouter.post(
  '/conversations/:id/reply',
  authenticate,
  requireAdmin,
  applyLongTimeout,
  controller.reply
);

qaRouter.post('/admin/chat', authenticate, requireAdmin, applyLongTimeout, controller.adminChat);

/**
 * @swagger
 * /api/qa/chat:
 *   post:
 *     summary: Вопрос клиента к Q&A боту
 *     tags: [QA]
 */
qaRouter.post('/chat', applyLongTimeout, controller.chat);

qaRouter.get('/session/:sessionId', applyLongTimeout, controller.getSession);
