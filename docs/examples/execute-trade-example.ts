import * as crypto from 'crypto';

/**
 * Example: Execute a Trade
 * 
 * This example demonstrates how to make an authenticated request to
 * execute a trade between two tokens.
 */

// Replace these with your team's credentials
const apiKey = 'your-api-key';
const apiSecret = 'your-api-secret';
const baseUrl = 'http://localhost:3001';

// API endpoint details
const method = 'POST';
const path = '/api/trade/execute';

// Token addresses (use these instead of symbols)
const USDC_ADDRESS = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const SOL_ADDRESS = 'So11111111111111111111111111111111111111112';

// Trade details
const tradeDetails = {
  fromToken: USDC_ADDRESS, // Buying SOL with USDC
  toToken: SOL_ADDRESS,
  amount: "100.00",        // Amount as string, not number
  price: "125.45",         // Optional price limit (can help with slippage)
  slippageTolerance: "0.5" // Optional slippage tolerance in percentage
};

async function executeTrade() {
  try {
    // Convert request body to string
    const bodyStr = JSON.stringify(tradeDetails);
    
    // Generate timestamp and signature
    // Note: For testing purposes, you may use a timestamp 2 years in future to avoid expiration
    // const timestamp = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString();
    const timestamp = new Date().toISOString();
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
    
    // Make the request
    console.log('Executing trade...');
    console.log('URL:', `${baseUrl}${path}`);
    console.log('Headers:', headers);
    console.log('Body:', bodyStr);
    
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
        errorMessage = errorBody.message || errorBody.error?.message || 'Unknown error';
      } catch (e) {
        errorMessage = await response.text();
      }
      throw new Error(`Request failed with status ${response.status}: ${errorMessage}`);
    }
    
    const result = await response.json();
    console.log('Trade Result:', JSON.stringify(result, null, 2));
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