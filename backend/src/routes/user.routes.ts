import { Router } from 'express';
import { UserController } from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.js';

export const userRouter = Router();
const controller = new UserController();

userRouter.get('/me', authenticate, controller.getMe);
userRouter.get('/', authenticate, controller.getAll);
