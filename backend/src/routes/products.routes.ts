import { Router } from 'express';
import { z } from 'zod';
import { validateRequest } from '../middleware/validateRequest';
import { searchProducts } from '../controllers/products.controller';

const router = Router();

const searchQuerySchema = z.object({
  q: z.string().min(1, 'Search query cannot be empty').max(200),
});

// GET /api/products/search?q=<query>
router.get(
  '/search',
  validateRequest(searchQuerySchema, 'query'),
  searchProducts
);

export default router;
