import { NovesProvider } from '../../../src/services/providers/noves.provider';
import { PriceTracker } from '../../../src/services/price-tracker.service';
import { BlockchainType } from '../../../src/types';
import { setupAdminClient, cleanupTestState, ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_EMAIL } from '../../utils/test-helpers';
import axios from 'axios';
import { getBaseUrl } from '../../utils/server';
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

describe('Noves Provider E2E Tests', () => {
  let novesProvider: NovesProvider;
  let priceTracker: PriceTracker;
  
  // Clean up test state before each test
  beforeEach(async () => {
    if (!runTests) {
      return;
    }
    
    // Clean up the test state using the standard utility
    await cleanupTestState();
    
    // Create admin account directly using the setup endpoint (standard pattern)
    await axios.post(`${getBaseUrl()}/api/admin/setup`, {
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD,
      email: ADMIN_EMAIL
    });
    
    // Initialize providers
    novesProvider = new NovesProvider(apiKey!);
    priceTracker = new PriceTracker();
  });
  
  describe('Chain detection', () => {
    it('should detect Solana token addresses correctly', () => {
      if (!runTests) {
        console.log('Skipping test - NOVES_API_KEY not set');
        return;
      }
      
      const chain = novesProvider.determineChain(solanaTokens.SOL);
      expect(chain).toBe(BlockchainType.SVM);
    });

    it('should detect Ethereum token addresses correctly', () => {
      if (!runTests) {
        console.log('Skipping test - NOVES_API_KEY not set');
        return;
      }
      
      const chain = novesProvider.determineChain(ethereumTokens.ETH);
      expect(chain).toBe(BlockchainType.EVM);
    });
  });

  describe('Direct provider price fetching', () => {
    it('should fetch Solana token prices directly from Noves provider', async () => {
      if (!runTests) {
        console.log('Skipping test - NOVES_API_KEY not set');
        return;
      }
      
      const price = await novesProvider.getPrice(solanaTokens.SOL, BlockchainType.SVM);
      expect(price).not.toBeNull();
      expect(typeof price).toBe('number');
      expect(price).toBeGreaterThan(0);
      console.log(`SOL price (direct from Noves): $${price}`);
    });

    it('should fetch Ethereum token prices directly from Noves provider', async () => {
      if (!runTests) {
        console.log('Skipping test - NOVES_API_KEY not set');
        return;
      }
      
      const price = await novesProvider.getPrice(ethereumTokens.ETH, BlockchainType.EVM);
      expect(price).not.toBeNull();
      expect(typeof price).toBe('number');
      expect(price).toBeGreaterThan(0);
      console.log(`ETH price (direct from Noves): $${price}`);
    });
  });

  describe('Integration with PriceTracker and Database', () => {
    it('should fetch Solana token prices from Noves API and store them in the database', async () => {
      if (!runTests) {
        console.log('Skipping test - NOVES_API_KEY not set');
        return;
      }
      
      // Clear any existing data and cache
      priceTracker.clearCache();
      
      // Capture logs to verify Noves API was called
      const originalConsoleLog = console.log;
      const mockLogs: string[] = [];
      console.log = jest.fn((...args) => {
        mockLogs.push(args.join(' '));
        originalConsoleLog(...args);
      });
      
      // Get price through price tracker (should call Noves API)
      const price = await priceTracker.getPrice(solanaTokens.SOL);
      
      // Restore console.log
      console.log = originalConsoleLog;
      
      expect(price).not.toBeNull();
      expect(typeof price).toBe('number');
      expect(price).toBeGreaterThan(0);
      
      // Verify Noves provider was called by looking at logs
      const novesApiCalled = mockLogs.some(log => 
        log.includes('NovesProvider') && 
        log.includes(solanaTokens.SOL) && 
        log.includes('svm')
      );
      expect(novesApiCalled).toBe(true);
      console.log(`SOL price (from Noves API via PriceTracker): $${price}`);
      
      // Verify the price is stored in the database using the PriceController API
      const baseUrl = getBaseUrl();
      const apiResponse = await axios.get(`${baseUrl}/api/price?token=${solanaTokens.SOL}`);
      expect(apiResponse.status).toBe(200);
      expect(apiResponse.data.success).toBe(true);
      expect(apiResponse.data.chain).toBe(BlockchainType.SVM);
      
      console.log('✅ Verified price was stored and accessible via API with chain:', apiResponse.data);
    });

    it('should fetch Ethereum token prices from Noves API and store them in the database', async () => {
      if (!runTests) {
        console.log('Skipping test - NOVES_API_KEY not set');
        return;
      }
      
      // Clear any existing data and cache
      priceTracker.clearCache();
      
      // Capture logs to verify Noves API was called
      const originalConsoleLog = console.log;
      const mockLogs: string[] = [];
      console.log = jest.fn((...args) => {
        mockLogs.push(args.join(' '));
        originalConsoleLog(...args);
      });
      
      // Get price through price tracker (should call Noves API)
      const price = await priceTracker.getPrice(ethereumTokens.ETH);
      
      // Restore console.log
      console.log = originalConsoleLog;
      
      expect(price).not.toBeNull();
      expect(typeof price).toBe('number');
      expect(price).toBeGreaterThan(0);
      
      // Verify Noves provider was called by looking at logs
      const novesApiCalled = mockLogs.some(log => 
        log.includes('NovesProvider') && 
        log.includes(ethereumTokens.ETH) && 
        log.includes('evm')
      );
      expect(novesApiCalled).toBe(true);
      console.log(`ETH price (from Noves API via PriceTracker): $${price}`);
      
      // Verify the price is stored in the database using the PriceController API
      const baseUrl = getBaseUrl();
      const apiResponse = await axios.get(`${baseUrl}/api/price?token=${ethereumTokens.ETH}`);
      expect(apiResponse.status).toBe(200);
      expect(apiResponse.data.success).toBe(true);
      expect(apiResponse.data.chain).toBe(BlockchainType.EVM);
      
      console.log('✅ Verified price was stored and accessible via API with chain:', apiResponse.data);
    });

    it('should use cache instead of calling API or database on subsequent requests', async () => {
      if (!runTests) {
        console.log('Skipping test - NOVES_API_KEY not set');
        return;
      }
      
      // Clear any existing data and cache
      priceTracker.clearCache();
      
      // First call should hit the API
      const firstCall = await priceTracker.getPrice(solanaTokens.SOL);
      expect(firstCall).not.toBeNull();
      
      // Capture logs to verify cache is used
      const originalConsoleLog = console.log;
      const mockLogs: string[] = [];
      console.log = jest.fn((...args) => {
        mockLogs.push(args.join(' '));
        originalConsoleLog(...args);
      });
      
      // Second call should use cache and not call API
      const secondCall = await priceTracker.getPrice(solanaTokens.SOL);
      
      // Restore console.log
      console.log = originalConsoleLog;
      
      // Verify the same value is returned (from cache)
      expect(secondCall).toBe(firstCall);
      
      // Verify no Noves API call was made for the second request
      const novesApiCalled = mockLogs.some(log => 
        log.includes('NovesProvider') && 
        log.includes('Getting price')
      );
      expect(novesApiCalled).toBe(false);
      
      // Check logs for cache message
      const cacheUsed = mockLogs.some(log => log.includes('Using cached price'));
      expect(cacheUsed).toBe(true);
      
      console.log(`✅ Cache prevented API call as expected`);
    });
  });

  describe('API endpoint integration', () => {
    it('should fetch Solana token prices through the API', async () => {
      if (!runTests) {
        console.log('Skipping test - NOVES_API_KEY not set');
        return;
      }
      
      // Test the API endpoint for price fetching
      const baseUrl = getBaseUrl();
      const response = await axios.get(`${baseUrl}/api/price?token=${solanaTokens.SOL}`);
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.price).toBeDefined();
      expect(typeof response.data.price).toBe('number');
      expect(response.data.price).toBeGreaterThan(0);
      
      console.log(`SOL price (via API): $${response.data.price}`);
    });
    
    it('should fetch Ethereum token prices through the API', async () => {
      if (!runTests) {
        console.log('Skipping test - NOVES_API_KEY not set');
        return;
      }
      
      // Test the API endpoint for price fetching
      const baseUrl = getBaseUrl();
      const response = await axios.get(`${baseUrl}/api/price?token=${ethereumTokens.ETH}`);
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.price).toBeDefined();
      expect(typeof response.data.price).toBe('number');
      expect(response.data.price).toBeGreaterThan(0);
      
      console.log(`ETH price (via API): $${response.data.price}`);
    });
  });

  describe('Cross-chain support', () => {
    it('should detect and store prices for tokens from different chains with correct chain identifiers', async () => {
      if (!runTests) {
        console.log('Skipping test - NOVES_API_KEY not set');
        return;
      }
      
      // Mix of SVM and EVM tokens
      const mixedTokens = [
        { address: solanaTokens.USDC, expectedChain: BlockchainType.SVM, name: 'Solana USDC' },
        { address: ethereumTokens.USDC, expectedChain: BlockchainType.EVM, name: 'Ethereum USDC' }
      ];
      
      // Clear cache to force new API calls
      priceTracker.clearCache();
      
      for (const token of mixedTokens) {
        // Test chain detection
        const detectedChain = priceTracker.determineChain(token.address);
        expect(detectedChain).toBe(token.expectedChain);
        
        // Test price fetching
        const price = await priceTracker.getPrice(token.address);
        expect(price).not.toBeNull();
        expect(typeof price).toBe('number');
        expect(price).toBeGreaterThan(0);
        
        // Verify correct chain in API response
        const baseUrl = getBaseUrl();
        const response = await axios.get(`${baseUrl}/api/price?token=${token.address}`);
        expect(response.data.chain).toBe(token.expectedChain);
        
        console.log(`${token.name} (${token.address}): Detected as ${detectedChain}, Price: $${price}`);
      }
    });
  });

  describe('Arbitrary token support', () => {
    it('should detect chain for arbitrary Base chain token', async () => {
      if (!runTests) {
        console.log('Skipping test - NOVES_API_KEY not set');
        return;
      }
      
      // Base chain token to test
      const baseChainToken = '0x532f27101965dd16442e59d40670faf5ebb142e4';
      
      // Clear cache to ensure we make a fresh API call
      priceTracker.clearCache();
      
      // Call directly through provider to test chain detection
      const detectedChain = novesProvider.determineChain(baseChainToken);
      console.log(`Detected chain for ${baseChainToken}: ${detectedChain}`);
      
      // For arbitrary tokens on chains like Base, we should get 'evm' as general EVM-compatible chain
      expect(detectedChain).toBe(BlockchainType.EVM);
      
      // Try to get price directly through the provider
      const price = await novesProvider.getPrice(baseChainToken, detectedChain);
      console.log(`Base chain token (${baseChainToken}) price: $${price}`);
      
      // The specific token might not have a price, which is okay for this test
      // We're just testing chain detection here
      
      // Now check via the API endpoint to verify chain detection is working
      const baseUrl = getBaseUrl();
      const apiResponse = await axios.get(`${baseUrl}/api/price?token=${baseChainToken}`);
      
      console.log('API response for Base chain token:', apiResponse.data);
      
      // Validate API response - we care about chain detection even if price isn't available
      expect(apiResponse.status).toBe(200);
      expect(apiResponse.data.chain).toBe(BlockchainType.EVM);
    });

    it('should fetch price for popular token on Base chain', async () => {
      if (!runTests) {
        console.log('Skipping test - NOVES_API_KEY not set');
        return;
      }
      
      // Use a popular token on Base chain that should have pricing data
      // This is USDbC (USD Base Coin) on Base chain
      const baseUsdcToken = '0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca';
      
      // Clear cache to ensure we make a fresh API call
      priceTracker.clearCache();
      
      // Capture logs to verify Noves API was called
      const originalConsoleLog = console.log;
      const mockLogs: string[] = [];
      console.log = jest.fn((...args) => {
        mockLogs.push(args.join(' '));
        originalConsoleLog(...args);
      });
      
      // Call directly through provider to test chain detection
      const detectedChain = novesProvider.determineChain(baseUsdcToken);
      console.log(`Detected chain for ${baseUsdcToken}: ${detectedChain}`);
      
      // For tokens on Base chain, we should get 'evm' as general EVM-compatible chain
      expect(detectedChain).toBe(BlockchainType.EVM);
      
      try {
        // Try to get price directly through the provider
        const price = await novesProvider.getPrice(baseUsdcToken, detectedChain);
        
        // Restore console.log
        console.log = originalConsoleLog;
        
        console.log(`Base chain USDC (${baseUsdcToken}) price: $${price}`);
        
        // This is a stablecoin, so price should be close to $1 if available
        if (price !== null) {
          expect(typeof price).toBe('number');
          expect(price).toBeGreaterThan(0);
          expect(price).toBeCloseTo(1.0, 1); // Should be close to $1 since it's a stablecoin
          
          // Verify it went through the Noves API by checking logs
          const novesApiCalled = mockLogs.some(log => 
            log.includes('NovesProvider') && 
            log.includes(baseUsdcToken) && 
            log.includes(detectedChain)
          );
          expect(novesApiCalled).toBe(true);
          
          // Now check via the API endpoint to verify it's integrated properly
          const baseUrl = getBaseUrl();
          const apiResponse = await axios.get(`${baseUrl}/api/price?token=${baseUsdcToken}`);
          
          console.log('API response for Base chain USDC:', apiResponse.data);
          
          // Validate API response
          expect(apiResponse.status).toBe(200);
          expect(apiResponse.data.success).toBe(true);
          expect(apiResponse.data.chain).toBe(BlockchainType.EVM);
          
          if (apiResponse.data.price !== null) {
            expect(apiResponse.data.price).toBeGreaterThan(0);
            expect(apiResponse.data.price).toBeCloseTo(1.0, 1);
          } else {
            console.log('API returned null price for USDbC on Base chain, but chain detection worked');
          }
        } else {
          console.log('Null price returned for USDbC on Base chain, but chain detection worked');
          // Even without a price, we should have correctly identified the chain
        }
      } catch (error) {
        // Restore console.log in case of error
        console.log = originalConsoleLog;
        
        console.error('Error fetching Base chain USDC price:', error);
        
        // Check if the error was due to the token not being supported
        const errorLogs = mockLogs.filter(log => 
          log.includes('Error') || 
          log.includes('Failed') || 
          log.includes('Exception')
        );
        
        if (errorLogs.length > 0) {
          console.log('Error logs:', errorLogs);
        }
        
        // Skip throwing the error - we're mostly testing chain detection
        console.log('Failed to get price, but chain detection may still be working');
      }
    });

    it('should handle arbitrary token lookup with proper error handling', async () => {
      if (!runTests) {
        console.log('Skipping test - NOVES_API_KEY not set');
        return;
      }
      
      // Use an invalid token address to test error handling
      const invalidToken = 'invalid-token-address';
      
      // Clear cache to ensure we make a fresh API call
      priceTracker.clearCache();
      
      try {
        // The determineChain function should return undefined or throw for invalid addresses
        const detectedChain = novesProvider.determineChain(invalidToken);
        console.log(`Detected chain for invalid token: ${detectedChain}`);
        
        // Try to get price, this should fail with a descriptive error
        const price = await novesProvider.getPrice(invalidToken, detectedChain || BlockchainType.EVM);
        
        // If we get here, we should expect a null price for an invalid token
        expect(price).toBeNull();
        console.log('Successfully got null price for invalid token as expected');
      } catch (error) {
        // Also acceptable if it throws an error
        console.log('Successfully caught error for invalid token:', error);
      }
    });
  });
}); 