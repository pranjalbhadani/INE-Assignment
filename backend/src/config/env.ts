import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load .env relative to the backend directory regardless of CWD
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  FRONTEND_ORIGIN: z.string().url().default('http://localhost:5173'),
  CRON_SECRET: z.string().min(8, 'CRON_SECRET must be at least 8 characters'),
  // Lock TTL must be strictly greater than scrape timeout
  SCRAPE_LOCK_TTL_MS: z.coerce.number().int().positive().default(900_000),
  SCRAPE_TIMEOUT_MS: z.coerce.number().int().positive().default(600_000),
});

const _parsed = EnvSchema.safeParse(process.env);

if (!_parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(_parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = _parsed.data;

// Runtime invariant: lock TTL must exceed scrape timeout
if (env.SCRAPE_LOCK_TTL_MS <= env.SCRAPE_TIMEOUT_MS) {
  console.error(
    `❌ Configuration error: SCRAPE_LOCK_TTL_MS (${env.SCRAPE_LOCK_TTL_MS}) ` +
      `must be STRICTLY GREATER than SCRAPE_TIMEOUT_MS (${env.SCRAPE_TIMEOUT_MS})`
  );
  process.exit(1);
}
