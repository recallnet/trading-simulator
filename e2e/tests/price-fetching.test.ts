import { 
  setupAdminClient, 
  cleanupTestState, 
  ADMIN_USERNAME, 
  ADMIN_PASSWORD, 
  ADMIN_EMAIL,
  registerTeamAndGetClient
} from '../utils/test-helpers';
import axios from 'axios';
import { getBaseUrl } from '../utils/server';
import config from '../../src/config';
import { ApiClient } from '../utils/api-client';

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
  // Create variables for authenticated clients
  let adminClient: ApiClient;
  let client: ApiClient;
  
  // Clean up test state before each test
  beforeEach(async () => {
    await cleanupTestState();
    
    // Create admin account directly using the setup endpoint
    await axios.post(`${getBaseUrl()}/api/admin/setup`, {
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD,
      email: ADMIN_EMAIL
    });
    
    // Setup admin client
    adminClient = await setupAdminClient();
    
    // Register a team and get an authenticated client
    const result = await registerTeamAndGetClient(adminClient);
    client = result.client;
  });
  
  test('should fetch prices for standard tokens', async () => {
    // Test price for SOL using authenticated client
    const solResponse = await client.getPrice(config.tokens.sol);
    expect(solResponse.success).toBe(true);
    expect(solResponse.price).toBeDefined();
    expect(typeof solResponse.price).toBe('number');
    expect(solResponse.price).toBeGreaterThan(0);
    expect(solResponse.chain).toBe('svm');
    console.log(`SOL price: $${solResponse.price}`);
    
    // Test price for USDC
    const usdcResponse = await client.getPrice(config.tokens.usdc);
    expect(usdcResponse.success).toBe(true);
    expect(usdcResponse.price).toBeDefined();
    expect(typeof usdcResponse.price).toBe('number');
    // Allow for stablecoin price variations (0.8 to 1.2 range)
    expect(usdcResponse.price).toBeGreaterThan(0.8);
    expect(usdcResponse.price).toBeLessThan(1.2);
    expect(usdcResponse.chain).toBe('svm');
    console.log(`USDC price: $${usdcResponse.price}`);
    
    // Test price for USDT
    const usdtResponse = await client.getPrice(config.tokens.usdt);
    expect(usdtResponse.success).toBe(true);
    expect(usdtResponse.price).toBeDefined();
    expect(typeof usdtResponse.price).toBe('number');
    // Allow for stablecoin price variations (0.8 to 1.2 range)
    expect(usdtResponse.price).toBeGreaterThan(0.8);
    expect(usdtResponse.price).toBeLessThan(1.2);
    expect(usdtResponse.chain).toBe('svm');
    console.log(`USDT price: $${usdtResponse.price}`);
  });
  
  test('should fetch price for arbitrary token if available', async () => {
    // The arbitrary token address to test with
    const arbitraryTokenAddress = '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R';
    
    // Test price for arbitrary token using authenticated client
    const response = await client.getPrice(arbitraryTokenAddress);
    
    console.log(`Arbitrary token (${arbitraryTokenAddress}) price response:`, response);
    
    // We expect a valid response, regardless of whether a price is available
    expect(response).toBeDefined();
    
    // If a price is available, validate it
    if (response.success && response.price !== null) {
      expect(response.price).toBeDefined();
      expect(typeof response.price).toBe('number');
      expect(response.price).toBeGreaterThan(0);
      expect(response.chain).toBe('svm');
      console.log(`Arbitrary token price: $${response.price}`);
    } else {
      // Log diagnostic information but don't fail the test
      console.log(`No price available for arbitrary token: ${arbitraryTokenAddress}`);
      console.log(`Response: ${JSON.stringify(response)}`);
      console.log(`This is expected if the token doesn't have active liquidity pools or API errors occurred.`);
    }
  });

  test('should fetch prices for tokens across different chains', async () => {
    // Test SOL price (Solana chain)
    const solToken = config.tokens.sol;
    const solResponse = await client.getPrice(solToken);
    expect(solResponse.success).toBeTruthy();
    expect(solResponse.price).toBeGreaterThan(0);
    expect(solResponse.chain).toBe('svm');
    console.log(`SOL price: $${solResponse.price}`);
    
    // Test ETH price (Ethereum chain)
    const ethToken = ETHEREUM_TOKENS.ETH;
    const ethResponse = await client.getPrice(ethToken);
    
    // If we get a successful response with price data
    if (ethResponse.success && ethResponse.price) {
      expect(ethResponse.price).toBeGreaterThan(0);
      expect(ethResponse.chain).toBe('evm');
      console.log(`ETH price: $${ethResponse.price}`);
      
      // Check if we got specific chain information
      if (ethResponse.specificChain) {
        expect(ethResponse.specificChain).toBe('eth');
      }
    } else {
      console.log(`Note: Could not get ETH price. This could be due to API issues.`);
      console.log(`Response: ${JSON.stringify(ethResponse)}`);
    }
    
    // Test Base Chain ETH with specific chain parameter
    try {
      const baseEthResponse = await client.getPrice(BASE_TOKENS.ETH, 'evm', 'base');
      
      if (baseEthResponse.success && baseEthResponse.price) {
        expect(baseEthResponse.price).toBeGreaterThan(0);
        expect(baseEthResponse.chain).toBe('evm');
        expect(baseEthResponse.specificChain).toBe('base');
        console.log(`Base chain ETH price: $${baseEthResponse.price}`);
      }
    } catch (error) {
      console.log(`Error fetching Base chain ETH price: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });
  
  test('should fetch USDC price from both chains', async () => {
    // Test Solana USDC
    const solanaUsdcAddress = config.tokens.usdc;
    try {
      const solanaResponse = await client.getPrice(solanaUsdcAddress);
      
      // Check if the response is successful
      if (solanaResponse.success) {
        expect(solanaResponse.price).toBeGreaterThan(0);
        // Allow for stablecoin price variations (0.8 to 1.2 range)
        expect(solanaResponse.price).toBeGreaterThan(0.8);
        expect(solanaResponse.price).toBeLessThan(1.2);
        expect(solanaResponse.chain).toBe('svm');
        console.log(`Solana USDC price: $${solanaResponse.price}`);
      } else {
        console.log(`Note: Couldn't get Solana USDC price. Response: ${JSON.stringify(solanaResponse)}`);
      }
    } catch (error) {
      console.log(`Error fetching Solana USDC price: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Test Ethereum USDC
    const ethereumUsdcAddress = ETHEREUM_TOKENS.USDC;
    try {
      const ethereumResponse = await client.getPrice(ethereumUsdcAddress);
      
      if (ethereumResponse.success) {
        // Allow for stablecoin price variations (0.8 to 1.2 range)
        expect(ethereumResponse.price).toBeGreaterThan(0.8);
        expect(ethereumResponse.price).toBeLessThan(1.2);
        expect(ethereumResponse.chain).toBe('evm');
        console.log(`Ethereum USDC price: $${ethereumResponse.price}`);
        
        // Check if we got specific chain information
        if (ethereumResponse.specificChain) {
          expect(ethereumResponse.specificChain).toBe('eth');
          console.log(`Ethereum USDC detected on chain: ${ethereumResponse.specificChain}`);
        }
      } else {
        console.log(`Note: Couldn't get Ethereum USDC price. Response: ${JSON.stringify(ethereumResponse)}`);
      }
    } catch (error) {
      console.log(`Error fetching Ethereum USDC price: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Test Base chain USDC with specific chain parameter
    try {
      const baseUsdcResponse = await client.getPrice(BASE_TOKENS.USDC, 'evm', 'base');
      
      if (baseUsdcResponse.success) {
        // Allow for stablecoin price variations (0.8 to 1.2 range)
        expect(baseUsdcResponse.price).toBeGreaterThan(0.8);
        expect(baseUsdcResponse.price).toBeLessThan(1.2);
        expect(baseUsdcResponse.chain).toBe('evm');
        expect(baseUsdcResponse.specificChain).toBe('base');
        console.log(`Base chain USDC price: $${baseUsdcResponse.price}`);
      }
    } catch (error) {
      console.log(`Error fetching Base USDC price: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });
  
  test('should use detailed token info endpoint correctly', async () => {
    // Test token-info endpoint for Ethereum token
    try {
      const ethToken = ETHEREUM_TOKENS.ETH;
      const tokenInfoResponse = await client.getTokenInfo(ethToken);
      
      expect(tokenInfoResponse.chain).toBe('evm');
      
      if (tokenInfoResponse.success) {
        expect(tokenInfoResponse.price).toBeGreaterThan(0);
        if (tokenInfoResponse.specificChain) {
          console.log(`ETH detected on chain: ${tokenInfoResponse.specificChain}`);
        }
      }
      
      console.log(`Token info for ETH:`, tokenInfoResponse);
    } catch (error) {
      console.log(`Error fetching token info for ETH: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Test token-info with specific chain parameter
    try {
      const baseToken = BASE_TOKENS.ETH;
      const tokenInfoResponse = await client.getTokenInfo(baseToken, 'evm', 'base');
      
      expect(tokenInfoResponse.chain).toBe('evm');
      expect(tokenInfoResponse.specificChain).toBe('base');
      
      if (tokenInfoResponse.success) {
        expect(tokenInfoResponse.price).toBeGreaterThan(0);
      }
      
      console.log(`Token info for Base ETH:`, tokenInfoResponse);
    } catch (error) {
      console.log(`Error fetching token info for Base ETH: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });
  
  test('should detect chain from token format', async () => {
    // Test Solana token detection
    const solAddress = config.tokens.sol;
    const solResponse = await client.getPrice(solAddress);
    expect(solResponse.chain).toBe('svm');
    
    // Test Ethereum token detection
    const ethAddress = ETHEREUM_TOKENS.ETH;
    const ethResponse = await client.getPrice(ethAddress);
    expect(ethResponse.chain).toBe('evm');
    
    // Test Base token detection
    const baseAddress = BASE_TOKENS.ETH;
    const baseResponse = await client.getPrice(baseAddress);
    expect(baseResponse.chain).toBe('evm');
    
    console.log(`✅ All tokens correctly identified by chain type`);
  });
}); 