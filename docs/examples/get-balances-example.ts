import * as crypto from 'crypto';

/**
 * Example: Get Team Balances
 * 
 * This example demonstrates how to make an authenticated request to
 * get your team's balances without using the client class.
 */

// Replace these with your team's credentials
const apiKey = 'your-api-key';
const apiSecret = 'your-api-secret';
const baseUrl = 'http://localhost:3001';

// API endpoint details
const method = 'GET';
const path = '/api/account/balances';

async function getBalances() {
  try {
    // Generate timestamp and signature
    // Note: For testing purposes, you may use a timestamp 2 years in future to avoid expiration
    // const timestamp = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString();
    const timestamp = new Date().toISOString();
    
    // IMPORTANT: For GET requests with no body, use '{}' in the signature calculation
    // This matches the server-side signature validation
    const data = method + path + timestamp + '{}';
    
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
    
    // Make the request
    console.log('Making request to get balances...');
    console.log('URL:', `${baseUrl}${path}`);
    console.log('Headers:', headers);
    
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
    });
    
    // Handle response
    if (!response.ok) {
      let errorMessage;
      try {
        const errorBody = await response.json();
        errorMessage = errorBody.message || errorBody.error?.message || 'Unknown error';
      } catch (e) {
        errorMessage = await response.text();
      }
      throw new Error(`Request failed with status ${response.status}: ${errorMessage}`);
    }
    
    const balances = await response.json();
    console.log('Balances:', JSON.stringify(balances, null, 2));
    
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
    
    return balances;
    
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