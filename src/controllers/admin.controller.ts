import { Request, Response, NextFunction } from 'express';
import { services } from '../services';
import { ApiError } from '../middleware/errorHandler';
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
   * 
   * @openapi
   * /api/admin/setup:
   *   post:
   *     tags:
   *       - Admin
   *     summary: Set up initial admin account
   *     description: Creates the first admin account. This endpoint is only available when no admin exists in the system.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - username
   *               - password
   *               - email
   *             properties:
   *               username:
   *                 type: string
   *                 description: Admin username
   *                 example: admin
   *               password:
   *                 type: string
   *                 description: Admin password (minimum 8 characters)
   *                 format: password
   *                 example: password123
   *               email:
   *                 type: string
   *                 format: email
   *                 description: Admin email address
   *                 example: admin@example.com
   *     responses:
   *       201:
   *         description: Admin account created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   description: Operation success status
   *                 message:
   *                   type: string
   *                   description: Success message
   *                 admin:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                       description: Admin ID
   *                     username:
   *                       type: string
   *                       description: Admin username
   *                     email:
   *                       type: string
   *                       description: Admin email
   *                     createdAt:
   *                       type: string
   *                       format: date-time
   *                       description: Account creation timestamp
   *                     apiKey:
   *                       type: string
   *                       description: API key for the admin to use with Bearer authentication
   *                       example: abc123def456_ghi789jkl012
   *       400:
   *         description: Missing required parameters or password too short
   *       403:
   *         description: Admin setup not allowed - an admin account already exists
   *       500:
   *         description: Server error
   *
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

      // Generate API key (same as for regular teams)
      const apiKey = services.teamManager.generateApiKey();
    
      // Encrypt API key for storage
      const encryptedApiKey = services.teamManager.encryptApiKey(apiKey);
      
      // Create admin record using team repository
      const admin = await repositories.teamRepository.create({
        id: uuidv4(),
        name: username,  // Use username as team name for admin
        email,
        contactPerson: 'System Administrator',
        apiKey: encryptedApiKey, 
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
          createdAt: admin.createdAt,
          apiKey
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Register a new team
   * 
   * @openapi
   * /api/admin/teams/register:
   *   post:
   *     tags:
   *       - Admin
   *     summary: Register a new team
   *     description: Admin-only endpoint to register a new team. Admins create team accounts and distribute the generated API keys to team members. Teams cannot register themselves.
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - teamName
   *               - email
   *               - contactPerson
   *             properties:
   *               teamName:
   *                 type: string
   *                 description: Name of the team
   *                 example: Team Alpha
   *               email:
   *                 type: string
   *                 format: email
   *                 description: Team email address
   *                 example: team@example.com
   *               contactPerson:
   *                 type: string
   *                 description: Name of the contact person
   *                 example: John Doe
   *     responses:
   *       201:
   *         description: Team registered successfully
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
   *                     contactPerson:
   *                       type: string
   *                       description: Contact person name
   *                     contact_person:
   *                       type: string
   *                       description: Contact person name (snake_case version)
   *                     apiKey:
   *                       type: string
   *                       description: API key for the team to use with Bearer authentication. Admin should securely provide this to the team.
   *                       example: abc123def456_ghi789jkl012
   *                     createdAt:
   *                       type: string
   *                       format: date-time
   *                       description: Account creation timestamp
   *       400:
   *         description: Missing required parameters
   *       409:
   *         description: Team with this email already exists
   *       500:
   *         description: Server error
   * 
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
        
        // Format the response to include api key for the client
        return res.status(201).json({
          success: true,
          team: {
            id: team.id,
            name: team.name,
            email: team.email,
            contactPerson: team.contactPerson,
            contact_person: team.contactPerson, // Add snake_case version for tests
            apiKey: team.apiKey,
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
   * 
   * @openapi
   * /api/admin/competition/start:
   *   post:
   *     tags:
   *       - Admin
   *     summary: Start a competition
   *     description: Create and start a new trading competition with specified teams
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *               - teamIds
   *             properties:
   *               name:
   *                 type: string
   *                 description: Competition name
   *                 example: Spring 2023 Trading Competition
   *               description:
   *                 type: string
   *                 description: Competition description
   *                 example: A trading competition for the spring semester
   *               teamIds:
   *                 type: array
   *                 items:
   *                   type: string
   *                 description: Array of team IDs to include in the competition
   *     responses:
   *       200:
   *         description: Competition started successfully
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
   *                     teamIds:
   *                       type: array
   *                       items:
   *                         type: string
   *                       description: Team IDs participating in the competition
   *       400:
   *         description: Missing required parameters
   *       401:
   *         description: Unauthorized - Admin authentication required
   *       500:
   *         description: Server error
   *
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
   * 
   * @openapi
   * /api/admin/competition/end:
   *   post:
   *     tags:
   *       - Admin
   *     summary: End a competition
   *     description: End an active trading competition and compute final results
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - competitionId
   *             properties:
   *               competitionId:
   *                 type: string
   *                 description: ID of the competition to end
   *     responses:
   *       200:
   *         description: Competition ended successfully
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
   *                       description: Competition end date
   *                     status:
   *                       type: string
   *                       enum: [pending, active, completed]
   *                       description: Competition status
   *                 leaderboard:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       teamId:
   *                         type: string
   *                         description: Team ID
   *                       value:
   *                         type: number
   *                         description: Final portfolio value
   *       400:
   *         description: Missing required parameter (competitionId)
   *       401:
   *         description: Unauthorized - Admin authentication required
   *       404:
   *         description: Competition not found
   *       409:
   *         description: Competition is not in an active state
   *       500:
   *         description: Server error
   *
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
   * 
   * @openapi
   * /api/admin/competition/reports:
   *   get:
   *     tags:
   *       - Admin
   *     summary: Get competition performance reports
   *     description: Get detailed performance reports and leaderboard for a specific competition
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: query
   *         name: competitionId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID of the competition to get reports for
   *     responses:
   *       200:
   *         description: Performance reports retrieved successfully
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
   *                         description: Team rank on the leaderboard
   *                       teamId:
   *                         type: string
   *                         description: Team ID
   *                       teamName:
   *                         type: string
   *                         description: Team name
   *                       portfolioValue:
   *                         type: number
   *                         description: Team portfolio value
   *       400:
   *         description: Missing required parameter (competitionId)
   *       401:
   *         description: Unauthorized - Admin authentication required
   *       404:
   *         description: Competition not found
   *       500:
   *         description: Server error
   *
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
   * 
   * @openapi
   * /api/admin/teams:
   *   get:
   *     tags:
   *       - Admin
   *     summary: List all teams
   *     description: Get a list of all registered teams (excluding admin accounts)
   *     security:
   *       - BearerAuth: []
   *     responses:
   *       200:
   *         description: Teams retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   description: Operation success status
   *                 teams:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: string
   *                         description: Team ID
   *                       name:
   *                         type: string
   *                         description: Team name
   *                       email:
   *                         type: string
   *                         format: email
   *                         description: Team email
   *                       contact_person:
   *                         type: string
   *                         description: Contact person name
   *                       createdAt:
   *                         type: string
   *                         format: date-time
   *                         description: Account creation timestamp
   *                       updatedAt:
   *                         type: string
   *                         format: date-time
   *                         description: Account last update timestamp
   *       401:
   *         description: Unauthorized - Admin authentication required
   *       500:
   *         description: Server error
   *
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
   * 
   * @openapi
   * /api/admin/teams/{teamId}:
   *   delete:
   *     tags:
   *       - Admin
   *     summary: Delete a team
   *     description: Delete a team from the system. Admin accounts cannot be deleted.
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: teamId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID of the team to delete
   *     responses:
   *       200:
   *         description: Team deleted successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   description: Operation success status
   *                 message:
   *                   type: string
   *                   description: Success message
   *       400:
   *         description: Missing team ID
   *       401:
   *         description: Unauthorized - Admin authentication required
   *       403:
   *         description: Cannot delete admin accounts
   *       404:
   *         description: Team not found
   *       500:
   *         description: Server error
   *
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
   * 
   * @openapi
   * /api/admin/competition/{competitionId}/snapshots:
   *   get:
   *     tags:
   *       - Admin
   *     summary: Get competition portfolio snapshots
   *     description: Get portfolio snapshots for all teams or a specific team in a competition
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: competitionId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID of the competition to get snapshots for
   *       - in: query
   *         name: teamId
   *         required: false
   *         schema:
   *           type: string
   *         description: Optional team ID to filter snapshots for a specific team
   *     responses:
   *       200:
   *         description: Portfolio snapshots retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   description: Operation success status
   *                 snapshots:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: string
   *                         description: Snapshot ID
   *                       competitionId:
   *                         type: string
   *                         description: Competition ID
   *                       teamId:
   *                         type: string
   *                         description: Team ID
   *                       timestamp:
   *                         type: string
   *                         format: date-time
   *                         description: Snapshot timestamp
   *                       totalValue:
   *                         type: number
   *                         description: Total portfolio value at snapshot time
   *       400:
   *         description: Missing required parameter or team not in competition
   *       401:
   *         description: Unauthorized - Admin authentication required
   *       404:
   *         description: Competition or team not found
   *       500:
   *         description: Server error
   *
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