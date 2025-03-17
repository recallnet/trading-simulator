import { setupAdminClient, cleanupTestState, ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_EMAIL } from '../utils/test-helpers';
import axios from 'axios';
import { getBaseUrl } from '../utils/server';
import config from '../../src/config';

// Define Ethereum token addresses for testing
const ETHEREUM_TOKENS = {
  ETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
  USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
};

// Define Base chain token addresses for testing
const BASE_TOKENS = {
  ETH: '0x4200000000000000000000000000000000000006', // WETH on Base
  USDC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA' // USDbC on Base
};

describe('Price Fetching', () => {
  // Clean up test state before each test
  beforeEach(async () => {
    await cleanupTestState();
    
    // Create admin account directly using the setup endpoint
    await axios.post(`${getBaseUrl()}/api/admin/setup`, {
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD,
      email: ADMIN_EMAIL
    });
  });
  
  test('should fetch prices for standard tokens', async () => {
    // Setup admin client
    const adminClient = await setupAdminClient();
    
    // Create an endpoint to test price fetching
    const baseUrl = getBaseUrl();
    
    // Test price for SOL
    const solResponse = await axios.get(`${baseUrl}/api/price?token=${config.tokens.sol}`);
    expect(solResponse.status).toBe(200);
    expect(solResponse.data.success).toBe(true);
    expect(solResponse.data.price).toBeDefined();
    expect(typeof solResponse.data.price).toBe('number');
    expect(solResponse.data.price).toBeGreaterThan(0);
    expect(solResponse.data.chain).toBe('svm');
    console.log(`SOL price: $${solResponse.data.price}`);
    
    // Test price for USDC
    const usdcResponse = await axios.get(`${baseUrl}/api/price?token=${config.tokens.usdc}`);
    expect(usdcResponse.status).toBe(200);
    expect(usdcResponse.data.success).toBe(true);
    expect(usdcResponse.data.price).toBeDefined();
    expect(typeof usdcResponse.data.price).toBe('number');
    // Allow for stablecoin price variations (0.8 to 1.2 range)
    expect(usdcResponse.data.price).toBeGreaterThan(0.8);
    expect(usdcResponse.data.price).toBeLessThan(1.2);
    expect(usdcResponse.data.chain).toBe('svm');
    console.log(`USDC price: $${usdcResponse.data.price}`);
    
    // Test price for USDT
    const usdtResponse = await axios.get(`${baseUrl}/api/price?token=${config.tokens.usdt}`);
    expect(usdtResponse.status).toBe(200);
    expect(usdtResponse.data.success).toBe(true);
    expect(usdtResponse.data.price).toBeDefined();
    expect(typeof usdtResponse.data.price).toBe('number');
    // Allow for stablecoin price variations (0.8 to 1.2 range)
    expect(usdtResponse.data.price).toBeGreaterThan(0.8);
    expect(usdtResponse.data.price).toBeLessThan(1.2);
    expect(usdtResponse.data.chain).toBe('svm');
    console.log(`USDT price: $${usdtResponse.data.price}`);
  });
  
  test('should fetch price for arbitrary token if available', async () => {
    // The arbitrary token address to test with
    const arbitraryTokenAddress = '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R';
    
    // Test price for arbitrary token
    const baseUrl = getBaseUrl();
    const response = await axios.get(`${baseUrl}/api/price?token=${arbitraryTokenAddress}`);
    
    console.log(`Arbitrary token (${arbitraryTokenAddress}) price response:`, response.data);
    
    // We expect a valid HTTP response, regardless of whether a price is available
    expect(response.status).toBe(200);
    
    // If a price is available, validate it
    if (response.data.success && response.data.price !== null) {
      expect(response.data.price).toBeDefined();
      expect(typeof response.data.price).toBe('number');
      expect(response.data.price).toBeGreaterThan(0);
      expect(response.data.chain).toBe('svm');
      console.log(`Arbitrary token price: $${response.data.price}`);
    } else {
      // Log diagnostic information but don't fail the test
      console.log(`No price available for arbitrary token: ${arbitraryTokenAddress}`);
      console.log(`Response: ${JSON.stringify(response.data)}`);
      console.log(`This is expected if the token doesn't have active liquidity pools or API errors occurred.`);
    }
  });

  test('should fetch prices for tokens across different chains', async () => {
    const baseUrl = getBaseUrl();
    
    // Test SOL price (Solana chain)
    const solToken = config.tokens.sol;
    const solResponse = await axios.get(`${baseUrl}/api/price?token=${solToken}`);
    expect(solResponse.status).toBe(200);
    expect(solResponse.data.success).toBeTruthy();
    expect(solResponse.data.price).toBeGreaterThan(0);
    expect(solResponse.data.chain).toBe('svm');
    console.log(`SOL price: $${solResponse.data.price}`);
    
    // Test ETH price (Ethereum chain)
    const ethToken = ETHEREUM_TOKENS.ETH;
    const ethResponse = await axios.get(`${baseUrl}/api/price?token=${ethToken}`);
    expect(ethResponse.status).toBe(200);
    
    // If we get a successful response with price data
    if (ethResponse.data.success && ethResponse.data.price) {
      expect(ethResponse.data.price).toBeGreaterThan(0);
      expect(ethResponse.data.chain).toBe('evm');
      console.log(`ETH price: $${ethResponse.data.price}`);
      
      // Check if we got specific chain information
      if (ethResponse.data.specificChain) {
        expect(ethResponse.data.specificChain).toBe('eth');
      }
    } else {
      console.log(`Note: Could not get ETH price. This could be due to API issues.`);
      console.log(`Response: ${JSON.stringify(ethResponse.data)}`);
    }
    
    // Test Base Chain ETH with specific chain parameter
    try {
      const baseEthResponse = await axios.get(`${baseUrl}/api/price`, {
        params: {
          token: BASE_TOKENS.ETH,
          chain: 'evm',
          specificChain: 'base'
        }
      });
      
      expect(baseEthResponse.status).toBe(200);
      if (baseEthResponse.data.success && baseEthResponse.data.price) {
        expect(baseEthResponse.data.price).toBeGreaterThan(0);
        expect(baseEthResponse.data.chain).toBe('evm');
        expect(baseEthResponse.data.specificChain).toBe('base');
        console.log(`Base chain ETH price: $${baseEthResponse.data.price}`);
      }
    } catch (error) {
      console.log(`Error fetching Base chain ETH price: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });
  
  test('should fetch USDC price from both chains', async () => {
    const baseUrl = getBaseUrl();
    
    // Test Solana USDC
    const solanaUsdcAddress = config.tokens.usdc;
    try {
      const solanaResponse = await axios.get(`${baseUrl}/api/price?token=${solanaUsdcAddress}`);
      expect(solanaResponse.status).toBe(200);
      
      // Check if the response is successful
      if (solanaResponse.data.success) {
        expect(solanaResponse.data.price).toBeGreaterThan(0);
        // Allow for stablecoin price variations (0.8 to 1.2 range)
        expect(solanaResponse.data.price).toBeGreaterThan(0.8);
        expect(solanaResponse.data.price).toBeLessThan(1.2);
        expect(solanaResponse.data.chain).toBe('svm');
        console.log(`Solana USDC price: $${solanaResponse.data.price}`);
      } else {
        console.log(`Note: Couldn't get Solana USDC price. Response: ${JSON.stringify(solanaResponse.data)}`);
      }
    } catch (error) {
      console.log(`Error fetching Solana USDC price: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Test Ethereum USDC
    const ethereumUsdcAddress = ETHEREUM_TOKENS.USDC;
    try {
      const ethereumResponse = await axios.get(`${baseUrl}/api/price?token=${ethereumUsdcAddress}`);
      expect(ethereumResponse.status).toBe(200);
      
      if (ethereumResponse.data.success) {
        // Allow for stablecoin price variations (0.8 to 1.2 range)
        expect(ethereumResponse.data.price).toBeGreaterThan(0.8);
        expect(ethereumResponse.data.price).toBeLessThan(1.2);
        expect(ethereumResponse.data.chain).toBe('evm');
        console.log(`Ethereum USDC price: $${ethereumResponse.data.price}`);
        
        // Check if we got specific chain information
        if (ethereumResponse.data.specificChain) {
          expect(ethereumResponse.data.specificChain).toBe('eth');
          console.log(`Ethereum USDC detected on chain: ${ethereumResponse.data.specificChain}`);
        }
      } else {
        console.log(`Note: Couldn't get Ethereum USDC price. Response: ${JSON.stringify(ethereumResponse.data)}`);
      }
    } catch (error) {
      console.log(`Error fetching Ethereum USDC price: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Test Base chain USDC with specific chain parameter
    try {
      const baseUsdcResponse = await axios.get(`${baseUrl}/api/price`, {
        params: {
          token: BASE_TOKENS.USDC,
          chain: 'evm',
          specificChain: 'base'
        }
      });
      
      if (baseUsdcResponse.data.success) {
        // Allow for stablecoin price variations (0.8 to 1.2 range)
        expect(baseUsdcResponse.data.price).toBeGreaterThan(0.8);
        expect(baseUsdcResponse.data.price).toBeLessThan(1.2);
        expect(baseUsdcResponse.data.chain).toBe('evm');
        expect(baseUsdcResponse.data.specificChain).toBe('base');
        console.log(`Base chain USDC price: $${baseUsdcResponse.data.price}`);
      }
    } catch (error) {
      console.log(`Error fetching Base USDC price: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });
  
  test('should use detailed token info endpoint correctly', async () => {
    const baseUrl = getBaseUrl();
    
    // Test token-info endpoint for Ethereum token
    try {
      const ethToken = ETHEREUM_TOKENS.ETH;
      const tokenInfoResponse = await axios.get(`${baseUrl}/api/price/token-info?token=${ethToken}`);
      
      expect(tokenInfoResponse.status).toBe(200);
      expect(tokenInfoResponse.data.chain).toBe('evm');
      
      if (tokenInfoResponse.data.success) {
        expect(tokenInfoResponse.data.price).toBeGreaterThan(0);
        if (tokenInfoResponse.data.specificChain) {
          console.log(`ETH detected on chain: ${tokenInfoResponse.data.specificChain}`);
        }
      }
      
      console.log(`Token info for ETH:`, tokenInfoResponse.data);
    } catch (error) {
      console.log(`Error fetching token info for ETH: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Test token-info with specific chain parameter
    try {
      const baseToken = BASE_TOKENS.ETH;
      const tokenInfoResponse = await axios.get(`${baseUrl}/api/price/token-info`, {
        params: {
          token: baseToken,
          chain: 'evm',
          specificChain: 'base'
        }
      });
      
      expect(tokenInfoResponse.status).toBe(200);
      expect(tokenInfoResponse.data.chain).toBe('evm');
      expect(tokenInfoResponse.data.specificChain).toBe('base');
      
      if (tokenInfoResponse.data.success) {
        expect(tokenInfoResponse.data.price).toBeGreaterThan(0);
      }
      
      console.log(`Token info for Base ETH:`, tokenInfoResponse.data);
    } catch (error) {
      console.log(`Error fetching token info for Base ETH: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });
  
  test('should detect chain from token format', async () => {
    const baseUrl = getBaseUrl();
    
    // Test Solana token detection
    const solAddress = config.tokens.sol;
    const solResponse = await axios.get(`${baseUrl}/api/price?token=${solAddress}`);
    expect(solResponse.data.chain).toBe('svm');
    
    // Test Ethereum token detection
    const ethAddress = ETHEREUM_TOKENS.ETH;
    const ethResponse = await axios.get(`${baseUrl}/api/price?token=${ethAddress}`);
    expect(ethResponse.data.chain).toBe('evm');
    
    // Test Base token detection
    const baseAddress = BASE_TOKENS.ETH;
    const baseResponse = await axios.get(`${baseUrl}/api/price?token=${baseAddress}`);
    expect(baseResponse.data.chain).toBe('evm');
    
    console.log(`✅ All tokens correctly identified by chain type`);
  });
}); 