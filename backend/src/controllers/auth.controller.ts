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
      
      // Also return token for clients that use Authorization header (e.g. admin panel).
      res.json({ user: result.user, token: result.token });
    } catch (error: any) {
      const status = error.message === 'Admin access required' ? 403 : 401;
      res.status(status).json({ error: error.message });
    }
  };
}
