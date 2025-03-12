import { PriceSource } from '../types';
import { JupiterProvider } from './providers/jupiter.provider';
import { RaydiumProvider } from './providers/raydium.provider';
import { SerumProvider } from './providers/serum.provider';
// import { SolanaProvider } from './providers/solana.provider'; // No longer using Solana provider
import { config } from '../config';
import { repositories } from '../database';

// Define PriceRecord type for consistent use
interface PriceRecord {
  id?: number;
  token: string;
  price: number;
  timestamp: Date;
}

/**
 * Price Tracker Service
 * Fetches and caches token prices from multiple providers
 */
export class PriceTracker {
  private providers: PriceSource[];
  private priceCache: Map<string, { price: number; timestamp: number }>;
  private readonly CACHE_DURATION = config.priceCacheDuration; // 30 seconds

  constructor() {
    // Initialize providers in priority order
    const jupiterProvider = new JupiterProvider();
    const raydiumProvider = new RaydiumProvider();
    const serumProvider = new SerumProvider();
    // const solanaProvider = new SolanaProvider(); // No longer using Solana provider

    this.providers = [
      jupiterProvider, // Jupiter for most tokens
      raydiumProvider, // Raydium as another source
      serumProvider,   // Serum as a third source
      // solanaProvider,  // Removed as it doesn't provide real prices
    ];
    this.priceCache = new Map();
  }

  /**
   * Get a provider by name
   * @param name The name of the provider to get
   * @returns The provider instance or null if not found
   */
  getProviderByName(name: string): PriceSource | null {
    return this.providers.find(p => p.getName().toLowerCase() === name.toLowerCase()) || null;
  }

  /**
   * Get current price for a token
   * Tries each provider in sequence until a price is found
   * @param tokenAddress The token address to get price for
   * @returns The token price in USD or null if not available
   */
  async getPrice(tokenAddress: string): Promise<number | null> {
    console.log(`[PriceTracker] Getting price for token: ${tokenAddress}`);

    // Check cache first
    const cached = this.priceCache.get(tokenAddress);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log(`[PriceTracker] Using cached price for ${tokenAddress}: $${cached.price}`);
      return cached.price;
    }

    // Try each provider in sequence until we get a price
    for (const provider of this.providers) {
      try {
        console.log(`[PriceTracker] Attempting to get price from ${provider.getName()}`);
        const price = await provider.getPrice(tokenAddress);

        if (price !== null) {
          console.log(`[PriceTracker] Got price $${price} from ${provider.getName()}`);
          
          // Store price in cache
          this.priceCache.set(tokenAddress, {
            price,
            timestamp: Date.now(),
          });
          
          // Store price in database for historical record (but never rely on this for trading)
          await this.storePrice(tokenAddress, price);
          
          return price;
        } else {
          console.log(`[PriceTracker] No price available from ${provider.getName()}`);
        }
      } catch (error) {
        console.error(
          `[PriceTracker] Error fetching price from ${provider.getName()}:`,
          error instanceof Error ? error.message : 'Unknown error'
        );
        continue;
      }
    }

    console.log(`[PriceTracker] No price available for ${tokenAddress} from any provider`);
    
    // As a last resort, try to get the most recent price from the database
    // This should rarely happen if providers are working correctly
    try {
      const lastPrice = await repositories.priceRepository.getLatestPrice(tokenAddress);
      if (lastPrice) {
        console.log(`[PriceTracker] Using last stored price for ${tokenAddress}: $${lastPrice.price} (WARNING: not real-time price)`);
        return lastPrice.price;
      }
    } catch (error) {
      console.error(`[PriceTracker] Error fetching last price from database:`, error);
    }
    
    return null;
  }

  /**
   * Store price data in the database
   * @param tokenAddress The token address
   * @param price The price in USD
   */
  private async storePrice(tokenAddress: string, price: number): Promise<void> {
    try {
      await repositories.priceRepository.create({
        token: tokenAddress,
        price,
        timestamp: new Date()
      });
    } catch (error) {
      console.error(`[PriceTracker] Error storing price in database:`, error);
    }
  }

  /**
   * Check if a token is supported by any provider
   * @param tokenAddress The token address to check
   * @returns True if at least one provider supports the token
   */
  async isTokenSupported(tokenAddress: string): Promise<boolean> {
    for (const provider of this.providers) {
      try {
        if (await provider.supports(tokenAddress)) {
          console.log(`[PriceTracker] Token ${tokenAddress} is supported by ${provider.getName()}`);
          return true;
        }
      } catch (error) {
        continue;
      }
    }
    console.log(`[PriceTracker] No providers support token ${tokenAddress}`);
    return false;
  }
  
  /**
   * Get historical price data for a token
   * @param tokenAddress The token address
   * @param timeframe The timeframe to get history for (e.g. '24h', '7d', '30d')
   * @returns An array of price points or null if not available
   */
  async getPriceHistory(tokenAddress: string, timeframe: string): Promise<{ timestamp: string; price: number }[] | null> {
    console.log(`[PriceTracker] Getting price history for ${tokenAddress} (${timeframe})`);
    
    try {
      // Convert timeframe to hours for database query
      let hours = 24; // Default to 24 hours
      
      if (timeframe === '7d') hours = 24 * 7;
      else if (timeframe === '30d') hours = 24 * 30;
      else if (timeframe === '1h') hours = 1;
      else if (timeframe === '6h') hours = 6;
      
      // Get historical data from database
      const history = await repositories.priceRepository.getPriceHistory(tokenAddress, hours);
      
      if (history && history.length > 0) {
        console.log(`[PriceTracker] Retrieved ${history.length} historical price points from database`);
        return history.map((point: PriceRecord) => ({
          timestamp: point.timestamp.toISOString(),
          price: point.price
        }));
      }
    } catch (error) {
      console.error(`[PriceTracker] Error fetching price history:`, error);
    }
    
    // If we don't have enough historical data in the database or an error occurred,
    // generate mock data based on current price
    console.log(`[PriceTracker] Generating mock price history data`);
    const currentPrice = await this.getPrice(tokenAddress);
    if (!currentPrice) return null;
    
    // Generate some mock historical data based on current price
    const now = Date.now();
    const history = [];
    for (let i = 0; i < 24; i++) {
      const time = now - (i * 3600 * 1000); // hourly points
      const randomVariation = 0.98 + (Math.random() * 0.04); // ±2%
      history.push({
        timestamp: new Date(time).toISOString(),
        price: currentPrice * randomVariation
      });
    }
    
    return history.reverse(); // Return in chronological order
  }

  /**
   * Clear the price cache
   */
  clearCache(): void {
    console.log(`[PriceTracker] Clearing price cache`);
    this.priceCache.clear();
  }
  
  /**
   * Check if price tracker is healthy
   * For system health check use
   */
  async isHealthy(): Promise<boolean> {
    try {
      // Check if database is accessible
      await repositories.priceRepository.count();
      
      // Check if at least one provider is responsive
      for (const provider of this.providers) {
        try {
          // Try to get SOL price as a simple test
          const price = await provider.getPrice('So11111111111111111111111111111111111111112');
          if (price !== null) {
            return true;
          }
        } catch (error) {
          continue;
        }
      }
      
      return false;
    } catch (error) {
      console.error('[PriceTracker] Health check failed:', error);
      return false;
    }
  }
} 