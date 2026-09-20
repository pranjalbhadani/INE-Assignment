import type { Request, Response, NextFunction } from 'express';
import { scrapeService } from '../services/scrape.service';

// export async function triggerCronScrape(
//   _req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> {
//   try {
//     const result = await scrapeService.executeCronScrape();
//     res.json({ success: true, data: result });
//   } catch (err) {
//     next(err);
//   }
// }

export async function triggerCronScrape(
  _req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  scrapeService.executeCronScrape().catch((err) => {
    console.error('[Cron] Background scrape failed:', err);
  });

  res.status(202).json({
    status: 'executed'
  });
}