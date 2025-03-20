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
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  static async getBalances(req: Request, res: Response, next: NextFunction) {
    try {
      const teamId = req.teamId as string;
      
      // Get the balances
      const balances = await services.balanceManager.getAllBalances(teamId);
      
      // Return the balances
      res.status(200).json({
        success: true,
        teamId,
        balances
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get portfolio information for the authenticated team
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