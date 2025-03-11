import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { Team, ApiAuth } from '../types';
import { config } from '../config';
import { repositories } from '../database';

/**
 * Team Manager Service
 * Manages team registration and API key authentication
 */
export class TeamManager {
  // In-memory cache for API keys to avoid database lookups on every request
  private apiKeyCache: Map<string, ApiAuth>;

  constructor() {
    this.apiKeyCache = new Map();
  }

  /**
   * Register a new team
   * @param name Team name
   * @param email Contact email
   * @param contactPerson Contact person name
   * @returns The created team with API credentials
   */
  async registerTeam(name: string, email: string, contactPerson: string): Promise<Team> {
    try {
      // Generate team ID
      const id = uuidv4();
      
      // Generate API key and secret
      const apiKey = this.generateApiKey();
      const apiSecret = this.generateApiSecret();
      
      // Hash the API secret for storage
      const hashedSecret = bcrypt.hashSync(apiSecret, 10);
      
      // Create team record
      const team: Team = {
        id,
        name,
        email,
        contactPerson,
        apiKey,
        apiSecret: hashedSecret, // Store hashed secret
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Store in database
      const savedTeam = await repositories.teamRepository.create(team);
      
      // Update cache
      this.apiKeyCache.set(apiKey, {
        teamId: id,
        key: apiKey,
        secret: hashedSecret
      });
      
      console.log(`[TeamManager] Registered team: ${name} (${id})`);
      
      // Return team with plain text secret (only time it's available)
      return {
        ...savedTeam,
        apiSecret // Return plain text secret to client
      };
    } catch (error) {
      console.error('[TeamManager] Error registering team:', error);
      throw error;
    }
  }

  /**
   * Get a team by ID
   * @param teamId The team ID
   * @returns The team or null if not found
   */
  async getTeam(teamId: string): Promise<Team | null> {
    try {
      return await repositories.teamRepository.findById(teamId);
    } catch (error) {
      console.error(`[TeamManager] Error retrieving team ${teamId}:`, error);
      return null;
    }
  }

  /**
   * Get all teams
   * @returns Array of all teams
   */
  async getAllTeams(): Promise<Team[]> {
    try {
      const teams = await repositories.teamRepository.findAll();
      // Don't expose hashed secrets
      return teams.map(team => ({
        ...team,
        apiSecret: '[REDACTED]' 
      }));
    } catch (error) {
      console.error('[TeamManager] Error retrieving all teams:', error);
      return [];
    }
  }

  /**
   * Validate API key and HMAC signature
   * @param apiKey The API key
   * @param signature The HMAC signature
   * @param method The HTTP method
   * @param path The request path
   * @param timestamp The request timestamp
   * @param body The request body
   * @returns The team ID if valid, null otherwise
   */
  async validateApiRequest(
    apiKey: string,
    signature: string,
    method: string,
    path: string,
    timestamp: string,
    body: string
  ): Promise<string | null> {
    try {
      // First check cache
      let auth = this.apiKeyCache.get(apiKey);
      
      // If not in cache, check database
      if (!auth) {
        const team = await repositories.teamRepository.findByApiKey(apiKey);
        if (!team) {
          console.log(`[TeamManager] Invalid API key: ${apiKey}`);
          return null;
        }
        
        // Add to cache
        auth = {
          teamId: team.id,
          key: apiKey,
          secret: team.apiSecret
        };
        this.apiKeyCache.set(apiKey, auth);
      }
      
      // Get team
      const team = await repositories.teamRepository.findById(auth.teamId);
      if (!team) {
        console.log(`[TeamManager] Team not found for API key: ${apiKey}`);
        return null;
      }
      
      // Validate timestamp (prevent replay attacks)
      const requestTime = new Date(timestamp).getTime();
      const currentTime = Date.now();
      const timeDiff = Math.abs(currentTime - requestTime);
      
      if (timeDiff > 5 * 60 * 1000) { // 5 minutes
        console.log(`[TeamManager] Request timestamp too old: ${timestamp}`);
        return null;
      }
      
      // Compute expected signature
      const data = method + path + timestamp + body;
      const expectedSignature = this.computeHmacSignature(data, config.security.hmacSecret);
      
      // Validate signature
      if (signature !== expectedSignature) {
        console.log(`[TeamManager] Invalid signature for team: ${team.name}`);
        return null;
      }
      
      console.log(`[TeamManager] Validated API request for team: ${team.name}`);
      return team.id;
    } catch (error) {
      console.error('[TeamManager] Error validating API request:', error);
      return null;
    }
  }

  /**
   * Check if a team is healthy (exists and has proper setup)
   * For system health check use
   */
  async isHealthy(): Promise<boolean> {
    try {
      const count = await repositories.teamRepository.count();
      return count >= 0; // Just verify we can connect to the database
    } catch (error) {
      console.error('[TeamManager] Health check failed:', error);
      return false;
    }
  }

  /**
   * Generate a new API key
   * @returns A unique API key
   */
  private generateApiKey(): string {
    // Generate a random API key with prefix
    const randomBytes = crypto.randomBytes(16).toString('hex');
    return `sk_${randomBytes}`;
  }

  /**
   * Generate a new API secret
   * @returns A secure random API secret
   */
  private generateApiSecret(): string {
    // Generate a random API secret
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Compute HMAC signature for request validation
   * @param data The data to sign
   * @param secret The secret key
   * @returns The HMAC signature
   */
  private computeHmacSignature(data: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('hex');
  }
} 