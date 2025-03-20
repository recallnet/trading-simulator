/**
 * Authentication Middleware Integration Test
 * 
 * IMPORTANT: This test REQUIRES the server to be running on port 3000.
 * Run the server with `npm run start:dev` in a separate terminal before running this test.
 * 
 * This test verifies the end-to-end authentication flow:
 * 1. Creates a new team with API credentials
 * 2. Stores encrypted API secret in the database
 * 3. Makes an API request with proper HMAC signature
 * 4. Confirms the authentication middleware correctly validates the request
 */
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import axios from 'axios';
import { config } from '../../config';
import { repositories } from '../../database';
import { services } from '../../services';
import { DatabaseConnection } from '../../database';

/**
 * Test script to verify the authentication fix
 * This script:
 * 1. Creates a test team with a new API key
 * 2. Makes a request with the API key and signature
 * 3. Verifies the authentication works
 */
async function testAuthFix() {
  try {
    console.log('Starting authentication fix test...');
    
    // 1. Create a test team
    const teamName = `Test Team ${Date.now()}`;
    const email = `test-${Date.now()}@example.com`;
    const contactPerson = 'Test User';
    
    console.log(`Creating test team: ${teamName}`);
    const team = await services.teamManager.registerTeam(teamName, email, contactPerson);
    
    console.log(`Team created with ID: ${team.id}`);
    console.log(`API Key: ${team.apiKey}`);
    console.log(`API Secret: ${(team as any).apiSecret.substring(0, 8)}...`);
    
    // Retrieve the team from database to verify the encrypted secret was saved
    const savedTeam = await repositories.teamRepository.findByApiKey(team.apiKey);
    
    if (!savedTeam) {
      throw new Error('Could not retrieve team from database!');
    }
    
    console.log(`Team retrieved from database: ${savedTeam.id}`);
    console.log(`API Key from DB: ${savedTeam.apiKey}`);
    console.log(`Has encrypted secret: ${Boolean(savedTeam.apiSecretEncrypted)}`);
    
    if (!savedTeam.apiSecretEncrypted) {
      throw new Error('Encrypted API secret was not saved to the database!');
    }
    
    // 2. Make a request with the API key and signature
    const baseUrl = 'http://localhost:3000';
    const apiKey = team.apiKey;
    const apiSecret = (team as any).apiSecret;
    
    console.log(`Using API Secret for signature (first 8 chars): ${apiSecret.substring(0, 8)}...`);
    
    // Create request data
    const method = 'GET';
    const endpoint = '/api/account/balances';
    const fullUrl = `${baseUrl}${endpoint}`;
    
    // CRITICAL: Use EXACTLY the same path format as the server
    // Server uses: "GET/api/account/balances2025-03-20T15:58:23.368Z{}"
    // Note the leading slash and empty JSON object at the end
    const pathForSignature = endpoint; // Keep the leading slash
    
    const timestamp = new Date().toISOString();
    const body = '{}'; // Empty JSON object as string
    
    // Create signature using the correct path format
    const dataToSign = method + pathForSignature + timestamp + body;
    const signature = crypto
      .createHmac('sha256', apiSecret)
      .update(dataToSign)
      .digest('hex');
    
    console.log(`Making a request to ${fullUrl}`);
    console.log(`Timestamp: ${timestamp}`);
    console.log(`Path for signature: ${pathForSignature}`);
    console.log(`Data to sign: ${dataToSign}`);
    console.log(`Signature: ${signature}`);
    
    let success = false;
    
    // Make the request
    try {
      const response = await axios({
        method,
        url: fullUrl,
        headers: {
          'X-API-Key': apiKey,
          'X-Timestamp': timestamp,
          'X-Signature': signature,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Request successful!');
      console.log(`Status code: ${response.status}`);
      console.log('Response data:', response.data);
      console.log('\nAUTHENTICATION TEST PASSED! ✅');
      success = true;
    } catch (error: unknown) {
      console.error('Request failed!');
      if (error instanceof Error) {
        console.error(`Error message: ${error.message}`);
      } 
      
      if (axios.isAxiosError(error)) {
        console.error(`Status code: ${error.response?.status}`);
        console.error('Response data:', error.response?.data);
        console.error('Request config:', {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers,
          data: error.config?.data
        });
      } else {
        console.error('Unknown error:', error);
      }
      console.error('\nAUTHENTICATION TEST FAILED! ❌');
    }
    
    return success;
  } catch (error) {
    console.error('Error running test:');
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }
    return false;
  }
}

// Main function to run test and clean up
async function main() {
  try {
    // Run the test
    const success = await testAuthFix();
    
    // Close database connection
    console.log('Closing database connection...');
    await DatabaseConnection.getInstance().close();
    
    // Exit with appropriate code
    console.log('Test complete, exiting...');
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('Unhandled error in main:', error);
    
    // Try to close DB connection even on error
    try {
      await DatabaseConnection.getInstance().close();
    } catch (e) {
      console.error('Error closing database connection:', e);
    }
    
    process.exit(1);
  }
}

// Run the test
main(); 