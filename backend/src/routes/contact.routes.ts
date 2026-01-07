import { Router } from 'express';
import { ContactController } from '../controllers/contact.controller.js';

export const contactRouter = Router();
const controller = new ContactController();

/**
 * @swagger
 * /api/contact:
 *   post:
 *     summary: Отправить форму обратной связи
 *     tags: [Contact]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - description
 *             properties:
 *               name:
 *                 type: string
 *               company:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               budget:
 *                 type: string
 *               description:
 *                 type: string
 *               pageCount:
 *                 type: number
 *               calculatedPrice:
 *                 type: number
 *     responses:
 *       200:
 *         description: Сообщение отправлено
 */
contactRouter.post('/', controller.send);
