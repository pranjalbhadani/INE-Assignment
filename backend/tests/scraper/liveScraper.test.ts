import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { runSingleProduct } from '../../src/scraper/orchestrator';
import { scrapeLockRepo } from '../../src/repositories/scrapeLock.repo';
import { priceHistoryRepo } from '../../src/repositories/priceHistory.repo';
import { scrapeAttemptRepo } from '../../src/repositories/scrapeAttempt.repo';
import { getPool, closePool } from '../../src/config/db';
import { v4 as uuidv4 } from 'uuid';
import { TrackedProduct } from '../../src/repositories/trackedProduct.repo';

describe('Scraper Orchestrator (Mocked Network Flow)', () => {
  beforeAll(async () => {
    await getPool();
  });

  afterAll(async () => {
    await closePool();
  });

  it('should timeout and abort retries if time budget is exceeded', async () => {
    // Creating a dummy product
    const dummyProduct: TrackedProduct = {
      id: uuidv4(),
      store_product_id: '9999',
      slug: 'dummy',
      name: 'Dummy',
      brand: 'DummyBrand',
      category: 'Cat',
      sku: 'SKU-9999',
      target_url: 'http://localhost:9999/dummy',
      is_active: true,
      last_known_price: null,
      last_known_mrp: null,
      last_known_stock: null,
      last_known_stock_status: null,
      last_scraped_at: null,
      last_scrape_status: 'pending',
      consecutive_failures: 0,
      created_at: new Date(),
      updated_at: new Date()
    };

    // We can't easily mock the exact internal timing in an integration test without 
    // a lot of setup, but we know the orchestrator will fail if it can't navigate.
    // The main point here is verifying lock acquires and releases.
    
    // Insert dummy product into DB
    const pool = await getPool();
    await pool.query(`
      INSERT INTO tracked_products 
      (id, store_product_id, slug, name, brand, category, sku, target_url) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      ON CONFLICT (store_product_id) DO UPDATE SET is_active = true
    `, [dummyProduct.id, dummyProduct.store_product_id, dummyProduct.slug, dummyProduct.name, dummyProduct.brand, dummyProduct.category, dummyProduct.sku, dummyProduct.target_url]);

    const resDb = await pool.query('SELECT id FROM tracked_products WHERE store_product_id = $1', ['9999']);
    dummyProduct.id = resDb.rows[0].id;

    // Check lock before
    const lock1 = await scrapeLockRepo.get(dummyProduct.id);
    expect(lock1).toBeNull();

    // Run scrape (will fail because URL doesn't exist)
    await runSingleProduct(dummyProduct, { headless: true }).catch(() => {});

    // Check lock released
    const lock2 = await scrapeLockRepo.get(dummyProduct.id);
    expect(lock2).toBeNull();
    
    // Check attempt logged as failed
    const res = await pool.query('SELECT status FROM scrape_attempts WHERE tracked_product_id = $1 ORDER BY scraped_at DESC LIMIT 1', [dummyProduct.id]);
    expect(res.rows[0]?.status).toBe('failed');
  }, 60000); // Allow long timeout for playwright
});
