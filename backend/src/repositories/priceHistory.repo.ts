import { db } from '../config/db';

export interface PriceHistoryRow {
  id: string;
  tracked_product_id: string;
  scrape_attempt_id: string;
  price: string;
  mrp: string | null;
  currency: string;
  stock: number;
  stock_status: 'in_stock' | 'out_of_stock';
  seller: string | null;
  discount_pct: number | null;
  rating: string | null;
  recorded_at: string;
}

export const priceHistoryRepo = {
  async findByProduct(trackedProductId: string, limit = 100): Promise<PriceHistoryRow[]> {
    const pool = await db();
    const { rows } = await pool.query<PriceHistoryRow>(
      `SELECT * FROM price_history WHERE tracked_product_id = $1 ORDER BY recorded_at DESC LIMIT $2`,
      [trackedProductId, limit]
    );
    return rows;
  },
  async create(input: any, client?: any): Promise<PriceHistoryRow> {
    const runner = client ?? (await db());
    const { rows } = await runner.query(
      `INSERT INTO price_history
         (tracked_product_id, scrape_attempt_id, price, mrp, currency, stock, stock_status, seller)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        input.tracked_product_id, input.scrape_attempt_id, input.price, input.mrp ?? null,
        input.currency ?? 'INR', input.stock, input.stock_status, input.seller ?? null
      ]
    );
    return rows[0] as PriceHistoryRow;
  },
};
