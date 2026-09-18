import type { Request, Response, NextFunction } from 'express';
import { trackingService } from '../services/tracking.service';

export async function listTrackedProducts(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const products = await trackingService.getAllTracked();
    res.json({ success: true, data: products, count: products.length });
  } catch (err) {
    next(err);
  }
}

export async function trackProduct(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { store_product_id } = req.body as { store_product_id: string };
    const product = await trackingService.trackProduct(store_product_id);
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}

export async function getTrackedProduct(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = String(req.params['id']);
    const product = await trackingService.getTrackedById(id);
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}

export async function untrackProduct(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = String(req.params['id']);
    await trackingService.untrack(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function getPriceHistory(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = String(req.params['id']);
    const limit = req.query['limit'] ? Number(req.query['limit']) : undefined;
    const history = await trackingService.getPriceHistory(id, limit);
    res.json({ success: true, data: history, count: history.length });
  } catch (err) {
    next(err);
  }
}

export async function getScrapeHistory(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = String(req.params['id']);
    const limit = req.query['limit'] ? Number(req.query['limit']) : undefined;
    const history = await trackingService.getScrapeHistory(id, limit);
    res.json({ success: true, data: history, count: history.length });
  } catch (err) {
    next(err);
  }
}

export async function triggerProductScrape(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = String(req.params['id']);
    const attempt = await trackingService.runScrape(id);
    res.json({ success: true, data: attempt });
  } catch (err) {
    next(err);
  }
}
