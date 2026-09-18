import type { Request, Response, NextFunction } from 'express';
import { getPool } from '../config/db';

export async function listAlerts(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const pool = await getPool();
    const result = await pool.query(`
      SELECT a.*, tp.name as product_name, tp.brand as product_brand, tp.store_product_id
      FROM alerts a
      JOIN tracked_products tp ON a.tracked_product_id = tp.id
      ORDER BY a.created_at DESC
      LIMIT 100
    `);
    res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (err) {
    next(err);
  }
}
