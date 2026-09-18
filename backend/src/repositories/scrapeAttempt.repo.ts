import { db } from '../config/db';
import { PoolClient } from 'pg';

export interface ScrapeAttempt {
  id: string;
  scrape_run_id: string;
  tracked_product_id: string;
  attempt_number: number;
  status: 'success' | 'failed';
  duration_ms: number;
  failure_stage: string | null;
  error_type: string | null;
  error_message: string | null;
  raw_price_text: string | null;
  raw_stock_text: string | null;
  scraped_at: string;
}

export interface CreateScrapeAttemptInput {
  scrape_run_id: string;
  tracked_product_id: string;
  attempt_number: number;
  status: 'success' | 'failed';
  duration_ms: number;
  failure_stage?: string | null;
  error_type?: string | null;
  error_message?: string | null;
  raw_price_text?: string | null;
  raw_stock_text?: string | null;
}

export const scrapeAttemptRepo = {
  async create(input: CreateScrapeAttemptInput, client?: PoolClient): Promise<ScrapeAttempt> {
    const runner = client ?? (await db());
    const { rows } = await runner.query<ScrapeAttempt>(
      `INSERT INTO scrape_attempts
         (scrape_run_id, tracked_product_id, attempt_number, status, duration_ms,
          failure_stage, error_type, error_message, raw_price_text, raw_stock_text)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        input.scrape_run_id, input.tracked_product_id, input.attempt_number,
        input.status, input.duration_ms,
        input.failure_stage ?? null, input.error_type ?? null,
        input.error_message ?? null, input.raw_price_text ?? null, input.raw_stock_text ?? null,
      ]
    );
    return rows[0]!;
  },

  async findByProduct(trackedProductId: string, limit = 50): Promise<ScrapeAttempt[]> {
    const pool = await db();
    const { rows } = await pool.query<ScrapeAttempt>(
      `SELECT sa.* FROM scrape_attempts sa
       WHERE sa.tracked_product_id = $1
       ORDER BY sa.scraped_at DESC LIMIT $2`,
      [trackedProductId, limit]
    );
    return rows;
  },

  async findByRun(runId: string): Promise<ScrapeAttempt[]> {
    const pool = await db();
    const { rows } = await pool.query<ScrapeAttempt>(
      `SELECT * FROM scrape_attempts WHERE scrape_run_id = $1 ORDER BY attempt_number ASC`,
      [runId]
    );
    return rows;
  },
};
