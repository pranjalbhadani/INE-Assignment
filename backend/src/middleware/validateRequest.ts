import type { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

type Target = 'body' | 'query' | 'params';

/**
 * Returns Express middleware that validates req[target] against a Zod schema.
 * On failure, responds immediately with 400 + detailed field errors.
 */
export function validateRequest<T>(schema: ZodSchema<T>, target: Target = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      const errors = formatZodError(result.error);
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: errors,
      });
      return;
    }
    // Replace raw input with validated/coerced output
    (req as Record<string, unknown>)[target] = result.data;
    next();
  };
}

function formatZodError(error: ZodError): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.') || '_root';
    if (!result[path]) result[path] = [];
    result[path].push(issue.message);
  }
  return result;
}
