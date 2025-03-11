import { Router } from 'express';
import { HealthController } from '../controllers/health.controller';

const router = Router();

// GET /api/health - Basic health check
router.get('/', HealthController.check);

// GET /api/health/detailed - Detailed health check
router.get('/detailed', HealthController.detailed);

export default router; 