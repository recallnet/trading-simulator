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
      
      // Get the balances
      const balances = await services.balanceManager.getAllBalances(teamId);
      
      // Calculate portfolio value
      const portfolioValue = await services.tradeSimulator.calculatePortfolioValue(teamId);
      
      // Get token prices and calculate individual values
      const tokenValues = [];
      for (const balance of balances) {
        const price = await services.priceTracker.getPrice(balance.token);
        const value = price ? balance.amount * price : 0;
        
        tokenValues.push({
          token: balance.token,
          amount: balance.amount,
          price: price || 0,
          value
        });
      }
      
      // Return the portfolio information
      res.status(200).json({
        success: true,
        teamId,
        totalValue: portfolioValue,
        tokens: tokenValues
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