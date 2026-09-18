import type { Request, Response, NextFunction } from 'express';
import { scrapeService } from '../services/scrape.service';

export async function triggerCronScrape(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await scrapeService.executeCronScrape();
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
