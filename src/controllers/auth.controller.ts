import { Request, Response, NextFunction } from 'express';
import { services } from '../services';
import { repositories } from '../database';
import { ApiError } from '../middleware/errorHandler';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { config } from '../config';

/**
 * Auth Controller
 * Handles authentication-related operations
 */
export class AuthController {
  /**
   * Login with API key and secret for teams or username/password for admins
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      // Check if this is an admin login (username/password) or a team login (apiKey/apiSecret)
      const { username, password, apiKey, apiSecret } = req.body;

      // Admin login flow
      if (username && password) {
        // Find admin by username (stored in name field)
        const teams = await repositories.teamRepository.findAll();
        const admin = teams.find(team => team.isAdmin && team.name === username);
        
        if (!admin) {
          throw new ApiError(401, 'Invalid username or password');
        }
        
        // Verify password using the decrypted value from apiSecretEncrypted
        let isPasswordValid = false;
        try {
          if (admin.apiSecretEncrypted) {
            const decryptedSecret = services.teamManager.decryptApiSecret(admin.apiSecretEncrypted);
            isPasswordValid = password === decryptedSecret;
          }
        } catch (error) {
          console.error('[AuthController] Error decrypting admin password:', error);
        }
        
        if (!isPasswordValid) {
          throw new ApiError(401, 'Invalid username or password');
        }
        
        // Generate JWT token for admin
        const token = jwt.sign(
          { 
            id: admin.id, 
            isAdmin: true,
            name: admin.name
          },
          config.security.jwtSecret,
          { expiresIn: '24h' }
        );
        
        res.status(200).json({
          success: true,
          token,
          admin: {
            id: admin.id,
            username: admin.name,
            email: admin.email
          },
          message: 'Admin authentication successful'
        });
        return;
      }
      
      // Team API key login flow
      if (apiKey && apiSecret) {
        // Find team by API key
        const team = await repositories.teamRepository.findByApiKey(apiKey);
        if (!team) {
          throw new ApiError(401, 'Invalid API credentials');
        }
        
        // For team authentication, we just verify that credentials were provided
        // The actual API signature validation happens on each API request
        
        res.status(200).json({
          success: true,
          message: 'Authentication successful. Use your API key and secret to sign requests.',
          team: {
            id: team.id,
            name: team.name
          }
        });
        return;
      }
      
      // Neither admin nor team credentials provided
      throw new ApiError(400, 'Missing required parameters: either (username, password) for admin or (apiKey, apiSecret) for teams');
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Validate API credentials
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  static async validate(req: Request, res: Response, next: NextFunction) {
    try {
      // Get headers
      const apiKey = req.header('X-API-Key');
      const timestamp = req.header('X-Timestamp');
      const signature = req.header('X-Signature');
      
      // Validate required headers
      if (!apiKey || !timestamp || !signature) {
        throw new ApiError(401, 'Missing required headers: X-API-Key, X-Timestamp, X-Signature');
      }
      
      // Validate API request
      const teamId = await services.teamManager.validateApiRequest(
        apiKey,
        signature,
        req.method,
        req.path,
        timestamp,
        JSON.stringify(req.body)
      );
      
      if (!teamId) {
        throw new ApiError(401, 'Invalid API credentials');
      }
      
      // Get team
      const team = await services.teamManager.getTeam(teamId);
      
      // Return validation result
      res.status(200).json({
        success: true,
        teamId,
        teamName: team?.name || 'Unknown Team',
        message: 'API credentials are valid'
      });
    } catch (error) {
      next(error);
    }
  }
} 