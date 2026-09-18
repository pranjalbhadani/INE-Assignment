import { v4 as uuidv4 } from 'uuid';
import { TrackedProduct, trackedProductRepo } from '../repositories/trackedProduct.repo';
import { scrapeLockRepo } from '../repositories/scrapeLock.repo';
import { scrapeRunRepo } from '../repositories/scrapeRun.repo';
import { scrapeAttemptRepo } from '../repositories/scrapeAttempt.repo';
import { priceHistoryRepo } from '../repositories/priceHistory.repo';
import { env } from '../config/env';
import { withRetry } from './retry';
import { createIsolatedSession, BrowserSession } from './browser/browserPool';
import {
  navigateToProduct,
  dismissCookieOverlayIfPresent,
  performHumanInteraction,
  triggerReveal,
  waitForPriceState
} from './browser/pageInteractions';
import { extractProductData } from './parser/domParser';
import { validateProductQuote } from './validator/scraperValidator';
import { PermanentError, ScrapeError, TransientError } from './validator/errors';

export interface ScrapeOptions {
  jobId?: string;
  headless?: boolean;
}

export async function runSingleProduct(product: TrackedProduct, options: ScrapeOptions = {}): Promise<void> {
  const runId = uuidv4();
  const jobId = options.jobId || uuidv4();
  
  // Total Scrape Time Budget: must be strictly less than TTL
  const TTL = env.SCRAPE_LOCK_TTL_MS;
  const timeoutMs = env.SCRAPE_TIMEOUT_MS; // e.g. 5 mins

  if (timeoutMs >= TTL) {
    throw new Error(`Configuration Error: SCRAPE_TIMEOUT_MS (${timeoutMs}) must be < SCRAPE_LOCK_TTL_MS (${TTL})`);
  }

  const deadlineMs = Date.now() + timeoutMs;
  let lock: { acquired: boolean; lock_token?: string } = { acquired: false };
  let actualRunId: string | null = null;
  let runCreated = false;

  console.log(`[Scrape Start] Product ${product.store_product_id} (ID: ${product.id})`);

  try {
    // 1. Acquire Lock
    lock = await scrapeLockRepo.acquire(product.id);
    if (!lock.acquired || !lock.lock_token) {
      console.warn(`[Lock Conflict] Scrape already in progress for product ${product.id}`);
      return; // Stop silently, another process is handling it
    }

    // 2. Create Scrape Run
    const scrapeRun = await scrapeRunRepo.create(product.id, jobId);
    actualRunId = scrapeRun.id;
    runCreated = true;

    // 3. Execute Scrape with Retry
    const result = await withRetry(async (attemptNumber) => {
      console.log(`[Attempt ${attemptNumber}] Product ${product.store_product_id}`);
      return await executeBrowserScrape(product, attemptNumber, actualRunId!, options.headless ?? true);
    }, deadlineMs);

    const { quote, attemptId } = result;

    // 4. Validation (Already validated inside executeBrowserScrape, but quote is ready)
    console.log(`[Success] Extracted price: ${quote.price}, Stock: ${quote.stock} for ${product.store_product_id}`);

    // 5. Persistence (Success)
    // Write history
    await priceHistoryRepo.create({
      tracked_product_id: product.id,
      scrape_attempt_id: attemptId,
      price: quote.price,
      mrp: quote.mrp,
      currency: 'INR',
      stock: quote.stock,
      stock_status: quote.stock_status,
      seller: null // Could add from parser
    });

    // Update Product
    await trackedProductRepo.update(product.id, {
      last_known_price: quote.price,
      last_known_mrp: quote.mrp,
      last_known_stock: quote.stock,
      last_known_stock_status: quote.stock_status,
      last_scrape_status: 'success',
      last_scraped_at: new Date(),
      consecutive_failures: 0
    });

    await scrapeRunRepo.complete(actualRunId, 'success');
  } catch (error: any) {
    console.error(`[Scrape Final Failure] Product ${product.store_product_id}:`, error.message);
    
    if (runCreated && actualRunId) {
      await scrapeRunRepo.complete(actualRunId, 'failed');
      await trackedProductRepo.incrementFailure(product.id);
    }
  } finally {
    // 6. Release Lock
    if (lock.acquired && lock.lock_token) {
      await scrapeLockRepo.release(product.id, lock.lock_token);
      console.log(`[Lock Released] Product ${product.store_product_id}`);
    }
  }
}

async function executeBrowserScrape(
  product: TrackedProduct,
  attemptNumber: number,
  runId: string,
  headless: boolean
) {
  const startTime = Date.now();
  let session: BrowserSession | null = null;
  let attemptId = uuidv4();
  
  try {
    console.log(`  [Browser] Launching isolated session (headless: ${headless})`);
    session = await createIsolatedSession(headless);
    const { page } = session;

    console.log(`  [Browser] Navigating to ${product.target_url}`);
    await navigateToProduct(page, product.target_url);

    console.log(`  [Browser] Dismissing cookie overlay (if any)`);
    await dismissCookieOverlayIfPresent(page);

    console.log(`  [Browser] Performing human-like mouse interaction`);
    await performHumanInteraction(page);

    console.log(`  [Browser] Triggering reveal button`);
    await triggerReveal(page);

    console.log(`  [Browser] Waiting for challenge/price resolve state`);
    await waitForPriceState(page);

    console.log(`  [Browser] Extracting DOM data`);
    const quote = await extractProductData(page);

    console.log(`  [Browser] Validating quote`);
    validateProductQuote(quote, product);

    // Write success attempt
    let attemptIdFinal = attemptId;
    try {
      const dbAttempt = await scrapeAttemptRepo.create({
        scrape_run_id: runId,
        tracked_product_id: product.id,
        attempt_number: attemptNumber,
        status: 'success',
        duration_ms: Date.now() - startTime
      });
      attemptIdFinal = dbAttempt.id;
    } catch (dbErr) {
      console.error(`  [DB Error] Failed to write success attempt:`, dbErr);
    }
    
    return { quote, attemptId: attemptIdFinal };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    let failureStage = 'timeout';
    let errorType = 'transient_timeout';
    
    if (error instanceof ScrapeError) {
      failureStage = error.stage;
      errorType = error.type;
    }

    // Write failure attempt immediately
    try {
      await scrapeAttemptRepo.create({
        id: attemptId,
        scrape_run_id: runId,
        tracked_product_id: product.id,
        attempt_number: attemptNumber,
        status: 'failed',
        duration_ms: duration,
        failure_stage: failureStage as any,
        error_type: errorType as any,
        error_message: error.message
      });
    } catch (dbErr) {
      console.error(`  [DB Error] Failed to write attempt:`, dbErr);
    }

    throw error; // Rethrow to trigger retry logic
  } finally {
    if (session) {
      console.log(`  [Browser] Cleaning up session`);
      await session.close();
    }
  }
}

export async function runAllTrackedProducts(options: ScrapeOptions = {}): Promise<void> {
  const products = await trackedProductRepo.findAllActive();
  const concurrencyLimit = 2; // Fixed concurrency
  const jobId = options.jobId || uuidv4();

  const chunks = [];
  for (let i = 0; i < products.length; i += concurrencyLimit) {
    chunks.push(products.slice(i, i + concurrencyLimit));
  }

  console.log(`[Batch] Starting batch ${jobId} for ${products.length} products`);

  for (const chunk of chunks) {
    const promises = chunk.map(p => runSingleProduct(p, { ...options, jobId }).catch(err => {
      console.error(`Unhandled orchestrator error for product ${p.id}:`, err);
    }));
    await Promise.all(promises);
  }

  console.log(`[Batch] Finished batch ${jobId}`);
}
