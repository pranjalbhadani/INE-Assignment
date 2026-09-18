import { db } from '../config/db';
import { PoolClient } from 'pg';

export interface ScrapeRun {
  id: string;
  tracked_product_id: string;
  job_id: string;
  status: 'pending' | 'success' | 'failed';
  started_at: string;
  completed_at: string | null;
}

export const scrapeRunRepo = {
  async create(trackedProductId: string, jobId: string, client?: PoolClient): Promise<ScrapeRun> {
    const runner = client ?? (await db());
    const { rows } = await runner.query<ScrapeRun>(
      `INSERT INTO scrape_runs (tracked_product_id, job_id) VALUES ($1, $2) RETURNING *`,
      [trackedProductId, jobId]
    );
    return rows[0]!;
  },

  async complete(runId: string, status: 'success' | 'failed', client?: PoolClient): Promise<ScrapeRun> {
    const runner = client ?? (await db());
    const { rows } = await runner.query<ScrapeRun>(
      `UPDATE scrape_runs SET status = $1, completed_at = NOW() WHERE id = $2 RETURNING *`,
      [status, runId]
    );
    return rows[0]!;
  },

  async findByProduct(trackedProductId: string, limit = 20): Promise<ScrapeRun[]> {
    const pool = await db();
    const { rows } = await pool.query<ScrapeRun>(
      `SELECT * FROM scrape_runs WHERE tracked_product_id = $1 ORDER BY started_at DESC LIMIT $2`,
      [trackedProductId, limit]
    );
    return rows;
  },
};
