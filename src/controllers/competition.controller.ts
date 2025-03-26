import { Request, Response, NextFunction } from 'express';
import { services } from '../services';
import { repositories } from '../database';
import { ApiError } from '../middleware/errorHandler';
import { config, features } from '../config';
import { BlockchainType } from '../types';

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
   *                       enum: [pending, active, completed]
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
      
      // Get all teams (excluding admin teams)
      const teams = await services.teamManager.getAllTeams(false);
      
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
   *                       enum: [pending, active, completed]
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
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  static async getRules(req: Request, res: Response, next: NextFunction) {
    try {
      // Get available chains and tokens
      const evmChains = config.evmChains;
      
      // Build initial balances description based on config
      const initialBalanceDescriptions = [];
      
      // SVM balances
      const svmBalances = config.multiChainInitialBalances[BlockchainType.SVM];
      if (svmBalances) {
        const svmTokens = [];
        if (svmBalances.sol > 0) svmTokens.push(`${svmBalances.sol} SOL`);
        if (svmBalances.usdc > 0) svmTokens.push(`${svmBalances.usdc} USDC`);
        if (svmBalances.usdt > 0) svmTokens.push(`${svmBalances.usdt} USDT`);
        
        if (svmTokens.length > 0) {
          initialBalanceDescriptions.push(`Solana: ${svmTokens.join(', ')}`);
        }
      }
      
      // EVM balances (general)
      const evmBalances = config.multiChainInitialBalances[BlockchainType.EVM];
      if (evmBalances) {
        const evmTokens = [];
        if (evmBalances.eth > 0) evmTokens.push(`${evmBalances.eth} ETH`);
        if (evmBalances.usdc > 0) evmTokens.push(`${evmBalances.usdc} USDC`);
        if (evmBalances.usdt > 0) evmTokens.push(`${evmBalances.usdt} USDT`);
        
        if (evmTokens.length > 0) {
          initialBalanceDescriptions.push(`Default for EVM chains: ${evmTokens.join(', ')}`);
        }
      }
      
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