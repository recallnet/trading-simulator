import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
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
      
      // Generate API key (longer, more secure format)
      const apiKey = this.generateApiKey();
      
      // Encrypt API key for storage
      const encryptedApiKey = this.encryptApiKey(apiKey);
      
      // Create team record
      const team: Team = {
        id,
        name,
        email,
        contactPerson,
        apiKey: encryptedApiKey, // Store encrypted key in database
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Store in database
      const savedTeam = await repositories.teamRepository.create(team);
      
      // Update cache with plaintext key
      this.apiKeyCache.set(apiKey, {
        teamId: id,
        key: apiKey
      });
      
      console.log(`[TeamManager] Registered team: ${name} (${id})`);
      
      // Return team with unencrypted apiKey for display to admin
      return {
        ...savedTeam,
        apiKey // Return unencrypted key
      };
    } catch (error) {
      if (error instanceof Error) {
        console.error('[TeamManager] Error registering team:', error);
        throw error;
      }
      
      console.error('[TeamManager] Unknown error registering team:', error);
      throw new Error(`Failed to register team: ${error}`);
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
   * @param includeAdmins Whether to include admin accounts in the results (default: true)
   * @returns Array of teams, filtered by the includeAdmins parameter
   */
  async getAllTeams(includeAdmins: boolean = true): Promise<Team[]> {
    try {
      const teams = await repositories.teamRepository.findAll();
      
      // Filter out admin teams if needed
      const filteredTeams = includeAdmins 
        ? teams 
        : teams.filter(team => !team.isAdmin);
      
      return filteredTeams.map(team => ({
        ...team,
      }));
    } catch (error) {
      console.error('[TeamManager] Error retrieving all teams:', error);
      return [];
    }
  }

  async validateApiKey(apiKey: string): Promise<string | null> {
    try {
      // First check cache
      const cachedAuth = this.apiKeyCache.get(apiKey);
      if (cachedAuth) {
        return cachedAuth.teamId;
      }
      
      // If not in cache, search all teams and check if any decrypted key matches
      const teams = await repositories.teamRepository.findAll();
      
      for (const team of teams) {
        try {
          const decryptedKey = this.decryptApiKey(team.apiKey);
          
          if (decryptedKey === apiKey) {
            // Found matching team, add to cache
            this.apiKeyCache.set(apiKey, {
              teamId: team.id,
              key: apiKey
            });
            
            return team.id;
          }
        } catch (decryptError) {
          // Log but continue checking other teams
          console.error(`[TeamManager] Error decrypting key for team ${team.id}:`, decryptError);
        }
      }
      
      // No matching team found
      return null;
    } catch (error) {
      console.error('[TeamManager] Error validating API key:', error);
      return null;
    }
  }

  /**
   * Generate a new API key
   * @returns A unique API key
   */
  public generateApiKey(): string {
    // Generate just 2 segments for a shorter key
    const segment1 = crypto.randomBytes(8).toString('hex');  // 16 chars
    const segment2 = crypto.randomBytes(8).toString('hex');  // 16 chars
    
    // Combine with a prefix and separator underscore for readability
    const key = `${segment1}_${segment2}`;
    console.log(`[TeamManager] Generated API key with length: ${key.length}`);
    return key;
  }

  /**
    * Encrypt an API key for database storage
    * @param key The API key to encrypt
    * @returns The encrypted key
    */
  public encryptApiKey(key: string): string {
    try {
      console.log(`[TeamManager] Encrypting API key with length: ${key.length}`);
      const algorithm = 'aes-256-cbc';
      const iv = crypto.randomBytes(16);
      
      // Create a consistently-sized key from the root encryption key
      const cryptoKey = crypto.createHash('sha256')
        .update(String(config.security.rootEncryptionKey))
        .digest();
      
      const cipher = crypto.createCipheriv(algorithm, cryptoKey, iv);
      let encrypted = cipher.update(key, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Return the IV and encrypted data together, clearly separated
      const result = `${iv.toString('hex')}:${encrypted}`;
      console.log(`[TeamManager] Encrypted key length: ${result.length}`);
      return result;
    } catch (error) {
      console.error('[TeamManager] Error encrypting API key:', error);
      throw new Error('Failed to encrypt API key');
    }
  }

  /**
    * Decrypt an encrypted API key
    * @param encryptedKey The encrypted API key
    * @returns The original API key
    */
  private decryptApiKey(encryptedKey: string): string {
    try {
      const algorithm = 'aes-256-cbc';
      const parts = encryptedKey.split(':');
      
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted key format');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      
      // Create a consistently-sized key from the root encryption key
      const cryptoKey = crypto.createHash('sha256')
        .update(String(config.security.rootEncryptionKey))
        .digest();
      
      const decipher = crypto.createDecipheriv(algorithm, cryptoKey, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('[TeamManager] Error decrypting API key:', error);
      throw error;
    }
  }

  /**
   * Check if the system is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      const count = await repositories.teamRepository.count();
      return count >= 0;
    } catch (error) {
      console.error('[TeamManager] Health check failed:', error);
      return false;
    }
  }

  /**
   * Delete a team by ID
   * @param teamId The team ID to delete
   * @returns true if team was deleted, false otherwise
   */
  async deleteTeam(teamId: string): Promise<boolean> {
    try {
      // Get the team to find its API key
      const team = await repositories.teamRepository.findById(teamId);
      
      if (!team) {
        console.log(`[TeamManager] Team not found for deletion: ${teamId}`);
        return false;
      }
      
      // Remove from cache if present
      if (team.apiKey) {
        this.apiKeyCache.delete(team.apiKey);
      }
      
      // Delete the team from the database
      const deleted = await repositories.teamRepository.delete(teamId);
      
      if (deleted) {
        console.log(`[TeamManager] Successfully deleted team: ${team.name} (${teamId})`);
      } else {
        console.log(`[TeamManager] Failed to delete team: ${team.name} (${teamId})`);
      }
      
      return deleted;
    } catch (error) {
      console.error(`[TeamManager] Error deleting team ${teamId}:`, error);
      throw new Error(`Failed to delete team: ${error instanceof Error ? error.message : error}`);
    }
  }
} 