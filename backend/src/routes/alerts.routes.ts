import { Router } from 'express';
import { listAlerts } from '../controllers/alerts.controller';

const router = Router();

// GET /api/alerts
router.get('/', listAlerts);

export default router;
