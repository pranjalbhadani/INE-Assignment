/**
 * scripts/migrate.ts
 * Run: npm run migrate
 */

import '../src/config/env';
import { getPool, closePool } from '../src/config/db';
import fs from 'fs';
import path from 'path';

const MIGRATIONS_DIR = path.resolve(__dirname, '../../database/migrations');

async function runMigrations(): Promise<void> {
  const pool = await getPool();
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const { rowCount } = await client.query(
        `SELECT 1 FROM _migrations WHERE filename = $1`,
        [file]
      );
      if ((rowCount ?? 0) > 0) {
        console.log(`⏭  Already applied: ${file}`);
        continue;
      }

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      console.log(`⏳ Applying: ${file}`);

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(`INSERT INTO _migrations (filename) VALUES ($1)`, [file]);
        await client.query('COMMIT');
        console.log(`✅ Applied:  ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(
          `Migration ${file} failed: ${err instanceof Error ? err.message : err}`
        );
      }
    }

    console.log('\n✅ All migrations applied successfully.');
  } finally {
    client.release();
    await closePool();
  }
}

runMigrations().catch((err) => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
