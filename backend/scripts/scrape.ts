import { runSingleProduct } from '../src/scraper/orchestrator';
import { trackedProductRepo } from '../src/repositories/trackedProduct.repo';
import { getPool, closePool } from '../src/config/db';

async function main() {
  await getPool();
  
  const args = process.argv.slice(2);
  const productIndex = args.indexOf('--product');
  
  if (productIndex === -1 || !args[productIndex + 1]) {
    console.error('Usage: npm run scrape:headed -- --product <store_product_id>');
    process.exit(1);
  }

  const storeProductId = args[productIndex + 1];
  console.log(`[CLI] Searching for tracked product: ${storeProductId}`);

  const product = await trackedProductRepo.findByStoreProductId(storeProductId);
  
  if (!product) {
    console.error(`Error: Product with store ID ${storeProductId} is not currently tracked.`);
    console.error(`Please add it via the API first.`);
    process.exit(1);
  }

  console.log(`[CLI] Initiating headed scrape for ${product.name}`);
  
  try {
    // Force headless to false for CLI headed mode
    await runSingleProduct(product, { headless: false });
  } catch (error) {
    console.error('[CLI] Unhandled orchestrator error:', error);
  } finally {
    await closePool();
    console.log('[CLI] Exiting.');
    process.exit(0);
  }
}

main();
