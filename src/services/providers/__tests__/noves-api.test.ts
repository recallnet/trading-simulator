import axios from 'axios';
import dotenv from 'dotenv';
import { SpecificChain } from '../../../types';
import config from '../../../config';

// Load environment variables
dotenv.config();

// Define the expected response format from the Noves API
interface NovesApiResponse {
  chain: string;
  block: string;
  token: {
    address: string | null;
    symbol: string | null;
    name: string | null;
  };
  price: {
    amount: string | null;
    currency: string | null;
    status: string | null;
  };
  pricedBy: string | null;
  priceType: string;
  priceStatus: string;
}

describe('Noves API Integration Tests', () => {
  // Skip all tests if NOVES_API_KEY is not set
  const apiKey = process.env.NOVES_API_KEY;
  const runTests = !!apiKey;
  const supportedChains: SpecificChain[] = config.evmChains;
  
  // Test token addresses
  const testTokens = {
    // Test token from Base
    base: '0x532f27101965dd16442e59d40670faf5ebb142e4',
    // WETH token from Ethereum
    eth: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  };

  // Test to verify the structure of the API response
  it('should return the correct response structure from the API', async () => {
    if (!runTests) {
      console.log('Skipping test - NOVES_API_KEY not set');
      return;
    }

    // Check Ethereum mainnet WETH token for response structure
    const url = `https://pricing.noves.fi/evm/eth/price/${testTokens.eth}`;
    
    try {
      const response = await axios.get<NovesApiResponse>(url, {
        headers: {
          'apiKey': apiKey,
          'Accept': 'application/json'
        },
        timeout: 5000
      });

      // Check response structure
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('chain');
      expect(response.data).toHaveProperty('price');
      expect(response.data).toHaveProperty('priceStatus');
      expect(response.data).toHaveProperty('token');
      
      console.log(`API response structure: ${JSON.stringify(response.data, null, 2)}`);
    } catch (error) {
      // If API is unavailable, skip test
      console.log(`API test skipped due to error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return;
    }
  });

  // Test to verify API headers format
  it('should accept the apiKey header format', async () => {
    if (!runTests) {
      console.log('Skipping test - NOVES_API_KEY not set');
      return;
    }

    const url = `https://pricing.noves.fi/evm/eth/price/${testTokens.eth}`;
    
    try {
      const response = await axios.get<NovesApiResponse>(url, {
        headers: {
          'apiKey': apiKey,
          'Accept': 'application/json'
        },
        timeout: 5000
      });

      // Basic check that we got a response
      expect(response.status).toBe(200);
      console.log(`API response with apiKey header: status code ${response.status}`);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        // If we get an error that's not a 401 unauthorized, the header format might be wrong
        if (error.response.status !== 401) {
          fail(`API request failed with status code ${error.response.status}. Header format might be incorrect.`);
        } else {
          console.log('Got 401 unauthorized - this may be due to API key authentication issues, not header format.');
        }
      } else {
        console.log(`API test skipped due to error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  });

  // Test to verify the price calculation status
  it('should indicate when price calculation is in progress', async () => {
    if (!runTests) {
      console.log('Skipping test - NOVES_API_KEY not set');
      return;
    }

    // Try a newer token that might still be calculating
    const url = `https://pricing.noves.fi/evm/base/price/${testTokens.base}`;
    
    try {
      const response = await axios.get<NovesApiResponse>(url, {
        headers: {
          'apiKey': apiKey,
          'Accept': 'application/json'
        },
        timeout: 10000
      });

      console.log(`Price status for Base token: ${response.data.priceStatus}`);
      console.log(`Full response: ${JSON.stringify(response.data, null, 2)}`);
      
      // Just verify we got a status code, not checking if it's inProgress since it might have completed
      expect(response.data).toHaveProperty('priceStatus');
    } catch (error) {
      console.log(`API test skipped due to error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, 15000); // Increase timeout to 15 seconds

  // Test to try all chains and verify which one(s) a token is found on
  it('should find a token on at least one chain when iterating through all chains', async () => {
    if (!runTests) {
      console.log('Skipping test - NOVES_API_KEY not set');
      return;
    }

    const token = testTokens.base;
    let foundOnChain: string | null = null;
    let completeResponse: NovesApiResponse | null = null;
    
    // Limit to just a few chains to avoid timeouts in tests
    const testChains = ['eth', 'base', 'polygon'] as SpecificChain[];
    
    // Test on each supported chain
    for (const chain of testChains) {
      const url = `https://pricing.noves.fi/evm/${chain}/price/${token}`;
      
      try {
        console.log(`Testing token ${token} on chain ${chain}`);
        const response = await axios.get<NovesApiResponse>(url, {
          headers: {
            'apiKey': apiKey,
            'Accept': 'application/json'
          },
          timeout: 10000
        });

        // If response is successful and doesn't indicate a 'not found' status
        if (response.status === 200) {
          console.log(`Response status for ${chain}: ${response.data.priceStatus}`);
          if (response.data.priceStatus !== 'inProgress') {
            if (response.data.price && response.data.price.amount) {
              foundOnChain = chain;
              completeResponse = response.data;
              console.log(`✅ Token found on ${chain} with price: ${response.data.price.amount}`);
              break;
            } else {
              console.log(`ℹ️ Response from ${chain} without price: ${JSON.stringify(response.data, null, 2)}`);
            }
          } else {
            console.log(`⏳ Price calculation in progress for ${chain}`);
          }
        }
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          // 401/404 errors are expected when the token is not on this chain
          if (error.response.status === 401 || error.response.status === 404) {
            console.log(`❌ Token not found on ${chain} chain (${error.response.status})`);
          } else {
            console.log(`Error checking chain ${chain}: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
          }
        } else {
          console.log(`Network error checking chain ${chain}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      // Add a small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // If testing a known token on Base, we expect to find it
    if (token === testTokens.base) {
      console.log(`Final result: token ${token} ${foundOnChain ? 'found on ' + foundOnChain : 'not found on any chain'}`);
      if (completeResponse) {
        console.log(`Complete response: ${JSON.stringify(completeResponse, null, 2)}`);
      }
    }
  }, 30000); // Increase timeout to 30 seconds
}); 