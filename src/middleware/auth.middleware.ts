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
      console.log(`\n[AuthMiddleware] ========== AUTH REQUEST ==========`);
      console.log(`[AuthMiddleware] Received request to ${req.method} ${req.originalUrl}`);
      console.log(`[AuthMiddleware] req.path: ${req.path}`);
      console.log(`[AuthMiddleware] req.baseUrl: ${req.baseUrl}`);
      
      // Get API key from header
      const apiKey = req.header('X-API-Key');
      console.log(`[AuthMiddleware] API Key from header: ${apiKey}`);
      if (!apiKey) {
        throw new ApiError(401, 'API key is required');
      }

      // Get timestamp from header
      const timestamp = req.header('X-Timestamp');
      console.log(`[AuthMiddleware] Timestamp from header: ${timestamp}`);
      if (!timestamp) {
        throw new ApiError(401, 'Request timestamp is required');
      }

      // Get signature from header
      const signature = req.header('X-Signature');
      console.log(`[AuthMiddleware] Signature from header: ${signature}`);
      if (!signature) {
        throw new ApiError(401, 'Request signature is required');
      }

      // For signature validation, use the full URL path
      const fullPath = req.originalUrl.split('?')[0]; // Remove query params if any
      console.log(`[AuthMiddleware] Full path for validation: ${fullPath}`);
      
      // Validate API request
      console.log(`[AuthMiddleware] Calling validateApiRequest with:`);
      console.log(`[AuthMiddleware] - API Key: ${apiKey}`);
      console.log(`[AuthMiddleware] - Method: ${req.method}`);
      console.log(`[AuthMiddleware] - Path: ${fullPath}`);
      console.log(`[AuthMiddleware] - Timestamp: ${timestamp}`);
      console.log(`[AuthMiddleware] - Body: ${JSON.stringify(req.body)}`);
      
      const teamId = await teamManager.validateApiRequest(
        apiKey,
        signature,
        req.method,
        fullPath,
        timestamp,
        JSON.stringify(req.body)
      );

      if (!teamId) {
        console.log(`[AuthMiddleware] validateApiRequest returned null - invalid credentials`);
        throw new ApiError(401, 'Invalid API credentials');
      }

      console.log(`[AuthMiddleware] validateApiRequest succeeded - team ID: ${teamId}`);
      
      // Set team ID in request for use in route handlers
      req.teamId = teamId;

      // Check if there's an active competition
      const activeCompetition = await competitionManager.getActiveCompetition();
      
      // For trade endpoints, ensure competition is active
      const fullRoutePath = `${req.baseUrl}${req.path}`;
      console.log(`[AuthMiddleware] Full route path: ${fullRoutePath}`);
      
      if (fullRoutePath.includes('/api/trade/execute') && req.method === 'POST') {
        if (!activeCompetition) {
          throw new ApiError(403, 'No active competition');
        }
        
        // Set competition ID in request
        req.competitionId = activeCompetition.id;
        console.log(`[AuthMiddleware] Set competition ID: ${req.competitionId}`);
      }

      console.log(`[AuthMiddleware] Authentication successful, proceeding to handler`);
      console.log(`[AuthMiddleware] ========== END AUTH ==========\n`);
      
      next();
    } catch (error) {
      console.log(`[AuthMiddleware] Error in authentication:`, error);
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