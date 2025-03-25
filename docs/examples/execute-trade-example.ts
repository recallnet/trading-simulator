import * as crypto from 'crypto';

/**
 * Example: Execute a Trade
 * 
 * This example demonstrates how to make an authenticated request to
 * execute a trade between two tokens on the same chain or across chains.
 * 
 * Note: All pricing is determined automatically by the server based on
 * current market data. The server calculates the appropriate exchange rate.
 */

// Replace these with your team's credentials
const apiKey = 'your-api-key';
const apiSecret = 'your-api-secret';
const baseUrl = 'http://localhost:3001';

// API endpoint details
const method = 'POST';
const path = '/api/trade/execute';

// Token addresses (use these instead of symbols)
// Solana tokens
const USDC_SOL_ADDRESS = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const SOL_ADDRESS = 'So11111111111111111111111111111111111111112';
// Ethereum tokens
const USDC_ETH_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const ETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'; // WETH

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
      fromChain: "evm",         // Blockchain type for source token (evm or svm)
      toChain: "evm",           // Blockchain type for destination token
      fromSpecificChain: "eth", // Specific chain for source token (eth, polygon, etc)
      toSpecificChain: "eth"    // Specific chain for destination token
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
      fromChain: "svm",            // Blockchain type for source token (svm)
      toChain: "evm",              // Blockchain type for destination token (evm)
      fromSpecificChain: "svm",    // Specific chain for source token (Solana)
      toSpecificChain: "eth"       // Specific chain for destination token (Ethereum)
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
      fromChain: "svm",        // Blockchain type for source token
      toChain: "svm",          // Blockchain type for destination token
      fromSpecificChain: "svm", // Specific chain for source token
      toSpecificChain: "svm"   // Specific chain for destination token
    };
    console.log('Executing Solana trade: Buy SOL with USDC on Solana');
    break;
}

async function executeTrade() {
  try {
    // Convert request body to string
    const bodyStr = JSON.stringify(tradeDetails);
    
    // Generate timestamp and signature
    const timestamp = new Date().toISOString();
    
    // IMPORTANT: For authentication, concatenate: method + path + timestamp + bodyStr
    // This must match exactly what the server expects
    const data = method + path + timestamp + bodyStr;
    
    const signature = crypto
      .createHmac('sha256', apiSecret)
      .update(data)
      .digest('hex');
    
    // Create headers
    const headers = {
      'X-API-Key': apiKey,
      'X-Timestamp': timestamp,
      'X-Signature': signature,
      'Content-Type': 'application/json'
    };
    
    // Log request details
    console.log('Executing trade...');
    console.log('URL:', `${baseUrl}${path}`);
    console.log('Headers:', headers);
    console.log('Body:', bodyStr);
    
    // Make the request
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: bodyStr
    });
    
    // Handle response
    if (!response.ok) {
      let errorMessage;
      try {
        const errorBody = await response.json();
        errorMessage = errorBody.message || errorBody.error || 'Unknown error';
      } catch (e) {
        errorMessage = await response.text();
      }
      throw new Error(`Request failed with status ${response.status}: ${errorMessage}`);
    }
    
    const result = await response.json();
    console.log('Trade Result:', JSON.stringify(result, null, 2));
    
    /* Expected response format:
    {
      "id": "string",
      "teamId": "string",
      "fromToken": "string",
      "toToken": "string",
      "fromAmount": "string",
      "toAmount": "string",
      "executionPrice": "string",
      "timestamp": "2019-08-24T14:15:22Z"
    }
    */
    
    // Display trade details
    if (result) {
      console.log(`\nTrade completed successfully:`);
      console.log(`ID: ${result.id}`);
      console.log(`Sold: ${result.fromAmount} tokens at address ${result.fromToken}`);
      console.log(`Received: ${result.toAmount} tokens at address ${result.toToken}`);
      console.log(`Execution price: ${result.executionPrice}`);
      console.log(`Timestamp: ${result.timestamp}`);
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