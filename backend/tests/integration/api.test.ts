import request from 'supertest';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import app from '../../src/app';
import { env } from '../../src/config/env';
import { db } from '../../src/config/db';
import { trackedProductRepo } from '../../src/repositories/trackedProduct.repo';

describe('API Integration Tests', () => {
  beforeEach(async () => {
    // Clear relevant tables
    const pool = await db();
    await pool.query('DELETE FROM tracked_products');
  });

  describe('Products API', () => {
    it('creates a tracked product successfully', async () => {
      const response = await request(app)
        .post('/api/tracked-products')
        .send({ store_product_id: '12' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.store_product_id).toBe('12');
    });

    it('rejects malformed product requests', async () => {
      const response = await request(app)
        .post('/api/tracked-products')
        .send({ store_product_id: '' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('fetches existing product correctly', async () => {
      const product = await trackedProductRepo.create({
        store_product_id: '48',
        slug: 'test-slug-48',
        name: 'Test 48',
        brand: 'Brand',
        category: 'Cat',
        sku: 'SKU48',
        target_url: 'http://test.com/48'
      });

      const response = await request(app).get(`/api/tracked-products/${product.id}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.store_product_id).toBe('48');
    });

    it('returns 404 for non-existent product', async () => {
      const uuid = '00000000-0000-0000-0000-000000000000';
      const response = await request(app).get(`/api/tracked-products/${uuid}`);
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Cron API', () => {
    it('rejects requests without X-Cron-Secret header', async () => {
      const response = await request(app).post('/api/cron/scrape');
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('rejects requests with incorrect X-Cron-Secret', async () => {
      const response = await request(app)
        .post('/api/cron/scrape')
        .set('X-Cron-Secret', 'wrong-secret');
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('accepts requests with correct X-Cron-Secret', async () => {
      const response = await request(app)
        .post('/api/cron/scrape')
        .set('X-Cron-Secret', env.CRON_SECRET);
      
      // Depending on orchestrator mock/execution, might be 202 or 200.
      expect([200, 202]).toContain(response.status);
      expect(response.body.success).toBe(true);
    });
  });
});
