import * as crypto from 'crypto';

/**
 * Example: Get Team Balances
 * 
 * This example demonstrates how to make an authenticated request to
 * get your team's balances without using the client class.
 */

// Replace these with your team's credentials
const apiKey = 'sk_ee08b6e5d6571bd78c3efcc64ae1da0e';
const apiSecret = 'f097f3c2a7ee7e043c1152c7943ea95906b7bcd54276b506aa19931efd45239c';
const baseUrl = 'http://localhost:3000';

// API endpoint details
const method = 'GET';
const path = '/api/account/balances';

async function getBalances() {
  try {
    // Generate timestamp and signature
    const timestamp = new Date().toISOString();
    const data = method + path + timestamp + ''; // Empty string for body
    
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
      const errorText = await response.text();
      throw new Error(`Request failed with status ${response.status}: ${errorText}`);
    }
    
    const balances = await response.json();
    console.log('Balances:', JSON.stringify(balances, null, 2));
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