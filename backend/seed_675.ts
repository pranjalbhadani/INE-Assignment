import { getPool, closePool } from './src/config/db';
async function run() {
  const p = await getPool();
  await p.query("INSERT INTO tracked_products (store_product_id, name, target_price) VALUES ('675', 'Product 675', 10000)");
  console.log('Added 675');
  await closePool();
}
run();
