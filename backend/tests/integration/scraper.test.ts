import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import express from 'express';
import { Server } from 'http';
import { runSingleProduct } from '../../src/scraper/orchestrator';
import { trackedProductRepo } from '../../src/repositories/trackedProduct.repo';
import { scrapeAttemptRepo } from '../../src/repositories/scrapeAttempt.repo';
import { priceHistoryRepo } from '../../src/repositories/priceHistory.repo';
import { db } from '../../src/config/db';
import { env } from '../../src/config/env';

describe('Scraper Integration Tests', () => {
  let app: express.Express;
  let server: Server;
  let baseUrl: string;
  
  // State for mock server
  let mockStatus = 200;
  let mockHtml = '';
  let requestCount = 0;

  beforeAll(async () => {
    app = express();
    app.get('/product', (req, res) => {
      requestCount++;
      if (mockStatus >= 400) {
        return res.status(mockStatus).send('Error');
      }
      res.send(mockHtml);
    });

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address() as any;
        baseUrl = `http://localhost:${address.port}`;
        resolve();
      });
    });
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(async () => {
    mockStatus = 200;
    mockHtml = '';
    requestCount = 0;
    
    const pool = await db();
    await pool.query('DELETE FROM price_history');
    await pool.query('DELETE FROM scrape_attempts');
    await pool.query('DELETE FROM scrape_runs');
    await pool.query('DELETE FROM scrape_locks');
    await pool.query('DELETE FROM tracked_products');
  });

  it('successfully scrapes and persists data', async () => {
    mockHtml = `
      <html>
        <body>
          <div class="sku-tag">SKU: 123</div>
          <div class="brand-tag">TestBrand</div>
          <div class="price-success">
            <div class="pv-1">₹1,500</div>
          </div>
          <div class="stock-badge in-stock">10 in stock</div>
        </body>
      </html>
    `;

    const product = await trackedProductRepo.create({
      store_product_id: 'TEST-1',
      slug: 'test-1',
      name: 'Test',
      brand: 'TestBrand',
      category: 'Cat',
      sku: 'SKU1',
      target_url: `${baseUrl}/product`
    });

    await runSingleProduct(product);

    const updatedProduct = await trackedProductRepo.findById(product.id);
    expect(updatedProduct!.last_scrape_status).toBe('success');
    expect(updatedProduct!.last_known_price).toBe('1500.00'); // numeric string

    const history = await priceHistoryRepo.getLatestForProduct(product.id);
    expect(history).not.toBeNull();
    expect(history!.price).toBe('1500.00');
  });

  it('records transient failure on 5xx', async () => {
    // We expect the scraper to retry because of 5xx, but since we keep returning 500,
    // it will eventually fail permanently after max retries or timeout.
    // For this test, we just ensure it records a failure.
    mockStatus = 500;

    const originalTimeout = env.SCRAPE_TIMEOUT_MS;
    // Set a very short timeout so retries fail fast
    (env as any).SCRAPE_TIMEOUT_MS = 2000;

    try {
      const product = await trackedProductRepo.create({
        store_product_id: 'TEST-2',
        slug: 'test-2',
        name: 'Test',
        brand: 'TestBrand',
        category: 'Cat',
        sku: 'SKU2',
        target_url: `${baseUrl}/product`
      });

      await runSingleProduct(product);

      const updatedProduct = await trackedProductRepo.findById(product.id);
      expect(updatedProduct!.last_scrape_status).toBe('failed');
      expect(updatedProduct!.consecutive_failures).toBeGreaterThan(0);

      // Verify no price history was created
      const history = await priceHistoryRepo.getLatestForProduct(product.id);
      expect(history).toBeNull();
      
      // Should have attempted multiple times
      expect(requestCount).toBeGreaterThan(0);
    } finally {
      (env as any).SCRAPE_TIMEOUT_MS = originalTimeout;
    }
  }, 10000); // give it time to exhaust retries

  it('records permanent parser error on malformed DOM', async () => {
    mockHtml = `
      <html>
        <body>
          <!-- Missing .price-success -->
        </body>
      </html>
    `;

    const product = await trackedProductRepo.create({
      store_product_id: 'TEST-3',
      slug: 'test-3',
      name: 'Test',
      brand: 'TestBrand',
      category: 'Cat',
      sku: 'SKU3',
      target_url: `${baseUrl}/product`
    });

    await runSingleProduct(product);

    const updatedProduct = await trackedProductRepo.findById(product.id);
    expect(updatedProduct!.last_scrape_status).toBe('failed');

    // Fetch the failed attempt to verify error type
    const pool = await db();
    const { rows } = await pool.query(`SELECT * FROM scrape_attempts WHERE tracked_product_id = $1 ORDER BY attempt_number DESC LIMIT 1`, [product.id]);
    const latestAttempt = rows[0];
    
    expect(latestAttempt).toBeDefined();
    expect(latestAttempt.status).toBe('failed');
    expect(latestAttempt.error_type).toBe('permanent_selector_missing');
  });
});
