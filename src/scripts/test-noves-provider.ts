import dotenv from 'dotenv';
import { NovesProvider } from '../services/providers/noves.provider';
import { BlockchainType } from '../types';

// Load environment variables
dotenv.config();

const apiKey = process.env.NOVES_API_KEY;
if (!apiKey) {
  console.error('NOVES_API_KEY environment variable is not set');
  process.exit(1);
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

async function testProvider() {
  const provider = new NovesProvider(apiKey!);
  
  console.log('\n--- Testing Noves Provider ---\n');
  
  // Test Solana tokens
  console.log('Testing Solana tokens:');
  for (const [symbol, address] of Object.entries(solanaTokens)) {
    try {
      const price = await provider.getPrice(address, BlockchainType.SVM);
      console.log(`${symbol} (${address}): $${price}`);
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error);
    }
  }
  
  console.log('\nTesting Ethereum tokens:');
  for (const [symbol, address] of Object.entries(ethereumTokens)) {
    try {
      const price = await provider.getPrice(address, BlockchainType.EVM);
      console.log(`${symbol} (${address}): $${price}`);
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error);
    }
  }
  
  console.log('\nTesting chain detection:');
  for (const [chain, tokens] of Object.entries({ Solana: solanaTokens, Ethereum: ethereumTokens })) {
    for (const [symbol, address] of Object.entries(tokens)) {
      const detectedChain = provider.determineChain(address);
      console.log(`${symbol} (${address}): Detected as ${detectedChain}`);
    }
  }
  
  console.log('\nTesting support checking:');
  for (const [chain, tokens] of Object.entries({ Solana: solanaTokens, Ethereum: ethereumTokens })) {
    for (const [symbol, address] of Object.entries(tokens)) {
      const supported = await provider.supports(address);
      console.log(`${symbol} (${address}): ${supported ? 'Supported' : 'Not supported'}`);
    }
  }
  
  // Test cache
  console.log('\nTesting caching:');
  console.log('Fetching SOL price first time:');
  await provider.getPrice(solanaTokens.SOL, BlockchainType.SVM);
  
  console.log('\nFetching SOL price second time (should use cache):');
  await provider.getPrice(solanaTokens.SOL, BlockchainType.SVM);
}

testProvider().catch(error => {
  console.error('Error running test:', error);
  process.exit(1);
}); 