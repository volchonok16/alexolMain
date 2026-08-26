import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { loginSchema } from '../validators/auth.validator.js';
import { AuthRequest } from '../types/index.js';

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

      res.json({ user: result.user, token: result.token });
    } catch (error: any) {
      const status = error.message === 'Admin access required' ? 403 : 401;
      res.status(status).json({ error: error.message });
    }
  };

  createMailTicket = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const result = await this.service.createMailTicket(req.userId);
      res.json(result);
    } catch (error: any) {
      const msg = error.message || 'SSO failed';
      const status =
        msg.includes('not configured') ? 503 : msg.includes('Admin') ? 403 : 400;
      res.status(status).json({ error: msg });
    }
  };

  exchangeSso = async (req: Request, res: Response) => {
    try {
      const ticket = typeof req.body?.ticket === 'string' ? req.body.ticket.trim() : '';
      if (!ticket) {
        return res.status(400).json({ error: 'ticket is required' });
      }
      const result = await this.service.exchangeSsoTicket(ticket);

      res.cookie('token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({ user: result.user, token: result.token });
    } catch (error: any) {
      const msg = error.message || 'SSO failed';
      const status =
        msg.includes('not configured') ? 503 : msg.includes('Admin') ? 403 : 401;
      res.status(status).json({ error: msg });
    }
  };
}
