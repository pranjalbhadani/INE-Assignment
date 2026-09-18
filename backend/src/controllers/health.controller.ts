import type { Request, Response } from 'express';
import { checkDbConnection } from '../config/db';
import { env } from '../config/env';

export async function healthCheck(_req: Request, res: Response): Promise<void> {
  try {
    await checkDbConnection();
    res.json({
      success: true,
      status: 'ok',
      timestamp: new Date().toISOString(),
      env: env.NODE_ENV,
      db: 'connected',
    });
  } catch {
    res.status(503).json({
      success: false,
      status: 'degraded',
      timestamp: new Date().toISOString(),
      db: 'unreachable',
    });
  }
}
