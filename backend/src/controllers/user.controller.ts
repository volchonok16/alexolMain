import { Response } from 'express';
import { UserService } from '../services/user.service.js';
import { AuthRequest } from '../types/index.js';

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
      const users = await this.service.findAll();
      res.json({ data: users });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
}
