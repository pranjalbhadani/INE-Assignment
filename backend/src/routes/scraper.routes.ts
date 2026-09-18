import { Router } from 'express';
import { getScraperStatus } from '../controllers/scraper.controller';

const router = Router();

// GET /api/scraper/status
router.get('/status', getScraperStatus);

export default router;
