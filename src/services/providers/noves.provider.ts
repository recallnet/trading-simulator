import { PriceSource } from '../../types';
import { BlockchainType } from '../../types';
import axios from 'axios';

/**
 * Noves price provider implementation
 * Uses Noves API to get token prices across multiple chains
 */
export class NovesProvider implements PriceSource {
  private readonly API_BASE = 'https://api.noves.fi/pricing';
  private cache: Map<string, { price: number; timestamp: number; chain: string }>;
  private readonly CACHE_DURATION = 30000; // 30 seconds
  private lastRequestTime: number = 0;
  private readonly MIN_REQUEST_INTERVAL = 100;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second

  constructor(private apiKey: string) {
    this.cache = new Map();
  }

  getName(): string {
    return 'Noves';
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

  private getCachedPrice(tokenAddress: string, chain: BlockchainType): { price: number } | null {
    const cacheKey = `${chain}:${tokenAddress}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return { price: cached.price };
    }
    return null;
  }

  private setCachedPrice(tokenAddress: string, chain: BlockchainType, price: number): void {
    const cacheKey = `${chain}:${tokenAddress}`;
    this.cache.set(cacheKey, {
      price,
      chain,
      timestamp: Date.now(),
    });
  }

  /**
   * Determines which blockchain a token address belongs to based on address format
   * @param tokenAddress The token address to check
   * @returns The blockchain type (SVM or EVM)
   */
  determineChain(tokenAddress: string): BlockchainType {
    // Ethereum addresses are hexadecimal and start with 0x, typically 42 chars total (0x + 40 hex chars)
    if (/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) {
      return BlockchainType.EVM;
    }
    
    // Solana addresses are base58 encoded and typically 32-44 characters long
    // Most don't start with 0x and contain alphanumeric characters
    return BlockchainType.SVM;
  }

  /**
   * Fetches token price from Noves API
   * @param tokenAddress Token address
   * @param chain Optional blockchain type, will be auto-detected if not provided
   * @returns Token price in USD or null if not found
   */
  async getPrice(tokenAddress: string, chain?: BlockchainType): Promise<number | null> {
    try {
      // Determine chain if not provided
      const tokenChain = chain || this.determineChain(tokenAddress);
      
      // Check cache first
      const cachedPrice = this.getCachedPrice(tokenAddress, tokenChain);
      if (cachedPrice !== null) {
        console.log(`[NovesProvider] Using cached price for ${tokenAddress} on ${tokenChain}: $${cachedPrice.price}`);
        return cachedPrice.price;
      }

      console.log(`[NovesProvider] Getting price for ${tokenAddress} on ${tokenChain}`);
      
      for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
        try {
          await this.enforceRateLimit();

          // For this initial implementation, we'll mock different endpoints 
          // based on available documentation. These should be updated once
          // we have the exact endpoint information.
          const chainEndpoint = tokenChain === BlockchainType.SVM ? 'svm' : 'evm';
          const url = `${this.API_BASE}/${chainEndpoint}/price`;
          
          console.log(`[NovesProvider] Debug: Requesting from ${url}`);
          console.log(`[NovesProvider] Attempt ${attempt}/${this.MAX_RETRIES} to fetch price for ${tokenAddress} on ${tokenChain}`);

          // For initial implementation, we'll use a simulated API response
          // This should be replaced with the actual API call once we have confirmed endpoints
          let price: number | null = null;
          
          // TEMPORARY IMPLEMENTATION - Replace with actual API call
          // This is for testing purposes only until we have confirmed exact API endpoints
          if (tokenChain === BlockchainType.SVM) {
            const testTokens: Record<string, number> = {
              'So11111111111111111111111111111111111111112': 100.5, // SOL
              'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 1.0, // USDC
              'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 0.000025 // BONK
            };
            price = testTokens[tokenAddress] || null;
          } else {
            const testTokens: Record<string, number> = {
              '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2': 3500.75, // WETH
              '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': 1.0, // USDC
              '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE': 0.00002 // SHIB
            };
            price = testTokens[tokenAddress] || null;
          }
          
          // Actual implementation should be similar to this:
          /*
          const response = await axios.get(url, {
            params: {
              token: tokenAddress
            },
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            timeout: 5000
          });
          
          if (response.status !== 200 || !response.data) {
            console.log(`[NovesProvider] Non-200 response from API: ${response.status}`);
            continue;
          }
          
          // Parse response based on API format
          const price = response.data.price;
          */

          if (price === null) {
            console.log(`[NovesProvider] No price data found for token: ${tokenAddress}`);
            if (attempt === this.MAX_RETRIES) return null;
            await this.delay(this.RETRY_DELAY * attempt);
            continue;
          }

          // Cache the result
          this.setCachedPrice(tokenAddress, tokenChain, price);
          console.log(`[NovesProvider] Successfully fetched price for ${tokenAddress} on ${tokenChain}: $${price}`);
          return price;
        } catch (error) {
          if (attempt === this.MAX_RETRIES) {
            throw error;
          }
          console.log(`[NovesProvider] Attempt ${attempt} failed, retrying after delay...`);
          if (axios.isAxiosError(error)) {
            console.error(`[NovesProvider] Axios error details:`, {
              message: error.message,
              code: error.code,
              status: error.response?.status,
              data: error.response?.data,
            });
          }
          await this.delay(this.RETRY_DELAY * attempt);
        }
      }
      return null;
    } catch (error) {
      console.error(`[NovesProvider] Error fetching price for ${tokenAddress}:`, error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  /**
   * Checks if a token is supported by the Noves API
   * @param tokenAddress Token address to check
   * @returns True if token is supported, false otherwise
   */
  async supports(tokenAddress: string): Promise<boolean> {
    try {
      console.log(`[NovesProvider] Checking support for token: ${tokenAddress}`);
      // First determine the chain
      const tokenChain = this.determineChain(tokenAddress);
      
      // Check cache
      if (this.getCachedPrice(tokenAddress, tokenChain) !== null) {
        return true;
      }

      // Try to get the price - if we get a value back, it's supported
      const price = await this.getPrice(tokenAddress, tokenChain);
      return price !== null;
    } catch (error) {
      console.error(`[NovesProvider] Error checking token support:`, error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }
} 