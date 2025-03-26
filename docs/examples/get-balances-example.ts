import { TradingSimulatorClient, BalancesResponse } from './api-client';

/**
 * Example: Get Team Balances
 * 
 * This example demonstrates how to get your team's balances using the Trading Simulator client.
 */

// Replace with your team's API key
const apiKey = 'your-api-key';
const baseUrl = 'http://localhost:3000';

// Create a client instance
const client = new TradingSimulatorClient(apiKey, baseUrl, true); // Enable debug mode

async function getBalances(): Promise<BalancesResponse> {
  try {
    console.log('Getting team balances...');
    
    // Get balances using the client
    const balanceResponse = await client.getBalances();
    
    console.log('Balance Response:', JSON.stringify(balanceResponse, null, 2));
    
    // Process the balances for easier viewing
    console.log('\nToken Balances:');
    if (balanceResponse.balances && balanceResponse.balances.length > 0) {
      balanceResponse.balances.forEach(balance => {
        console.log(`- ${balance.token}: ${balance.amount} (Chain: ${balance.chain}${balance.specificChain ? `, ${balance.specificChain}` : ''})`);
      });
    } else {
      console.log('No balances found');
    }
    
    /* Expected response format:
    {
      "success": true,
      "teamId": "string",
      "balances": [
        {
          "token": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC on Solana
          "amount": 0,
          "chain": "svm",
          "specificChain": null
        },
        {
          "token": "So11111111111111111111111111111111111111112", // SOL
          "amount": 0,
          "chain": "svm",
          "specificChain": null
        },
        {
          "token": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC on Ethereum
          "amount": 0,
          "chain": "evm",
          "specificChain": "eth"
        }
      ]
    }
    */
    
    return balanceResponse;
    
  } catch (error) {
    console.error('Error getting balances:', error);
    throw error;
  }
}

// Execute the function
getBalances().catch(error => {
  console.error('Failed to get balances:', error);
  process.exit(1);
}); 