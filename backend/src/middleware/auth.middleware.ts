import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

/**
 * Validates the X-Cron-Secret header for cron-only endpoints.
 * The secret is NEVER forwarded to the client or logged in full.
 */
export function cronAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const provided = req.headers['x-cron-secret'];
  if (!provided || provided !== env.CRON_SECRET) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Missing or invalid X-Cron-Secret header',
    });
    return;
  }
  next();
}
