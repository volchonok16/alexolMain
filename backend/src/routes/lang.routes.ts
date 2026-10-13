import { Router } from 'express';
import { LangTutorController } from '../controllers/langTutor.controller.js';
import { requireLangUser } from '../middleware/langAuth.js';

export const langRouter = Router();
const controller = new LangTutorController();

langRouter.use(requireLangUser);
langRouter.get('/me', controller.me);
langRouter.get('/students', controller.students);
langRouter.get('/students/:telegramId', controller.student);
langRouter.patch('/students/:telegramId/admin', controller.setAdmin);
langRouter.patch('/students/:telegramId/tutor', controller.setTutor);
langRouter.post('/students/:telegramId/lessons', controller.createLesson);
langRouter.patch('/lessons/:id', controller.renameLesson);
langRouter.delete('/lessons/:id', controller.deleteLesson);
langRouter.post('/students/:telegramId/words', controller.createWord);
langRouter.patch('/words/:id/progress', controller.saveProgress);
langRouter.post('/students/:telegramId/progress/reset', controller.resetProgress);
langRouter.delete('/words/:id', controller.deleteWord);
langRouter.post('/students/:telegramId/homework', controller.createHomework);
langRouter.delete('/homework/:id', controller.deleteHomework);
langRouter.patch('/homework/:id', controller.saveAnswer);
langRouter.patch('/homework/:id/review', controller.reviewHomework);
