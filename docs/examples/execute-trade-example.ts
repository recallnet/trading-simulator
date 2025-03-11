import * as crypto from 'crypto';

/**
 * Example: Execute a Trade
 * 
 * This example demonstrates how to make an authenticated request to
 * execute a trade (buy or sell).
 */

// Replace these with your team's credentials
const apiKey = 'sk_ee08b6e5d6571bd78c3efcc64ae1da0e';
const apiSecret = 'f097f3c2a7ee7e043c1152c7943ea95906b7bcd54276b506aa19931efd45239c';
const baseUrl = 'http://localhost:3000';

// API endpoint details
const method = 'POST';
const path = '/api/trading/execute';

// Trade details
const tradeDetails = {
  tokenAddress: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R', // Solana token
  side: 'buy',
  amount: 0.01 // Buy 0.01 tokens
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
      const errorText = await response.text();
      throw new Error(`Request failed with status ${response.status}: ${errorText}`);
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