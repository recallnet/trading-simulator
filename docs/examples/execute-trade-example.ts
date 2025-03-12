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
const baseUrl = 'http://localhost:3000';

// API endpoint details
const method = 'POST';
const path = '/api/trade/execute';

// Trade details
const tradeDetails = {
  fromToken: 'USDC',
  toToken: 'SOL',
  amount: 100.00,
  slippageTolerance: 0.5 // Optional slippage tolerance in percentage
};

async function executeTrade() {
  try {
    // Convert request body to string
    const bodyStr = JSON.stringify(tradeDetails);
    
    // Generate timestamp and signature
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