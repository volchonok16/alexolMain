import { Router } from 'express';
import { UserController } from '../controllers/user.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

export const userRouter = Router();
const controller = new UserController();
const adminOnly = [authenticate, requireAdmin];

userRouter.get('/me', ...adminOnly, controller.getMe);
userRouter.get('/', ...adminOnly, controller.getAll);
userRouter.post('/', ...adminOnly, upload.single('photo'), controller.create);
userRouter.put('/:id', ...adminOnly, upload.single('photo'), controller.update);
userRouter.delete('/:id', ...adminOnly, controller.delete);
