import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { loginSchema } from '../validators/auth.validator.js';

export class AuthController {
  private service = new AuthService();

  login = async (req: Request, res: Response) => {
    try {
      const data = loginSchema.parse(req.body);
      const result = await this.service.login(data);
      
      res.cookie('token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      
      res.json({ user: result.user });
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  };
}
