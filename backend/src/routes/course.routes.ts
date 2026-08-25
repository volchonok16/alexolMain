import { Router } from 'express';
import { CourseController } from '../controllers/course.controller.js';
import { authenticate } from '../middleware/auth.js';
import { uploadVideo } from '../middleware/upload.js';

export const courseRouter = Router();
const controller = new CourseController();

/**
 * @swagger
 * /api/courses:
 *   post:
 *     summary: Создать курс
 *     tags: [Courses]
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
 *               - topic
 *               - description
 *               - video
 *             properties:
 *               title:
 *                 type: string
 *               topic:
 *                 type: string
 *               description:
 *                 type: string
 *               video:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Курс создан
 */
courseRouter.post('/', authenticate, uploadVideo.single('video'), controller.create);

/**
 * @swagger
 * /api/courses:
 *   get:
 *     summary: Получить все курсы
 *     tags: [Courses]
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
 *           default: 50
 *     responses:
 *       200:
 *         description: Список курсов
 */
courseRouter.get('/', controller.getAll);

/**
 * @swagger
 * /api/courses/{id}:
 *   get:
 *     summary: Получить курс по ID
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Курс найден
 */
courseRouter.get('/:id', controller.getById);

/**
 * @swagger
 * /api/courses/{id}:
 *   put:
 *     summary: Обновить курс
 *     tags: [Courses]
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
 *               topic:
 *                 type: string
 *               description:
 *                 type: string
 *               video:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Курс обновлён
 */
courseRouter.put('/:id', authenticate, uploadVideo.single('video'), controller.update);

/**
 * @swagger
 * /api/courses/{id}:
 *   delete:
 *     summary: Удалить курс
 *     tags: [Courses]
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
 *         description: Курс удалён
 */
courseRouter.delete('/:id', authenticate, controller.delete);
