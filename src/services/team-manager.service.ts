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
  // Cache for disqualified teams to avoid repeated database lookups
  private disqualifiedTeamsCache: Map<string, { reason: string, date: Date }>;

  constructor() {
    this.apiKeyCache = new Map();
    this.disqualifiedTeamsCache = new Map();
  }

  /**
   * Validate an Ethereum address
   * @param address The Ethereum address to validate
   * @returns True if the address is valid
   */
  private isValidEthereumAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Register a new team
   * @param name Team name
   * @param email Contact email
   * @param contactPerson Contact person name
   * @param walletAddress Ethereum wallet address (must start with 0x)
   * @returns The created team with API credentials
   */
  async registerTeam(name: string, email: string, contactPerson: string, walletAddress: string): Promise<Team> {
    try {
      // Validate wallet address
      if (!walletAddress) {
        throw new Error('Wallet address is required');
      }
      
      if (!this.isValidEthereumAddress(walletAddress)) {
        throw new Error('Invalid Ethereum address format. Must be 0x followed by 40 hex characters.');
      }
      
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
        walletAddress,
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

  /**
   * Validate an API key and check if the team is allowed to access
   * @param apiKey The API key to validate
   * @returns The team ID if valid and not disqualified, null otherwise
   * @throws Error if the team is disqualified
   */
  async validateApiKey(apiKey: string): Promise<string | null> {
    try {
      // First check cache
      const cachedAuth = this.apiKeyCache.get(apiKey);
      if (cachedAuth) {
        // Check if the team is disqualified
        if (this.disqualifiedTeamsCache.has(cachedAuth.teamId)) {
          const disqualificationInfo = this.disqualifiedTeamsCache.get(cachedAuth.teamId);
          throw new Error(`Your team has been disqualified from the competition: ${disqualificationInfo?.reason}`);
        }
        return cachedAuth.teamId;
      }
      
      // If not in cache, search all teams and check if any decrypted key matches
      const teams = await repositories.teamRepository.findAll();
      
      for (const team of teams) {
        try {
          const decryptedKey = this.decryptApiKey(team.apiKey);
          
          if (decryptedKey === apiKey) {
            // Found matching team, check if disqualified
            if (team.disqualified) {
              // Cache the disqualification info
              this.disqualifiedTeamsCache.set(team.id, {
                reason: team.disqualificationReason || 'No reason provided',
                date: team.disqualificationDate || new Date()
              });
              throw new Error(`Your team has been disqualified from the competition: ${team.disqualificationReason}`);
            }
            
            // Add to cache
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
      throw error; // Re-throw to allow middleware to handle it
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

  /**
   * Disqualify a team from competition
   * @param teamId Team ID to disqualify
   * @param reason Reason for disqualification
   * @returns The disqualified team or null if team not found
   */
  async disqualifyTeam(teamId: string, reason: string): Promise<Team | null> {
    try {
      console.log(`[TeamManager] Disqualifying team: ${teamId}, Reason: ${reason}`);
      
      // Call repository to disqualify the team
      const disqualifiedTeam = await repositories.teamRepository.disqualifyTeam(teamId, reason);
      
      if (!disqualifiedTeam) {
        console.log(`[TeamManager] Team not found for disqualification: ${teamId}`);
        return null;
      }
      
      // Update disqualification cache
      this.disqualifiedTeamsCache.set(teamId, {
        reason: reason,
        date: disqualifiedTeam.disqualificationDate || new Date()
      });
      
      console.log(`[TeamManager] Successfully disqualified team: ${disqualifiedTeam.name} (${teamId})`);
      
      return disqualifiedTeam;
    } catch (error) {
      console.error(`[TeamManager] Error disqualifying team ${teamId}:`, error);
      throw new Error(`Failed to disqualify team: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Reinstate a previously disqualified team
   * @param teamId Team ID to reinstate
   * @returns The reinstated team or null if team not found
   */
  async reinstateTeam(teamId: string): Promise<Team | null> {
    try {
      console.log(`[TeamManager] Reinstating team: ${teamId}`);
      
      // Call repository to reinstate the team
      const reinstatedTeam = await repositories.teamRepository.reinstateTeam(teamId);
      
      if (!reinstatedTeam) {
        console.log(`[TeamManager] Team not found for reinstatement: ${teamId}`);
        return null;
      }
      
      // Remove from disqualification cache
      this.disqualifiedTeamsCache.delete(teamId);
      
      console.log(`[TeamManager] Successfully reinstated team: ${reinstatedTeam.name} (${teamId})`);
      
      return reinstatedTeam;
    } catch (error) {
      console.error(`[TeamManager] Error reinstating team ${teamId}:`, error);
      throw new Error(`Failed to reinstate team: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Get all disqualified teams
   * @returns Array of disqualified teams
   */
  async getDisqualifiedTeams(): Promise<Team[]> {
    try {
      return await repositories.teamRepository.findDisqualifiedTeams();
    } catch (error) {
      console.error('[TeamManager] Error retrieving disqualified teams:', error);
      return [];
    }
  }

  /**
   * Check if a team is disqualified
   * @param teamId Team ID to check
   * @returns Object with disqualification status and reason if applicable
   */
  async isTeamDisqualified(teamId: string): Promise<{ isDisqualified: boolean; reason?: string; date?: Date }> {
    try {
      // Check cache first
      if (this.disqualifiedTeamsCache.has(teamId)) {
        const info = this.disqualifiedTeamsCache.get(teamId);
        return {
          isDisqualified: true,
          reason: info?.reason,
          date: info?.date
        };
      }
      
      // If not in cache, check database
      const team = await repositories.teamRepository.findById(teamId);
      
      if (!team) {
        return { isDisqualified: false };
      }
      
      if (team.disqualified) {
        // Update cache
        this.disqualifiedTeamsCache.set(teamId, {
          reason: team.disqualificationReason || 'No reason provided',
          date: team.disqualificationDate || new Date()
        });
        
        return {
          isDisqualified: true,
          reason: team.disqualificationReason,
          date: team.disqualificationDate
        };
      }
      
      return { isDisqualified: false };
    } catch (error) {
      console.error(`[TeamManager] Error checking disqualification status for team ${teamId}:`, error);
      return { isDisqualified: false };
    }
  }
} 