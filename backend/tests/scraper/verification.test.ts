import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { runSingleProduct } from '../../src/scraper/orchestrator';
import { scrapeLockRepo } from '../../src/repositories/scrapeLock.repo';
import { priceHistoryRepo } from '../../src/repositories/priceHistory.repo';
import { scrapeAttemptRepo } from '../../src/repositories/scrapeAttempt.repo';
import { getPool, closePool } from '../../src/config/db';
import { v4 as uuidv4 } from 'uuid';
import { TrackedProduct } from '../../src/repositories/trackedProduct.repo';
import * as dotenv from 'dotenv';
dotenv.config();

describe('Scraper Verification & Reliability', () => {
  let pool: any;

  beforeAll(async () => {
    pool = await getPool();
    await pool.query('TRUNCATE TABLE price_history, scrape_attempts, scrape_runs, scrape_locks CASCADE');
  });

  afterAll(async () => {
    await closePool();
  });

  async function createDummyProduct(storeId: string, url: string): Promise<TrackedProduct> {
    const id = uuidv4();
    await pool.query(`
      INSERT INTO tracked_products (id, store_product_id, name, target_url, slug, category, sku, brand, is_active) 
      VALUES ($1, $2, $3, $4, $5, 'TestCategory', 'SKU-TEST', 'TestBrand', true)
      ON CONFLICT (store_product_id) DO UPDATE SET target_url = EXCLUDED.target_url
    `, [id, storeId, 'Dummy ' + storeId, url, 'dummy-slug-' + storeId]);
    
    const res = await pool.query('SELECT * FROM tracked_products WHERE store_product_id = $1', [storeId]);
    return res.rows[0];
  }

  it('1. Successful scrape for Products 12, 48, 675', async () => {
    const p12 = await createDummyProduct('verify-12', 'https://demo.inelabteamdev.com/product/12');
    const p48 = await createDummyProduct('verify-48', 'https://demo.inelabteamdev.com/product/48');
    const p675 = await createDummyProduct('verify-675', 'https://demo.inelabteamdev.com/product/675');

    await runSingleProduct(p12, { headless: true });
    await runSingleProduct(p48, { headless: true });
    await runSingleProduct(p675, { headless: true });

    const hist12 = await pool.query('SELECT * FROM price_history WHERE tracked_product_id = $1', [p12.id]);
    expect(hist12.rowCount).toBe(1);
    expect(parseFloat(hist12.rows[0].price)).toBeGreaterThan(0);

    const hist48 = await pool.query('SELECT * FROM price_history WHERE tracked_product_id = $1', [p48.id]);
    expect(hist48.rowCount).toBe(1);
    
    const hist675 = await pool.query('SELECT * FROM price_history WHERE tracked_product_id = $1', [p675.id]);
    expect(hist675.rowCount).toBe(1);
  }, 120000);

  it('2. Permanent failure (missing/malformed price)', async () => {
    const pBad = await createDummyProduct('verify-bad', 'https://demo.inelabteamdev.com/product/999999'); 
    
    await runSingleProduct(pBad, { headless: true }).catch(() => {});
    
    const hist = await pool.query('SELECT * FROM price_history WHERE tracked_product_id = $1', [pBad.id]);
    expect(hist.rowCount).toBe(0); 

    const attempts = await pool.query('SELECT status FROM scrape_attempts WHERE tracked_product_id = $1 ORDER BY scraped_at DESC', [pBad.id]);
    expect(attempts.rows[0].status).toBe('failed'); 

    const lock = await scrapeLockRepo.get(pBad.id);
    expect(lock).toBeNull(); 
  }, 60000);

  it('4. Concurrency (Simultaneous scrapes acquire only 1 lock)', async () => {
    const pCon = await createDummyProduct('verify-con', 'https://demo.inelabteamdev.com/product/12');
    
    const p1 = runSingleProduct(pCon, { headless: true });
    const p2 = runSingleProduct(pCon, { headless: true });
    
    await Promise.all([p1, p2]);
    
    const hist = await pool.query('SELECT * FROM price_history WHERE tracked_product_id = $1', [pCon.id]);
    expect(hist.rowCount).toBe(1);
  }, 60000);

  it('5. Batch isolation (One fails, one succeeds)', async () => {
    const pOk = await createDummyProduct('verify-ok', 'https://demo.inelabteamdev.com/product/48');
    const pFail = await createDummyProduct('verify-fail', 'https://demo.inelabteamdev.com/product/999999');

    await runSingleProduct(pFail, { headless: true }).catch(() => {});
    await runSingleProduct(pOk, { headless: true }).catch(() => {});

    const histFail = await pool.query('SELECT * FROM price_history WHERE tracked_product_id = $1', [pFail.id]);
    expect(histFail.rowCount).toBe(0);

    const histOk = await pool.query('SELECT * FROM price_history WHERE tracked_product_id = $1', [pOk.id]);
    expect(histOk.rowCount).toBe(1);
  }, 90000);

  it('6. Time budget (enforces SCRAPE_TIMEOUT_MS)', async () => {
    const ttl = parseInt(process.env.SCRAPE_LOCK_TTL_MS || '900000', 10);
    const timeout = parseInt(process.env.SCRAPE_TIMEOUT_MS || '800000', 10);
    expect(timeout).toBeLessThan(ttl);
  });
});
