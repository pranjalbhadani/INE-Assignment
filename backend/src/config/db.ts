import { Pool } from 'pg';
import { env } from './env';

export const db = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  // Supabase requires SSL in production
  ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

db.on('error', (err) => {
  console.error('Unexpected pg pool error:', err.message);
});

export async function checkDbConnection(): Promise<void> {
  const client = await db.connect();
  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }
}
