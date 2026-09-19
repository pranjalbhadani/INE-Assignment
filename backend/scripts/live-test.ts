import { config } from 'dotenv';
import path from 'path';

// Load .env
config({ path: path.resolve(__dirname, '../../.env') });

import { db } from '../src/config/db';
import { trackedProductRepo } from '../src/repositories/trackedProduct.repo';
import { runSingleProduct } from '../src/scraper/orchestrator';

const TARGET_IDS = ['12', '48', '675'];
const STORE_URL = process.env.STORE_URL || 'http://localhost:54321'; // The mock store URL

async function main() {
  console.log('--- LIVE SCRAPER TEST ---');
  
  // Initialize DB pool
  const pool = await db();
  console.log('Connected to database.');

  // Create products if they don't exist
  for (const id of TARGET_IDS) {
    let product = await trackedProductRepo.findByStoreProductId(id);
    if (!product) {
      console.log(`Tracking new product ${id}...`);
      product = await trackedProductRepo.create({
        store_product_id: id,
        target_url: `${STORE_URL}/product/${id}`,
        name: `Product ${id}`,
        brand: `Brand ${id}`,
        category: 'Live Test',
        sku: `SKU-${id}`,
        slug: `product-${id}`
      });
    } else {
      console.log(`Product ${id} already tracked (ID: ${product.id}). Resetting failures.`);
      // Reset failures and activate
      await pool.query(`UPDATE tracked_products SET consecutive_failures = 0, is_active = true WHERE id = $1`, [product.id]);
      product = await trackedProductRepo.findByStoreProductId(id);
    }

    console.log(`\n========================================`);
    console.log(`Running Headed Scrape for Product ${id}`);
    console.log(`========================================`);
    
    // Run the orchestrator headed
    await runSingleProduct(product!, { headless: false });

    // Verify result
    const updated = await trackedProductRepo.findByStoreProductId(id);
    console.log(`\nOutcome for Product ${id}:`);
    console.log(`Status: ${updated?.last_scrape_status}`);
    console.log(`Price: ${updated?.last_known_price}`);
    console.log(`Stock: ${updated?.last_known_stock}`);
    console.log(`----------------------------------------`);
  }

  console.log('Live test complete.');
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error during live test:', err);
  process.exit(1);
});
