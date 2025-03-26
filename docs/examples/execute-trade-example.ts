import { TradingSimulatorClient, BlockchainType, SpecificChain, COMMON_TOKENS } from './api-client';

/**
 * Example: Execute a Trade
 * 
 * This example demonstrates how to use the Trading Simulator client to
 * execute a trade between two tokens on the same chain or across chains.
 * 
 * Note: All pricing is determined automatically by the server based on
 * current market data. The server calculates the appropriate exchange rate.
 */

// Replace with your team's API key
const apiKey = 'your-api-key';
const baseUrl = 'http://localhost:3001';

// Create a client instance
const client = new TradingSimulatorClient(apiKey, baseUrl, true); // Enable debug mode

// Token addresses (for reference, these are also available in COMMON_TOKENS)
// Solana tokens
const USDC_SOL_ADDRESS = COMMON_TOKENS.SVM.USDC;
const SOL_ADDRESS = COMMON_TOKENS.SVM.SOL;
// Ethereum tokens
const USDC_ETH_ADDRESS = COMMON_TOKENS.EVM.USDC;
const ETH_ADDRESS = COMMON_TOKENS.EVM.ETH;

// Choose which example to run
const tradeType = process.argv[2] || 'solana'; // Options: 'solana', 'ethereum', 'cross-chain'

// Trade details based on selected type
let tradeDetails;

switch (tradeType) {
  case 'ethereum':
    // Example: Buy ETH with USDC on Ethereum
    tradeDetails = {
      fromToken: USDC_ETH_ADDRESS, // Buying ETH with USDC (Ethereum)
      toToken: ETH_ADDRESS,
      amount: "100.00",         // Amount as string, not number
      slippageTolerance: "0.5", // Optional slippage tolerance in percentage
      fromChain: BlockchainType.EVM,         // Blockchain type for source token (evm or svm)
      toChain: BlockchainType.EVM,           // Blockchain type for destination token
      fromSpecificChain: SpecificChain.ETH, // Specific chain for source token (eth, polygon, etc)
      toSpecificChain: SpecificChain.ETH    // Specific chain for destination token
    };
    console.log('Executing Ethereum trade: Buy ETH with USDC on Ethereum');
    break;
  
  case 'cross-chain':
    // Example: Buy ETH with USDC on Solana (cross-chain trade)
    tradeDetails = {
      fromToken: USDC_SOL_ADDRESS, // Using USDC from Solana
      toToken: ETH_ADDRESS,        // To buy ETH on Ethereum
      amount: "100.00",            // Amount as string, not number
      slippageTolerance: "0.5",    // Optional slippage tolerance in percentage
      fromChain: BlockchainType.SVM,            // Blockchain type for source token (svm)
      toChain: BlockchainType.EVM,              // Blockchain type for destination token (evm)
      fromSpecificChain: SpecificChain.SVM,    // Specific chain for source token (Solana)
      toSpecificChain: SpecificChain.ETH       // Specific chain for destination token (Ethereum)
    };
    console.log('Executing cross-chain trade: Buy ETH with Solana USDC');
    break;
  
  case 'solana':
  default:
    // Example: Buy SOL with USDC on Solana
    tradeDetails = {
      fromToken: USDC_SOL_ADDRESS, // Buying SOL with USDC
      toToken: SOL_ADDRESS,
      amount: "100.00",        // Amount as string, not number
      slippageTolerance: "0.5", // Optional slippage tolerance in percentage
      fromChain: BlockchainType.SVM,        // Blockchain type for source token
      toChain: BlockchainType.SVM,          // Blockchain type for destination token
      fromSpecificChain: SpecificChain.SVM, // Specific chain for source token
      toSpecificChain: SpecificChain.SVM   // Specific chain for destination token
    };
    console.log('Executing Solana trade: Buy SOL with USDC on Solana');
    break;
}

async function executeTrade() {
  try {
    console.log('Executing trade...');
    console.log('Trade details:', JSON.stringify(tradeDetails, null, 2));
    
    // Execute the trade using the client
    const result = await client.executeTrade(tradeDetails);
    
    console.log('Trade Result:', JSON.stringify(result, null, 2));
    
    /* Expected response format:
    {
      "success": true,
      "transaction": {
        "id": "string",
        "teamId": "string",
        "competitionId": "string",
        "fromToken": "string",
        "toToken": "string",
        "fromAmount": 0,
        "toAmount": 0,
        "price": 0,
        "success": true,
        "timestamp": "2019-08-24T14:15:22Z",
        "fromChain": "string",
        "toChain": "string",
        "fromSpecificChain": "string",
        "toSpecificChain": "string"
      }
    }
    */
    
    // Display trade details
    if (result && result.success && result.transaction) {
      console.log(`\nTrade completed successfully:`);
      console.log(`ID: ${result.transaction.id}`);
      console.log(`Sold: ${result.transaction.fromAmount} tokens at address ${result.transaction.fromToken}`);
      console.log(`Received: ${result.transaction.toAmount} tokens at address ${result.transaction.toToken}`);
      console.log(`Execution price: ${result.transaction.price}`);
      console.log(`Timestamp: ${result.transaction.timestamp}`);
      console.log(`From chain: ${result.transaction.fromChain} (${result.transaction.fromSpecificChain || 'unspecified'})`);
      console.log(`To chain: ${result.transaction.toChain} (${result.transaction.toSpecificChain || 'unspecified'})`);
    }
    
    return result;
    
  } catch (error) {
    console.error('Error executing trade:', error);
    throw error;
  }
}

// Execute the function
executeTrade().catch(error => {
  console.error('Failed to execute trade:', error);
  process.exit(1);
});

/**
 * To run this example with different trade types, use:
 * 
 * For Solana trade:
 *   npx ts-node execute-trade-example.ts solana
 * 
 * For Ethereum trade:
 *   npx ts-node execute-trade-example.ts ethereum
 * 
 * For cross-chain trade:
 *   npx ts-node execute-trade-example.ts cross-chain
 */ 