import { PriceSource } from '../../types';
import { BlockchainType, SpecificChain, getBlockchainType } from '../../types';
import axios from 'axios';
import config from '../../config';
import { NovesProvider } from './noves.provider';

// Export the supported EVM chains list for use in tests
export const supportedEvmChains: SpecificChain[] = config.evmChains;

/**
 * MultiChainProvider implementation
 * Uses Noves API to get token prices across multiple EVM chains by trying each chain
 * until a valid price is found.
 */
export class MultiChainProvider implements PriceSource {
  private readonly chainToTokenCache: Map<string, SpecificChain> = new Map();
  private readonly CACHE_DURATION = 3600000; // 1 hour in milliseconds
  private readonly tokenPriceCache: Map<string, { 
    price: number; 
    timestamp: number; 
    chain: BlockchainType; 
    specificChain: SpecificChain;
  }> = new Map();
  
  // Use NovesProvider for common functionality
  private novesProvider: NovesProvider;

  constructor(
    private apiKey: string, 
    private defaultChains: SpecificChain[] = config.evmChains
  ) {
    if (!apiKey) {
      throw new Error('Noves API key is required for MultiChainProvider');
    }
    
    // Initialize the NovesProvider for delegation
    this.novesProvider = new NovesProvider(apiKey);
    
    console.log(`[MultiChainProvider] Initialized with chains: ${this.defaultChains.join(', ')}`);
  }

  getName(): string {
    return 'Noves MultiChain';
  }

  /**
   * Determines which blockchain a token address belongs to based on address format
   * Using NovesProvider's implementation
   */
  determineChain(tokenAddress: string): BlockchainType {
    return this.novesProvider.determineChain(tokenAddress);
  }

  /**
   * Get cached token price if available
   */
  private getCachedPrice(tokenAddress: string): { 
    price: number; 
    chain: BlockchainType; 
    specificChain: SpecificChain;
  } | null {
    const cached = this.tokenPriceCache.get(tokenAddress.toLowerCase());
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return { 
        price: cached.price, 
        chain: cached.chain, 
        specificChain: cached.specificChain 
      };
    }
    return null;
  }

  /**
   * Cache token price and its chain
   */
  private setCachedPrice(tokenAddress: string, specificChain: SpecificChain, price: number): void {
    const generalChain = getBlockchainType(specificChain);
    
    this.tokenPriceCache.set(tokenAddress.toLowerCase(), {
      price,
      chain: generalChain,
      specificChain,
      timestamp: Date.now(),
    });
    
    // Also cache the token-to-chain mapping for future lookups
    this.chainToTokenCache.set(tokenAddress.toLowerCase(), specificChain);
  }

  /**
   * Get the cached chain for a token if available
   */
  private getCachedChain(tokenAddress: string): SpecificChain | null {
    return this.chainToTokenCache.get(tokenAddress.toLowerCase()) || null;
  }

  /**
   * Fetches token price from Noves API across multiple EVM chains
   * @param tokenAddress Token address
   * @param explicitChain Optional specific chain to check (if known)
   * @returns Token price in USD or null if not found
   */
  async getPrice(tokenAddress: string, blockchainType?: BlockchainType): Promise<number | null> {
    try {
      // Normalize token address to lowercase
      const normalizedAddress = tokenAddress.toLowerCase();
      
      // Determine blockchain type if not provided
      const detectedChainType = blockchainType || this.determineChain(normalizedAddress);
      
      // For Solana tokens, we can't use this provider
      if (detectedChainType === BlockchainType.SVM) {
        console.log(`[MultiChainProvider] Token ${normalizedAddress} is on Solana chain, cannot use multi-chain lookup`);
        return null;
      }
      
      // Check price cache first
      const cachedPrice = this.getCachedPrice(normalizedAddress);
      if (cachedPrice !== null) {
        console.log(`[MultiChainProvider] Using cached price for ${normalizedAddress} - Chain: ${cachedPrice.specificChain}, Price: $${cachedPrice.price}`);
        return cachedPrice.price;
      }
      
      console.log(`[MultiChainProvider] Getting price for EVM token ${normalizedAddress}`);
      
      // Check if we have a cached chain for this token
      let chainsToTry = [...this.defaultChains];
      const cachedChain = this.getCachedChain(normalizedAddress);
      
      // If we have a cached chain, try that first
      if (cachedChain) {
        console.log(`[MultiChainProvider] Found cached chain ${cachedChain} for ${normalizedAddress}, trying it first`);
        chainsToTry = [cachedChain, ...chainsToTry.filter(c => c !== cachedChain)];
      }
      
      // Try each chain until we get a price
      for (const chain of chainsToTry) {
        try {
          console.log(`[MultiChainProvider] Attempting to fetch price for ${normalizedAddress} on ${chain} chain`);
          
          // Use NovesProvider's implementation to get price for a specific chain
          const price = await this.novesProvider.getPriceForSpecificEVMChain(normalizedAddress, chain);
          
          if (price !== null) {
            // Cache the result with the specific chain
            this.setCachedPrice(normalizedAddress, chain, price);
            
            console.log(`[MultiChainProvider] Successfully found price for ${normalizedAddress} on ${chain} chain: $${price}`);
            return price;
          }
        } catch (error) {
          console.log(`[MultiChainProvider] Error fetching price for ${normalizedAddress} on ${chain} chain:`, 
            error instanceof Error ? error.message : 'Unknown error');
          
          // Continue to next chain
          continue;
        }
      }
      
      console.log(`[MultiChainProvider] Could not find price for ${normalizedAddress} on any chain`);
      return null;
    } catch (error) {
      console.error(`[MultiChainProvider] Unexpected error fetching price for ${tokenAddress}:`, 
        error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  /**
   * Checks if a token is supported by trying to fetch its price
   * @param tokenAddress Token address to check
   * @returns True if token is supported, false otherwise
   */
  async supports(tokenAddress: string): Promise<boolean> {
    try {
      // For non-EVM tokens, we don't support them
      if (this.determineChain(tokenAddress) !== BlockchainType.EVM) {
        return false;
      }
      
      // Check if we already have a cached price
      if (this.getCachedPrice(tokenAddress) !== null) {
        return true;
      }
      
      // Try to get the price - if we get a value back, it's supported
      const price = await this.getPrice(tokenAddress);
      return price !== null;
    } catch (error) {
      console.log(`[MultiChainProvider] Error checking support for ${tokenAddress}:`, 
        error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  /**
   * Get detailed information about a token including which chain it's on
   * @param tokenAddress Token address
   * @returns Object containing price and chain information or null if not found
   */
  async getTokenInfo(tokenAddress: string): Promise<{ 
    price: number | null; 
    chain: BlockchainType; 
    specificChain: SpecificChain | null;
  } | null> {
    try {
      // Normalize token address
      const normalizedAddress = tokenAddress.toLowerCase();
      
      // Determine blockchain type
      const generalChain = this.determineChain(normalizedAddress);
      
      // For Solana tokens, we return just the blockchain type
      if (generalChain === BlockchainType.SVM) {
        return {
          price: null, // We don't have a price yet
          chain: BlockchainType.SVM,
          specificChain: 'svm'
        };
      }
      
      // Check cache first
      const cachedPrice = this.getCachedPrice(normalizedAddress);
      if (cachedPrice !== null) {
        return cachedPrice;
      }
      
      // Try to get price, which will also update cache with chain info
      const price = await this.getPrice(normalizedAddress);
      
      // Get the specific chain from cache (should have been set by getPrice if successful)
      const specificChain = this.getCachedChain(normalizedAddress);
      
      return {
        price,
        chain: generalChain,
        specificChain
      };
    } catch (error) {
      console.error(`[MultiChainProvider] Error getting token info for ${tokenAddress}:`, 
        error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }
} 