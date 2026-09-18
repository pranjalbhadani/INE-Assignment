import { db } from '../config/db';
import { env } from '../config/env';
import { v4 as uuidv4 } from 'uuid';

export interface ScrapeLock {
  tracked_product_id: string;
  lock_token: string;
  acquired_at: string;
  expires_at: string;
}

export interface AcquireResult {
  acquired: boolean;
  lock_token?: string;
}

export const scrapeLockRepo = {
  async acquire(trackedProductId: string): Promise<AcquireResult> {
    const token = uuidv4();
    const ttlMs = env.SCRAPE_LOCK_TTL_MS;
    const pool = await db();

    const { rows } = await pool.query<{ lock_token: string }>(
      `INSERT INTO scrape_locks (tracked_product_id, lock_token, expires_at)
       VALUES ($1, $2, NOW() + ($3::bigint || ' milliseconds')::interval)
       ON CONFLICT (tracked_product_id) DO UPDATE
         SET lock_token  = EXCLUDED.lock_token,
             acquired_at = NOW(),
             expires_at  = EXCLUDED.expires_at
       WHERE scrape_locks.expires_at < NOW()
       RETURNING lock_token`,
      [trackedProductId, token, ttlMs]
    );

    if (rows.length === 0) return { acquired: false };
    return { acquired: true, lock_token: rows[0]!.lock_token };
  },

  async release(trackedProductId: string, lockToken: string): Promise<void> {
    const pool = await db();
    await pool.query(
      `DELETE FROM scrape_locks WHERE tracked_product_id = $1 AND lock_token = $2`,
      [trackedProductId, lockToken]
    );
  },

  async get(trackedProductId: string): Promise<ScrapeLock | null> {
    const pool = await db();
    const { rows } = await pool.query<ScrapeLock>(
      `SELECT * FROM scrape_locks WHERE tracked_product_id = $1`,
      [trackedProductId]
    );
    return rows[0] ?? null;
  },

  async pruneExpired(): Promise<number> {
    const pool = await db();
    const { rowCount } = await pool.query(`DELETE FROM scrape_locks WHERE expires_at < NOW()`);
    return rowCount ?? 0;
  },
};
