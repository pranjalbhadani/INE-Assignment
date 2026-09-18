import { db } from '../config/db';
import { PoolClient } from 'pg';

export interface TrackedProduct {
  id: string;
  store_product_id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  sku: string;
  target_url: string;
  is_active: boolean;
  last_known_price: string | null;
  last_known_mrp: string | null;
  last_known_stock: number | null;
  last_known_stock_status: 'in_stock' | 'out_of_stock' | null;
  last_scraped_at: string | null;
  last_scrape_status: 'pending' | 'success' | 'failed';
  consecutive_failures: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTrackedProductInput {
  store_product_id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  sku: string;
  target_url: string;
}

export const trackedProductRepo = {
  async findAll(): Promise<TrackedProduct[]> {
    const { rows } = await db.query<TrackedProduct>(
      `SELECT * FROM tracked_products ORDER BY created_at DESC`
    );
    return rows;
  },

  async findById(id: string): Promise<TrackedProduct | null> {
    const { rows } = await db.query<TrackedProduct>(
      `SELECT * FROM tracked_products WHERE id = $1`,
      [id]
    );
    return rows[0] ?? null;
  },

  async findByStoreProductId(
    storeProductId: string
  ): Promise<TrackedProduct | null> {
    const { rows } = await db.query<TrackedProduct>(
      `SELECT * FROM tracked_products WHERE store_product_id = $1`,
      [storeProductId]
    );
    return rows[0] ?? null;
  },

  async create(
    input: CreateTrackedProductInput,
    client?: PoolClient
  ): Promise<TrackedProduct> {
    const runner = client ?? db;
    const { rows } = await runner.query<TrackedProduct>(
      `INSERT INTO tracked_products
         (store_product_id, slug, name, brand, category, sku, target_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        input.store_product_id,
        input.slug,
        input.name,
        input.brand,
        input.category,
        input.sku,
        input.target_url,
      ]
    );
    return rows[0];
  },

  async softDelete(id: string): Promise<boolean> {
    const { rowCount } = await db.query(
      `UPDATE tracked_products SET is_active = false, updated_at = NOW()
       WHERE id = $1 AND is_active = true`,
      [id]
    );
    return (rowCount ?? 0) > 0;
  },

  async findAllActive(): Promise<TrackedProduct[]> {
    const { rows } = await db.query<TrackedProduct>(
      `SELECT * FROM tracked_products WHERE is_active = true ORDER BY created_at ASC`
    );
    return rows;
  },
};
