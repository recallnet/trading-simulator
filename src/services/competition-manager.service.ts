import { v4 as uuidv4 } from 'uuid';
import { Competition, CompetitionStatus, PortfolioValue } from '../types';
import { BalanceManager } from './balance-manager.service';
import { TradeSimulator } from './trade-simulator.service';
import { PriceTracker } from './price-tracker.service';
import { repositories } from '../database';

// Define the shape of portfolio snapshot data
interface PortfolioSnapshot {
  id: number;
  teamId: string;
  competitionId: string;
  timestamp: Date;
  totalValue: number;
}

/**
 * Competition Manager Service
 * Manages trading competitions
 */
export class CompetitionManager {
  private balanceManager: BalanceManager;
  private tradeSimulator: TradeSimulator;
  private priceTracker: PriceTracker;
  private activeCompetitionCache: string | null = null;

  constructor(
    balanceManager: BalanceManager,
    tradeSimulator: TradeSimulator,
    priceTracker: PriceTracker
  ) {
    this.balanceManager = balanceManager;
    this.tradeSimulator = tradeSimulator;
    this.priceTracker = priceTracker;
    
    // Load active competition on initialization
    this.loadActiveCompetition();
  }

  /**
   * Load the active competition from the database
   * This is used at startup to restore the active competition state
   */
  private async loadActiveCompetition(): Promise<void> {
    try {
      const activeCompetition = await repositories.competitionRepository.findActive();
      if (activeCompetition) {
        this.activeCompetitionCache = activeCompetition.id;
        console.log(`[CompetitionManager] Loaded active competition: ${activeCompetition.name} (${activeCompetition.id})`);
      }
    } catch (error) {
      console.error('[CompetitionManager] Error loading active competition:', error);
    }
  }

  /**
   * Create a new competition
   * @param name Competition name
   * @param description Optional description
   * @returns The created competition
   */
  async createCompetition(name: string, description?: string): Promise<Competition> {
    const id = uuidv4();
    const competition: Competition = {
      id,
      name,
      description,
      startDate: null,
      endDate: null,
      status: CompetitionStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await repositories.competitionRepository.create(competition);
    
    console.log(`[CompetitionManager] Created competition: ${name} (${id})`);
    return competition;
  }

  /**
   * Get a competition by ID
   * @param competitionId The competition ID
   * @returns The competition or null if not found
   */
  async getCompetition(competitionId: string): Promise<Competition | null> {
    return repositories.competitionRepository.findById(competitionId);
  }

  /**
   * Get all competitions
   * @returns Array of all competitions
   */
  async getAllCompetitions(): Promise<Competition[]> {
    return repositories.competitionRepository.findAll();
  }

  /**
   * Start a competition
   * @param competitionId The competition ID
   * @param teamIds Array of team IDs participating in the competition
   * @returns The updated competition
   */
  async startCompetition(competitionId: string, teamIds: string[]): Promise<Competition> {
    const competition = await repositories.competitionRepository.findById(competitionId);
    if (!competition) {
      throw new Error(`Competition not found: ${competitionId}`);
    }

    if (competition.status !== CompetitionStatus.PENDING) {
      throw new Error(`Competition cannot be started: ${competition.status}`);
    }

    const activeCompetition = await repositories.competitionRepository.findActive();
    if (activeCompetition) {
      throw new Error(`Another competition is already active: ${activeCompetition.id}`);
    }

    // Reset balances for all teams
    for (const teamId of teamIds) {
      await this.balanceManager.resetTeamBalances(teamId);
      
      // Register team in the competition
      await repositories.competitionRepository.addTeamToCompetition(competitionId, teamId);
    }

    // Update competition status
    competition.status = CompetitionStatus.ACTIVE;
    competition.startDate = new Date();
    competition.updatedAt = new Date();
    await repositories.competitionRepository.update(competition);
    
    // Update cache
    this.activeCompetitionCache = competitionId;

    console.log(`[CompetitionManager] Started competition: ${competition.name} (${competitionId})`);
    console.log(`[CompetitionManager] Participating teams: ${teamIds.join(', ')}`);
    
    return competition;
  }

  /**
   * End a competition
   * @param competitionId The competition ID
   * @returns The updated competition
   */
  async endCompetition(competitionId: string): Promise<Competition> {
    const competition = await repositories.competitionRepository.findById(competitionId);
    if (!competition) {
      throw new Error(`Competition not found: ${competitionId}`);
    }

    if (competition.status !== CompetitionStatus.ACTIVE) {
      throw new Error(`Competition is not active: ${competition.status}`);
    }

    if (this.activeCompetitionCache !== competitionId) {
      throw new Error(`Competition is not the active one: ${this.activeCompetitionCache}`);
    }

    // Take final portfolio snapshots
    await this.takePortfolioSnapshots(competitionId);

    // Update competition status
    competition.status = CompetitionStatus.COMPLETED;
    competition.endDate = new Date();
    competition.updatedAt = new Date();
    await repositories.competitionRepository.update(competition);
    
    // Update cache
    this.activeCompetitionCache = null;

    console.log(`[CompetitionManager] Ended competition: ${competition.name} (${competitionId})`);
    
    return competition;
  }

  /**
   * Check if a competition is active
   * @param competitionId The competition ID
   * @returns True if the competition is active
   */
  async isCompetitionActive(competitionId: string): Promise<boolean> {
    const competition = await repositories.competitionRepository.findById(competitionId);
    return competition?.status === CompetitionStatus.ACTIVE;
  }

  /**
   * Get the currently active competition
   * @returns The active competition or null if none
   */
  async getActiveCompetition(): Promise<Competition | null> {
    // First check cache for better performance
    if (this.activeCompetitionCache) {
      const competition = await repositories.competitionRepository.findById(this.activeCompetitionCache);
      if (competition?.status === CompetitionStatus.ACTIVE) {
        return competition;
      } else {
        // Cache is out of sync, clear it
        this.activeCompetitionCache = null;
      }
    }
    
    // Fallback to database query
    const activeCompetition = await repositories.competitionRepository.findActive();
    if (activeCompetition) {
      this.activeCompetitionCache = activeCompetition.id;
    }
    return activeCompetition;
  }

  /**
   * Take portfolio snapshots for all teams in a competition
   * @param competitionId The competition ID
   */
  async takePortfolioSnapshots(competitionId: string): Promise<void> {
    const teams = await repositories.competitionRepository.getCompetitionTeams(competitionId);
    const timestamp = new Date();
    
    for (const teamId of teams) {
      const balances = await this.balanceManager.getAllBalances(teamId);
      const valuesByToken: Record<string, { amount: number; valueUsd: number; price: number }> = {};
      let totalValue = 0;
      
      for (const balance of balances) {
        const price = await this.priceTracker.getPrice(balance.token);
        if (price) {
          const valueUsd = balance.amount * price;
          valuesByToken[balance.token] = {
            amount: balance.amount,
            valueUsd,
            price
          };
          totalValue += valueUsd;
        }
      }
      
      // Create portfolio snapshot in database
      const snapshot = await repositories.competitionRepository.createPortfolioSnapshot({
        teamId,
        competitionId,
        timestamp,
        totalValue
      });
      
      // Store token values
      for (const [token, data] of Object.entries(valuesByToken)) {
        await repositories.competitionRepository.createPortfolioTokenValue({
          portfolioSnapshotId: snapshot.id,
          tokenAddress: token,
          amount: data.amount,
          valueUsd: data.valueUsd,
          price: data.price
        });
      }
    }
    
    console.log(`[CompetitionManager] Took portfolio snapshots for ${teams.length} teams in competition ${competitionId}`);
  }

  /**
   * Get the leaderboard for a competition
   * @param competitionId The competition ID
   * @returns Array of team IDs sorted by portfolio value
   */
  async getLeaderboard(competitionId: string): Promise<{ teamId: string; value: number }[]> {
    try {
      // Try to get from recent portfolio snapshots first
      const snapshots = await repositories.competitionRepository.getLatestPortfolioSnapshots(competitionId);
      
      if (snapshots.length > 0) {
        // Sort by value descending
        return snapshots.map((snapshot: PortfolioSnapshot) => ({
          teamId: snapshot.teamId,
          value: snapshot.totalValue
        })).sort((a: { value: number }, b: { value: number }) => b.value - a.value);
      }
      
      // Fallback to calculating current values
      const teams = await repositories.competitionRepository.getCompetitionTeams(competitionId);
      const leaderboard: { teamId: string; value: number }[] = [];
      
      for (const teamId of teams) {
        const portfolioValue = await this.tradeSimulator.calculatePortfolioValue(teamId);
        leaderboard.push({
          teamId,
          value: portfolioValue
        });
      }
      
      // Sort by value descending
      return leaderboard.sort((a, b) => b.value - a.value);
    } catch (error) {
      console.error(`[CompetitionManager] Error getting leaderboard for competition ${competitionId}:`, error);
      return [];
    }
  }

  /**
   * Get portfolio snapshots for a team in a competition
   * @param competitionId The competition ID
   * @param teamId The team ID
   * @returns Array of portfolio snapshots
   */
  async getTeamPortfolioSnapshots(competitionId: string, teamId: string): Promise<PortfolioValue[]> {
    const snapshots = await repositories.competitionRepository.getTeamPortfolioSnapshots(competitionId, teamId);
    const result: PortfolioValue[] = [];
    
    for (const snapshot of snapshots) {
      const tokenValues = await repositories.competitionRepository.getPortfolioTokenValues(snapshot.id);
      
      const valuesByToken: Record<string, { amount: number; valueUsd: number }> = {};
      for (const tokenValue of tokenValues) {
        valuesByToken[tokenValue.tokenAddress] = {
          amount: tokenValue.amount,
          valueUsd: tokenValue.valueUsd
        };
      }
      
      result.push({
        teamId,
        competitionId,
        timestamp: snapshot.timestamp,
        totalValue: snapshot.totalValue,
        valuesByToken
      });
    }
    
    return result;
  }
  
  /**
   * Check if competition manager is healthy
   * For system health check use
   */
  async isHealthy(): Promise<boolean> {
    try {
      // Simple check to see if we can connect to the database
      await repositories.competitionRepository.count();
      return true;
    } catch (error) {
      console.error('[CompetitionManager] Health check failed:', error);
      return false;
    }
  }
} 