import { Router } from 'express';
import { healthCheck } from '../controllers/health.controller';
import { scrapeLockRepo } from '../repositories/scrapeLock.repo';

const router = Router();

router.get('/', healthCheck);

router.get('/dev/clearlocks', async (req, res) => {
  try {
    await scrapeLockRepo.pruneExpired(); // This only prunes expired. Let's just do it directly.
    const { db } = await import('../config/db');
    const p = await db();
    await p.query('DELETE FROM scrape_locks');
    res.json({ status: 'locks cleared' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
