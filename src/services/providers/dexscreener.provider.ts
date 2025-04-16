import { PriceSource } from '../../types';
import { BlockchainType, SpecificChain } from '../../types';
import axios from 'axios';

/**
 * DexScreener price provider implementation
 * Uses DexScreener API to get token prices across multiple chains
 */
export class DexScreenerProvider implements PriceSource {
  private readonly API_BASE = 'https://api.dexscreener.com/tokens/v1';
  private cache: Map<string, { price: number; timestamp: number }>;
  private readonly CACHE_DURATION = 30000; // 30 seconds
  private lastRequestTime: number = 0;
  private readonly MIN_REQUEST_INTERVAL = 100;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second

  // Mapping for DexScreener specific chain names
  private readonly chainMapping: Record<SpecificChain, string> = {
    eth: 'ethereum',
    polygon: 'polygon',
    bsc: 'bsc',
    arbitrum: 'arbitrum',
    optimism: 'optimism',
    avalanche: 'avalanche',
    base: 'base',
    linea: 'linea',
    zksync: 'zksync',
    scroll: 'scroll',
    mantle: 'mantle',
    svm: 'solana',
  };

  constructor() {
    this.cache = new Map();
  }

  getName(): string {
    return 'DexScreener';
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      await this.delay(this.MIN_REQUEST_INTERVAL - timeSinceLastRequest);
    }
    this.lastRequestTime = Date.now();
  }

  private getCachedPrice(tokenAddress: string, chain: string): number | null {
    const cacheKey = `${chain}:${tokenAddress}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.price;
    }
    return null;
  }

  private setCachedPrice(tokenAddress: string, chain: string, price: number): void {
    const cacheKey = `${chain}:${tokenAddress}`;
    this.cache.set(cacheKey, { price, timestamp: Date.now() });
  }

  determineChain(tokenAddress: string): BlockchainType {
    // Simple heuristic: Solana tokens don't start with '0x'
    if (!tokenAddress.startsWith('0x')) {
      return BlockchainType.SVM;
    }
    return BlockchainType.EVM;
  }

  /**
   * Convert a BlockchainType and SpecificChain to the correct chain identifier for DexScreener API
   */
  private getDexScreenerChain(
    tokenAddress: string,
    chain?: BlockchainType,
    specificChain?: SpecificChain,
  ): string {
    if (specificChain && this.chainMapping[specificChain]) {
      return this.chainMapping[specificChain];
    }

    // If no specific chain provided but we have a BlockchainType
    if (chain === BlockchainType.SVM) {
      return 'solana';
    }

    // Default to ethereum for EVM chains without specifics
    return 'ethereum';
  }

  /**
   * Fetch token price from DexScreener API
   */
  private async fetchPrice(tokenAddress: string, dexScreenerChain: string): Promise<number | null> {
    const url = `${this.API_BASE}/${dexScreenerChain}/${tokenAddress}`;

    let retries = 0;
    while (retries <= this.MAX_RETRIES) {
      try {
        // Enforce rate limiting
        await this.enforceRateLimit();

        // Make the API request
        const response = await axios.get(url);

        // Check if response has data
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          // Find first pair with a valid USD price
          for (const pair of response.data) {
            if (pair.priceUsd && !isNaN(parseFloat(pair.priceUsd))) {
              return parseFloat(pair.priceUsd);
            }
          }
        }

        // If no valid price found in response
        return null;
      } catch (error) {
        console.error(
          `Error fetching price from DexScreener for ${tokenAddress} on ${dexScreenerChain}:`,
          error,
        );
        retries++;

        // If we haven't reached the max retries, delay and try again
        if (retries <= this.MAX_RETRIES) {
          await this.delay(this.RETRY_DELAY);
        }
      }
    }

    // If all retries failed
    return null;
  }

  /**
   * Get the price of a token
   */
  async getPrice(
    tokenAddress: string,
    chain?: BlockchainType,
    specificChain?: SpecificChain,
  ): Promise<number | null> {
    // Determine chain if not provided
    if (!chain) {
      chain = this.determineChain(tokenAddress);
    }

    // Get the DexScreener chain identifier
    const dexScreenerChain = this.getDexScreenerChain(tokenAddress, chain, specificChain);

    // Check cache first
    const cachedPrice = this.getCachedPrice(tokenAddress, dexScreenerChain);
    if (cachedPrice !== null) {
      return cachedPrice;
    }

    // Fetch the price
    const price = await this.fetchPrice(tokenAddress, dexScreenerChain);

    // Cache the result if we got a valid price
    if (price !== null) {
      this.setCachedPrice(tokenAddress, dexScreenerChain, price);
    }

    return price;
  }

  /**
   * Check if the provider supports this token
   */
  async supports(tokenAddress: string): Promise<boolean> {
    const chain = this.determineChain(tokenAddress);
    const dexScreenerChain = this.getDexScreenerChain(tokenAddress, chain);

    // Try to get a price - if successful, we support it
    const price = await this.getPrice(tokenAddress, chain);
    return price !== null;
  }
}
