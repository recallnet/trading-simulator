import { PriceSource, BlockchainType, SpecificChain } from '../types';
import { JupiterProvider } from './providers/jupiter.provider';
import { RaydiumProvider } from './providers/raydium.provider';
import { SerumProvider } from './providers/serum.provider';
import { NovesProvider } from './providers/noves.provider';
import { MultiChainProvider } from './providers/multi-chain.provider';
// import { SolanaProvider } from './providers/solana.provider'; // No longer using Solana provider
import { config } from '../config';
import { repositories } from '../database';

// Define PriceRecord type for consistent use
interface PriceRecord {
  id?: number;
  token: string;
  price: number;
  timestamp: Date;
  chain?: BlockchainType; // General chain type (EVM, SVM)
  specificChain?: SpecificChain; // Specific chain (eth, polygon, base, svm, etc.)
}

/**
 * Price Tracker Service
 * Fetches and caches token prices from multiple providers
 */
export class PriceTracker {
  private providers: PriceSource[];
  private novesProvider: NovesProvider | null = null;
  private multiChainProvider: MultiChainProvider | null = null;
  private priceCache: Map<string, { price: number; timestamp: number }>;
  private readonly CACHE_DURATION = config.priceCacheDuration; // 30 seconds

  constructor() {
    // Initialize Noves provider if API key is available
    if (config.api.noves.enabled) {
      this.novesProvider = new NovesProvider(config.api.noves.apiKey);
      
      // Also initialize the MultiChainProvider for EVM tokens across multiple chains
      this.multiChainProvider = new MultiChainProvider(config.api.noves.apiKey);
      
      console.log('[PriceTracker] Initialized Noves provider for multi-chain support');
    }
    
    // Initialize Solana-specific providers 
    const jupiterProvider = new JupiterProvider();
    const raydiumProvider = new RaydiumProvider();
    const serumProvider = new SerumProvider();
    
    // Set up providers in priority order
    this.providers = [];
    
    // Add MultiChainProvider as the first provider for EVM tokens if available
    if (this.multiChainProvider) {
      this.providers.push(this.multiChainProvider);
    }
    
    // Add Noves as the second provider if available
    if (this.novesProvider) {
      this.providers.push(this.novesProvider);
    }
    
    // Add Solana-specific providers as fallbacks
    this.providers.push(
      jupiterProvider,
      raydiumProvider,
      serumProvider
    );
    
    this.priceCache = new Map();
    
    console.log(`[PriceTracker] Initialized with ${this.providers.length} providers`);
    this.providers.forEach(p => console.log(`[PriceTracker] Loaded provider: ${p.getName()}`));
  }

  /**
   * Determines which blockchain a token address belongs to based on address format
   * @param tokenAddress The token address to check
   * @returns The blockchain type (SVM or EVM)
   */
  determineChain(tokenAddress: string): BlockchainType {
    // If we have Noves provider, use its chain detection
    if (this.novesProvider) {
      return this.novesProvider.determineChain(tokenAddress);
    }
    
    // Fallback detection if Noves is not available
    // Ethereum addresses are hexadecimal and start with 0x, typically 42 chars total (0x + 40 hex chars)
    if (/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) {
      return BlockchainType.EVM;
    }
    
    // Solana addresses are base58 encoded and typically 32-44 characters long
    return BlockchainType.SVM;
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

    // Determine which chain this token belongs to
    const tokenChain = this.determineChain(tokenAddress);
    console.log(`[PriceTracker] Detected token ${tokenAddress} on chain: ${tokenChain}`);

    // Check cache first
    const cacheKey = `${tokenChain}:${tokenAddress}`;
    const cached = this.priceCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log(`[PriceTracker] Using cached price for ${tokenAddress} on ${tokenChain}: $${cached.price}`);
      return cached.price;
    }

    // Try each provider in sequence until we get a price
    for (const provider of this.providers) {
      try {
        console.log(`[PriceTracker] Attempting to get price from ${provider.getName()}`);
        
        let price: number | null = null;
        let specificChain: SpecificChain | undefined;
        
        // For MultiChainProvider, it can handle any EVM token
        if (provider instanceof MultiChainProvider && tokenChain === BlockchainType.EVM) {
          // Try to get detailed token info with specific chain
          const tokenInfo = await provider.getTokenInfo(tokenAddress);
          if (tokenInfo && tokenInfo.price !== null) {
            price = tokenInfo.price;
            specificChain = tokenInfo.specificChain || undefined;
          } else {
            // Fallback to just getting the price
            price = await provider.getPrice(tokenAddress, tokenChain);
          }
        }
        // For NovesProvider, we pass the chain type for specificity
        else if (provider instanceof NovesProvider) {
          price = await provider.getPrice(tokenAddress, tokenChain);
          if (tokenChain === BlockchainType.SVM) {
            specificChain = 'svm';
          }
        } 
        // For Solana-specific providers, only use them for SVM tokens
        else if (tokenChain === BlockchainType.SVM) {
          price = await provider.getPrice(tokenAddress);
          specificChain = 'svm';
        } else {
          // Skip non-compatible providers for this token type
          console.log(`[PriceTracker] Skipping ${provider.getName()} for ${tokenChain} token`);
          continue;
        }

        if (price !== null) {
          console.log(`[PriceTracker] Got price $${price} from ${provider.getName()}`);
          
          // Store price in cache
          this.priceCache.set(cacheKey, {
            price,
            timestamp: Date.now(),
          });
          
          // Store price in database for historical record (but never rely on this for trading)
          await this.storePrice(tokenAddress, price, tokenChain, specificChain);
          
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
   * Get detailed token information including which chain it's on and its price
   * This is useful for EVM tokens which need specific chain information
   * @param tokenAddress The token address to get info for
   * @returns Object containing token price and chain information or null
   */
  async getTokenInfo(tokenAddress: string): Promise<{ 
    price: number | null; 
    chain: BlockchainType; 
    specificChain: SpecificChain | null 
  } | null> {
    console.log(`[PriceTracker] Getting detailed token info for: ${tokenAddress}`);
    
    const chainType = this.determineChain(tokenAddress);
    
    // For Solana tokens, return basic info
    if (chainType === BlockchainType.SVM) {
      const price = await this.getPrice(tokenAddress);
      return {
        price,
        chain: BlockchainType.SVM,
        specificChain: 'svm'
      };
    }
    
    // Use MultiChainProvider if available for EVM tokens
    if (this.multiChainProvider && chainType === BlockchainType.EVM) {
      try {
        const tokenInfo = await this.multiChainProvider.getTokenInfo(tokenAddress);
        if (tokenInfo && tokenInfo.price !== null) {
          return {
            price: tokenInfo.price,
            chain: tokenInfo.chain,
            specificChain: tokenInfo.specificChain
          };
        }
      } catch (error) {
        console.log(`[PriceTracker] Failed to get token info from MultiChainProvider: ${error}`);
      }
    }
    
    // If MultiChainProvider failed or returned null price, try to get price from other providers
    console.log(`[PriceTracker] Falling back to standard providers for token info: ${tokenAddress}`);
    const price = await this.getPrice(tokenAddress);
    
    // Determine specificChain based on chainType
    let specificChain: SpecificChain | null = null;
    if (chainType.toString() === 'svm') {
      specificChain = 'svm';
    }
    
    // Return combined token info
    return {
      price,
      chain: chainType,
      specificChain
    };
  }

  /**
   * Store price data in the database
   * @param tokenAddress The token address
   * @param price The price in USD
   * @param chain The blockchain type (optional)
   * @param specificChain The specific chain (optional)
   */
  private async storePrice(
    tokenAddress: string, 
    price: number, 
    chain?: BlockchainType,
    specificChain?: SpecificChain
  ): Promise<void> {
    try {
      const generalChain = chain || this.determineChain(tokenAddress);
      
      await repositories.priceRepository.create({
        token: tokenAddress,
        price,
        timestamp: new Date(),
        chain: generalChain,
        specificChain
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
    const tokenChain = this.determineChain(tokenAddress);
    
    for (const provider of this.providers) {
      try {
        // For Noves, we can check with the chain type
        if (provider instanceof NovesProvider) {
          if (await provider.supports(tokenAddress)) {
            console.log(`[PriceTracker] Token ${tokenAddress} is supported by ${provider.getName()}`);
            return true;
          }
        } 
        // For other providers, only check for SVM tokens
        else if (tokenChain === BlockchainType.SVM) {
          if (await provider.supports(tokenAddress)) {
            console.log(`[PriceTracker] Token ${tokenAddress} is supported by ${provider.getName()}`);
            return true;
          }
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
   * @param allowMockData Whether to generate mock data if real data is not available (defaults to config setting)
   * @returns An array of price points or null if not available
   */
  async getPriceHistory(
    tokenAddress: string, 
    timeframe: string,
    allowMockData: boolean = config.allowMockPriceHistory
  ): Promise<{ timestamp: string; price: number }[] | null> {
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
    // generate mock data based on current price, but only if allowed
    if (!allowMockData) {
      console.log(`[PriceTracker] No historical data available and mock data generation is disabled`);
      return null;
    }
    
    console.log(`[PriceTracker] WARNING: Generating SIMULATED price history data (not real market data)`);
    const currentPrice = await this.getPrice(tokenAddress);
    if (!currentPrice) return null;
    
    // Convert timeframe to number of data points
    let dataPoints = 24; // Default for 24h
    let intervalMs = 3600 * 1000; // 1 hour in milliseconds
    
    if (timeframe === '7d') {
      dataPoints = 7 * 24;
      intervalMs = 3600 * 1000; // 1 hour
    } else if (timeframe === '30d') {
      dataPoints = 30;
      intervalMs = 24 * 3600 * 1000; // 1 day
    } else if (timeframe === '1h') {
      dataPoints = 12;
      intervalMs = 5 * 60 * 1000; // 5 minutes
    } else if (timeframe === '6h') {
      dataPoints = 12;
      intervalMs = 30 * 60 * 1000; // 30 minutes
    }
    
    // Cap data points to a reasonable number
    dataPoints = Math.min(dataPoints, 180);
    
    // Generate some mock historical data based on current price
    const now = Date.now();
    const history = [];
    for (let i = 0; i < dataPoints; i++) {
      const time = now - (i * intervalMs);
      // Create somewhat realistic price movements (±2%)
      const randomVariation = 0.98 + (Math.random() * 0.04); 
      history.push({
        timestamp: new Date(time).toISOString(),
        price: currentPrice * randomVariation,
        simulated: true // Add a flag to indicate this is simulated data
      });
    }
    
    console.log(`[PriceTracker] Generated ${dataPoints} simulated data points for ${timeframe} timeframe`);
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