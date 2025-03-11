import { Request, Response, NextFunction } from 'express';
import { TeamManager } from '../services/team-manager.service';
import { CompetitionManager } from '../services/competition-manager.service';
import { ApiError } from './errorHandler';

/**
 * Authentication middleware
 * Validates API key and HMAC signature
 */
export const authMiddleware = (
  teamManager: TeamManager,
  competitionManager: CompetitionManager
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get API key from header
      const apiKey = req.header('X-API-Key');
      if (!apiKey) {
        throw new ApiError(401, 'API key is required');
      }

      // Get timestamp from header
      const timestamp = req.header('X-Timestamp');
      if (!timestamp) {
        throw new ApiError(401, 'Request timestamp is required');
      }

      // Get signature from header
      const signature = req.header('X-Signature');
      if (!signature) {
        throw new ApiError(401, 'Request signature is required');
      }

      // Validate API request
      const teamId = await teamManager.validateApiRequest(
        apiKey,
        signature,
        req.method,
        req.path,
        timestamp,
        JSON.stringify(req.body)
      );

      if (!teamId) {
        throw new ApiError(401, 'Invalid API credentials');
      }

      // Set team ID in request for use in route handlers
      req.teamId = teamId;

      // Check if there's an active competition
      const activeCompetition = await competitionManager.getActiveCompetition();
      
      // For trade endpoints, ensure competition is active
      if (req.path.startsWith('/api/trade/execute') && req.method === 'POST') {
        if (!activeCompetition) {
          throw new ApiError(403, 'No active competition');
        }
        
        // Set competition ID in request
        req.competitionId = activeCompetition.id;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Extend Express Request interface to include teamId and competitionId
declare global {
  namespace Express {
    interface Request {
      teamId?: string;
      competitionId?: string;
    }
  }
} 