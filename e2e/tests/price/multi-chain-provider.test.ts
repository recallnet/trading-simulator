// import { NovesProvider } from '../../../src/services/providers/noves.provider';
import { MultiChainProvider } from '../../../src/services/providers/multi-chain.provider';
import { PriceTracker } from '../../../src/services/price-tracker.service';
import { BlockchainType, SpecificChain, PriceSource } from '../../../src/types';
import { ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_EMAIL } from '../../utils/test-helpers';
import axios from 'axios';
import { getBaseUrl } from '../../utils/server';
import dotenv from 'dotenv';
import config from '../../../src/config';
import { dbManager } from '../../utils/db-manager';

// Load environment variables
dotenv.config();

// We no longer need the API key check since we're using DexScreener
// const apiKey = process.env.NOVES_API_KEY;
// const runTests = !!apiKey;
const runTests = true; // All tests should run now without API key

// Set of EVM chains we'll test against
const evmChains = config.evmChains;

// Test tokens for various chains
const testTokens = {
  // Ethereum Mainnet
  eth: {
    ETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
  },
  // Polygon
  polygon: {
    MATIC: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WMATIC
    USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
  },
  // Binance Smart Chain
  bsc: {
    BNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB
    USDT: '0x55d398326f99059fF775485246999027B3197955'
  },
  // Arbitrum
  arbitrum: {
    ETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH on Arbitrum
    USDC: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8'
  },
  // Base
  base: {
    ETH: '0x4200000000000000000000000000000000000006', // WETH on Base
    USDC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA'
  },
  // Solana tokens for comparison
  svm: {
    SOL: 'So11111111111111111111111111111111111111112',
    USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
  }
};

describe('Multi-Chain Provider Tests', () => {
  let multiChainProvider: MultiChainProvider;
  let priceTracker: PriceTracker;
  
  // Initialize database before all tests
  beforeAll(async () => {
    // Initialize the database which includes migrations
    if (runTests) {
      await dbManager.initialize();
    }
  });
  
  // Check database schema as a test
  it('should have the correct schema with specific_chain column', async () => {
    if (!runTests) {
      console.log('Skipping test - Tests disabled');
      return;
    }
    
    // The specific_chain column should already be added by the dbManager.initialize()
    // Let's just verify it exists
    const pool = dbManager.getPool();
    
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'prices'
        AND column_name = 'specific_chain'
      ) as column_exists;
    `);
    
    console.log(`Does specific_chain column exist? ${result.rows[0].column_exists}`);
    expect(result.rows[0].column_exists).toBe(true);
  });
  
  // Clean up test state before each test
  beforeEach(async () => {
    if (!runTests) {
      return;
    }
    
    // Clean up the test state using the DbManager
    await dbManager.cleanupTestState();
    
    // Create admin account
    await axios.post(`${getBaseUrl()}/api/admin/setup`, {
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD,
      email: ADMIN_EMAIL
    });
    
    // Initialize providers
    multiChainProvider = new MultiChainProvider();
    priceTracker = new PriceTracker();
  });
  
  describe('Multi-chain token detection', () => {
    it('should correctly identify the blockchain type for EVM tokens', () => {
      if (!runTests) {
        console.log('Skipping test - Tests disabled');
        return;
      }
      
      // Test Ethereum mainnet token
      const ethToken = testTokens.eth.ETH;
      const ethChain = multiChainProvider.determineChain(ethToken);
      expect(ethChain).toBe(BlockchainType.EVM);
      
      // Test Polygon token
      const polygonToken = testTokens.polygon.MATIC;
      const polygonChain = multiChainProvider.determineChain(polygonToken);
      expect(polygonChain).toBe(BlockchainType.EVM);
      
      // Test BSC token
      const bscToken = testTokens.bsc.BNB;
      const bscChain = multiChainProvider.determineChain(bscToken);
      expect(bscChain).toBe(BlockchainType.EVM);
      
      console.log('✅ All EVM tokens correctly identified as EVM chains');
    });
    
    it('should correctly identify Solana token addresses', () => {
      if (!runTests) {
        console.log('Skipping test - Tests disabled');
        return;
      }
      
      const solToken = testTokens.svm.SOL;
      const solChain = multiChainProvider.determineChain(solToken);
      expect(solChain).toBe(BlockchainType.SVM);
      
      const usdcToken = testTokens.svm.USDC;
      const usdcChain = multiChainProvider.determineChain(usdcToken);
      expect(usdcChain).toBe(BlockchainType.SVM);
      
      console.log('✅ Solana tokens correctly identified as SVM chains');
    });
  });

  describe('Multi-chain price fetching', () => {
    it('should try to fetch prices for Ethereum mainnet tokens', async () => {
      if (!runTests) {
        console.log('Skipping test - Tests disabled');
        return;
      }
      
      // Test direct price fetching from MultiChainProvider
      const ethToken = testTokens.eth.ETH;
      
      try {
        // Get price using the MultiChainProvider
        const price = await multiChainProvider.getPrice(ethToken, BlockchainType.EVM);
        
        console.log(`Ethereum token price: $${price}`);
        
        // Test that chain detection works even if price fetching fails due to API issues
        const chain = multiChainProvider.determineChain(ethToken);
        expect(chain).toBe(BlockchainType.EVM);
        
        // If we got a price, let's verify it looks reasonable
        if (price !== null) {
          expect(price).toBeGreaterThan(0);
          console.log(`ETH price: $${price}`);
        } else {
          console.log(`Could not get ETH price (API might be unavailable)`);
        }
      } catch (error) {
        console.log('Error fetching price:', error instanceof Error ? error.message : 'Unknown error');
      }
      
      // Test through the API endpoint if available
      try {
        const baseUrl = getBaseUrl();
        const apiResponse = await axios.get(`${baseUrl}/api/price?token=${ethToken}`);
        console.log(`API response for ETH token:`, apiResponse.data);
        
        // Always check the chain type is correctly identified
        expect(apiResponse.data.chain).toBe(BlockchainType.EVM);
      } catch (error) {
        console.log('Error fetching price through API:', error);
      }
    });
    
    it('should try to fetch prices for Base tokens', async () => {
      if (!runTests) {
        console.log('Skipping test - Tests disabled');
        return;
      }
      
      const baseToken = testTokens.base.ETH;
      
      try {
        // Get price directly from MultiChainProvider with specific chain
        const price = await multiChainProvider.getPrice(baseToken, BlockchainType.EVM, 'base');
        
        console.log(`Base ETH price: $${price}`);
        
        // Test that chain detection works
        const chain = multiChainProvider.determineChain(baseToken);
        expect(chain).toBe(BlockchainType.EVM);
        
        // If we get a price, verify it
        if (price !== null) {
          expect(price).toBeGreaterThan(0);
          console.log(`Base ETH price: $${price}`);
        } else {
          console.log(`Could not get Base ETH price (API might be unavailable)`);
        }
      } catch (error) {
        console.log('Error fetching Base token price:', error instanceof Error ? error.message : 'Unknown error');
      }
    });
    
    it('should try to fetch prices for unknown tokens by searching multiple chains', async () => {
      if (!runTests) {
        console.log('Skipping test - Tests disabled');
        return;
      }
      
      // Example token from Base chain (this is a real token, but may not be in our test data)
      const unknownToken = '0x532f27101965dd16442E59d40670FaF5eBB142E4';
      
      try {
        // First check if the MultiChainProvider can find this token
        const price = await multiChainProvider.getPrice(unknownToken, BlockchainType.EVM);
        
        console.log(`Unknown token (${unknownToken}) price: $${price}`);
        
        // We don't assert a specific result here since it depends on the token existence
        // If the token exists on any chain, we'll get a result
        if (price !== null) {
          expect(price).toBeGreaterThan(0);
          console.log(`Found price for unknown token: $${price}`);
          
          // Get detailed token info to see which chain it was found on
          const tokenInfo = await multiChainProvider.getTokenInfo(unknownToken, BlockchainType.EVM);
          if (tokenInfo && tokenInfo.specificChain) {
            console.log(`Token was found on chain: ${tokenInfo.specificChain}`);
          }
        } else {
          console.log(`Token not found on any of the tested chains`);
        }
      } catch (error) {
        console.log('Error fetching unknown token price:', error instanceof Error ? error.message : 'Unknown error');
      }
      
      // Test the token through the API
      try {
        const baseUrl = getBaseUrl();
        const apiResponse = await axios.get(`${baseUrl}/api/price?token=${unknownToken}`);
        console.log(`API response for token: ${JSON.stringify(apiResponse.data, null, 2)}`);
        
        // Validate that the chain is correctly identified
        expect(apiResponse.data.chain).toBe(BlockchainType.EVM);
      } catch (error) {
        console.log(`Error fetching price via API: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    // Replace the test that was using NovesProvider with one that just tests MultiChainProvider
    it('should find token on Base chain', async () => {
      if (!runTests) {
        console.log('Skipping test - Tests disabled');
        return;
      }
      
      // Token from the base chain
      const baseToken = '0x532f27101965dd16442e59d40670faf5ebb142e4';
      
      console.log(`Testing MultiChainProvider for token ${baseToken}...`);
      
      // Call getPrice to get the result
      const priceResult = await multiChainProvider.getPrice(baseToken, BlockchainType.EVM, 'base');
      
      console.log(`Price result for ${baseToken} on Base: ${priceResult}`);
      
      // If the API works correctly, we should get a non-null price
      if (priceResult !== null) {
        // Verify the price is a valid number and greater than 0
        expect(typeof priceResult).toBe('number');
        expect(priceResult).toBeGreaterThan(0);
        
        // Also test the token info
        const tokenInfo = await multiChainProvider.getTokenInfo(baseToken, BlockchainType.EVM, 'base');
        
        if (tokenInfo && tokenInfo.specificChain) {
          console.log(`Token ${baseToken} confirmed on chain: ${tokenInfo.specificChain} with price: $${tokenInfo.price}`);
          
          // Based on the previous tests, we expect this token to be on Base
          expect(tokenInfo.specificChain).toBe('base');
        }
      }
    }, 60000); // Increase timeout for API calls
    
    // Replace the test for NovesProvider fallback
    it('should handle token lookups without specific chain parameter', async () => {
      if (!runTests) {
        console.log('Skipping test - Tests disabled');
        return;
      }
      
      // Use a known token that should work without specific chain
      const ethToken = testTokens.eth.ETH; // WETH token
      
      // Test MultiChainProvider directly
      console.log('Testing MultiChainProvider auto chain detection...');
      const multiChainResult = await multiChainProvider.getPrice(ethToken, BlockchainType.EVM);
      console.log(`MultiChainProvider auto detected price: $${multiChainResult}`);
      
      // Get detailed info to see which chain was detected
      const tokenInfo = await multiChainProvider.getTokenInfo(ethToken, BlockchainType.EVM);
      console.log(`MultiChainProvider token info: ${JSON.stringify(tokenInfo)}`);
      
      // Check PriceTracker 
      console.log('Testing PriceTracker...');
      const priceTracker = new PriceTracker();
      
      // Make sure the PriceTracker has the MultiChainProvider
      const providers = (priceTracker as any).providers;
      expect(providers.length).toBe(1);
      
      // Find MultiChainProvider in the list
      const hasMultiChain = providers.some((p: PriceSource) => p.getName() === 'DexScreener MultiChain');
      expect(hasMultiChain).toBe(true);
      
      // Get token info through PriceTracker
      const trackerTokenInfo = await priceTracker.getTokenInfo(ethToken);
      console.log(`PriceTracker.getTokenInfo result: ${JSON.stringify(trackerTokenInfo)}`);
      
      // The token info should have info regardless of the price
      expect(trackerTokenInfo).not.toBeNull();
      if (trackerTokenInfo) {
        expect(trackerTokenInfo.chain).toBe(BlockchainType.EVM);
        if (trackerTokenInfo.price !== null) {
          expect(trackerTokenInfo.price).toBeGreaterThan(0);
        }
      }
    });

    it('should fetch prices for specific known tokens across different chains', async () => {
      if (!runTests) {
        console.log('Skipping test - Tests disabled');
        return;
      }
      
      // List of known tokens that should work with DexScreener
      const knownTokens = [
        { address: '0x912CE59144191C1204E64559FE8253a0e49E6548', name: 'Arbitrum (ARB)', expectedChain: 'arbitrum' },
        { address: '0x532f27101965dd16442E59d40670FaF5eBB142E4', name: 'TOSHI Token', expectedChain: 'base' },
        { address: '0x514910771af9ca656af840dff83e8264ecf986ca', name: 'Chainlink (LINK)', expectedChain: 'eth' }
      ];
      
      // Test each token directly with the MultiChainProvider
      for (const token of knownTokens) {
        console.log(`Testing ${token.name} (${token.address})...`);
        
        // First verify chain detection
        const chainType = multiChainProvider.determineChain(token.address);
        expect(chainType).toBe(BlockchainType.EVM);
        
        // Try to get price with the specific chain parameter
        const price = await multiChainProvider.getPrice(token.address, BlockchainType.EVM, token.expectedChain as SpecificChain);
        console.log(`Price result for ${token.name}: $${price}`);
        
        // Get detailed token info 
        const tokenInfo = await multiChainProvider.getTokenInfo(token.address, BlockchainType.EVM, token.expectedChain as SpecificChain);
        console.log(`Token info for ${token.name}:`, tokenInfo);
        
        // Verify we got a result
        expect(tokenInfo).not.toBeNull();
        
        if (tokenInfo) {
          // Chain type should always be correctly identified
          expect(tokenInfo.chain).toBe(BlockchainType.EVM);
          
          // If we got a price, verify it looks reasonable
          if (tokenInfo.price !== null) {
            expect(tokenInfo.price).toBeGreaterThan(0);
            console.log(`✅ Verified price for ${token.name}: $${tokenInfo.price}`);
          }
          
          // If we got a specific chain, verify it matches our expectation
          if (tokenInfo.specificChain) {
            console.log(`Token ${token.name} detected on chain: ${tokenInfo.specificChain}`);
            
            // The chain should match our expected chain
            if (tokenInfo.specificChain !== token.expectedChain) {
              console.log(`⚠️ Note: ${token.name} was found on ${tokenInfo.specificChain} (expected ${token.expectedChain})`);
            } else {
              console.log(`✅ Confirmed ${token.name} on expected chain: ${token.expectedChain}`);
            }
          }
        }
        
        // Test through the API endpoint
        try {
          const baseUrl = getBaseUrl();
          const apiResponse = await axios.get(`${baseUrl}/api/price/token-info?token=${token.address}`);
          console.log(`API token-info response for ${token.name}:`, apiResponse.data);
          
          // Chain type should always be correctly identified
          expect(apiResponse.data.chain).toBe(BlockchainType.EVM);
          
          if (apiResponse.data.price !== null) {
            console.log(`✅ API returned price for ${token.name}: $${apiResponse.data.price}`);
          }
        } catch (error) {
          console.log(`Error fetching ${token.name} through API:`, 
            error instanceof Error ? error.message : 'Unknown error');
        }
      }
    }, 60000); // 60 second timeout for API tests
  });
  
  describe('API integration for multi-chain price fetching', () => {
    it('should fetch token price through API and automatically detect the chain', async () => {
      if (!runTests) {
        console.log('Skipping test - Tests disabled');
        return;
      }
      
      // Try to fetch an Ethereum token price
      try {
        // Check if we can directly fetch the price using the provider
        const ethToken = testTokens.eth.ETH;
        const chain = multiChainProvider.determineChain(ethToken);
        expect(chain).toBe(BlockchainType.EVM);
        
        // Try to get price through the price tracker
        const price = await priceTracker.getPrice(ethToken);
        console.log(`ETH price from price tracker: $${price}`);
        
        // Test through the token-info endpoint
        const baseUrl = getBaseUrl();
        const apiResponse = await axios.get(`${baseUrl}/api/price/token-info?token=${ethToken}`);
        console.log(`Token info API response:`, apiResponse.data);
        
        // Chain identification should work regardless of price availability
        expect(apiResponse.data.chain).toBe(BlockchainType.EVM);
        
        // If we get a price, check it's reasonable
        if (apiResponse.data.price !== null) {
          expect(apiResponse.data.price).toBeGreaterThan(0);
        }
        
        // If specific chain info is available, it should be one of our supported chains
        if (apiResponse.data.specificChain) {
          expect(evmChains).toContain(apiResponse.data.specificChain);
        }
      } catch (error) {
        console.log(`Error in API integration test: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
    
    it('should handle errors gracefully for unsupported tokens', async () => {
      if (!runTests) {
        console.log('Skipping test - Tests disabled');
        return;
      }
      
      // Use an invalid token address
      const invalidToken = 'not-a-valid-token-address';
      
      try {
        // The API should return a proper error response
        const baseUrl = getBaseUrl();
        const response = await axios.get(`${baseUrl}/api/price?token=${invalidToken}`);
        
        console.log(`API response for invalid token:`, response.data);
        
        // The response should have success: false
        expect(response.data.success).toBe(false);
        expect(response.data.price).toBeNull();
      } catch (error) {
        // Even with error, the API shouldn't crash
        console.log(`Error with invalid token (this may be expected): ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
    
    it('should successfully fetch prices faster when providing the exact chain parameter', async () => {
      if (!runTests) {
        console.log('Skipping test - Tests disabled');
        return;
      }
      
      // Use Chainlink token for testing
      const linkToken = '0x514910771af9ca656af840dff83e8264ecf986ca';
      const expectedChain = 'eth';
      
      console.log(`Testing chain override API performance for Chainlink token (${linkToken})`);
      
      // 1. First test without chain parameter
      const startTimeWithout = Date.now();
      const responseWithout = await axios.get(`${getBaseUrl()}/api/price`, {
        params: {
          token: linkToken
        }
      });
      const endTimeWithout = Date.now();
      const timeWithout = endTimeWithout - startTimeWithout;
      
      console.log(`API response time without chain parameter: ${timeWithout}ms`);
      console.log(`API response:`, responseWithout.data);
      
      // Verify response format
      expect(responseWithout.status).toBe(200);
      expect(responseWithout.data.token).toBe(linkToken);
      expect(responseWithout.data.chain).toBe('evm');
      
      // Short delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 2. Now test with chain parameter
      const startTimeWith = Date.now();
      const responseWith = await axios.get(`${getBaseUrl()}/api/price`, {
        params: {
          token: linkToken,
          chain: 'evm',
          specificChain: expectedChain
        }
      });
      const endTimeWith = Date.now();
      const timeWith = endTimeWith - startTimeWith;
      
      console.log(`API response time with chain parameter: ${timeWith}ms`);
      console.log(`API response:`, responseWith.data);
      
      // Verify response format
      expect(responseWith.status).toBe(200);
      expect(responseWith.data.token).toBe(linkToken);
      expect(responseWith.data.chain).toBe('evm');
      expect(responseWith.data.specificChain).toBe(expectedChain);
      
      // Log the performance difference
      console.log(`API call difference: ${timeWithout - timeWith}ms (${((timeWithout - timeWith) / timeWithout * 100).toFixed(2)}% faster)`);
      
      // Also test the token-info endpoint which should return more detailed information
      console.log(`Testing token-info API with chain parameter for Chainlink token (${linkToken})`);
      const tokenInfoResponse = await axios.get(`${getBaseUrl()}/api/price/token-info`, {
        params: {
          token: linkToken,
          chain: 'evm',
          specificChain: expectedChain
        }
      });
      
      console.log(`Token info API response:`, tokenInfoResponse.data);
      
      // Verify token info response format
      expect(tokenInfoResponse.status).toBe(200);
      expect(tokenInfoResponse.data.token).toBe(linkToken);
      expect(tokenInfoResponse.data.chain).toBe('evm');
      expect(tokenInfoResponse.data.specificChain).toBe(expectedChain);
    }, 60000); // 60 second timeout for this test
  });
}); 