import { Request } from 'express';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  message?: string;
  error?: string;
}
