import type { Request, Response, NextFunction } from 'express';
import { getPool } from '../config/db';

export async function getScraperStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const pool = await getPool();
    
    // Total tracked products
    const trackedResult = await pool.query('SELECT COUNT(*) FROM tracked_products');
    const trackedCount = parseInt(trackedResult.rows[0].count, 10);

    // Active locks
    const locksResult = await pool.query('SELECT COUNT(*) FROM scrape_locks');
    const activeScrapes = parseInt(locksResult.rows[0].count, 10);

    // Overall success/failure in last 24h
    const statsResult = await pool.query(`
      SELECT status, COUNT(*) as count 
      FROM scrape_attempts 
      WHERE scraped_at > NOW() - INTERVAL '24 hours'
      GROUP BY status
    `);
    
    let successfulScrapes = 0;
    let failedScrapes = 0;
    for (const row of statsResult.rows) {
      if (row.status === 'success') successfulScrapes = parseInt(row.count, 10);
      if (row.status === 'failed') failedScrapes = parseInt(row.count, 10);
    }
    
    const totalScrapes = successfulScrapes + failedScrapes;
    const failureRate = totalScrapes > 0 ? (failedScrapes / totalScrapes) * 100 : 0;

    // Last run
    const lastRunResult = await pool.query('SELECT started_at FROM scrape_runs ORDER BY started_at DESC LIMIT 1');
    const lastRunTimestamp = lastRunResult.rows.length > 0 ? lastRunResult.rows[0].started_at : null;

    res.json({
      success: true,
      data: {
        trackedProductCount: trackedCount,
        activeScrapeCount: activeScrapes,
        successfulScrapes24h: successfulScrapes,
        failedScrapes24h: failedScrapes,
        recentFailureRatePct: Number(failureRate.toFixed(2)),
        lastRunTimestamp
      }
    });
  } catch (err) {
    next(err);
  }
}
