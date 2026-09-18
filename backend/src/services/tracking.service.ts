import { trackedProductRepo, TrackedProduct, CreateTrackedProductInput } from '../repositories/trackedProduct.repo';
import { priceHistoryRepo, PriceHistoryRow } from '../repositories/priceHistory.repo';
import { scrapeAttemptRepo, ScrapeAttempt } from '../repositories/scrapeAttempt.repo';
import { resolveProductMetadata } from './product.service';
import { createError } from '../middleware/errorHandler';

export const trackingService = {
  /**
   * Track a new product. Resolves metadata from the store and creates the
   * tracked_products row. Idempotent: if the product is already tracked,
   * returns 409 DUPLICATE_PRODUCT.
   */
  async trackProduct(storeProductId: string): Promise<TrackedProduct> {
    // 1. Check for duplicate
    const existing = await trackedProductRepo.findByStoreProductId(storeProductId);
    if (existing) {
      if (existing.is_active) {
        throw createError(
          `Product ${storeProductId} is already being tracked`,
          409,
          'DUPLICATE_PRODUCT'
        );
      }
      // Re-activate if previously soft-deleted
      // (For Phase 2, we treat re-tracking as a new row; full re-activation is Phase 3 scope)
      throw createError(
        `Product ${storeProductId} is already tracked (inactive). Re-activation not yet implemented.`,
        409,
        'DUPLICATE_PRODUCT'
      );
    }

    // 2. Resolve product metadata from store
    const meta = await resolveProductMetadata(storeProductId);
    if (!meta) {
      throw createError(
        `Product ${storeProductId} not found on the demo store`,
        404,
        'PRODUCT_NOT_FOUND'
      );
    }

    // 3. Create the tracked product row
    const product = await trackedProductRepo.create(meta as CreateTrackedProductInput);
    return product;
  },

  async getAllTracked(): Promise<TrackedProduct[]> {
    return trackedProductRepo.findAll();
  },

  async getTrackedById(id: string): Promise<TrackedProduct> {
    const product = await trackedProductRepo.findById(id);
    if (!product) {
      throw createError(`Tracked product ${id} not found`, 404, 'NOT_FOUND');
    }
    return product;
  },

  async untrack(id: string): Promise<void> {
    const deleted = await trackedProductRepo.softDelete(id);
    if (!deleted) {
      throw createError(
        `Tracked product ${id} not found or already inactive`,
        404,
        'NOT_FOUND'
      );
    }
  },

  async getPriceHistory(
    id: string,
    limit?: number
  ): Promise<PriceHistoryRow[]> {
    // Validate product exists first
    const product = await trackedProductRepo.findById(id);
    if (!product) {
      throw createError(`Tracked product ${id} not found`, 404, 'NOT_FOUND');
    }
    return priceHistoryRepo.findByProduct(id, limit);
  },

  async getScrapeHistory(
    id: string,
    limit?: number
  ): Promise<ScrapeAttempt[]> {
    const product = await trackedProductRepo.findById(id);
    if (!product) {
      throw createError(`Tracked product ${id} not found`, 404, 'NOT_FOUND');
    }
    return scrapeAttemptRepo.findByProduct(id, limit);
  },

  async runScrape(id: string): Promise<ScrapeAttempt | null> {
    const product = await trackedProductRepo.findById(id);
    if (!product) {
      throw createError(`Tracked product ${id} not found`, 404, 'NOT_FOUND');
    }
    const { runSingleProduct } = await import('../scraper/orchestrator');
    
    // We reuse the existing orchestrator flow that uses PostgreSQL locks
    // and enforces all the scrape invariants.
    await runSingleProduct(product, { headless: true });
    
    // Return the result of what just happened
    const attempts = await scrapeAttemptRepo.findByProduct(id, 1);
    return attempts[0] || null;
  },
};
