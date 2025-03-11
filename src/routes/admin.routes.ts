import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { adminAuthMiddleware } from '../middleware/admin-auth.middleware';

const router = Router();

// Public admin route - no auth required
// POST /api/admin/setup - Set up the initial admin account
router.post('/setup', AdminController.setupAdmin);

// Apply admin auth middleware to protected routes
router.use(adminAuthMiddleware);

// Protected admin routes - require admin authentication
// POST /api/admin/teams/register - Register a new team
router.post('/teams/register', AdminController.registerTeam);

// POST /api/admin/competition/start - Start a competition
router.post('/competition/start', AdminController.startCompetition);

// POST /api/admin/competition/end - End a competition
router.post('/competition/end', AdminController.endCompetition);

// GET /api/admin/reports/performance - Get performance reports
router.get('/reports/performance', AdminController.getPerformanceReports);

export default router; 