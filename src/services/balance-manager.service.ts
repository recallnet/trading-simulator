import { Balance } from '../types';
import { config } from '../config';
import { repositories } from '../database';

/**
 * Balance Manager Service
 * Manages token balances for teams
 */
export class BalanceManager {
  // Cache of teamId -> Map of tokenAddress -> balance
  private balanceCache: Map<string, Map<string, number>>;

  constructor() {
    this.balanceCache = new Map();
  }

  /**
   * Initialize a team's balances with default values
   * @param teamId The team ID
   */
  async initializeTeamBalances(teamId: string): Promise<void> {
    console.log(`[BalanceManager] Initializing balances for team ${teamId}`);
    
    try {
      const initialBalances = new Map<string, number>();
      
      // Set default balances from config
      initialBalances.set(config.tokens.sol, config.initialBalances.sol);
      initialBalances.set(config.tokens.usdc, config.initialBalances.usdc);
      initialBalances.set(config.tokens.usdt, config.initialBalances.usdt);
      
      // Save to database
      await repositories.balanceRepository.initializeTeamBalances(teamId, initialBalances);
      
      // Update cache
      this.balanceCache.set(teamId, initialBalances);
    } catch (error) {
      console.error(`[BalanceManager] Error initializing balances for team ${teamId}:`, error);
      throw error;
    }
  }

  /**
   * Get a team's balance for a specific token
   * @param teamId The team ID
   * @param tokenAddress The token address
   * @returns The balance amount or 0 if not found
   */
  async getBalance(teamId: string, tokenAddress: string): Promise<number> {
    try {
      // First check cache
      const cachedBalances = this.balanceCache.get(teamId);
      if (cachedBalances && cachedBalances.has(tokenAddress)) {
        return cachedBalances.get(tokenAddress) || 0;
      }
      
      // Get from database
      const balance = await repositories.balanceRepository.getBalance(teamId, tokenAddress);
      
      // If balance exists, update cache
      if (balance) {
        if (!this.balanceCache.has(teamId)) {
          this.balanceCache.set(teamId, new Map<string, number>());
        }
        this.balanceCache.get(teamId)?.set(tokenAddress, balance.amount);
        return balance.amount;
      }
      
      return 0;
    } catch (error) {
      console.error(`[BalanceManager] Error getting balance for team ${teamId}, token ${tokenAddress}:`, error);
      return 0;
    }
  }

  /**
   * Get all balances for a team
   * @param teamId The team ID
   * @returns Array of Balance objects
   */
  async getAllBalances(teamId: string): Promise<Balance[]> {
    try {
      // Get from database
      const balances = await repositories.balanceRepository.getTeamBalances(teamId);
      
      // Update cache
      const balanceMap = new Map<string, number>();
      balances.forEach(balance => {
        balanceMap.set(balance.token, balance.amount);
      });
      this.balanceCache.set(teamId, balanceMap);
      
      return balances;
    } catch (error) {
      console.error(`[BalanceManager] Error getting all balances for team ${teamId}:`, error);
      return [];
    }
  }

  /**
   * Update a team's token balance
   * @param teamId The team ID
   * @param tokenAddress The token address
   * @param amount The new balance amount
   */
  async updateBalance(teamId: string, tokenAddress: string, amount: number): Promise<void> {
    try {
      if (amount < 0) {
        throw new Error('Balance cannot be negative');
      }
      
      // Save to database
      await repositories.balanceRepository.saveBalance(teamId, tokenAddress, amount);
      
      // Update cache
      if (!this.balanceCache.has(teamId)) {
        this.balanceCache.set(teamId, new Map<string, number>());
      }
      this.balanceCache.get(teamId)?.set(tokenAddress, amount);
      
      console.log(`[BalanceManager] Updated balance for team ${teamId}, token ${tokenAddress}: ${amount}`);
    } catch (error) {
      console.error(`[BalanceManager] Error updating balance for team ${teamId}, token ${tokenAddress}:`, error);
      throw error;
    }
  }

  /**
   * Add amount to a team's token balance
   * @param teamId The team ID
   * @param tokenAddress The token address
   * @param amount The amount to add
   */
  async addAmount(teamId: string, tokenAddress: string, amount: number): Promise<void> {
    const currentBalance = await this.getBalance(teamId, tokenAddress);
    await this.updateBalance(teamId, tokenAddress, currentBalance + amount);
  }

  /**
   * Subtract amount from a team's token balance
   * @param teamId The team ID
   * @param tokenAddress The token address
   * @param amount The amount to subtract
   */
  async subtractAmount(teamId: string, tokenAddress: string, amount: number): Promise<void> {
    const currentBalance = await this.getBalance(teamId, tokenAddress);
    if (currentBalance < amount) {
      throw new Error('Insufficient balance');
    }
    await this.updateBalance(teamId, tokenAddress, currentBalance - amount);
  }

  /**
   * Reset a team's balances to initial values
   * @param teamId The team ID
   */
  async resetTeamBalances(teamId: string): Promise<void> {
    try {
      const initialBalances = new Map<string, number>();
      
      // Set default balances from config
      initialBalances.set(config.tokens.sol, config.initialBalances.sol);
      initialBalances.set(config.tokens.usdc, config.initialBalances.usdc);
      initialBalances.set(config.tokens.usdt, config.initialBalances.usdt);
      
      // Reset in database
      await repositories.balanceRepository.resetTeamBalances(teamId, initialBalances);
      
      // Update cache
      this.balanceCache.set(teamId, initialBalances);
      
      console.log(`[BalanceManager] Reset balances for team ${teamId}`);
    } catch (error) {
      console.error(`[BalanceManager] Error resetting balances for team ${teamId}:`, error);
      throw error;
    }
  }

  /**
   * Check if a team has sufficient balance for a trade
   * @param teamId The team ID
   * @param tokenAddress The token address
   * @param amount The amount to check
   * @returns True if the team has sufficient balance
   */
  async hasSufficientBalance(teamId: string, tokenAddress: string, amount: number): Promise<boolean> {
    const balance = await this.getBalance(teamId, tokenAddress);
    return balance >= amount;
  }

  /**
   * Check if balance manager is healthy
   * For system health check use
   */
  async isHealthy(): Promise<boolean> {
    try {
      // Simple check to see if we can connect to the database
      await repositories.balanceRepository.count();
      return true;
    } catch (error) {
      console.error('[BalanceManager] Health check failed:', error);
      return false;
    }
  }
} 