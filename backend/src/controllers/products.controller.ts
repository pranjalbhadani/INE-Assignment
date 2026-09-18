import type { Request, Response, NextFunction } from 'express';
import { searchStoreProducts } from '../services/product.service';

export async function searchProducts(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const q = String(req.query['q'] ?? '').trim();
    const results = await searchStoreProducts(q);
    res.json({ success: true, data: results, count: results.length });
  } catch (err) {
    next(err);
  }
}
