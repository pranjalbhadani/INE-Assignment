import { runAllTrackedProducts, runSingleProduct } from '../scraper/orchestrator';
import { trackedProductRepo } from '../repositories/trackedProduct.repo';

export interface CronScrapeResult {
  job_id: string;
  total: number;
  skipped_locked: number;
  started: string[];
  errors: Array<{ product_id: string; error: string }>;
}

export const scrapeService = {
  async executeCronScrape(): Promise<{ status: string }> {
    console.log('[ScrapeService] Triggering batch scrape for all products');
    // runAllTrackedProducts handles locking and execution asynchronously
    // We return immediately for the cron trigger
    runAllTrackedProducts({ headless: true }).catch(err => {
      console.error('[ScrapeService] Batch scrape failed:', err);
    });
    return { status: 'started' };
  },

  async executeSingleScrape(
    trackedProductId: string,
    jobId: string
  ): Promise<{ run_id: string; status: string }> {
    console.log(`[ScrapeService] Triggering single scrape for ${trackedProductId}`);
    
    const product = await trackedProductRepo.findById(trackedProductId);
    if (!product) throw new Error('Product not found');

    // Run asynchronously to not block the request
    runSingleProduct(product, { jobId, headless: true }).catch(err => {
      console.error(`[ScrapeService] Single scrape failed for ${trackedProductId}:`, err);
    });
    
    return { run_id: jobId, status: 'initiated' };
  }
};
