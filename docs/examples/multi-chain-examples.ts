/**
 * Multi-Chain Examples for Trading Simulator API
 * 
 * This file contains examples for using the Trading Simulator API with
 * multiple blockchains (Solana and Ethereum).
 */

import { TradingSimulatorClient, BlockchainType, COMMON_TOKENS } from './api-client';

// Token addresses for different chains
const TOKENS = {
  // Solana Tokens
  SOL: COMMON_TOKENS.SVM.SOL,
  USDC_SOL: COMMON_TOKENS.SVM.USDC,

  // Ethereum Tokens
  ETH: COMMON_TOKENS.EVM.ETH,
  USDC_ETH: COMMON_TOKENS.EVM.USDC
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

  // Get price from specific provider (Noves supports both chains)
  console.log('\nGetting prices from Noves provider...');
  const solNovesPrice = await client.getPriceFromProvider(TOKENS.SOL, 'noves');
  console.log(`SOL Price from Noves: $${solNovesPrice.price} (Chain: ${solNovesPrice.chain})`);
  
  const ethNovesPrice = await client.getPriceFromProvider(TOKENS.ETH, 'noves');
  console.log(`ETH Price from Noves: $${ethNovesPrice.price} (Chain: ${ethNovesPrice.chain})`);
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
      tokenAddress: TOKENS.SOL,
      side: 'buy',
      amount: '10.00', // 10 USDC
      slippageTolerance: '0.5'
    });
    console.log('Solana Trade Result:', JSON.stringify(solTrade, null, 2));
  } catch (error) {
    console.error('Error executing Solana trade:', error);
  }

  // 2. Buy ETH with USDC on Ethereum
  console.log('\nExecuting Ethereum trade: Buy ETH with USDC...');
  try {
    const ethTrade = await client.executeTrade({
      tokenAddress: TOKENS.ETH,
      side: 'buy',
      amount: '10.00', // 10 USDC
      slippageTolerance: '0.5'
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
    const crossTrade1 = await client.executeCrossChainTrade({
      fromToken: TOKENS.USDC_SOL,
      toToken: TOKENS.ETH,
      amount: '50.00',
      slippageTolerance: '0.5'
    });
    console.log('Cross-Chain Trade Result:', JSON.stringify(crossTrade1, null, 2));
    console.log(`From chain: ${crossTrade1.transaction.fromChain}, To chain: ${crossTrade1.transaction.toChain}`);
  } catch (error) {
    console.error('Error executing cross-chain trade:', error);
  }

  // 2. Trade Ethereum USDC to Solana SOL
  console.log('\nExecuting cross-chain trade: Ethereum USDC to Solana SOL...');
  try {
    const crossTrade2 = await client.executeCrossChainTrade({
      fromToken: TOKENS.USDC_ETH,
      toToken: TOKENS.SOL,
      amount: '50.00',
      slippageTolerance: '0.5'
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
  getFilteredTradeHistory
}; 