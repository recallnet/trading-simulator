import { Request, Response, NextFunction } from 'express';
import { services } from '../services';
import { ApiError } from '../middleware/errorHandler';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { repositories } from '../database';

/**
 * Admin Controller
 * Handles administrative operations
 */
export class AdminController {
  
  /**
   * Setup the initial admin account
   * This endpoint is only available when no admin exists in the system
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  static async setupAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      // Check if any admin already exists
      const teams = await repositories.teamRepository.findAll();
      const adminExists = teams.some(team => team.isAdmin === true);
      
      if (adminExists) {
        throw new ApiError(403, 'Admin setup is not allowed - an admin account already exists');
      }
      
      // Validate required parameters
      const { username, password, email } = req.body;
      if (!username || !password || !email) {
        throw new ApiError(400, 'Missing required parameters: username, password, email');
      }
      
      // Validate password strength
      if (password.length < 8) {
        throw new ApiError(400, 'Password must be at least 8 characters long');
      }
      
      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      // Create admin record using team repository
      const admin = await repositories.teamRepository.create({
        id: uuidv4(),
        name: username,  // Use username as team name for admin
        email,
        contactPerson: 'System Administrator',
        apiKey: `admin-${uuidv4()}`, // Still use a prefix for clarity
        apiSecret: hashedPassword, // Store password in apiSecret field
        isAdmin: true,   // Set admin flag
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Return success without exposing password
      res.status(201).json({
        success: true,
        message: 'Admin account created successfully',
        admin: {
          id: admin.id,
          username: admin.name,
          email: admin.email,
          createdAt: admin.createdAt
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Register a new team
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  static async registerTeam(req: Request, res: Response, next: NextFunction) {
    try {
      const { teamName, email, contactPerson } = req.body;
      
      // Validate required parameters
      if (!teamName || !email || !contactPerson) {
        throw new ApiError(400, 'Missing required parameters: teamName, email, contactPerson');
      }
      
      // Register the team
      const team = await services.teamManager.registerTeam(teamName, email, contactPerson);
      
      // Return team with API credentials
      res.status(201).json({
        success: true,
        team: {
          id: team.id,
          name: team.name,
          email: team.email,
          contactPerson: team.contactPerson,
          apiKey: team.apiKey,
          apiSecret: team.apiSecret, // Only time the secret is returned in plain text
          createdAt: team.createdAt
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Start a competition
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  static async startCompetition(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, description, teamIds } = req.body;
      
      // Validate required parameters
      if (!name || !teamIds || !Array.isArray(teamIds) || teamIds.length === 0) {
        throw new ApiError(400, 'Missing required parameters: name, teamIds (array)');
      }
      
      // Create a new competition
      const competition = await services.competitionManager.createCompetition(name, description);
      
      // Start the competition
      const startedCompetition = await services.competitionManager.startCompetition(competition.id, teamIds);
      
      // Return the started competition
      res.status(200).json({
        success: true,
        competition: startedCompetition
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * End a competition
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  static async endCompetition(req: Request, res: Response, next: NextFunction) {
    try {
      const { competitionId } = req.body;
      
      // Validate required parameters
      if (!competitionId) {
        throw new ApiError(400, 'Missing required parameter: competitionId');
      }
      
      // End the competition
      const endedCompetition = await services.competitionManager.endCompetition(competitionId);
      
      // Get final leaderboard
      const leaderboard = await services.competitionManager.getLeaderboard(competitionId);
      
      // Return the ended competition with leaderboard
      res.status(200).json({
        success: true,
        competition: endedCompetition,
        leaderboard
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get performance reports
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  static async getPerformanceReports(req: Request, res: Response, next: NextFunction) {
    try {
      const { competitionId } = req.query;
      
      // Validate required parameters
      if (!competitionId) {
        throw new ApiError(400, 'Missing required parameter: competitionId');
      }
      
      // Get the competition
      const competition = await services.competitionManager.getCompetition(competitionId as string);
      if (!competition) {
        throw new ApiError(404, 'Competition not found');
      }
      
      // Get leaderboard
      const leaderboard = await services.competitionManager.getLeaderboard(competitionId as string);
      
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
      
      // Return performance report
      res.status(200).json({
        success: true,
        competition,
        leaderboard: formattedLeaderboard
      });
    } catch (error) {
      next(error);
    }
  }
} 