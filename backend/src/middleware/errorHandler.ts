import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

/**
 * Central error handler — always returns a consistent JSON envelope.
 * Never leaks stack traces in production.
 */
export function errorHandler(
  err: ApiError,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const statusCode = err.statusCode ?? 500;
  const isDev = env.NODE_ENV === 'development';

  res.status(statusCode).json({
    success: false,
    error: err.code ?? 'INTERNAL_ERROR',
    message: err.message ?? 'An unexpected error occurred',
    ...(isDev && err.stack ? { stack: err.stack } : {}),
  });
}

/** Convenience factory for typed API errors */
export function createError(
  message: string,
  statusCode: number,
  code?: string
): ApiError {
  const err = new Error(message) as ApiError;
  err.statusCode = statusCode;
  err.code = code;
  return err;
}
