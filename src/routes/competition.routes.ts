import { Router } from 'express';
import { CompetitionController } from '../controllers/competition.controller';

const router = Router();

// TODO: Implement competition information routes
// GET /api/competition/leaderboard
// GET /api/competition/status
// GET /api/competition/rules

// GET /api/competition/leaderboard - Get leaderboard for a competition
router.get('/leaderboard', CompetitionController.getLeaderboard);

// GET /api/competition/status - Get status of the current competition
router.get('/status', CompetitionController.getStatus);

// GET /api/competition/rules - Get rules for the competition
router.get('/rules', CompetitionController.getRules);

export default router; 