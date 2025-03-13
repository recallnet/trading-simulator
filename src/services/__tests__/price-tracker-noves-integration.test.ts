import { PriceTracker } from '../price-tracker.service';
import { BlockchainType } from '../../types';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Skip all tests if NOVES_API_KEY is not set
const apiKey = process.env.NOVES_API_KEY;
const runTests = !!apiKey;

// Test tokens
const solanaTokens = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'
};

const ethereumTokens = {
  ETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
  USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  SHIB: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE'
};

describe('PriceTracker with Noves Integration', () => {
  let priceTracker: PriceTracker;
  
  beforeEach(() => {
    priceTracker = new PriceTracker();
    jest.setTimeout(30000); // Increase timeout for API calls
  });

  describe('Chain detection', () => {
    it('should identify Solana tokens', () => {
      const chain = priceTracker.determineChain(solanaTokens.SOL);
      expect(chain).toBe(BlockchainType.SVM);
    });

    it('should identify Ethereum tokens', () => {
      const chain = priceTracker.determineChain(ethereumTokens.ETH);
      expect(chain).toBe(BlockchainType.EVM);
    });
  });

  // Only run these tests if NOVES_API_KEY is set
  (runTests ? describe : describe.skip)('Price fetching', () => {
    it('should fetch Solana token prices', async () => {
      const price = await priceTracker.getPrice(solanaTokens.SOL);
      expect(price).not.toBeNull();
      expect(typeof price).toBe('number');
      console.log(`SOL price: $${price}`);
    });

    it('should fetch Ethereum token prices', async () => {
      const price = await priceTracker.getPrice(ethereumTokens.ETH);
      expect(price).not.toBeNull();
      expect(typeof price).toBe('number');
      console.log(`ETH price: $${price}`);
    }, 15000); // Increase timeout to 15 seconds

    it('should cache prices after fetching', async () => {
      // First fetch - should go to API
      await priceTracker.getPrice(solanaTokens.SOL);
      
      // Mock console.log to check for cache messages
      const originalConsoleLog = console.log;
      let cacheMessageLogged = false;
      console.log = jest.fn((...args) => {
        originalConsoleLog(...args);
        if (typeof args[0] === 'string' && args[0].includes('Using cached price')) {
          cacheMessageLogged = true;
        }
      });
      
      // Second fetch - should use cache
      const price = await priceTracker.getPrice(solanaTokens.SOL);
      
      // Restore console.log
      console.log = originalConsoleLog;
      
      // Verify cache was used
      expect(cacheMessageLogged).toBe(true);
      console.log(`[PriceTracker] Using cached price for ${solanaTokens.SOL} on svm: $${price}`);
    });
  });

  (runTests ? describe : describe.skip)('Token support checking', () => {
    it('should confirm support for Solana tokens', async () => {
      const supported = await priceTracker.isTokenSupported(solanaTokens.SOL);
      expect(supported).toBe(true);
    });

    it('should confirm support for Ethereum tokens', async () => {
      const supported = await priceTracker.isTokenSupported(ethereumTokens.ETH);
      expect(supported).toBe(true);
    });

    // Increase timeout for this specific test as it needs to try multiple providers
    it('should reject invalid tokens', async () => {
      const supported = await priceTracker.isTokenSupported('invalid_token_address');
      expect(supported).toBe(false);
    }, 30000); // 30 second timeout
  });
});

// Add proper cleanup after all tests
afterAll(async () => {
  try {
    // Force close any remaining connections
    try {
      const connection = require('../../database/connection').default;
      if (connection && typeof connection.getPool === 'function') {
        const pool = connection.getPool();
        if (pool) {
          await pool.end();
          console.log('[Test] Closed database connection pool in price-tracker-noves-integration.test.ts');
        }
      }
    } catch (err) {
      console.log('[Test] No database connection to clean up');
    }
  } catch (error) {
    console.error('[Test] Error during cleanup:', error);
  }
}); 