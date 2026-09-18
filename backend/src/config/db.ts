import { Pool } from 'pg';
import { env } from './env';

let _pool: Pool | null = null;

export async function getPool(): Promise<Pool> {
  if (_pool) return _pool;

  _pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15_000,
    ssl: { rejectUnauthorized: false },
  });

  _pool.on('connect', (client) => {
    if (env.DB_SCHEMA) {
      client.query(`SET search_path TO ${env.DB_SCHEMA}, public, extensions`);
    }
  });

  _pool.on('error', (err) => {
    console.error('Unexpected pg pool error:', err.message);
  });

  console.log('🔌 DB pool initialized');
  return _pool;
}

export async function db(): Promise<Pool> {
  return getPool();
}

export async function checkDbConnection(): Promise<void> {
  const pool = await getPool();
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
  }
}
