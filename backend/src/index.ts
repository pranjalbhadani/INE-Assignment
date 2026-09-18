import app from './app';
import { checkDbConnection } from './config/db';
import { env } from './config/env';

// ── Startup ───────────────────────────────────────────────────────────────────
async function start(): Promise<void> {
  try {
    await checkDbConnection();
    console.log('✅ Database connection verified');
  } catch (err) {
    console.error('❌ Failed to connect to database:', err instanceof Error ? err.message : err);
    process.exit(1);
  }

  const port = env.PORT;
  app.listen(port, () => {
    console.log(`🚀 INE Price Tracker API running on http://localhost:${port}`);
    console.log(`   NODE_ENV: ${env.NODE_ENV}`);
    console.log(`   FRONTEND_ORIGIN: ${env.FRONTEND_ORIGIN}`);
    console.log(`   SCRAPE_LOCK_TTL_MS: ${env.SCRAPE_LOCK_TTL_MS}`);
    console.log(`   SCRAPE_TIMEOUT_MS:  ${env.SCRAPE_TIMEOUT_MS}`);
  });
}

start();
