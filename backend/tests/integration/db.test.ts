import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../src/config/db';
import { scrapeLockRepo } from '../../src/repositories/scrapeLock.repo';
import { scrapeRunRepo } from '../../src/repositories/scrapeRun.repo';
import { scrapeAttemptRepo } from '../../src/repositories/scrapeAttempt.repo';
import { priceHistoryRepo } from '../../src/repositories/priceHistory.repo';
import { trackedProductRepo } from '../../src/repositories/trackedProduct.repo';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../../src/config/env';

describe('Database Integrity & Concurrency Tests', () => {
  let productId: string;
  let productId2: string;
  let runId: string;
  let attemptId: string;

  beforeEach(async () => {
    // Clear relevant tables
    const pool = await db();
    await pool.query('DELETE FROM price_history');
    await pool.query('DELETE FROM scrape_attempts');
    await pool.query('DELETE FROM scrape_runs');
    await pool.query('DELETE FROM scrape_locks');
    await pool.query('DELETE FROM tracked_products');

    // Setup base data
    const p1 = await trackedProductRepo.create({
      store_product_id: 'TEST-DB-1',
      slug: 'test-db-1',
      name: 'DB Test Product 1',
      brand: 'Test',
      category: 'Test',
      sku: 'SKU1',
      target_url: 'http://example.com/1'
    });
    productId = p1.id;

    const p2 = await trackedProductRepo.create({
      store_product_id: 'TEST-DB-2',
      slug: 'test-db-2',
      name: 'DB Test Product 2',
      brand: 'Test',
      category: 'Test',
      sku: 'SKU2',
      target_url: 'http://example.com/2'
    });
    productId2 = p2.id;

    const run = await scrapeRunRepo.create(productId, uuidv4());
    runId = run.id;
  });

  describe('Invariants', () => {
    it('allows price_history insertion for successful scrape attempt', async () => {
      const attempt = await scrapeAttemptRepo.create({
        scrape_run_id: runId,
        tracked_product_id: productId,
        attempt_number: 1,
        status: 'success',
        duration_ms: 1000
      });
      
      const history = await priceHistoryRepo.create({
        tracked_product_id: productId,
        scrape_attempt_id: attempt.id,
        price: 100,
        mrp: null,
        currency: 'INR',
        stock: 10,
        stock_status: 'in_stock',
        seller: null
      });

      expect(history).toBeDefined();
      expect(history.price).toBe('100.00'); // pg numeric returns string
    });

    it('rejects price_history insertion for failed scrape attempt', async () => {
      const attempt = await scrapeAttemptRepo.create({
        scrape_run_id: runId,
        tracked_product_id: productId,
        attempt_number: 1,
        status: 'failed',
        duration_ms: 1000
      });
      
      await expect(priceHistoryRepo.create({
        tracked_product_id: productId,
        scrape_attempt_id: attempt.id,
        price: 100,
        mrp: null,
        currency: 'INR',
        stock: 10,
        stock_status: 'in_stock',
        seller: null
      })).rejects.toThrow(/status "failed"/);
    });

    it('rejects price_history if product identity mismatches attempt', async () => {
      const attempt = await scrapeAttemptRepo.create({
        scrape_run_id: runId,
        tracked_product_id: productId,
        attempt_number: 1,
        status: 'success',
        duration_ms: 1000
      });
      
      // Attempting to attach product 2's history to product 1's attempt
      await expect(priceHistoryRepo.create({
        tracked_product_id: productId2,
        scrape_attempt_id: attempt.id,
        price: 100,
        mrp: null,
        currency: 'INR',
        stock: 10,
        stock_status: 'in_stock',
        seller: null
      })).rejects.toThrow(/product identity mismatch/);
    });
  });

  describe('Concurrency & Scrape Locks', () => {
    it('prevents multiple simultaneous lock acquisitions for the same product', async () => {
      const lock1 = await scrapeLockRepo.acquire(productId);
      expect(lock1.acquired).toBe(true);

      const lock2 = await scrapeLockRepo.acquire(productId);
      expect(lock2.acquired).toBe(false);
      expect(lock2.lock_token).toBeUndefined();
    });

    it('allows another product to be locked simultaneously', async () => {
      const lock1 = await scrapeLockRepo.acquire(productId);
      expect(lock1.acquired).toBe(true);

      const lock2 = await scrapeLockRepo.acquire(productId2);
      expect(lock2.acquired).toBe(true);
      expect(lock2.lock_token).toBeDefined();
    });

    it('releases lock correctly', async () => {
      const lock1 = await scrapeLockRepo.acquire(productId);
      expect(lock1.acquired).toBe(true);

      await scrapeLockRepo.release(productId, lock1.lock_token!);

      const lock2 = await scrapeLockRepo.acquire(productId);
      expect(lock2.acquired).toBe(true);
    });

    it('does not release lock if lock_token does not match', async () => {
      const lock1 = await scrapeLockRepo.acquire(productId);
      expect(lock1.acquired).toBe(true);

      await scrapeLockRepo.release(productId, uuidv4());

      const lock2 = await scrapeLockRepo.acquire(productId);
      expect(lock2.acquired).toBe(false);
    });

    it('reclaims expired locks automatically', async () => {
      // Temporarily mock environment TTL to 0ms for this test only
      const originalTtl = env.SCRAPE_LOCK_TTL_MS;
      (env as any).SCRAPE_LOCK_TTL_MS = 0; // Lock expires immediately

      try {
        const lock1 = await scrapeLockRepo.acquire(productId);
        expect(lock1.acquired).toBe(true);
        
        // Wait 100ms
        await new Promise(r => setTimeout(r, 100));

        // Because TTL is 0 and 100ms passed, the lock should be reclaimable
        const lock2 = await scrapeLockRepo.acquire(productId);
        expect(lock2.acquired).toBe(true);
      } finally {
        (env as any).SCRAPE_LOCK_TTL_MS = originalTtl;
      }
    });
  });
});
