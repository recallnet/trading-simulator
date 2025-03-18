/**
 * Multi-Chain Examples for Trading Simulator API
 * 
 * This file contains examples for using the Trading Simulator API with
 * multiple blockchains (Solana and Ethereum).
 */

import { TradingSimulatorClient, BlockchainType, SpecificChain, COMMON_TOKENS, TOKEN_CHAINS } from './api-client';

// Token addresses for different chains
const TOKENS = {
  // Solana Tokens
  SOL: COMMON_TOKENS.SVM.SOL,
  USDC_SOL: COMMON_TOKENS.SVM.USDC,

  // Ethereum Tokens
  ETH: COMMON_TOKENS.EVM.ETH,
  USDC_ETH: COMMON_TOKENS.EVM.USDC,
  LINK: COMMON_TOKENS.EVM.LINK,
  ARB: COMMON_TOKENS.EVM.ARB,
  TOSHI: COMMON_TOKENS.EVM.TOSHI
};

// Replace with your team's credentials
const apiKey = 'your-api-key';
const apiSecret = 'your-api-secret';
const baseUrl = 'http://localhost:3001';

// Function to help log section headers
function logSection(title: string) {
  console.log('\n' + '='.repeat(50));
  console.log(`  ${title}`);
  console.log('='.repeat(50) + '\n');
}

/**
 * Example 1: Get prices for tokens on different chains
 */
async function getMultiChainPrices(client: TradingSimulatorClient) {
  logSection('Example 1: Get Multi-Chain Prices');

  // Get Solana token prices
  console.log('Getting Solana token prices...');
  const solPrice = await client.getPrice(TOKENS.SOL);
  console.log(`SOL Price: $${solPrice.price} (Chain: ${solPrice.chain})`);
  
  const usdcSolPrice = await client.getPrice(TOKENS.USDC_SOL);
  console.log(`USDC (Solana) Price: $${usdcSolPrice.price} (Chain: ${usdcSolPrice.chain})`);

  // Get Ethereum token prices
  console.log('\nGetting Ethereum token prices...');
  const ethPrice = await client.getPrice(TOKENS.ETH);
  console.log(`ETH Price: $${ethPrice.price} (Chain: ${ethPrice.chain})`);
  
  const usdcEthPrice = await client.getPrice(TOKENS.USDC_ETH);
  console.log(`USDC (Ethereum) Price: $${usdcEthPrice.price} (Chain: ${usdcEthPrice.chain})`);

  // Get prices directly using the standard endpoint
  // Note: The system now uses DexScreener for all price lookups
  console.log('\nGetting prices from DexScreener provider...');
  const solDexPrice = await client.getPrice(TOKENS.SOL, BlockchainType.SVM);
  console.log(`SOL Price from DexScreener: $${solDexPrice.price} (Chain: ${solDexPrice.chain})`);
  
  const ethDexPrice = await client.getPrice(TOKENS.ETH, BlockchainType.EVM);
  console.log(`ETH Price from DexScreener: $${ethDexPrice.price} (Chain: ${ethDexPrice.chain})`);
}

/**
 * Example 2: Filter balances and portfolio by chain
 */
async function getMultiChainPortfolio(client: TradingSimulatorClient) {
  logSection('Example 2: Portfolio Across Chains');

  // Get all balances (across all chains)
  const balances = await client.getBalances();
  console.log('All Balances:');
  
  // Group balances by chain
  const solanaBalances = balances.balances.filter((b: any) => b.chain === BlockchainType.SVM);
  const ethereumBalances = balances.balances.filter((b: any) => b.chain === BlockchainType.EVM);
  
  console.log('\nSolana Balances:');
  solanaBalances.forEach((balance: any) => {
    console.log(`  ${balance.token}: ${balance.amount}`);
  });
  
  console.log('\nEthereum Balances:');
  ethereumBalances.forEach((balance: any) => {
    console.log(`  ${balance.token}: ${balance.amount}`);
  });
}

/**
 * Example 3: Execute trades on different chains
 */
async function executeMultiChainTrades(client: TradingSimulatorClient) {
  logSection('Example 3: Execute Trades on Different Chains');

  // 1. Buy SOL with USDC on Solana
  console.log('Executing Solana trade: Buy SOL with USDC...');
  try {
    const solTrade = await client.executeTrade({
      fromToken: TOKENS.USDC_SOL,
      toToken: TOKENS.SOL,
      amount: '10.00', // 10 USDC
      slippageTolerance: '0.5',
      fromChain: BlockchainType.SVM,
      toChain: BlockchainType.SVM
    });
    console.log('Solana Trade Result:', JSON.stringify(solTrade, null, 2));
  } catch (error) {
    console.error('Error executing Solana trade:', error);
  }

  // 2. Buy ETH with USDC on Ethereum
  console.log('\nExecuting Ethereum trade: Buy ETH with USDC...');
  try {
    const ethTrade = await client.executeTrade({
      fromToken: TOKENS.USDC_ETH,
      toToken: TOKENS.ETH,
      amount: '10.00', // 10 USDC
      slippageTolerance: '0.5',
      fromChain: BlockchainType.EVM,
      toChain: BlockchainType.EVM,
      fromSpecificChain: SpecificChain.ETH,
      toSpecificChain: SpecificChain.ETH
    });
    console.log('Ethereum Trade Result:', JSON.stringify(ethTrade, null, 2));
  } catch (error) {
    console.error('Error executing Ethereum trade:', error);
  }
}

/**
 * Example 4: Execute cross-chain trades
 */
async function executeCrossChainTrades(client: TradingSimulatorClient) {
  logSection('Example 4: Execute Cross-Chain Trades');

  // 1. Trade Solana USDC to Ethereum ETH
  console.log('Executing cross-chain trade: Solana USDC to Ethereum ETH...');
  try {
    const crossTrade1 = await client.executeTrade({
      fromToken: TOKENS.USDC_SOL,
      toToken: TOKENS.ETH,
      amount: '50.00',
      slippageTolerance: '0.5',
      fromChain: BlockchainType.SVM,
      toChain: BlockchainType.EVM,
      fromSpecificChain: SpecificChain.SVM,
      toSpecificChain: SpecificChain.ETH
    });
    console.log('Cross-Chain Trade Result:', JSON.stringify(crossTrade1, null, 2));
    console.log(`From chain: ${crossTrade1.transaction.fromChain}, To chain: ${crossTrade1.transaction.toChain}`);
  } catch (error) {
    console.error('Error executing cross-chain trade:', error);
  }

  // 2. Trade Ethereum USDC to Solana SOL
  console.log('\nExecuting cross-chain trade: Ethereum USDC to Solana SOL...');
  try {
    const crossTrade2 = await client.executeTrade({
      fromToken: TOKENS.USDC_ETH,
      toToken: TOKENS.SOL,
      amount: '50.00',
      slippageTolerance: '0.5',
      fromChain: BlockchainType.EVM,
      toChain: BlockchainType.SVM,
      fromSpecificChain: SpecificChain.ETH,
      toSpecificChain: SpecificChain.SVM
    });
    console.log('Cross-Chain Trade Result:', JSON.stringify(crossTrade2, null, 2));
    console.log(`From chain: ${crossTrade2.transaction.fromChain}, To chain: ${crossTrade2.transaction.toChain}`);
  } catch (error) {
    console.error('Error executing cross-chain trade:', error);
  }
}

/**
 * Example 5: Get filtered trade history by chain
 */
async function getFilteredTradeHistory(client: TradingSimulatorClient) {
  logSection('Example 5: Filtered Trade History');

  // Get Solana trades
  console.log('Getting Solana trade history...');
  const solanaTrades = await client.getTrades({
    chain: BlockchainType.SVM,
    limit: 5
  });
  console.log(`Found ${solanaTrades.trades.length} Solana trades`);
  
  if (solanaTrades.trades.length > 0) {
    console.log('Latest Solana trade:', JSON.stringify(solanaTrades.trades[0], null, 2));
  }

  // Get Ethereum trades
  console.log('\nGetting Ethereum trade history...');
  const ethereumTrades = await client.getTrades({
    chain: BlockchainType.EVM,
    limit: 5
  });
  console.log(`Found ${ethereumTrades.trades.length} Ethereum trades`);
  
  if (ethereumTrades.trades.length > 0) {
    console.log('Latest Ethereum trade:', JSON.stringify(ethereumTrades.trades[0], null, 2));
  }
}

/**
 * Example 6: Using chain override for faster price lookups
 */
async function getChainOverridePrices(client: TradingSimulatorClient) {
  logSection('Example 6: Chain Override for Faster Price Lookups');

  // Tokens we'll test with
  const testTokens = [
    { name: 'Chainlink (LINK)', address: TOKENS.LINK, chain: SpecificChain.ETH },
    { name: 'Arbitrum (ARB)', address: TOKENS.ARB, chain: SpecificChain.ARBITRUM },
    { name: 'TOSHI', address: TOKENS.TOSHI, chain: SpecificChain.BASE }
  ];

  for (const token of testTokens) {
    console.log(`Testing ${token.name} (${token.address})...`);
    
    // First, get price without chain override (slower)
    console.log('Getting price WITHOUT chain override...');
    const startTime1 = Date.now();
    const priceNoOverride = await client.getPrice(token.address, BlockchainType.EVM);
    const duration1 = Date.now() - startTime1;
    console.log(`Price: $${priceNoOverride.price}`);
    console.log(`Time taken: ${duration1}ms`);
    console.log(`Chain detected: ${priceNoOverride.chain}, Specific chain: ${priceNoOverride.specificChain || 'not detected'}`);
    
    // Short delay to prevent rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Now, get price WITH chain override (faster)
    console.log('\nGetting price WITH chain override...');
    const startTime2 = Date.now();
    const priceWithOverride = await client.getPrice(
      token.address, 
      BlockchainType.EVM,
      token.chain
    );
    const duration2 = Date.now() - startTime2;
    console.log(`Price: $${priceWithOverride.price}`);
    console.log(`Time taken: ${duration2}ms`);
    console.log(`Chain detected: ${priceWithOverride.chain}, Specific chain: ${priceWithOverride.specificChain || 'not detected'}`);
    
    // Calculate improvement
    if (duration1 > 0 && duration2 > 0) {
      const improvement = ((duration1 - duration2) / duration1 * 100).toFixed(2);
      const speedup = (duration1 / duration2).toFixed(2);
      console.log(`\nPerformance improvement: ${improvement}% faster (${speedup}x speedup)`);
    }
    
    console.log('\n-----------------------------------------\n');
  }
}

/**
 * Example 7: Get detailed token info with chain override
 */
async function getTokenInfoWithChainOverride(client: TradingSimulatorClient) {
  logSection('Example 7: Token Info with Chain Override');

  // First get token info without chain override
  console.log('Getting detailed token info for Chainlink (LINK) WITHOUT chain override...');
  const startTime1 = Date.now();
  const tokenInfoNoOverride = await client.getTokenInfo(TOKENS.LINK);
  const duration1 = Date.now() - startTime1;
  
  console.log(`Token info: ${JSON.stringify(tokenInfoNoOverride, null, 2)}`);
  console.log(`Time taken: ${duration1}ms`);
  
  // Short delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Now with chain override
  console.log('\nGetting detailed token info for Chainlink (LINK) WITH chain override...');
  const startTime2 = Date.now();
  const tokenInfoWithOverride = await client.getTokenInfo(
    TOKENS.LINK,
    BlockchainType.EVM,
    SpecificChain.ETH
  );
  const duration2 = Date.now() - startTime2;
  
  console.log(`Token info: ${JSON.stringify(tokenInfoWithOverride, null, 2)}`);
  console.log(`Time taken: ${duration2}ms`);
  
  // Calculate improvement
  if (duration1 > 0 && duration2 > 0) {
    const improvement = ((duration1 - duration2) / duration1 * 100).toFixed(2);
    const speedup = (duration1 / duration2).toFixed(2);
    console.log(`\nPerformance improvement: ${improvement}% faster (${speedup}x speedup)`);
  }
}

/**
 * Main function to run all examples
 */
async function runAllExamples() {
  try {
    // Create Trading Simulator client
    const client = new TradingSimulatorClient(apiKey, apiSecret, baseUrl);
    console.log('Trading Simulator client initialized');

    // Run examples
    await getMultiChainPrices(client);
    await getMultiChainPortfolio(client);
    await executeMultiChainTrades(client);
    await executeCrossChainTrades(client);
    await getFilteredTradeHistory(client);
    await getChainOverridePrices(client);
    await getTokenInfoWithChainOverride(client);
    
    console.log('\nAll examples completed successfully!');
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Run all examples if this file is executed directly
if (require.main === module) {
  console.log('Running multi-chain examples...');
  runAllExamples().catch(console.error);
}

// Export functions for individual use
export {
  getMultiChainPrices,
  getMultiChainPortfolio,
  executeMultiChainTrades,
  executeCrossChainTrades,
  getFilteredTradeHistory,
  getChainOverridePrices,
  getTokenInfoWithChainOverride
}; 