import { Router } from 'express';
import { cronAuthMiddleware } from '../middleware/auth.middleware';
import { triggerCronScrape } from '../controllers/cron.controller';

const router = Router();

// POST /api/cron/scrape — protected by X-Cron-Secret header
router.post('/scrape', cronAuthMiddleware, triggerCronScrape);

export default router;
