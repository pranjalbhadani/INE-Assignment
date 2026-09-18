const { getPool, closePool } = require('./src/config/db');
const { scrapeLockRepo } = require('./src/repositories/scrapeLock.repo');
const { trackedProductRepo } = require('./src/repositories/trackedProduct.repo');

async function testLock() {
  console.log('--- TESTING LOCK BEHAVIOR ---');
  await getPool().then(p => p.query("INSERT INTO tracked_products (store_product_id, slug, name, brand, category, sku, target_url) VALUES ('999', 'slug', 'name', 'brand', 'cat', 'sku', 'url') ON CONFLICT DO NOTHING"));
  const product = await trackedProductRepo.findByStoreProductId('999');

  console.log('Acquiring lock for first time...');
  const lock1 = await scrapeLockRepo.acquire(product.id);
  console.log('Lock 1 acquired:', lock1.acquired, 'token:', lock1.lock_token);

  console.log('Attempting to acquire same lock (should fail)...');
  const lock2 = await scrapeLockRepo.acquire(product.id);
  console.log('Lock 2 acquired:', lock2.acquired);

  console.log('Releasing lock with wrong token (should not release)...');
  await scrapeLockRepo.release(product.id, '00000000-0000-0000-0000-000000000000');
  const lockCheck1 = await scrapeLockRepo.get(product.id);
  console.log('Lock still exists:', !!lockCheck1);

  console.log('Releasing lock with correct token...');
  await scrapeLockRepo.release(product.id, lock1.lock_token);
  const lockCheck2 = await scrapeLockRepo.get(product.id);
  console.log('Lock exists after correct release:', !!lockCheck2);

  await closePool();
}

testLock().catch(console.error);
