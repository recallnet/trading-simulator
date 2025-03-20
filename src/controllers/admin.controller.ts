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
        apiSecretEncrypted: services.teamManager.encryptApiSecret(password), // Store encrypted password for HMAC
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
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters: teamName, email, contactPerson'
        });
      }
      
      // First check if a team with this email already exists
      const existingTeam = await repositories.teamRepository.findByEmail(email);
      
      if (existingTeam) {
        const errorMessage = `A team with email ${email} already exists`;
        console.log('[AdminController] Duplicate email error:', errorMessage);
        return res.status(409).json({
          success: false,
          error: errorMessage
        });
      }
      
      try {
        // Register the team
        const team = await services.teamManager.registerTeam(teamName, email, contactPerson);
        
        // Format the response to include apiSecret for the client
        return res.status(201).json({
          success: true,
          team: {
            id: team.id,
            name: team.name,
            email: team.email,
            contactPerson: team.contactPerson,
            contact_person: team.contactPerson, // Add snake_case version for tests
            apiKey: team.apiKey,
            apiSecret: (team as any).apiSecret, // Type assertion since this is a temporary field not in the interface
            createdAt: team.createdAt
          }
        });
      } catch (error) {
        console.error('[AdminController] Error registering team:', error);
        
        // Check if this is a duplicate email error that somehow got here
        if (error instanceof Error && error.message.includes('email already exists')) {
          return res.status(409).json({
            success: false,
            error: error.message
          });
        }
        
        // Handle other errors
        return res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error registering team'
        });
      }
    } catch (error) {
      console.error('[AdminController] Uncaught error in registerTeam:', error);
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
        competition: {
          ...startedCompetition,
          teamIds
        }
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
  
  /**
   * List all teams
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  static async listAllTeams(req: Request, res: Response, next: NextFunction) {
    try {
      // Get all teams (excluding admin teams)
      const teams = await services.teamManager.getAllTeams(false);
      
      // Format the response to match the expected structure
      const formattedTeams = teams.map(team => ({
        id: team.id,
        name: team.name,
        email: team.email,
        contact_person: team.contactPerson,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt
      }));
      
      // Return the teams
      res.status(200).json({
        success: true,
        teams: formattedTeams
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a team
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  static async deleteTeam(req: Request, res: Response, next: NextFunction) {
    try {
      const { teamId } = req.params;
      
      if (!teamId) {
        return res.status(400).json({
          success: false,
          error: 'Team ID is required'
        });
      }
      
      // Get the team first to check if it exists and is not an admin
      const team = await services.teamManager.getTeam(teamId);
      
      if (!team) {
        return res.status(404).json({
          success: false,
          error: 'Team not found'
        });
      }
      
      // Prevent deletion of admin teams
      if (team.isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Cannot delete admin accounts'
        });
      }
      
      // Delete the team
      const deleted = await services.teamManager.deleteTeam(teamId);
      
      if (deleted) {
        return res.status(200).json({
          success: true,
          message: 'Team successfully deleted'
        });
      } else {
        return res.status(500).json({
          success: false,
          error: 'Failed to delete team'
        });
      }
    } catch (error) {
      console.error('[AdminController] Error deleting team:', error);
      next(error);
    }
  }

  /**
   * Get portfolio snapshots for a competition
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  static async getCompetitionSnapshots(req: Request, res: Response, next: NextFunction) {
    try {
      const { competitionId } = req.params;
      
      // Validate required parameters
      if (!competitionId) {
        throw new ApiError(400, 'Missing required parameter: competitionId');
      }
      
      // Check if the competition exists
      const competition = await services.competitionManager.getCompetition(competitionId);
      if (!competition) {
        throw new ApiError(404, 'Competition not found');
      }
      
      // Get team ID from query param if provided
      const teamId = req.query.teamId as string;
      
      // Get snapshots based on whether a team ID was provided
      let snapshots;
      if (teamId) {
        // Check if the team exists and is in the competition
        const team = await repositories.teamRepository.findById(teamId);
        if (!team) {
          throw new ApiError(404, 'Team not found');
        }
        
        const isTeamInCompetition = await repositories.teamRepository.isTeamInCompetition(
          teamId, 
          competitionId
        );
        
        if (!isTeamInCompetition) {
          throw new ApiError(400, 'Team is not participating in this competition');
        }
        
        // Get snapshots for the specific team
        snapshots = await services.competitionManager.getTeamPortfolioSnapshots(competitionId, teamId);
      } else {
        // Get snapshots for all teams in the competition
        const teams = await repositories.competitionRepository.getCompetitionTeams(competitionId);
        snapshots = [];
        
        for (const teamId of teams) {
          const teamSnapshots = await services.competitionManager.getTeamPortfolioSnapshots(competitionId, teamId);
          snapshots.push(...teamSnapshots);
        }
      }
      
      // Return the snapshots
      res.status(200).json({
        success: true,
        snapshots
      });
    } catch (error) {
      next(error);
    }
  }
} 