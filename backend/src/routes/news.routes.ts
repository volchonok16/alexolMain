import { Router } from 'express';
import { NewsController } from '../controllers/news.controller.js';
import { authenticate } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

export const newsRouter = Router();
const controller = new NewsController();

/**
 * @swagger
 * /api/news:
 *   post:
 *     summary: Создать новость
 *     tags: [News]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - text
 *               - photo
 *             properties:
 *               title:
 *                 type: string
 *               text:
 *                 type: string
 *               photo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Новость создана
 */
newsRouter.post('/', authenticate, upload.single('photo'), controller.create);

/**
 * @swagger
 * /api/news:
 *   get:
 *     summary: Получить все новости
 *     tags: [News]
 *     responses:
 *       200:
 *         description: Список новостей
 */
newsRouter.get('/', controller.getAll);

/**
 * @swagger
 * /api/news/{id}:
 *   get:
 *     summary: Получить новость по ID
 *     tags: [News]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Новость найдена
 */
newsRouter.get('/:id', controller.getById);

/**
 * @swagger
 * /api/news/{id}:
 *   put:
 *     summary: Обновить новость
 *     tags: [News]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               text:
 *                 type: string
 *               photo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Новость обновлена
 */
newsRouter.put('/:id', authenticate, upload.single('photo'), controller.update);

/**
 * @swagger
 * /api/news/{id}:
 *   delete:
 *     summary: Удалить новость
 *     tags: [News]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Новость удалена
 */
newsRouter.delete('/:id', authenticate, controller.delete);
