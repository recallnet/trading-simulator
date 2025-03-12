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

// GET /api/admin/teams - List all teams
router.get('/teams', AdminController.listAllTeams);

// DELETE /api/admin/teams/:teamId - Delete a team
router.delete('/teams/:teamId', AdminController.deleteTeam);

// POST /api/admin/competition/start - Start a competition
router.post('/competition/start', AdminController.startCompetition);

// POST /api/admin/competition/end - End a competition
router.post('/competition/end', AdminController.endCompetition);

// GET /api/admin/competition/:competitionId/snapshots - Get competition snapshots
router.get('/competition/:competitionId/snapshots', AdminController.getCompetitionSnapshots);

// GET /api/admin/reports/performance - Get performance reports
router.get('/reports/performance', AdminController.getPerformanceReports);

export default router; 