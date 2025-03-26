import { Request, Response, NextFunction } from 'express';
import { services } from '../services';
import { ApiError } from '../middleware/errorHandler';
import { repositories } from '../database';

/**
 * Account Controller
 * Handles account-related operations
 */
export class AccountController {
  /**
   * Get profile for the authenticated team
   * 
   * @openapi
   * /api/account/profile:
   *   get:
   *     tags:
   *       - Account
   *     summary: Get team profile
   *     description: Get profile information for the authenticated team
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: header
   *         name: Authorization
   *         schema:
   *           type: string
   *         required: true
   *         description: Bearer token for authentication (format "Bearer YOUR_API_KEY")
   *     responses:
   *       200:
   *         description: Team profile
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   description: Operation success status
   *                 team:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                       description: Team ID
   *                     name:
   *                       type: string
   *                       description: Team name
   *                     email:
   *                       type: string
   *                       description: Team email
   *                     contact_person:
   *                       type: string
   *                       description: Contact person name
   *                     createdAt:
   *                       type: string
   *                       format: date-time
   *                       description: Team creation timestamp
   *                     updatedAt:
   *                       type: string
   *                       format: date-time
   *                       description: Team last update timestamp
   *       401:
   *         description: Unauthorized - Missing or invalid authentication
   *       404:
   *         description: Team not found
   *       500:
   *         description: Server error
   * 
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const teamId = req.teamId as string;
      
      // Get the team
      const team = await repositories.teamRepository.findById(teamId);
      
      if (!team) {
        throw new ApiError(404, 'Team not found');
      }
      
      // Return the team profile
      res.status(200).json({
        success: true,
        team: {
          id: team.id,
          name: team.name,
          email: team.email,
          contact_person: team.contactPerson,
          createdAt: team.createdAt,
          updatedAt: team.updatedAt
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Update profile for the authenticated team
   * 
   * @openapi
   * /api/account/profile:
   *   put:
   *     tags:
   *       - Account
   *     summary: Update team profile
   *     description: Update profile information for the authenticated team
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: header
   *         name: Authorization
   *         schema:
   *           type: string
   *         required: true
   *         description: Bearer token for authentication (format "Bearer YOUR_API_KEY")
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               contactPerson:
   *                 type: string
   *                 description: New contact person name
   *     responses:
   *       200:
   *         description: Updated team profile
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   description: Operation success status
   *                 team:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                       description: Team ID
   *                     name:
   *                       type: string
   *                       description: Team name
   *                     email:
   *                       type: string
   *                       description: Team email
   *                     contact_person:
   *                       type: string
   *                       description: Updated contact person name
   *                     createdAt:
   *                       type: string
   *                       format: date-time
   *                       description: Team creation timestamp
   *                     updatedAt:
   *                       type: string
   *                       format: date-time
   *                       description: Team update timestamp
   *       401:
   *         description: Unauthorized - Missing or invalid authentication
   *       404:
   *         description: Team not found
   *       500:
   *         description: Server error
   * 
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  static async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const teamId = req.teamId as string;
      const { contactPerson } = req.body;
      
      // Get the team
      const team = await repositories.teamRepository.findById(teamId);
      
      if (!team) {
        throw new ApiError(404, 'Team not found');
      }
      
      // Update contact person
      if (contactPerson !== undefined) {
        team.contactPerson = contactPerson;
      }
      
      // Save the updated team
      team.updatedAt = new Date();
      const updatedTeam = await repositories.teamRepository.update(team);
      
      // Return the updated team profile
      res.status(200).json({
        success: true,
        team: {
          id: updatedTeam.id,
          name: updatedTeam.name,
          email: updatedTeam.email,
          contact_person: updatedTeam.contactPerson,
          createdAt: updatedTeam.createdAt,
          updatedAt: updatedTeam.updatedAt
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get balances for the authenticated team
   * 
   * @openapi
   * /api/account/balances:
   *   get:
   *     tags:
   *       - Account
   *     summary: Get token balances
   *     description: Get all token balances for the authenticated team
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: header
   *         name: Authorization
   *         schema:
   *           type: string
   *         required: true
   *         description: Bearer token for authentication (format "Bearer YOUR_API_KEY")
   *     responses:
   *       200:
   *         description: Team token balances
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   description: Operation success status
   *                 teamId:
   *                   type: string
   *                   description: Team ID
   *                 balances:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       token:
   *                         type: string
   *                         description: Token address
   *                       amount:
   *                         type: number
   *                         description: Token balance amount
   *                       chain:
   *                         type: string
   *                         enum: [evm, svm]
   *                         description: Blockchain type of the token
   *                       specificChain:
   *                         type: string
   *                         nullable: true
   *                         description: Specific chain for EVM tokens
   *       401:
   *         description: Unauthorized - Missing or invalid authentication
   *       500:
   *         description: Server error
   * 
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  static async getBalances(req: Request, res: Response, next: NextFunction) {
    try {
      const teamId = req.teamId as string;
      
      // Get the balances
      const balances = await services.balanceManager.getAllBalances(teamId);
      
      // Enhance balances with chain information
      const enhancedBalances = await Promise.all(balances.map(async (balance) => {
        // First check if we have chain information in our database
        const latestPriceRecord = await repositories.priceRepository.getLatestPrice(balance.token);
        
        // If we have complete chain info in our database, use that
        if (latestPriceRecord && latestPriceRecord.chain) {
          // For SVM tokens, specificChain is always 'svm'
          if (latestPriceRecord.chain === 'svm') {
            return {
              ...balance,
              chain: latestPriceRecord.chain,
              specificChain: 'svm'
            };
          }
          
          // For EVM tokens, if we have a specificChain, use it
          if (latestPriceRecord.chain === 'evm' && latestPriceRecord.specificChain) {
            return {
              ...balance,
              chain: latestPriceRecord.chain,
              specificChain: latestPriceRecord.specificChain
            };
          }
        }
        
        // If we don't have complete chain info, use getTokenInfo (which will update our database)
        const tokenInfo = await services.priceTracker.getTokenInfo(balance.token);
        
        if (tokenInfo) {
          return {
            ...balance,
            chain: tokenInfo.chain,
            specificChain: tokenInfo.specificChain
          };
        }
        
        // As a last resort, determine chain type locally
        const chain = services.priceTracker.determineChain(balance.token);
        const specificChain = chain === 'svm' ? 'svm' : null;
        
        return {
          ...balance,
          chain,
          specificChain
        };
      }));
      
      // Return the balances
      res.status(200).json({
        success: true,
        teamId,
        balances: enhancedBalances
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get portfolio information for the authenticated team
   * 
   * @openapi
   * /api/account/portfolio:
   *   get:
   *     tags:
   *       - Account
   *     summary: Get portfolio information
   *     description: Get portfolio valuation and token details for the authenticated team
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: header
   *         name: Authorization
   *         schema:
   *           type: string
   *         required: true
   *         description: Bearer token for authentication (format "Bearer YOUR_API_KEY")
   *     responses:
   *       200:
   *         description: Team portfolio information
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   description: Operation success status
   *                 teamId:
   *                   type: string
   *                   description: Team ID
   *                 totalValue:
   *                   type: number
   *                   description: Total portfolio value in USD
   *                 tokens:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       token:
   *                         type: string
   *                         description: Token address
   *                       amount:
   *                         type: number
   *                         description: Token balance amount
   *                       price:
   *                         type: number
   *                         description: Current token price in USD
   *                       value:
   *                         type: number
   *                         description: Total value of token holdings in USD
   *                       chain:
   *                         type: string
   *                         enum: [evm, svm]
   *                         description: Blockchain type of the token
   *                       specificChain:
   *                         type: string
   *                         nullable: true
   *                         description: Specific chain for EVM tokens
   *                 snapshotTime:
   *                   type: string
   *                   format: date-time
   *                   description: Time of the snapshot (if source is 'snapshot')
   *                 source:
   *                   type: string
   *                   enum: [snapshot, live-calculation]
   *                   description: Source of the portfolio data
   *       401:
   *         description: Unauthorized - Missing or invalid authentication
   *       500:
   *         description: Server error
   * 
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  static async getPortfolio(req: Request, res: Response, next: NextFunction) {
    try {
      const teamId = req.teamId as string;
      
      // First, check if there's an active competition
      const activeCompetition = await repositories.competitionRepository.findActive();
      
      // Check if we have snapshot data (preferred method)
      if (activeCompetition) {
        // Try to get the latest snapshot for this team
        const teamSnapshots = await repositories.competitionRepository.getTeamPortfolioSnapshots(
          activeCompetition.id, 
          teamId
        );
        
        // If we have a snapshot, use it
        if (teamSnapshots.length > 0) {
          // Get the most recent snapshot
          const latestSnapshot = teamSnapshots[teamSnapshots.length - 1];
          
          // Get the token values for this snapshot
          const tokenValues = await repositories.competitionRepository.getPortfolioTokenValues(latestSnapshot.id);
          
          // Format the token values with additional information
          const formattedTokens = tokenValues.map(tokenValue => {
            // Use the price from the snapshot and only determine chain type
            const chain = services.priceTracker.determineChain(tokenValue.tokenAddress);
            
            // For SVM tokens, the specificChain is always 'svm'
            // For EVM tokens, we don't have specificChain without an API call, so we'll leave it undefined
            const specificChain = chain === 'svm' ? 'svm' : undefined;
            
            return {
              token: tokenValue.tokenAddress,
              amount: tokenValue.amount,
              price: tokenValue.price,
              value: tokenValue.valueUsd,
              chain,
              specificChain
            };
          });
          
          // Return the snapshot information
          return res.status(200).json({
            success: true,
            teamId,
            totalValue: latestSnapshot.totalValue,
            tokens: formattedTokens,
            snapshotTime: latestSnapshot.timestamp,
            source: 'snapshot' // Indicate this is from a snapshot
          });
        }
        
        // No snapshot, but we should initiate one for future requests
        console.log(`[AccountController] No portfolio snapshots found for team ${teamId} in competition ${activeCompetition.id}`);
        // Request a snapshot asynchronously (don't await)
        services.competitionManager.takePortfolioSnapshots(activeCompetition.id).catch(error => {
          console.error(`[AccountController] Error taking snapshot for team ${teamId}:`, error);
        });
      }
      
      // Fall back to calculating portfolio on-demand
      console.log(`[AccountController] Using live calculation for portfolio of team ${teamId}`);
      
      // Get the balances
      const balances = await services.balanceManager.getAllBalances(teamId);
      let totalValue = 0;
      const tokenValues = [];
      
      // Calculate values with minimal API calls
      for (const balance of balances) {
        // Get price and token information using the existing service method
        const tokenInfo = await services.priceTracker.getTokenInfo(balance.token);
        const price = tokenInfo?.price || 0;
        const value = price ? balance.amount * price : 0;
        totalValue += value;
        
        tokenValues.push({
          token: balance.token,
          amount: balance.amount,
          price: price,
          value,
          chain: tokenInfo?.chain,
          specificChain: tokenInfo?.specificChain
        });
      }
      
      // Return the calculated portfolio information
      return res.status(200).json({
        success: true,
        teamId,
        totalValue,
        tokens: tokenValues,
        source: 'live-calculation' // Indicate this is a live calculation
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get trade history for the authenticated team
   * 
   * @openapi
   * /api/account/trades:
   *   get:
   *     tags:
   *       - Account
   *     summary: Get trade history
   *     description: Get trade history for the authenticated team
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: header
   *         name: Authorization
   *         schema:
   *           type: string
   *         required: true
   *         description: Bearer token for authentication (format "Bearer YOUR_API_KEY")
   *     responses:
   *       200:
   *         description: Team trade history
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   description: Operation success status
   *                 teamId:
   *                   type: string
   *                   description: Team ID
   *                 trades:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: string
   *                         description: Unique trade ID
   *                       teamId:
   *                         type: string
   *                         description: Team ID that executed the trade
   *                       competitionId:
   *                         type: string
   *                         description: ID of the competition this trade is part of
   *                       fromToken:
   *                         type: string
   *                         description: Token address that was sold
   *                       toToken:
   *                         type: string
   *                         description: Token address that was bought
   *                       fromAmount:
   *                         type: number
   *                         description: Amount of fromToken that was sold
   *                       toAmount:
   *                         type: number
   *                         description: Amount of toToken that was received
   *                       price:
   *                         type: number
   *                         description: Price at which the trade was executed
   *                       success:
   *                         type: boolean
   *                         description: Whether the trade was successfully completed
   *                       error:
   *                         type: string
   *                         description: Error message if the trade failed
   *                       timestamp:
   *                         type: string
   *                         format: date-time
   *                         description: Timestamp of when the trade was executed
   *                       fromChain:
   *                         type: string
   *                         description: Blockchain type of the source token
   *                       toChain:
   *                         type: string
   *                         description: Blockchain type of the destination token
   *                       fromSpecificChain:
   *                         type: string
   *                         description: Specific chain for the source token
   *                       toSpecificChain:
   *                         type: string
   *                         description: Specific chain for the destination token
   *       401:
   *         description: Unauthorized - Missing or invalid authentication
   *       500:
   *         description: Server error
   * 
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  static async getTrades(req: Request, res: Response, next: NextFunction) {
    try {
      const teamId = req.teamId as string;
      
      // Get the trades
      const trades = await services.tradeSimulator.getTeamTrades(teamId);
      
      // Sort trades by timestamp (newest first)
      const sortedTrades = [...trades].sort((a, b) => 
        b.timestamp.getTime() - a.timestamp.getTime()
      );
      
      // Return the trades
      res.status(200).json({
        success: true,
        teamId,
        trades: sortedTrades
      });
    } catch (error) {
      next(error);
    }
  }
} 