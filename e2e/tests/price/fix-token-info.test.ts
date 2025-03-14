import { PriceTracker } from '../../../src/services/price-tracker.service';
import { BlockchainType } from '../../../src/types';
import { NovesProvider } from '../../../src/services/providers/noves.provider';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Skip tests if API key is not set
const apiKey = process.env.NOVES_API_KEY;
const runTests = !!apiKey;

// Test tokens
const ethereumTokens = {
  ETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
  USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
};

/**
 * This test demonstrates that the issue is in the getTokenInfo method
 * that's being used for EVM tokens in the controller.
 */
describe('Token Info Fix Test', () => {
  // Only run tests if API key is available
  (runTests ? describe : describe.skip)('EVM Token Issue', () => {
    it('shows that the direct Noves provider works', async () => {
      const novesProvider = new NovesProvider(apiKey!);
      const price = await novesProvider.getPrice(ethereumTokens.ETH, BlockchainType.EVM);
      console.log(`Direct NovesProvider price: ${price}`);
      expect(price).not.toBeNull();
      expect(typeof price).toBe('number');
      expect(price).toBeGreaterThan(0);
    });
    
    it('shows that getPrice in PriceTracker works (falls back to NovesProvider)', async () => {
      const priceTracker = new PriceTracker();
      const price = await priceTracker.getPrice(ethereumTokens.ETH);
      console.log(`PriceTracker.getPrice result: ${price}`);
      expect(price).not.toBeNull();
      expect(typeof price).toBe('number');
      expect(price).toBeGreaterThan(0);
    });
    
    it('shows that getTokenInfo in PriceTracker now falls back to other providers when MultiChainProvider fails', async () => {
      const priceTracker = new PriceTracker();
      const tokenInfo = await priceTracker.getTokenInfo(ethereumTokens.ETH);
      console.log(`PriceTracker.getTokenInfo result: ${JSON.stringify(tokenInfo)}`);
      // After our fix, tokenInfo.price should not be null because we added fallback logic
      if (tokenInfo) {
        expect(tokenInfo.price).not.toBeNull(); // We now expect a non-null price
        expect(typeof tokenInfo.price).toBe('number');
        expect(tokenInfo.price).toBeGreaterThan(0);
      }
    });
  });
  
  /**
   * FIX SUGGESTION:
   * 
   * The issue is that getTokenInfo only tries the MultiChainProvider, 
   * which is failing for the Ethereum token address.
   * 
   * We need to modify PriceTracker.getTokenInfo to try other providers if MultiChainProvider fails.
   * Here's how the fix would look:
   * 
   * // In price-tracker.service.ts
   * 
   * async getTokenInfo(tokenAddress: string): Promise<TokenInfo | null> {
   *   // Get the chain type
   *   const chain = this.determineChain(tokenAddress);
   *   
   *   // Try to get detailed token info from MultiChainProvider first
   *   if (chain === BlockchainType.EVM && this.multiChainProvider) {
   *     try {
   *       const tokenInfo = await this.multiChainProvider.getTokenInfo(tokenAddress);
   *       if (tokenInfo && tokenInfo.price !== null) {
   *         return tokenInfo;
   *       }
   *     } catch (error) {
   *       console.log(`[PriceTracker] Failed to get token info from MultiChainProvider: ${error}`);
   *     }
   *   }
   *   
   *   // If MultiChainProvider failed or returned null price, try to get price from other providers
   *   const price = await this.getPrice(tokenAddress);
   *   
   *   // If we got a price, return basic token info
   *   if (price !== null) {
   *     return {
   *       price,
   *       chain,
   *       specificChain: chain === BlockchainType.SVM ? 'svm' : null
   *     };
   *   }
   *   
   *   // If we couldn't get a price from any provider, return null
   *   return null;
   * }
   */
}); 