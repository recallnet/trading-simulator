import { v4 as uuidv4 } from 'uuid';
import { Trade, TradeResult } from '../types';
import { BalanceManager } from './balance-manager.service';
import { PriceTracker } from './price-tracker.service';
import { repositories } from '../database';

/**
 * Trade Simulator Service
 * Executes simulated trades between tokens
 */
export class TradeSimulator {
  private balanceManager: BalanceManager;
  private priceTracker: PriceTracker;
  // Cache of recent trades for performance (teamId -> trades)
  private tradeCache: Map<string, Trade[]>;

  constructor(balanceManager: BalanceManager, priceTracker: PriceTracker) {
    this.balanceManager = balanceManager;
    this.priceTracker = priceTracker;
    this.tradeCache = new Map();
  }

  /**
   * Execute a trade between two tokens
   * @param teamId The team ID
   * @param competitionId The competition ID
   * @param fromToken The source token address
   * @param toToken The destination token address
   * @param fromAmount The amount to trade
   * @param slippageTolerance Optional slippage tolerance percentage
   * @returns TradeResult object with success status and trade details
   */
  async executeTrade(
    teamId: string,
    competitionId: string,
    fromToken: string,
    toToken: string,
    fromAmount: number,
    slippageTolerance?: number
  ): Promise<TradeResult> {
    try {
      console.log(`\n[TradeSimulator] Starting trade execution:
                Team: ${teamId}
                Competition: ${competitionId}
                From Token: ${fromToken}
                To Token: ${toToken}
                Amount: ${fromAmount}
                Slippage Tolerance: ${slippageTolerance || 'default'}
            `);

      // Validate minimum trade amount
      if (fromAmount < 0.000001) {
        console.log(`[TradeSimulator] Trade amount too small: ${fromAmount}`);
        return {
          success: false,
          error: 'Trade amount too small (minimum: 0.000001)',
        };
      }

      // Validate balances
      const currentBalance = await this.balanceManager.getBalance(teamId, fromToken);
      console.log(`[TradeSimulator] Current balance of ${fromToken}: ${currentBalance}`);

      if (currentBalance < fromAmount) {
        console.log(`[TradeSimulator] Insufficient balance: ${currentBalance} < ${fromAmount}`);
        return {
          success: false,
          error: 'Insufficient balance',
        };
      }

      // Get prices
      const fromPrice = await this.priceTracker.getPrice(fromToken);
      const toPrice = await this.priceTracker.getPrice(toToken);

      console.log(`[TradeSimulator] Got prices:
                From Token (${fromToken}): $${fromPrice}
                To Token (${toToken}): $${toPrice}
            `);

      if (!fromPrice || !toPrice) {
        console.log(`[TradeSimulator] Missing price data:
                    From Token Price: ${fromPrice}
                    To Token Price: ${toPrice}
                `);
        return {
          success: false,
          error: 'Unable to determine price for tokens',
        };
      }

      // Calculate the trade using USD values
      const fromValueUSD = fromAmount * fromPrice;
      
      // Calculate portfolio value to check maximum trade size (25% of portfolio)
      const portfolioValue = await this.calculatePortfolioValue(teamId);
      if (fromValueUSD > portfolioValue * 0.25) {
        console.log(`[TradeSimulator] Trade exceeds maximum size: $${fromValueUSD} > $${portfolioValue * 0.25} (25% of portfolio)`);
        return {
          success: false,
          error: 'Trade exceeds maximum size (25% of portfolio value)',
        };
      }

      // Apply slippage based on trade size
      const baseSlippage = (fromValueUSD / 10000) * 0.5; // 0.5% per $10,000
      const actualSlippage = baseSlippage * (0.8 + (Math.random() * 0.4)); // ±20% randomness
      const slippagePercentage = actualSlippage * 100;
      
      // Calculate final amount with slippage
      const effectiveFromValueUSD = fromValueUSD * (1 - actualSlippage);
      const toAmount = effectiveFromValueUSD / toPrice;

      // Debug logging for price calculations
      console.log(`[TradeSimulator] Trade calculation details:
                From Token (${fromToken}):
                - Amount: ${fromAmount}
                - Price: $${fromPrice}
                - USD Value: $${fromValueUSD.toFixed(6)}
                
                Slippage:
                - Base: ${(baseSlippage * 100).toFixed(4)}%
                - Actual: ${slippagePercentage.toFixed(4)}%
                - Effective USD Value: $${effectiveFromValueUSD.toFixed(6)}

                To Token (${toToken}):
                - Price: $${toPrice}
                - Calculated Amount: ${toAmount.toFixed(6)}

                Exchange Rate: 1 ${fromToken} = ${(toAmount / fromAmount).toFixed(6)} ${toToken}
            `);

      // Execute the trade
      await this.balanceManager.subtractAmount(teamId, fromToken, fromAmount);
      await this.balanceManager.addAmount(teamId, toToken, toAmount);

      // Create trade record
      const trade: Trade = {
        id: uuidv4(),
        timestamp: new Date(),
        fromToken,
        toToken,
        fromAmount,
        toAmount,
        price: toAmount / fromAmount, // Exchange rate
        success: true,
        teamId,
        competitionId
      };

      // Store the trade in database
      await repositories.tradeRepository.create(trade);

      // Update cache
      const cachedTrades = this.tradeCache.get(teamId) || [];
      cachedTrades.unshift(trade); // Add to beginning of array (newest first)
      // Limit cache size to 100 trades per team
      if (cachedTrades.length > 100) {
        cachedTrades.pop();
      }
      this.tradeCache.set(teamId, cachedTrades);

      console.log(`[TradeSimulator] Trade executed successfully:
                Initial ${fromToken} Balance: ${currentBalance}
                New ${fromToken} Balance: ${await this.balanceManager.getBalance(teamId, fromToken)}
                New ${toToken} Balance: ${await this.balanceManager.getBalance(teamId, toToken)}
            `);

      return {
        success: true,
        trade,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during trade';
      console.error(`[TradeSimulator] Trade execution failed:`, errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get all trades for a team
   * @param teamId The team ID
   * @param limit Optional number of trades to return
   * @param offset Optional offset for pagination
   * @returns Array of Trade objects
   */
  async getTeamTrades(teamId: string, limit?: number, offset?: number): Promise<Trade[]> {
    try {
      // If limit is small and we have cache, use it
      if (limit && limit <= 100 && offset === undefined && this.tradeCache.has(teamId)) {
        const cachedTrades = this.tradeCache.get(teamId) || [];
        if (cachedTrades.length >= limit) {
          return cachedTrades.slice(0, limit);
        }
      }
      
      // Get from database
      const trades = await repositories.tradeRepository.getTeamTrades(teamId, limit, offset);
      
      // Update cache if fetching recent trades
      if (!offset && (!limit || limit <= 100)) {
        this.tradeCache.set(teamId, [...trades]);
      }
      
      return trades;
    } catch (error) {
      console.error(`[TradeSimulator] Error getting team trades:`, error);
      return [];
    }
  }

  /**
   * Get all trades for a competition
   * @param competitionId The competition ID
   * @param limit Optional number of trades to return
   * @param offset Optional offset for pagination
   * @returns Array of Trade objects
   */
  async getCompetitionTrades(competitionId: string, limit?: number, offset?: number): Promise<Trade[]> {
    try {
      return await repositories.tradeRepository.getCompetitionTrades(competitionId, limit, offset);
    } catch (error) {
      console.error(`[TradeSimulator] Error getting competition trades:`, error);
      return [];
    }
  }

  /**
   * Calculate a team's portfolio value in USD
   * @param teamId The team ID
   * @returns Total portfolio value in USD
   */
  async calculatePortfolioValue(teamId: string): Promise<number> {
    let totalValue = 0;
    const balances = await this.balanceManager.getAllBalances(teamId);
    
    for (const balance of balances) {
      const price = await this.priceTracker.getPrice(balance.token);
      if (price) {
        totalValue += balance.amount * price;
      }
    }
    
    return totalValue;
  }

  /**
   * Check if trade simulator is healthy
   * For system health check use
   */
  async isHealthy(): Promise<boolean> {
    try {
      // Simple check to see if we can connect to the database
      await repositories.tradeRepository.count();
      return true;
    } catch (error) {
      console.error('[TradeSimulator] Health check failed:', error);
      return false;
    }
  }
} 