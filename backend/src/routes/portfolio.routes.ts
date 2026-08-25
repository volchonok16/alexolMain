import { Router } from 'express';
import { PortfolioController } from '../controllers/portfolio.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

export const portfolioRouter = Router();
const controller = new PortfolioController();

/**
 * @swagger
 * /api/portfolio:
 *   post:
 *     summary: Создать работу в портфолио
 *     tags: [Portfolio]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - category
 *               - titleRu
 *               - titleEn
 *               - descriptionRu
 *               - descriptionEn
 *               - resultRu
 *               - resultEn
 *               - image
 *             properties:
 *               category:
 *                 type: string
 *                 example: Crypto
 *               titleRu:
 *                 type: string
 *               titleEn:
 *                 type: string
 *               descriptionRu:
 *                 type: string
 *               descriptionEn:
 *                 type: string
 *               resultRu:
 *                 type: string
 *               resultEn:
 *                 type: string
 *               link:
 *                 type: string
 *               sortOrder:
 *                 type: integer
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Работа создана
 */
portfolioRouter.post('/', authenticate, requireAdmin, upload.single('image'), controller.create);

/**
 * @swagger
 * /api/portfolio:
 *   get:
 *     summary: Получить все работы портфолио
 *     tags: [Portfolio]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *     responses:
 *       200:
 *         description: Список работ
 */
portfolioRouter.get('/', controller.getAll);

/**
 * @swagger
 * /api/portfolio/{id}:
 *   get:
 *     summary: Получить работу по ID
 *     tags: [Portfolio]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Работа найдена
 */
portfolioRouter.get('/:id', controller.getById);

/**
 * @swagger
 * /api/portfolio/{id}:
 *   put:
 *     summary: Обновить работу в портфолио
 *     tags: [Portfolio]
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
 *               category:
 *                 type: string
 *               titleRu:
 *                 type: string
 *               titleEn:
 *                 type: string
 *               descriptionRu:
 *                 type: string
 *               descriptionEn:
 *                 type: string
 *               resultRu:
 *                 type: string
 *               resultEn:
 *                 type: string
 *               link:
 *                 type: string
 *               sortOrder:
 *                 type: integer
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Работа обновлена
 */
portfolioRouter.put('/:id', authenticate, requireAdmin, upload.single('image'), controller.update);

/**
 * @swagger
 * /api/portfolio/{id}:
 *   delete:
 *     summary: Удалить работу из портфолио
 *     tags: [Portfolio]
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
 *         description: Работа удалена
 */
portfolioRouter.delete('/:id', authenticate, requireAdmin, controller.delete);
