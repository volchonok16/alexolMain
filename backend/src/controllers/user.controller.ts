import { Response } from 'express';
import { UserService } from '../services/user.service.js';
import { AuthRequest } from '../types/index.js';
import { createUserSchema, updateUserSchema } from '../validators/user.validator.js';

export class UserController {
  private service = new UserService();

  getMe = async (req: AuthRequest, res: Response) => {
    try {
      const user = await this.service.findById(req.userId!);
      res.json({ data: user });
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  };

  getAll = async (req: AuthRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const result = await this.service.findAll(page, limit);
      res.json({ data: result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  create = async (req: AuthRequest, res: Response) => {
    try {
      const data = createUserSchema.parse(req.body);
      const user = await this.service.create({ ...data, photo: req.file });
      res.status(201).json({ data: user });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  update = async (req: AuthRequest, res: Response) => {
    try {
      const data = updateUserSchema.parse(req.body);
      const user = await this.service.update(req.params.id, { ...data, photo: req.file });
      res.json({ data: user });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  delete = async (req: AuthRequest, res: Response) => {
    try {
      await this.service.delete(req.params.id, req.userId!);
      res.json({ message: 'User deleted' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };
}
