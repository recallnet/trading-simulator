import { Response, NextFunction } from 'express';
import { services } from '../services';
import { repositories } from '../database';
import { ApiError } from '../middleware/errorHandler';
import { config, features } from '../config';
import { AuthenticatedRequest } from '../types';

/**
 * Competition Controller
 * Handles competition-related operations
 */
export class CompetitionController {
  /**
   * Get leaderboard for a competition
   * 
   * @openapi
   * /api/competition/leaderboard:
   *   get:
   *     tags:
   *       - Competition
   *     summary: Get competition leaderboard
   *     description: Retrieve the current leaderboard for a competition. If no competitionId is provided, the active competition is used.
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: query
   *         name: competitionId
   *         required: false
   *         schema:
   *           type: string
   *         description: Optional ID of the competition. If not provided, the active competition is used.
   *     responses:
   *       200:
   *         description: Leaderboard retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   description: Operation success status
   *                 competition:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                       description: Competition ID
   *                     name:
   *                       type: string
   *                       description: Competition name
   *                     description:
   *                       type: string
   *                       description: Competition description
   *                     startDate:
   *                       type: string
   *                       format: date-time
   *                       description: Competition start date
   *                     endDate:
   *                       type: string
   *                       format: date-time
   *                       nullable: true
   *                       description: Competition end date (null if not ended)
   *                     status:
   *                       type: string
   *                       enum: [PENDING, ACTIVE, COMPLETED]
   *                       description: Competition status
   *                 leaderboard:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       rank:
   *                         type: integer
   *                         description: Team ranking position
   *                       teamId:
   *                         type: string
   *                         description: Team ID
   *                       teamName:
   *                         type: string
   *                         description: Team name
   *                       portfolioValue:
   *                         type: number
   *                         description: Current portfolio value
   *                       active:
   *                         type: boolean
   *                         description: Whether the team is active
   *                       deactivationReason:
   *                         type: string
   *                         nullable: true
   *                         description: Reason for deactivation if applicable
   *                 hasInactiveTeams:
   *                   type: boolean
   *                   description: Indicates if any teams are inactive
   *                 inactiveTeamsFiltered:
   *                   type: boolean
   *                   description: Indicates if inactive teams are filtered out
   *       400:
   *         description: No active competition and no competitionId provided
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Team is not participating in the competition
   *       404:
   *         description: Competition not found
   *       500:
   *         description: Server error
   *
   * @param req AuthenticatedRequest object with team authentication information
   * @param res Express response
   * @param next Express next function
   */
  static async getLeaderboard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
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
      const teamId = req.teamId;

      // If no team ID, they can't be in the competition
      if (!teamId) {
        throw new ApiError(401, 'Authentication required to view leaderboard');
      }

      // Check if user is an admin (added by auth middleware)
      const isAdmin = req.isAdmin === true;

      // Check if non-admin access is disabled via environment variable
      const participantLeaderboardAccessDisabled = config.leaderboardAccess;

      // If participant access is disabled and user is not an admin, deny access
      if (participantLeaderboardAccessDisabled && !isAdmin) {
        console.log(`[CompetitionController] Denying leaderboard access to non-admin team ${teamId} as participant access is disabled`);
        throw new ApiError(403, 'Leaderboard access is currently restricted to administrators only');
      }

      // If not an admin, verify team is part of the competition
      if (!isAdmin) {
        const isTeamInCompetition = await repositories.teamRepository.isTeamInCompetition(
          teamId,
          competitionId
        );

        if (!isTeamInCompetition) {
          throw new ApiError(403, 'Your team is not participating in this competition');
        }
      } else {
        console.log(`[CompetitionController] Admin ${teamId} accessing leaderboard for competition ${competitionId}`);
      }

      // Get leaderboard
      const leaderboard = await services.competitionManager.getLeaderboard(competitionId);

      // Get all teams (excluding admin teams)
      const teams = await services.teamManager.getAllTeams(false);

      // Create map of all teams
      const teamMap = new Map(teams.map(team => [team.id, team]));

      // Track teams with inactive status
      const inactiveTeamIds = new Set(
        teams
          .filter(team => team.active === false)
          .map(team => team.id)
      );

      const hasInactiveTeams = inactiveTeamIds.size > 0;

      // Format leaderboard with team names and active status
      const formattedLeaderboard = leaderboard.map((entry, index) => {
        const team = teamMap.get(entry.teamId);
        const isInactive = team?.active === false;

        return {
          rank: index + 1,
          teamId: entry.teamId,
          teamName: team ? team.name : 'Unknown Team',
          portfolioValue: entry.value,
          active: team?.active !== false,
          deactivationReason: isInactive ? team?.deactivationReason : null
        };
      });

      // Return the complete leaderboard with active/inactive flags
      res.status(200).json({
        success: true,
        competition,
        leaderboard: formattedLeaderboard,
        hasInactiveTeams,
        inactiveTeamsFiltered: false
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get status of the current competition
   * 
   * @openapi
   * /api/competition/status:
   *   get:
   *     tags:
   *       - Competition
   *     summary: Get competition status
   *     description: Get the status of the current competition and information about team participation
   *     security:
   *       - BearerAuth: []
   *     responses:
   *       200:
   *         description: Competition status retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   description: Operation success status
   *                 active:
   *                   type: boolean
   *                   description: Whether there is an active competition
   *                 competition:
   *                   type: object
   *                   nullable: true
   *                   description: Competition details (null if no active competition or team not participating)
   *                   properties:
   *                     id:
   *                       type: string
   *                       description: Competition ID
   *                     name:
   *                       type: string
   *                       description: Competition name
   *                     description:
   *                       type: string
   *                       description: Competition description
   *                     startDate:
   *                       type: string
   *                       format: date-time
   *                       description: Competition start date
   *                     endDate:
   *                       type: string
   *                       format: date-time
   *                       nullable: true
   *                       description: Competition end date (null if not ended)
   *                     status:
   *                       type: string
   *                       enum: [PENDING, ACTIVE, COMPLETED]
   *                       description: Competition status
   *                 message:
   *                   type: string
   *                   description: Additional information message
   *                   nullable: true
   *       401:
   *         description: Authentication required (for full competition details)
   *       500:
   *         description: Server error
   *
   * @param req AuthenticatedRequest object with team authentication information
   * @param res Express response
   * @param next Express next function
   */
  static async getStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      console.log('[CompetitionController] Processing getStatus request');

      // Get active competition
      const activeCompetition = await services.competitionManager.getActiveCompetition();

      // Get team ID from request (if authenticated)
      const teamId = req.teamId;

      // If not authenticated, just return basic status
      if (!teamId) {
        const info = activeCompetition
          ? {
            id: activeCompetition.id,
            name: activeCompetition.name,
            status: activeCompetition.status
          }
          : null;

        console.log(`[CompetitionController] Returning basic competition status (no auth)`);

        return res.status(200).json({
          success: true,
          active: !!activeCompetition,
          competition: info,
          message: "Authenticate to get full competition details"
        });
      }

      // No active competition, return empty response
      if (!activeCompetition) {
        console.log('[CompetitionController] No active competition found');

        return res.status(200).json({
          success: true,
          active: false,
          competition: null,
          message: "No active competition found"
        });
      }

      console.log(`[CompetitionController] Found active competition: ${activeCompetition.id}`);

      // Check if the team is part of the competition
      const isTeamInCompetition = await repositories.teamRepository.isTeamInCompetition(
        teamId,
        activeCompetition.id
      );

      // Check if the team is an admin
      const isAdmin = req.isAdmin === true;

      // If team is not in competition and not an admin, return limited info
      if (!isTeamInCompetition && !isAdmin) {
        console.log(`[CompetitionController] Team ${teamId} is not in competition ${activeCompetition.id}`);

        return res.status(200).json({
          success: true,
          active: true,
          competition: {
            id: activeCompetition.id,
            name: activeCompetition.name,
            status: activeCompetition.status,
            startDate: activeCompetition.startDate
          },
          message: "Your team is not participating in this competition"
        });
      }

      // Return full competition details for participants and admins
      if (isAdmin) {
        console.log(`[CompetitionController] Admin ${teamId} accessing competition status`);
      } else {
        console.log(`[CompetitionController] Team ${teamId} is participating in competition ${activeCompetition.id}`);
      }

      res.status(200).json({
        success: true,
        active: true,
        competition: activeCompetition,
        participating: true
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get rules for the competition
   * 
   * @openapi
   * /api/competition/rules:
   *   get:
   *     tags:
   *       - Competition
   *     summary: Get competition rules
   *     description: Get the rules, rate limits, and other configuration details for the competition
   *     responses:
   *       200:
   *         description: Competition rules retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   description: Operation success status
   *                 rules:
   *                   type: object
   *                   properties:
   *                     tradingRules:
   *                       type: array
   *                       items:
   *                         type: string
   *                       description: List of trading rules for the competition
   *                     rateLimits:
   *                       type: array
   *                       items:
   *                         type: string
   *                       description: Rate limits for API endpoints
   *                     availableChains:
   *                       type: object
   *                       properties:
   *                         svm:
   *                           type: boolean
   *                           description: Whether Solana (SVM) is available
   *                         evm:
   *                           type: array
   *                           items:
   *                             type: string
   *                           description: List of available EVM chains
   *                     slippageFormula:
   *                       type: string
   *                       description: Formula used for calculating slippage
   *                     portfolioSnapshots:
   *                       type: object
   *                       properties:
   *                         interval:
   *                           type: string
   *                           description: Interval between portfolio snapshots
   *       500:
   *         description: Server error
   *
   * @param req AuthenticatedRequest object with team authentication information
   * @param res Express response
   * @param next Express next function
   */
  static async getRules(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      // Check if the team is authenticated
      const teamId = req.teamId;

      // If no team ID, they can't be authenticated
      if (!teamId) {
        throw new ApiError(401, 'Authentication required to view competition rules');
      }

      // Check if user is an admin (added by auth middleware)
      const isAdmin = req.isAdmin === true;

      // If not an admin, verify team is part of the active competition
      if (!isAdmin) {
        // Get active competition
        const activeCompetition = await services.competitionManager.getActiveCompetition();

        if (!activeCompetition) {
          throw new ApiError(400, 'No active competition');
        }

        const isTeamInCompetition = await repositories.teamRepository.isTeamInCompetition(
          teamId,
          activeCompetition.id
        );

        if (!isTeamInCompetition) {
          throw new ApiError(403, 'Your team is not participating in the active competition');
        }
      } else {
        console.log(`[CompetitionController] Admin ${teamId} accessing competition rules`);
      }

      // Get available chains and tokens
      const evmChains = config.evmChains;

      // Build initial balances description based on config
      const initialBalanceDescriptions = [];

      // Chain-specific balances
      for (const chain of Object.keys(config.specificChainBalances)) {
        const chainBalances = config.specificChainBalances[chain as keyof typeof config.specificChainBalances];
        const tokenItems = [];

        for (const token of Object.keys(chainBalances)) {
          const amount = chainBalances[token];
          if (amount > 0) {
            tokenItems.push(`${amount} ${token.toUpperCase()}`);
          }
        }

        if (tokenItems.length > 0) {
          let chainName = chain;
          // Format chain name for better readability
          if (chain === 'eth') chainName = 'Ethereum';
          else if (chain === 'svm') chainName = 'Solana';
          else chainName = chain.charAt(0).toUpperCase() + chain.slice(1); // Capitalize

          initialBalanceDescriptions.push(`${chainName}: ${tokenItems.join(', ')}`);
        }
      }

      // Return the competition rules with actual config values
      res.status(200).json({
        success: true,
        rules: {
          tradingRules: [
            'Trading is only allowed for tokens with valid price data',
            `All teams start with identical token balances: ${initialBalanceDescriptions.join('; ')}`,
            'Minimum trade amount: 0.000001 tokens',
            'Maximum single trade: 25% of team\'s total portfolio value',
            'No shorting allowed (trades limited to available balance)',
            'Slippage is applied to all trades based on trade size',
            `Cross-chain trading: ${features.ALLOW_CROSS_CHAIN_TRADING ? 'Enabled' : 'Disabled'}`,
            'Transaction fees are not simulated'
          ],
          rateLimits: [
            `${config.rateLimiting.maxRequests} requests per ${config.rateLimiting.windowMs / 1000} seconds per endpoint`,
            '100 requests per minute for trade operations',
            '300 requests per minute for price queries',
            '30 requests per minute for balance/portfolio checks',
            '3,000 requests per minute across all endpoints',
            '10,000 requests per hour per team'
          ],
          availableChains: {
            svm: true,
            evm: evmChains
          },
          slippageFormula: 'baseSlippage = (tradeAmountUSD / 10000) * 0.05%, actualSlippage = baseSlippage * (0.9 + (Math.random() * 0.2))',
          portfolioSnapshots: {
            interval: `${config.portfolio.snapshotIntervalMs / 60000} minutes`
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
} 