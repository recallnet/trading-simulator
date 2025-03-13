import { MultiChainProvider, supportedEvmChains } from '../multi-chain.provider';
import { BlockchainType } from '../../../types';
import axios from 'axios';
import dotenv from 'dotenv';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Load environment variables
dotenv.config();

const apiKey = process.env.NOVES_API_KEY || 'test-api-key';

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

// Sample success response from API - using a mock price that can be anything reasonable
const mockSuccessResponse = {
  status: 200,
  data: {
    price: 3500.25 // This is just a mock value for testing
  }
};

// Sample error response for non-existent token
const mockNotFoundResponse = {
  status: 404,
  data: {
    error: 'Token not found'
  }
};

describe('MultiChainProvider', () => {
  let provider: MultiChainProvider;
  
  beforeEach(() => {
    provider = new MultiChainProvider(apiKey);
    
    // Reset axios mock before each test
    mockedAxios.get.mockReset();
    
    // Mock console methods to reduce noise
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  afterEach(() => {
    // Restore console methods
    jest.restoreAllMocks();
  });

  describe('Basic functionality', () => {
    it('should have correct name', () => {
      expect(provider.getName()).toBe('Noves MultiChain');
    });
    
    it('should throw an error if initialized without API key', () => {
      expect(() => new MultiChainProvider('')).toThrow('Noves API key is required');
    });
  });

  describe('Chain detection', () => {
    it('should detect EVM token addresses correctly', () => {
      const ethToken = testTokens.eth.ETH;
      expect(provider.determineChain(ethToken)).toBe(BlockchainType.EVM);
      
      const polygonToken = testTokens.polygon.MATIC;
      expect(provider.determineChain(polygonToken)).toBe(BlockchainType.EVM);
    });
    
    it('should detect Solana token addresses correctly', () => {
      const solToken = testTokens.svm.SOL;
      expect(provider.determineChain(solToken)).toBe(BlockchainType.SVM);
      
      const usdcToken = testTokens.svm.USDC;
      expect(provider.determineChain(usdcToken)).toBe(BlockchainType.SVM);
    });
  });
  
  describe('Price fetching across chains', () => {
    it('should use the API to fetch prices', async () => {
      const ethToken = testTokens.eth.ETH;
      
      // Mock a simple successful response
      mockedAxios.get.mockResolvedValue(mockSuccessResponse);
      
      const price = await provider.getPrice(ethToken);
      
      // Instead of checking for an exact price, verify the data was parsed correctly
      expect(price).toBe(mockSuccessResponse.data.price);
      // Verify the price is a number and positive
      expect(typeof price).toBe('number');
      expect(price).toBeGreaterThan(0);
      expect(mockedAxios.get).toHaveBeenCalled();
      
      // Verify that the URL contains the expected parts
      const url = mockedAxios.get.mock.calls[0][0];
      expect(url).toContain('/evm/');
      expect(url).toContain('/price/');
      expect(url).toContain(ethToken.toLowerCase());
    });
    
    it('should return null if API returns an error', async () => {
      const unknownToken = '0x1234567890123456789012345678901234567890';
      
      // Mock all requests to return error
      mockedAxios.get.mockRejectedValue({ response: { status: 404 } });
      
      const price = await provider.getPrice(unknownToken);
      
      expect(price).toBeNull();
      expect(mockedAxios.get).toHaveBeenCalled();
    });
    
    it('should not try to fetch Solana token prices', async () => {
      const solToken = testTokens.svm.SOL;
      
      const price = await provider.getPrice(solToken);
      
      expect(price).toBeNull();
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });
    
    it('should cache results and use them for subsequent requests', async () => {
      const ethToken = testTokens.eth.ETH;
      
      // Mock success for first request
      mockedAxios.get.mockResolvedValueOnce(mockSuccessResponse);
      
      // First call should make API request
      const firstResult = await provider.getPrice(ethToken);
      // Verify the price is returned correctly from the mock
      expect(firstResult).toBe(mockSuccessResponse.data.price);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      
      // Reset mock to verify it's not called again
      mockedAxios.get.mockReset();
      
      // Second call should use cache
      const secondResult = await provider.getPrice(ethToken);
      // Verify that cache returns the same price
      expect(secondResult).toBe(mockSuccessResponse.data.price);
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });
  });
  
  describe('Token info retrieval', () => {
    it('should return both price and chain information', async () => {
      const ethToken = testTokens.eth.ETH;
      
      mockedAxios.get.mockResolvedValueOnce(mockSuccessResponse);
      
      const info = await provider.getTokenInfo(ethToken);
      
      expect(info).not.toBeNull();
      // Instead of checking for an exact price, verify the data was parsed correctly
      expect(info?.price).toBe(mockSuccessResponse.data.price);
      // Verify the price is a number and positive
      expect(typeof info?.price).toBe('number');
      expect(info?.price).toBeGreaterThan(0);
      // The chain is the high-level type of blockchain (evm, not a specific chain)
      expect(info?.chain).toBe(BlockchainType.EVM);
      // Specific chain should be one of the supported chains
      if (info?.specificChain) {
        expect(supportedEvmChains).toContain(info.specificChain);
      }
    });
    
    it('should return object with null price if token info cannot be found', async () => {
      // Use a valid EVM format for the unknown token to ensure axios is called
      const unknownToken = '0x1234567890123456789012345678901234567890';
      
      // Make sure get is called but throws an error to simulate token not found
      mockedAxios.get.mockRejectedValueOnce({
        response: { status: 404, data: { error: 'Token not found' } }
      });
      
      const info = await provider.getTokenInfo(unknownToken);
      
      // Provider returns an object with null price when token info can't be found
      expect(info).not.toBeNull();
      expect(info?.price).toBeNull();
      expect(mockedAxios.get).toHaveBeenCalled();
    });
  });
  
  describe('Support checking', () => {
    it('should return true for supported tokens', async () => {
      const ethToken = testTokens.eth.ETH;
      
      // Mock success response
      mockedAxios.get.mockResolvedValueOnce(mockSuccessResponse);
      
      const supported = await provider.supports(ethToken);
      expect(supported).toBe(true);
    });
    
    it('should return false for unsupported tokens', async () => {
      const unknownToken = '0x1234567890123456789012345678901234567890';
      
      // Mock API call to fail
      mockedAxios.get.mockRejectedValue({ response: { status: 404 } });
      
      const supported = await provider.supports(unknownToken);
      expect(supported).toBe(false);
    });
    
    it('should return false for Solana tokens', async () => {
      const solToken = testTokens.svm.SOL;
      
      const supported = await provider.supports(solToken);
      expect(supported).toBe(false);
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should handle network errors gracefully', async () => {
      const ethToken = testTokens.eth.ETH;
      
      // Mock network error
      mockedAxios.get.mockRejectedValue(new Error('Network error'));
      
      const price = await provider.getPrice(ethToken);
      
      expect(price).toBeNull();
      expect(mockedAxios.get).toHaveBeenCalled();
    });
  });

  // Add proper cleanup after all tests
  afterAll(async () => {
    try {
      // Clean up mocks
      mockedAxios.get.mockRestore();
      
      // Force close any remaining connections that might be created by imports
      try {
        const connection = require('../../../database/connection').default;
        if (connection && connection.getPool) {
          const pool = connection.getPool();
          if (pool) {
            await pool.end();
            console.log('[Test] Closed database connection pool in multi-chain.provider.test.ts');
          }
        }
      } catch (error) {
        // Ignore errors if no connection exists
      }
    } catch (error) {
      console.error('[Test] Error during cleanup:', error);
    }
  });
}); 