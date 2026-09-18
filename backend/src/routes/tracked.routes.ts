import { Router } from 'express';
import { z } from 'zod';
import { validateRequest } from '../middleware/validateRequest';
import {
  listTrackedProducts,
  trackProduct,
  getTrackedProduct,
  untrackProduct,
  getPriceHistory,
  getScrapeHistory,
  triggerProductScrape,
} from '../controllers/tracked.controller';

const router = Router();

const trackProductSchema = z.object({
  store_product_id: z
    .string()
    .min(1, 'store_product_id is required')
    .max(64)
    .regex(/^\d+$/, 'store_product_id must be numeric'),
});

// GET  /api/tracked-products
router.get('/', listTrackedProducts);

// POST /api/tracked-products
router.post('/', validateRequest(trackProductSchema, 'body'), trackProduct);

// GET  /api/tracked-products/:id
router.get('/:id', getTrackedProduct);

// DELETE /api/tracked-products/:id
router.delete('/:id', untrackProduct);

// GET  /api/tracked-products/:id/history
router.get('/:id/history', getPriceHistory);

// GET  /api/tracked-products/:id/scrapes
router.get('/:id/scrapes', getScrapeHistory);

// POST /api/tracked-products/:id/scrape
router.post('/:id/scrape', triggerProductScrape);

export default router;
