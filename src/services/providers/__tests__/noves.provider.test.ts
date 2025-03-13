import { NovesProvider } from '../noves.provider';
import dotenv from 'dotenv';
import { BlockchainType } from '../../../types';

// Load environment variables
dotenv.config();

const apiKey = process.env.NOVES_API_KEY;
if (!apiKey) {
  throw new Error('NOVES_API_KEY environment variable is not set');
}

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

describe('NovesProvider', () => {
  let provider: NovesProvider;
  
  beforeEach(() => {
    provider = new NovesProvider(apiKey!);
    jest.setTimeout(30000); // Increase timeout for API calls
  });

  describe('Basic functionality', () => {
    it('should have correct name', () => {
      expect(provider.getName()).toBe('Noves');
    });
  });

  describe('Solana token price fetching', () => {
    it('should fetch SOL price', async () => {
      const price = await provider.getPrice(solanaTokens.SOL, BlockchainType.SVM);
      
      expect(price).not.toBeNull();
      expect(typeof price).toBe('number');
      expect(price).toBeGreaterThan(0);
      
      console.log(`SOL price: $${price}`);
    });

    it('should fetch USDC price', async () => {
      const price = await provider.getPrice(solanaTokens.USDC, BlockchainType.SVM);
      
      expect(price).not.toBeNull();
      expect(typeof price).toBe('number');
      expect(price).toBeGreaterThan(0);
      expect(price).toBeCloseTo(1, 1); // USDC should be close to $1
      
      console.log(`USDC price: $${price}`);
    });
  });

  describe('Ethereum token price fetching', () => {
    it('should fetch ETH price', async () => {
      const price = await provider.getPrice(ethereumTokens.ETH, BlockchainType.EVM);
      
      expect(price).not.toBeNull();
      expect(typeof price).toBe('number');
      expect(price).toBeGreaterThan(0);
      
      console.log(`ETH price: $${price}`);
    });

    it('should fetch USDC price', async () => {
      const price = await provider.getPrice(ethereumTokens.USDC, BlockchainType.EVM);
      
      expect(price).not.toBeNull();
      expect(typeof price).toBe('number');
      expect(price).toBeGreaterThan(0);
      expect(price).toBeCloseTo(1, 1); // USDC should be close to $1
      
      console.log(`USDC price: $${price}`);
    });
  });

  describe('Chain detection', () => {
    it('should detect Solana addresses correctly', async () => {
      const chain = provider.determineChain(solanaTokens.SOL);
      expect(chain).toBe(BlockchainType.SVM);
    });

    it('should detect Ethereum addresses correctly', async () => {
      const chain = provider.determineChain(ethereumTokens.ETH);
      expect(chain).toBe(BlockchainType.EVM);
    });
  });

  describe('Support checking', () => {
    it('should support SOL token', async () => {
      const supported = await provider.supports(solanaTokens.SOL);
      expect(supported).toBe(true);
    });
    
    it('should support ETH token', async () => {
      const supported = await provider.supports(ethereumTokens.ETH);
      expect(supported).toBe(true);
    });
    
    it('should not support invalid tokens', async () => {
      const supported = await provider.supports('invalid_token_address');
      expect(supported).toBe(false);
    });
  });
}); 