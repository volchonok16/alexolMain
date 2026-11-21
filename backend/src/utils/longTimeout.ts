import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env.js';

export const HTTP_TIMEOUT_MS = Math.max(config.openrouter.timeoutMs + 20_000, 200_000);

export const applyLongTimeout = (req: Request, res: Response, next: NextFunction) => {
  req.setTimeout(HTTP_TIMEOUT_MS);
  res.setTimeout(HTTP_TIMEOUT_MS);
  next();
};

export const applyServerTimeouts = (server: { timeout: number; keepAliveTimeout: number; headersTimeout: number }) => {
  server.timeout = HTTP_TIMEOUT_MS;
  server.keepAliveTimeout = HTTP_TIMEOUT_MS + 5_000;
  server.headersTimeout = HTTP_TIMEOUT_MS + 10_000;
};
