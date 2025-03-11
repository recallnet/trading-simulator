import { PriceSource } from '../../types';
import { config } from '../../config';

/**
 * Basic Solana provider implementation
 * Provides hardcoded prices for main tokens and SOL as a fallback
 */
export class SolanaProvider implements PriceSource {
  // Fixed prices for main tokens as fallback
  private readonly KNOWN_TOKENS: Record<string, number> = {
    [config.tokens.sol]: 100.0, // SOL at $100
    [config.tokens.usdc]: 1.0,  // USDC at $1
    [config.tokens.usdt]: 1.0,  // USDT at $1
  };

  getName(): string {
    return 'Solana';
  }

  async getPrice(tokenAddress: string): Promise<number | null> {
    console.log(`[SolanaProvider] Getting price for ${tokenAddress}`);
    
    // Check if this is a known token
    if (this.KNOWN_TOKENS[tokenAddress]) {
      const price = this.KNOWN_TOKENS[tokenAddress];
      console.log(`[SolanaProvider] Got price for ${tokenAddress}: $${price} (fallback)`);
      return price;
    }
    
    console.log(`[SolanaProvider] No price available for ${tokenAddress}`);
    return null;
  }

  async supports(tokenAddress: string): Promise<boolean> {
    return Object.keys(this.KNOWN_TOKENS).includes(tokenAddress);
  }
} 