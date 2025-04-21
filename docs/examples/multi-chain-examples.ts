/**
 * Multi-Chain Examples for Trading Simulator API
 *
 * This file contains examples for using the Trading Simulator API with
 * multiple blockchains (Solana and Ethereum).
 */

import { TradingSimulatorClient, COMMON_TOKENS } from './api-client';
import {
  BlockchainType,
  SpecificChain,
  PriceResponse,
  BalancesResponse,
  TradeResponse,
  TokenInfoResponse,
  TradeHistoryResponse,
  TradeExecutionParams
} from '../../e2e/utils/api-types';

// Use TradeExecutionParams for trade details
type TradeDetails = TradeExecutionParams;

interface TradeHistoryParams {
  limit?: number;
  offset?: number;
  token?: string;
  chain?: BlockchainType;
}

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
  TOSHI: COMMON_TOKENS.EVM.TOSHI,
};

// Replace with your team's API key
const apiKey = 'your-api-key';
const baseUrl = 'http://localhost:3000';

// Function to help log section headers
function logSection(title: string): void {
  console.log('\n' + '='.repeat(50));
  console.log(`  ${title}`);
  console.log('='.repeat(50) + '\n');
}

/**
 * Example 1: Get prices for tokens on different chains
 */
async function getMultiChainPrices(client: TradingSimulatorClient): Promise<void> {
  logSection('Example 1: Get Multi-Chain Prices');

  // Get Solana token prices
  console.log('Getting Solana token prices...');
  const solPrice: PriceResponse = await client.getPrice(TOKENS.SOL);
  console.log(`SOL Price: $${solPrice.price} (Chain: ${solPrice.chain})`);

  const usdcSolPrice: PriceResponse = await client.getPrice(TOKENS.USDC_SOL);
  console.log(`USDC (Solana) Price: $${usdcSolPrice.price} (Chain: ${usdcSolPrice.chain})`);

  // Get Ethereum token prices
  console.log('\nGetting Ethereum token prices...');
  const ethPrice: PriceResponse = await client.getPrice(TOKENS.ETH);
  console.log(`ETH Price: $${ethPrice.price} (Chain: ${ethPrice.chain})`);

  const usdcEthPrice: PriceResponse = await client.getPrice(TOKENS.USDC_ETH);
  console.log(`USDC (Ethereum) Price: $${usdcEthPrice.price} (Chain: ${usdcEthPrice.chain})`);

  // Get prices directly using the standard endpoint
  // Note: The system now uses DexScreener for all price lookups
  console.log('\nGetting prices from DexScreener provider...');
  const solDexPrice: PriceResponse = await client.getPrice(TOKENS.SOL, BlockchainType.SVM);
  console.log(`SOL Price from DexScreener: $${solDexPrice.price} (Chain: ${solDexPrice.chain})`);

  const ethDexPrice: PriceResponse = await client.getPrice(TOKENS.ETH, BlockchainType.EVM);
  console.log(`ETH Price from DexScreener: $${ethDexPrice.price} (Chain: ${ethDexPrice.chain})`);
}

/**
 * Example 2: Filter balances and portfolio by chain
 */
async function getMultiChainPortfolio(client: TradingSimulatorClient): Promise<void> {
  logSection('Example 2: Portfolio Across Chains');

  // Get all balances (across all chains)
  const balances: BalancesResponse = await client.getBalances();
  console.log('All Balances:', JSON.stringify(balances, null, 2));

  // Group balances by chain
  if (balances.balances && balances.balances.length > 0) {
    // Filter for Solana tokens
    const solanaBalances = balances.balances.filter(
      (balance) => balance.chain === BlockchainType.SVM,
    );

    // Filter for Ethereum tokens
    const ethereumBalances = balances.balances.filter(
      (balance) => balance.chain === BlockchainType.EVM,
    );

    console.log('\nSolana Balances:');
    solanaBalances.forEach((balance) => {
      console.log(`  ${balance.token}: ${balance.amount}`);
    });

    console.log('\nEthereum Balances:');
    ethereumBalances.forEach((balance) => {
      console.log(`  ${balance.token}: ${balance.amount}`);
    });
  }
}

/**
 * Example 3: Execute trades on different chains
 */
async function executeMultiChainTrades(client: TradingSimulatorClient): Promise<void> {
  logSection('Example 3: Execute Trades on Different Chains');

  // 1. Buy SOL with USDC on Solana
  console.log('Executing Solana trade: Buy SOL with USDC...');
  try {
    const solanaTradeDetails: TradeDetails = {
      fromToken: TOKENS.USDC_SOL,
      toToken: TOKENS.SOL,
      amount: '10.00', // 10 USDC
      slippageTolerance: '0.5',
      fromChain: BlockchainType.SVM,
      toChain: BlockchainType.SVM,
    };

    const solTrade: TradeResponse = await client.executeTrade(solanaTradeDetails);
    console.log('Solana Trade Result:', JSON.stringify(solTrade, null, 2));
  } catch (error) {
    console.error('Error executing Solana trade:', error);
  }

  // 2. Buy ETH with USDC on Ethereum
  console.log('\nExecuting Ethereum trade: Buy ETH with USDC...');
  try {
    const ethereumTradeDetails: TradeDetails = {
      fromToken: TOKENS.USDC_ETH,
      toToken: TOKENS.ETH,
      amount: '10.00', // 10 USDC
      slippageTolerance: '0.5',
      fromChain: BlockchainType.EVM,
      toChain: BlockchainType.EVM,
      fromSpecificChain: SpecificChain.ETH,
      toSpecificChain: SpecificChain.ETH,
    };

    const ethTrade: TradeResponse = await client.executeTrade(ethereumTradeDetails);
    console.log('Ethereum Trade Result:', JSON.stringify(ethTrade, null, 2));
  } catch (error) {
    console.error('Error executing Ethereum trade:', error);
  }
}

/**
 * Example 4: Execute cross-chain trades
 */
async function executeCrossChainTrades(client: TradingSimulatorClient): Promise<void> {
  logSection('Example 4: Execute Cross-Chain Trades');

  // 1. Trade Solana USDC to Ethereum ETH
  console.log('Executing cross-chain trade: Solana USDC to Ethereum ETH...');
  try {
    const crossChainTradeDetails1: TradeDetails = {
      fromToken: TOKENS.USDC_SOL,
      toToken: TOKENS.ETH,
      amount: '50.00',
      slippageTolerance: '0.5',
      fromChain: BlockchainType.SVM,
      toChain: BlockchainType.EVM,
      fromSpecificChain: SpecificChain.SVM,
      toSpecificChain: SpecificChain.ETH,
    };

    const crossTrade1: TradeResponse = await client.executeTrade(crossChainTradeDetails1);
    console.log('Cross-Chain Trade Result:', JSON.stringify(crossTrade1, null, 2));
    console.log(
      `From chain: ${crossTrade1.transaction.fromChain}, To chain: ${crossTrade1.transaction.toChain}`,
    );
  } catch (error) {
    console.error('Error executing cross-chain trade:', error);
  }

  // 2. Trade Ethereum USDC to Solana SOL
  console.log('\nExecuting cross-chain trade: Ethereum USDC to Solana SOL...');
  try {
    const crossChainTradeDetails2: TradeDetails = {
      fromToken: TOKENS.USDC_ETH,
      toToken: TOKENS.SOL,
      amount: '50.00',
      slippageTolerance: '0.5',
      fromChain: BlockchainType.EVM,
      toChain: BlockchainType.SVM,
      fromSpecificChain: SpecificChain.ETH,
      toSpecificChain: SpecificChain.SVM,
    };

    const crossTrade2: TradeResponse = await client.executeTrade(crossChainTradeDetails2);
    console.log('Cross-Chain Trade Result:', JSON.stringify(crossTrade2, null, 2));
    console.log(
      `From chain: ${crossTrade2.transaction.fromChain}, To chain: ${crossTrade2.transaction.toChain}`,
    );
  } catch (error) {
    console.error('Error executing cross-chain trade:', error);
  }
}

/**
 * Example 5: Get filtered trade history by chain
 */
async function getFilteredTradeHistory(client: TradingSimulatorClient): Promise<void> {
  logSection('Example 5: Filtered Trade History');

  // Get Solana trades
  console.log('Getting Solana trade history...');
  const solanaParams: TradeHistoryParams = {
    chain: BlockchainType.SVM,
    limit: 5,
  };

  const solanaTrades: TradeHistoryResponse = await client.getTradeHistory(solanaParams);
  console.log(`Found ${solanaTrades.trades.length} Solana trades`);

  if (solanaTrades.trades.length > 0) {
    console.log('Latest Solana trade:', JSON.stringify(solanaTrades.trades[0], null, 2));
  }

  // Get Ethereum trades
  console.log('\nGetting Ethereum trade history...');
  const ethereumParams: TradeHistoryParams = {
    chain: BlockchainType.EVM,
    limit: 5,
  };

  const ethereumTrades: TradeHistoryResponse = await client.getTradeHistory(ethereumParams);
  console.log(`Found ${ethereumTrades.trades.length} Ethereum trades`);

  if (ethereumTrades.trades.length > 0) {
    console.log('Latest Ethereum trade:', JSON.stringify(ethereumTrades.trades[0], null, 2));
  }
}

/**
 * Example 6: Using chain override for faster price lookups
 */
async function getChainOverridePrices(client: TradingSimulatorClient): Promise<void> {
  logSection('Example 6: Chain Override for Faster Price Lookups');

  // Tokens we'll test with
  interface TokenTestInfo {
    name: string;
    address: string;
    chain: SpecificChain;
  }

  const testTokens: TokenTestInfo[] = [
    { name: 'Chainlink (LINK)', address: TOKENS.LINK, chain: SpecificChain.ETH },
    { name: 'Arbitrum (ARB)', address: TOKENS.ARB, chain: SpecificChain.ARBITRUM },
    { name: 'TOSHI', address: TOKENS.TOSHI, chain: SpecificChain.BASE },
  ];

  for (const token of testTokens) {
    console.log(`Testing ${token.name} (${token.address})...`);

    // First, get price without chain override (slower)
    console.log('Getting price WITHOUT chain override...');
    const startTime1 = Date.now();
    const priceNoOverride: PriceResponse = await client.getPrice(token.address, BlockchainType.EVM);
    const duration1 = Date.now() - startTime1;
    console.log(`Price: $${priceNoOverride.price}`);
    console.log(`Time taken: ${duration1}ms`);
    console.log(
      `Chain detected: ${priceNoOverride.chain}, Specific chain: ${priceNoOverride.specificChain || 'not detected'}`,
    );

    // Short delay to prevent rate limiting
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Now, get price WITH chain override (faster)
    console.log('\nGetting price WITH chain override...');
    const startTime2 = Date.now();
    const priceWithOverride: PriceResponse = await client.getPrice(
      token.address,
      BlockchainType.EVM,
      token.chain,
    );
    const duration2 = Date.now() - startTime2;
    console.log(`Price: $${priceWithOverride.price}`);
    console.log(`Time taken: ${duration2}ms`);
    console.log(
      `Chain detected: ${priceWithOverride.chain}, Specific chain: ${priceWithOverride.specificChain || 'not detected'}`,
    );

    // Calculate improvement
    if (duration1 > 0 && duration2 > 0) {
      const improvement = (((duration1 - duration2) / duration1) * 100).toFixed(2);
      const speedup = (duration1 / duration2).toFixed(2);
      console.log(`\nPerformance improvement: ${improvement}% faster (${speedup}x speedup)`);
    }

    console.log('\n-----------------------------------------\n');
  }
}

/**
 * Example 7: Get detailed token info with chain override
 */
async function getTokenInfoWithChainOverride(client: TradingSimulatorClient): Promise<void> {
  logSection('Example 7: Token Info with Chain Override');

  // First get token info without chain override
  console.log('Getting detailed token info for Chainlink (LINK) WITHOUT chain override...');
  const startTime1 = Date.now();
  const tokenInfoNoOverride: TokenInfoResponse = await client.getTokenInfo(TOKENS.LINK);
  const duration1 = Date.now() - startTime1;

  console.log(`Token info: ${JSON.stringify(tokenInfoNoOverride, null, 2)}`);
  console.log(`Time taken: ${duration1}ms`);

  // Short delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Now with chain override
  console.log('\nGetting detailed token info for Chainlink (LINK) WITH chain override...');
  const startTime2 = Date.now();
  const tokenInfoWithOverride: TokenInfoResponse = await client.getTokenInfo(
    TOKENS.LINK,
    BlockchainType.EVM,
    SpecificChain.ETH,
  );
  const duration2 = Date.now() - startTime2;

  console.log(`Token info: ${JSON.stringify(tokenInfoWithOverride, null, 2)}`);
  console.log(`Time taken: ${duration2}ms`);

  // Calculate improvement
  if (duration1 > 0 && duration2 > 0) {
    const improvement = (((duration1 - duration2) / duration1) * 100).toFixed(2);
    const speedup = (duration1 / duration2).toFixed(2);
    console.log(`\nPerformance improvement: ${improvement}% faster (${speedup}x speedup)`);
  }
}

/**
 * Main function to run all examples
 */
async function runAllExamples(): Promise<void> {
  try {
    // Create Trading Simulator client
    const client = new TradingSimulatorClient(apiKey, baseUrl, false);
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
  getTokenInfoWithChainOverride,
};
