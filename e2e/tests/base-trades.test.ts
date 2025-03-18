import { setupAdminClient, registerTeamAndGetClient, startTestCompetition, cleanupTestState, wait, ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_EMAIL } from '../utils/test-helpers';
import axios from 'axios';
import { getBaseUrl } from '../utils/server';
import config from '../../src/config';
import { BlockchainType } from '../../src/types';

describe('Base Chain Trading', () => {
  // Base tokens to test with
  const BASE_TOKENS = [
    '0x3992B27dA26848C2b19CeA6Fd25ad5568B68AB98', // DEGEN
    '0x63706e401c06ac8513145b7687A14804d17f814b', // MOBY
    '0xB6fe221Fe9EeF5aBa221c348bA20A1Bf5e73624c', // SUSHI
    '0x0b3e328455c4059EEb9e3f84b5543F74E24e7E1b', // OBO
    '0x98d0baa52b2D063E780DE12F615f963Fe8537553'  // BEAN
  ];

  // Base USDC token address
  const BASE_USDC_ADDRESS = '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA';
  
  // Base specific chain identifier
  const BASE_CHAIN = 'base';

  // Number of tokens to distribute funds across
  const NUM_TOKENS = BASE_TOKENS.length;

  // Clean up test state before each test
  beforeEach(async () => {
    await cleanupTestState();
    
    // Create admin account
    await axios.post(`${getBaseUrl()}/api/admin/setup`, {
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD,
      email: ADMIN_EMAIL
    });
  });
  
  test('team can trade Base tokens with explicit chain parameters', async () => {
    console.log('[Test] Starting Base chain trading test with explicit chain parameters');
    
    // Setup admin client
    const adminClient = await setupAdminClient();
    
    // Register team and get client
    const { client: teamClient, team } = await registerTeamAndGetClient(adminClient, 'Base Chain Trading Team');
    
    // Start a competition with our team
    const competitionName = `Base Trading Test ${Date.now()}`;
    await startTestCompetition(adminClient, competitionName, [team.id]);
    
    // Wait for balances to be properly initialized
    await wait(500);
    
    // Check initial balance
    const initialBalanceResponse = await teamClient.getBalance();
    expect(initialBalanceResponse.success).toBe(true);
    expect(initialBalanceResponse.balance).toBeDefined();
    
    // Get initial Base USDC balance (should be 5000 as set in .env)
    const initialBaseUsdcBalance = parseFloat(initialBalanceResponse.balance[BASE_USDC_ADDRESS]?.toString() || '0');
    console.log(`Initial Base USDC balance: ${initialBaseUsdcBalance}`);
    expect(initialBaseUsdcBalance).toBeGreaterThan(0);
    
    // Amount to spend on each token
    const spendPerToken = initialBaseUsdcBalance / NUM_TOKENS;
    console.log(`Spending ${spendPerToken} USDC per token across ${NUM_TOKENS} Base tokens`);
    
    // Store token prices and expected amounts
    const tokenData = [];
    
    // Get the price for each token
    for (const tokenAddress of BASE_TOKENS) {
      // Get token price with explicit chain parameters to bypass chain detection
      const priceResponse = await axios.get(
        `${getBaseUrl()}/api/price?token=${tokenAddress}&chain=${BlockchainType.EVM}&specificChain=${BASE_CHAIN}`
      );
      expect(priceResponse.data.success).toBe(true);
      
      const tokenPrice = parseFloat(priceResponse.data.price);
      const expectedTokenAmount = spendPerToken / tokenPrice;
      
      console.log(`Token ${tokenAddress} price: $${tokenPrice} - Expected to receive: ${expectedTokenAmount}`);
      
      tokenData.push({
        address: tokenAddress,
        price: tokenPrice,
        expectedAmount: expectedTokenAmount
      });
    }
    
    // Execute trades for each token with explicit chain parameters
    for (const token of tokenData) {
      // Execute a buy trade for this token with explicit chain parameters
      console.log(`Executing trade for token ${token.address}`);
      
      // Log what we're doing to make debugging easier
      console.log(`About to execute trade from ${BASE_USDC_ADDRESS} to ${token.address} with amount ${spendPerToken}`);
      
      // Use the API endpoint with explicit from/to token addresses
      const tradeResponse = await teamClient.request('post', '/api/trade/execute', {
        fromToken: BASE_USDC_ADDRESS,  // Explicitly use Base USDC address
        toToken: token.address,        // Target token to buy
        amount: spendPerToken.toString(),
        fromChain: BlockchainType.EVM,
        toChain: BlockchainType.EVM,
        fromSpecificChain: BASE_CHAIN,
        toSpecificChain: BASE_CHAIN
      });
      
      console.log(`Trade response for ${token.address}: ${JSON.stringify(tradeResponse.success)}`);
      expect(tradeResponse.success).toBe(true);
      expect(tradeResponse.transaction).toBeDefined();
      
      // Verify chain parameters in the transaction
      expect(tradeResponse.transaction.fromChain).toBe(BlockchainType.EVM);
      expect(tradeResponse.transaction.toChain).toBe(BlockchainType.EVM);
      expect(tradeResponse.transaction.fromSpecificChain).toBe(BASE_CHAIN);
      expect(tradeResponse.transaction.toSpecificChain).toBe(BASE_CHAIN);
      
      // Wait a bit between trades to ensure they're processed
      await wait(100);
    }
    
    // Wait for all trades to be processed
    await wait(500);
    
    // Check final balance
    const finalBalanceResponse = await teamClient.getBalance();
    expect(finalBalanceResponse.success).toBe(true);
    
    // Calculate total portfolio value after trades
    let totalActualValue = 0;
    
    for (const token of tokenData) {
      const tokenBalance = parseFloat(finalBalanceResponse.balance[token.address]?.toString() || '0');
      console.log(`Final ${token.address} balance: ${tokenBalance}`);
      expect(tokenBalance).toBeGreaterThan(0);
      
      // Add token value to total (tokenBalance * price)
      const tokenValue = tokenBalance * token.price;
      totalActualValue += tokenValue;
    }
    
    // Add any remaining USDC
    const finalBaseUsdcBalance = parseFloat(finalBalanceResponse.balance[BASE_USDC_ADDRESS]?.toString() || '0');
    console.log(`Final Base USDC balance: ${finalBaseUsdcBalance}`);
    totalActualValue += finalBaseUsdcBalance;
    
    console.log(`Total actual portfolio value after trades: $${totalActualValue}`);
    
    // Total expected value should be close to initial portfolio value
    const totalExpectedValue = 5000; // Initial portfolio value
    
    // Verify the final portfolio value is close to the expected value
    // Allowing for some slippage but within reasonable bounds
    // Use a larger tolerance (2) since server prices might differ from what we fetched
    expect(totalActualValue).toBeCloseTo(totalExpectedValue, -2); // Check to nearest 100 dollars due to price differences
    
    // Get trade history and verify all trades were recorded with correct chain info
    const tradeHistoryResponse = await teamClient.getTradeHistory();
    expect(tradeHistoryResponse.success).toBe(true);
    expect(tradeHistoryResponse.trades).toBeInstanceOf(Array);
    expect(tradeHistoryResponse.trades.length).toBeGreaterThanOrEqual(NUM_TOKENS);
    
    // Verify each trade in history has correct chain parameters
    for (let i = 0; i < NUM_TOKENS; i++) {
      const trade = tradeHistoryResponse.trades[i];
      expect(trade.fromChain).toBe(BlockchainType.EVM);
      expect(trade.toChain).toBe(BlockchainType.EVM);
      expect(trade.fromSpecificChain).toBe(BASE_CHAIN);
      expect(trade.toSpecificChain).toBe(BASE_CHAIN);
    }
    
    console.log('[Test] Completed Base chain trading test with explicit chain parameters');
  });
}); 