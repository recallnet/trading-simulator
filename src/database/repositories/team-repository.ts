import { BaseRepository } from '../base-repository';
import { Team } from '../../types';
import { DatabaseRow } from '../types';
import { PoolClient } from 'pg';

/**
 * Team Repository
 * Handles database operations for teams
 */
export class TeamRepository extends BaseRepository<Team> {
  constructor() {
    super('teams');
  }

  /**
   * Create a new team
   * @param team Team to create
   * @param client Optional database client for transactions
   */
  async create(team: Team, client?: PoolClient): Promise<Team> {
    try {
      const query = `
        INSERT INTO teams (
          id, name, email, contact_person, api_key, wallet_address, is_admin, 
          disqualified, disqualification_reason, disqualification_date, 
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
        ) RETURNING *
      `;
      
      const values = [
        team.id,
        team.name,
        team.email,
        team.contactPerson,
        team.apiKey,
        team.walletAddress,
        team.isAdmin || false,
        team.disqualified || false,
        team.disqualificationReason || null,
        team.disqualificationDate || null,
        team.createdAt,
        team.updatedAt
      ];
      
      const result = client 
        ? await client.query(query, values) 
        : await this.db.query(query, values);
      
      return this.mapToEntity(this.toCamelCase(result.rows[0]));
    } catch (error) {
      console.error('[TeamRepository] Error in create:', error);
      throw error;
    }
  }

  /**
   * Find a team by email
   * @param email The email to search for
   * @param client Optional database client for transactions
   */
  async findByEmail(email: string, client?: PoolClient): Promise<Team | null> {
    try {
      const query = `
        SELECT * FROM teams
        WHERE LOWER(email) = LOWER($1)
        LIMIT 1
      `;
      
      const values = [email];
      
      const result = client 
        ? await client.query(query, values) 
        : await this.db.query(query, values);
      
      return result.rows.length > 0 
        ? this.mapToEntity(this.toCamelCase(result.rows[0])) 
        : null;
    } catch (error) {
      console.error('[TeamRepository] Error in findByEmail:', error);
      throw error;
    }
  }

  /**
   * Update an existing team
   * @param team Team to update
   * @param client Optional database client for transactions
   */
  async update(team: Team, client?: PoolClient): Promise<Team> {
    try {
      const query = `
        UPDATE teams SET
          name = $1,
          email = $2,
          contact_person = $3,
          api_key = $4,
          wallet_address = $5,
          is_admin = $6,
          disqualified = $7,
          disqualification_reason = $8,
          disqualification_date = $9,
          updated_at = $10
        WHERE id = $11
        RETURNING *
      `;
      
      const values = [
        team.name,
        team.email,
        team.contactPerson,
        team.apiKey,
        team.walletAddress,
        team.isAdmin || false,
        team.disqualified || false,
        team.disqualificationReason || null,
        team.disqualificationDate || null,
        new Date(),
        team.id
      ];
      
      const result = client 
        ? await client.query(query, values) 
        : await this.db.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error(`Team with ID ${team.id} not found`);
      }
      
      return this.mapToEntity(this.toCamelCase(result.rows[0]));
    } catch (error) {
      console.error('[TeamRepository] Error in update:', error);
      throw error;
    }
  }

  /**
   * Find a team by API key
   * @param apiKey The API key to search for
   * @param client Optional database client for transactions
   */
  async findByApiKey(apiKey: string, client?: PoolClient): Promise<Team | null> {
    try {
      const query = `
        SELECT * FROM teams
        WHERE api_key = $1
      `;
      
      const values = [apiKey];
      
      const result = client 
        ? await client.query(query, values) 
        : await this.db.query(query, values);
      
      return result.rows.length > 0 
        ? this.mapToEntity(this.toCamelCase(result.rows[0])) 
        : null;
    } catch (error) {
      console.error('[TeamRepository] Error in findByApiKey:', error);
      throw error;
    }
  }

  /**
   * Check if a team exists in a competition
   * @param teamId Team ID
   * @param competitionId Competition ID
   * @param client Optional database client for transactions
   */
  async isTeamInCompetition(teamId: string, competitionId: string, client?: PoolClient): Promise<boolean> {
    try {
      const query = `
        SELECT 1 FROM competition_teams
        WHERE team_id = $1 AND competition_id = $2
      `;
      
      const values = [teamId, competitionId];
      
      const result = client 
        ? await client.query(query, values) 
        : await this.db.query(query, values);
      
      return result.rows.length > 0;
    } catch (error) {
      console.error('[TeamRepository] Error in isTeamInCompetition:', error);
      throw error;
    }
  }

  /**
   * Disqualify a team from competition
   * @param teamId Team ID to disqualify
   * @param reason Reason for disqualification
   * @param client Optional database client for transactions
   */
  async disqualifyTeam(teamId: string, reason: string, client?: PoolClient): Promise<Team | null> {
    try {
      // First check if team exists
      const team = await this.findById(teamId, client);
      if (!team) {
        return null;
      }

      const query = `
        UPDATE teams SET
          disqualified = true,
          disqualification_reason = $1,
          disqualification_date = $2,
          updated_at = $3
        WHERE id = $4
        RETURNING *
      `;
      
      const values = [
        reason,
        new Date(),
        new Date(),
        teamId
      ];
      
      const result = client 
        ? await client.query(query, values) 
        : await this.db.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapToEntity(this.toCamelCase(result.rows[0]));
    } catch (error) {
      console.error('[TeamRepository] Error in disqualifyTeam:', error);
      throw error;
    }
  }

  /**
   * Reinstate a previously disqualified team
   * @param teamId Team ID to reinstate
   * @param client Optional database client for transactions
   */
  async reinstateTeam(teamId: string, client?: PoolClient): Promise<Team | null> {
    try {
      const query = `
        UPDATE teams SET
          disqualified = false,
          disqualification_reason = null,
          disqualification_date = null,
          updated_at = $1
        WHERE id = $2
        RETURNING *
      `;
      
      const values = [
        new Date(),
        teamId
      ];
      
      const result = client 
        ? await client.query(query, values) 
        : await this.db.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapToEntity(this.toCamelCase(result.rows[0]));
    } catch (error) {
      console.error('[TeamRepository] Error in reinstateTeam:', error);
      throw error;
    }
  }

  /**
   * Find all disqualified teams
   * @param client Optional database client for transactions
   */
  async findDisqualifiedTeams(client?: PoolClient): Promise<Team[]> {
    try {
      const query = `
        SELECT * FROM teams
        WHERE disqualified = true
        ORDER BY disqualification_date DESC
      `;
      
      const result = client 
        ? await client.query(query) 
        : await this.db.query(query);
      
      return result.rows.map((row: any) => this.mapToEntity(this.toCamelCase(row)));
    } catch (error) {
      console.error('[TeamRepository] Error in findDisqualifiedTeams:', error);
      throw error;
    }
  }

  /**
   * Map database row to Team entity
   * @param data Row data with camelCase keys
   */
  protected mapToEntity(data: DatabaseRow): Team {
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      contactPerson: data.contactPerson,
      apiKey: data.apiKey,
      walletAddress: data.walletAddress,
      isAdmin: data.isAdmin || false,
      disqualified: data.disqualified || false,
      disqualificationReason: data.disqualificationReason,
      disqualificationDate: data.disqualificationDate ? new Date(data.disqualificationDate) : undefined,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt)
    };
  }
} 