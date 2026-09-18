import { env } from '../src/config/env';
import { getPool, closePool } from '../src/config/db';
import fs from 'fs';
import path from 'path';

export async function setupTestDb() {
  if (env.NODE_ENV !== 'test' || env.DB_SCHEMA !== 'test_schema') {
    console.error('CRITICAL: Tests must be run with NODE_ENV=test and DB_SCHEMA=test_schema');
    process.exit(1);
  }

  const pool = await getPool();

  try {
    // Recreate the test schema
    await pool.query('DROP SCHEMA IF EXISTS test_schema CASCADE;');
    await pool.query('CREATE SCHEMA test_schema;');
    await pool.query('SET search_path TO test_schema, public, extensions;');
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

    // Run all migrations
    const migrationsDir = path.resolve(__dirname, '../../database/migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await pool.query(sql);
    }
    
    // Check if we also want to seed some products
    const seedSql = fs.readFileSync(path.join(__dirname, '../../database/seed.sql'), 'utf8');
    await pool.query(seedSql);

    console.log('Test database schema and seeds initialized successfully.');
  } catch (err) {
    console.error('Failed to setup test database:', err);
    process.exit(1);
  }
}

export async function teardownTestDb() {
  const pool = await getPool();
  try {
    await pool.query('DROP SCHEMA IF EXISTS test_schema CASCADE;');
    console.log('Test schema dropped successfully.');
  } catch (err) {
    console.error('Failed to teardown test database:', err);
  } finally {
    await closePool();
  }
}
