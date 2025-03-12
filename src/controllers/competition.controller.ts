import { Request, Response, NextFunction } from 'express';
import { services } from '../services';
import { repositories } from '../database';
import { ApiError } from '../middleware/errorHandler';

/**
 * Competition Controller
 * Handles competition-related operations
 */
export class CompetitionController {
  /**
   * Get leaderboard for a competition
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  static async getLeaderboard(req: Request, res: Response, next: NextFunction) {
    try {
      // Get active competition or use competitionId from query
      const competitionId = req.query.competitionId as string || 
                           (await services.competitionManager.getActiveCompetition())?.id;
      
      if (!competitionId) {
        throw new ApiError(400, 'No active competition and no competitionId provided');
      }
      
      // Get the competition
      const competition = await services.competitionManager.getCompetition(competitionId);
      if (!competition) {
        throw new ApiError(404, 'Competition not found');
      }
      
      // Check if the team is part of the competition
      // @ts-ignore - teamId is added to the request by team-auth middleware
      const teamId = req.teamId;
      
      // If no team ID, they can't be in the competition
      if (!teamId) {
        throw new ApiError(401, 'Authentication required to view leaderboard');
      }
      
      const isTeamInCompetition = await repositories.teamRepository.isTeamInCompetition(
        teamId, 
        competitionId
      );
      
      if (!isTeamInCompetition) {
        throw new ApiError(403, 'Your team is not participating in this competition');
      }
      
      // Get leaderboard
      const leaderboard = await services.competitionManager.getLeaderboard(competitionId);
      
      // Get all teams
      const teams = await services.teamManager.getAllTeams();
      
      // Map team IDs to names
      const teamMap = new Map(teams.map(team => [team.id, team.name]));
      
      // Format leaderboard with team names
      const formattedLeaderboard = leaderboard.map((entry, index) => ({
        rank: index + 1,
        teamId: entry.teamId,
        teamName: teamMap.get(entry.teamId) || 'Unknown Team',
        portfolioValue: entry.value
      }));
      
      // Return the leaderboard
      res.status(200).json({
        success: true,
        competition,
        leaderboard: formattedLeaderboard
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get status of the current competition
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  static async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      // Get active competition
      const activeCompetition = await services.competitionManager.getActiveCompetition();
      
      if (!activeCompetition) {
        return res.status(200).json({
          success: true,
          active: false,
          message: 'No active competition'
        });
      }
      
      // Check if the team is part of the competition
      // @ts-ignore - teamId is added to the request by team-auth middleware
      const teamId = req.teamId;
      
      // If no team ID, they can't be in the competition
      if (!teamId) {
        return res.status(200).json({
          success: true,
          active: false,
          competition: null,
          message: 'Authentication required to view competition details'
        });
      }
      
      const isTeamInCompetition = await repositories.teamRepository.isTeamInCompetition(
        teamId, 
        activeCompetition.id
      );
      
      if (!isTeamInCompetition) {
        return res.status(200).json({
          success: true,
          active: false,
          competition: null,
          message: 'Your team is not participating in the active competition'
        });
      }
      
      // Return the competition status
      res.status(200).json({
        success: true,
        active: true,
        competition: activeCompetition
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get rules for the competition
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  static async getRules(req: Request, res: Response, next: NextFunction) {
    try {
      // Return the competition rules
      res.status(200).json({
        success: true,
        rules: {
          tradingRules: [
            'Trading is only allowed for tokens with valid price data',
            'All teams start with identical token balances (10 SOL, 1000 USDC, 1000 USDT)',
            'Minimum trade amount: 0.000001 tokens',
            'Maximum single trade: 25% of team\'s total portfolio value',
            'No shorting allowed (trades limited to available balance)',
            'Slippage is applied to all trades based on trade size',
            'Transaction fees are not simulated'
          ],
          rateLimits: [
            '100 requests per minute for trade operations',
            '300 requests per minute for price queries',
            '30 requests per minute for balance/portfolio checks',
            '3,000 requests per minute across all endpoints',
            '10,000 requests per hour per team'
          ],
          slippageFormula: 'baseSlippage = (tradeAmountUSD / 10000) * 0.5%, actualSlippage = baseSlippage * (0.8 + (Math.random() * 0.4))'
        }
      });
    } catch (error) {
      next(error);
    }
  }
} 