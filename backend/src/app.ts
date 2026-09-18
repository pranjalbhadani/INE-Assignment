import './config/env';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env';
import { checkDbConnection, closePool } from './config/db';
import { errorHandler } from './middleware/errorHandler';

import healthRoutes from './routes/health.routes';
import productRoutes from './routes/products.routes';
import trackedRoutes from './routes/tracked.routes';
import cronRoutes from './routes/cron.routes';
import scraperRoutes from './routes/scraper.routes';
import alertsRoutes from './routes/alerts.routes';

const app = express();

// ── Security Headers ──────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS — locked to frontend origin only ────────────────────────────────────
app.use(
  cors({
    origin: env.FRONTEND_ORIGIN,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    // X-Cron-Secret is NOT exposed to the frontend via CORS allowedHeaders.
    // The cron endpoint is server-to-server only.
    credentials: false,
  })
);

// ── Body Parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/health', healthRoutes);
app.use('/api/products', productRoutes);
app.use('/api/tracked-products', trackedRoutes);
app.use('/api/cron', cronRoutes);
app.use('/api/scraper', scraperRoutes);
app.use('/api/alerts', alertsRoutes);

// ── 404 Catch-All ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: 'The requested endpoint does not exist',
  });
});

// ── Global Error Handler (must be last) ──────────────────────────────────────
app.use(errorHandler);

export default app;
