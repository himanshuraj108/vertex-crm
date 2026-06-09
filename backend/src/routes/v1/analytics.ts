import { Router } from 'express';
import { getDashboardStats } from '../../controllers/analyticsController';

const router = Router();

// GET /api/v1/analytics/dashboard
router.get('/dashboard', getDashboardStats);

export default router;
